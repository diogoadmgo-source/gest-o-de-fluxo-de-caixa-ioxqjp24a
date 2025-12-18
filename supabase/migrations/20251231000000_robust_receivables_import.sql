-- 1. Schema Enhancements for Receivables
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS source_file_name TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS source_row_num INTEGER;

-- 2. Create Import Logs Table
CREATE TABLE IF NOT EXISTS public.import_logs_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    user_id UUID REFERENCES auth.users(id),
    file_name TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    total_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    rejected_rows INTEGER DEFAULT 0,
    total_amount_imported NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'processing',
    error_message TEXT
);

-- 3. Create Import Rejects Table
CREATE TABLE IF NOT EXISTS public.import_receivables_rejects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.import_logs_receivables(id),
    row_number INTEGER,
    raw_data JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_rejects_batch ON public.import_receivables_rejects(batch_id);
CREATE INDEX IF NOT EXISTS idx_receivables_import_batch ON public.receivables(import_batch_id);

-- 4. Utility Functions

-- Date Parsing (BR & ISO)
CREATE OR REPLACE FUNCTION public.parse_date_br(p_date_text TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_clean_text TEXT;
BEGIN
    IF p_date_text IS NULL OR p_date_text = '' THEN
        RETURN NULL;
    END IF;
    
    v_clean_text := trim(p_date_text);
    
    -- Excel serial date handling (approximate, usually sufficient for ints)
    IF v_clean_text ~ '^\d{5}$' THEN
       RETURN (DATE '1899-12-30' + v_clean_text::INTEGER);
    END IF;
    
    -- Try ISO format (YYYY-MM-DD)
    IF v_clean_text ~ '^\d{4}-\d{2}-\d{2}' THEN
        RETURN v_clean_text::DATE;
    END IF;
    
    -- Try BR format (DD/MM/YYYY)
    IF v_clean_text ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN
        RETURN to_date(v_clean_text, 'DD/MM/YYYY');
    END IF;
    
    -- Try BR short format (DD/MM/YY)
    IF v_clean_text ~ '^\d{1,2}/\d{1,2}/\d{2}' THEN
        RETURN to_date(v_clean_text, 'DD/MM/YY');
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Installment Normalization (e.g. "1/12" -> "01/12")
CREATE OR REPLACE FUNCTION public.normalize_installment(p_inst TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_parts TEXT[];
    v_curr INTEGER;
    v_total INTEGER;
BEGIN
    IF p_inst IS NULL OR trim(p_inst) = '' THEN
        RETURN NULL;
    END IF;

    -- Split by slash
    v_parts := regexp_split_to_array(trim(p_inst), '\s*/\s*');
    
    IF array_length(v_parts, 1) = 2 THEN
        BEGIN
            v_curr := v_parts[1]::INTEGER;
            v_total := v_parts[2]::INTEGER;
            
            IF v_curr > v_total THEN
                -- Invalid: current > total
                RETURN NULL; 
            END IF;
            
            IF v_total = 0 THEN RETURN NULL; END IF;

            -- Format as 01/02
            RETURN lpad(v_curr::TEXT, 2, '0') || '/' || lpad(v_total::TEXT, 2, '0');
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
    ELSIF array_length(v_parts, 1) = 1 THEN
        IF p_inst ~ '^\d+$' THEN
             RETURN lpad(p_inst, 2, '0');
        END IF;
    END IF;

    RETURN NULL; -- Invalid format
END;
$$;

-- 5. Main Import RPC
CREATE OR REPLACE FUNCTION public.import_receivables_replace(
    p_company_id UUID,
    p_user_id UUID,
    p_file_name TEXT,
    p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch_id UUID;
    v_row JSONB;
    v_idx INTEGER := 0;
    v_total_rows INTEGER;
    
    -- Parsed fields
    v_invoice_number TEXT;
    v_order_number TEXT;
    v_customer TEXT;
    v_customer_doc TEXT;
    v_issue_date DATE;
    v_due_date DATE;
    v_payment_prediction DATE;
    v_principal_value NUMERIC;
    v_fine NUMERIC;
    v_interest NUMERIC;
    v_updated_value NUMERIC;
    v_title_status TEXT;
    v_seller TEXT;
    v_customer_code TEXT;
    v_uf TEXT;
    v_regional TEXT;
    v_installment TEXT;
    v_installment_norm TEXT;
    v_days_overdue INTEGER;
    v_utilization TEXT;
    v_negativado TEXT;
    v_description TEXT;
    v_customer_name TEXT;
    v_new_status TEXT;
    
    -- Counters
    v_imported_count INTEGER := 0;
    v_rejected_count INTEGER := 0;
    v_imported_amount NUMERIC := 0;
    
    -- Validation
    v_reject_reason TEXT;
BEGIN
    -- 1. Setup Batch Log
    INSERT INTO public.import_logs_receivables (
        company_id, user_id, file_name, total_rows, status
    ) VALUES (
        p_company_id, p_user_id, p_file_name, jsonb_array_length(p_rows), 'processing'
    ) RETURNING id INTO v_batch_id;

    -- 2. Clean Slate: Delete existing for company
    DELETE FROM public.receivables WHERE company_id = p_company_id;

    v_total_rows := jsonb_array_length(p_rows);

    -- 3. Loop and Process
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_idx := v_idx + 1;
        v_reject_reason := NULL;
        
        -- Extract & Parse
        v_invoice_number := trim(v_row->>'invoice_number');
        v_customer := trim(v_row->>'customer');
        v_principal_value := (v_row->>'principal_value')::NUMERIC;
        
        -- Mandatory Fields Check
        IF v_invoice_number IS NULL OR v_invoice_number = '' THEN
            v_reject_reason := 'invoice_number_vazio';
        ELSIF v_customer IS NULL OR v_customer = '' THEN
            v_reject_reason := 'customer_vazio';
        ELSIF v_principal_value IS NULL THEN
            v_reject_reason := 'valor_invalido';
        END IF;

        -- Date Parsing
        IF v_reject_reason IS NULL THEN
            v_issue_date := public.parse_date_br(v_row->>'issue_date');
            v_due_date := public.parse_date_br(v_row->>'due_date');
            
            IF v_due_date IS NULL THEN
                 v_reject_reason := 'data_vencimento_invalida';
            END IF;
        END IF;

        -- Installment Normalization
        IF v_reject_reason IS NULL THEN
            v_installment := trim(v_row->>'installment');
            IF v_installment IS NOT NULL AND v_installment <> '' THEN
                v_installment_norm := public.normalize_installment(v_installment);
                IF v_installment_norm IS NULL THEN
                    v_reject_reason := 'parcela_formato_invalido';
                END IF;
            ELSE
                v_installment_norm := NULL;
            END IF;
        END IF;

        -- Deduplication Check (Internal to this batch)
        -- Since we wiped the table, we only check against what we JUST inserted in this transaction.
        IF v_reject_reason IS NULL THEN
            PERFORM 1 FROM public.receivables 
            WHERE company_id = p_company_id 
              AND invoice_number = v_invoice_number 
              AND COALESCE(installment, '') = COALESCE(v_installment_norm, '') 
              AND principal_value = v_principal_value;
            
            IF FOUND THEN
                v_reject_reason := 'duplicado_lote';
            END IF;
        END IF;

        -- Insert or Reject
        IF v_reject_reason IS NOT NULL THEN
            INSERT INTO public.import_receivables_rejects (
                batch_id, row_number, raw_data, reason
            ) VALUES (
                v_batch_id, v_idx, v_row, v_reject_reason
            );
            v_rejected_count := v_rejected_count + 1;
        ELSE
            -- Map other fields
            v_order_number := trim(v_row->>'order_number');
            v_customer_doc := trim(v_row->>'customer_doc');
            v_payment_prediction := public.parse_date_br(v_row->>'payment_prediction');
            v_fine := COALESCE((v_row->>'fine')::NUMERIC, 0);
            v_interest := COALESCE((v_row->>'interest')::NUMERIC, 0);
            v_updated_value := COALESCE((v_row->>'updated_value')::NUMERIC, v_principal_value + v_fine + v_interest);
            v_title_status := COALESCE(trim(v_row->>'title_status'), 'Aberto');
            v_seller := trim(v_row->>'seller');
            v_customer_code := trim(v_row->>'customer_code');
            v_uf := trim(v_row->>'uf');
            v_regional := trim(v_row->>'regional');
            v_days_overdue := COALESCE((v_row->>'days_overdue')::INTEGER, 0);
            v_utilization := trim(v_row->>'utilization');
            v_negativado := trim(v_row->>'negativado');
            v_description := trim(v_row->>'description');
            v_customer_name := trim(v_row->>'customer_name');
            v_new_status := trim(v_row->>'new_status');

            INSERT INTO public.receivables (
                company_id,
                invoice_number,
                order_number,
                customer,
                customer_doc,
                issue_date,
                due_date,
                payment_prediction,
                principal_value,
                fine,
                interest,
                updated_value,
                title_status,
                seller,
                customer_code,
                uf,
                regional,
                installment,
                days_overdue,
                utilization,
                negativado,
                description,
                customer_name,
                new_status,
                import_batch_id,
                source_file_name,
                source_row_num,
                created_at
            ) VALUES (
                p_company_id,
                v_invoice_number,
                v_order_number,
                v_customer,
                v_customer_doc,
                v_issue_date,
                v_due_date,
                v_payment_prediction,
                v_principal_value,
                v_fine,
                v_interest,
                v_updated_value,
                v_title_status,
                v_seller,
                v_customer_code,
                v_uf,
                v_regional,
                v_installment_norm, 
                v_days_overdue,
                v_utilization,
                v_negativado,
                v_description,
                v_customer_name,
                v_new_status,
                v_batch_id,
                p_file_name,
                v_idx,
                now()
            );
            
            v_imported_count := v_imported_count + 1;
            v_imported_amount := v_imported_amount + v_principal_value;
        END IF;
    END LOOP;

    -- 4. Finalize Log
    UPDATE public.import_logs_receivables
    SET 
        finished_at = now(),
        imported_rows = v_imported_count,
        rejected_rows = v_rejected_count,
        total_amount_imported = v_imported_amount,
        status = 'completed'
    WHERE id = v_batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'total_rows', v_total_rows,
        'imported_rows', v_imported_count,
        'rejected_rows', v_rejected_count,
        'imported_amount', v_imported_amount
    );

EXCEPTION WHEN OTHERS THEN
    IF v_batch_id IS NOT NULL THEN
        UPDATE public.import_logs_receivables
        SET status = 'failed', error_message = SQLERRM, finished_at = now()
        WHERE id = v_batch_id;
    END IF;
    RAISE;
END;
$$;

-- 6. RPC to Get Rejects
CREATE OR REPLACE FUNCTION public.get_receivables_rejects(
    p_batch_id UUID,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    row_number INTEGER,
    reason TEXT,
    raw_data JSONB,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.row_number,
        r.reason,
        r.raw_data,
        (SELECT count(*) FROM public.import_receivables_rejects WHERE batch_id = p_batch_id)::BIGINT
    FROM public.import_receivables_rejects r
    WHERE r.batch_id = p_batch_id
    ORDER BY r.row_number ASC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$;
