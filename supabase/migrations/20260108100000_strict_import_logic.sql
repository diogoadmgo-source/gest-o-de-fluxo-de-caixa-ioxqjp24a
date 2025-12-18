-- Migration for Strict Import Logic, Constraints and Audit

-- 1. Helper Function: Normalize Installment
CREATE OR REPLACE FUNCTION public.normalize_installment(p_inst TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_inst IS NULL THEN RETURN NULL; END IF;
  -- Remove all spaces to standardize (e.g. "1 / 2" -> "1/2")
  RETURN regexp_replace(p_inst, '\s+', '', 'g');
END;
$$;

-- 2. Constraints: Enforce uniqueness on (company, invoice, installment)
-- Drop old constraints if they exist to avoid conflicts
ALTER TABLE public.receivables DROP CONSTRAINT IF EXISTS receivables_unique_import;
ALTER TABLE public.receivables DROP CONSTRAINT IF EXISTS receivables_unique_import_v2;

-- Clean up any potential duplicates before adding constraint (though import wipes data, good practice)
-- (Skipping complex cleanup as import will wipe data for the company anyway)

-- Add strict constraint
ALTER TABLE public.receivables
ADD CONSTRAINT receivables_strict_unique 
UNIQUE (company_id, invoice_number, installment);

-- 3. Enhanced Import RPC
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
    
    -- Fields
    v_invoice_number TEXT;
    v_customer TEXT;
    v_principal_value NUMERIC;
    v_due_date DATE;
    v_issue_date DATE;
    v_installment TEXT;
    v_installment_norm TEXT;
    v_updated_value NUMERIC;
    v_title_status TEXT;
    
    -- Counters
    v_imported_count INTEGER := 0;
    v_rejected_count INTEGER := 0;
    v_imported_amount NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_rejected_amount NUMERIC := 0;
    
    -- Audit
    v_audit_rows INTEGER;
    v_audit_value NUMERIC;
    
    -- Validation
    v_reject_reason TEXT;
BEGIN
    -- 1. Init Log
    INSERT INTO public.import_receivables_log (
        company_id, user_id, file_name, total_rows, status, total_value
    ) VALUES (
        p_company_id, p_user_id, p_file_name, jsonb_array_length(p_rows), 'processing', 0
    ) RETURNING id INTO v_batch_id;

    -- 2. Atomic Replacement: Delete existing records for the company
    DELETE FROM public.receivables WHERE company_id = p_company_id;

    v_total_rows := jsonb_array_length(p_rows);

    -- 3. Loop and Process
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_idx := v_idx + 1;
        v_reject_reason := NULL;
        
        -- Extract Fields
        v_invoice_number := trim(v_row->>'invoice_number');
        v_customer := trim(v_row->>'customer');
        v_principal_value := (v_row->>'principal_value')::NUMERIC;
        v_due_date := public.parse_date_br(v_row->>'due_date');
        v_issue_date := public.parse_date_br(v_row->>'issue_date');
        v_installment := trim(v_row->>'installment');
        
        -- Defaulting Issue Date
        IF v_issue_date IS NULL THEN
            v_issue_date := CURRENT_DATE;
        END IF;

        -- Defaulting Updated Value
        v_updated_value := COALESCE((v_row->>'updated_value')::NUMERIC, v_principal_value);
        
        -- Installment Normalization
        IF v_installment IS NOT NULL AND v_installment <> '' THEN
            -- Check for months (e.g. "jan") to reject trash
            IF v_installment ~* '[a-z]{3}' THEN 
                 v_reject_reason := 'parcela_formato_invalido';
            ELSE
                 v_installment_norm := public.normalize_installment(v_installment);
            END IF;
        ELSE
            v_installment_norm := NULL;
        END IF;

        -- Calculate File Totals
        IF v_principal_value IS NOT NULL THEN
            v_total_amount := v_total_amount + v_principal_value;
        END IF;

        -- Validation Rules
        IF v_reject_reason IS NULL THEN
            IF v_invoice_number IS NULL OR v_invoice_number = '' THEN
                v_reject_reason := 'invoice_number_vazio';
            ELSIF v_customer IS NULL OR v_customer = '' THEN
                 v_reject_reason := 'customer_vazio';
            ELSIF v_principal_value IS NULL THEN
                v_reject_reason := 'valor_invalido';
            ELSIF v_principal_value <= 0 THEN
                v_reject_reason := 'valor_negativo_ou_zero';
            ELSIF v_due_date IS NULL THEN
                v_reject_reason := 'data_vencimento_invalida';
            ELSIF v_due_date < v_issue_date THEN
                v_reject_reason := 'vencimento_menor_emissao';
            END IF;
        END IF;

        -- Deduplication: Check against table (which is clean for this company, but accumulates rows from this loop)
        IF v_reject_reason IS NULL THEN
            PERFORM 1 FROM public.receivables 
            WHERE company_id = p_company_id 
              AND invoice_number = v_invoice_number 
              -- Use IS NOT DISTINCT FROM for nullable installment
              AND installment IS NOT DISTINCT FROM v_installment_norm;
            
            IF FOUND THEN
                v_reject_reason := 'duplicado_lote';
            END IF;
        END IF;

        -- Insert or Reject
        IF v_reject_reason IS NOT NULL THEN
            INSERT INTO public.import_receivables_rejects (
                batch_id, company_id, row_number, raw_data, reason
            ) VALUES (
                v_batch_id, p_company_id, v_idx, v_row, v_reject_reason
            );
            v_rejected_count := v_rejected_count + 1;
            IF v_principal_value IS NOT NULL THEN
                v_rejected_amount := v_rejected_amount + v_principal_value;
            END IF;
        ELSE
            -- Ensure title_status is valid
            v_title_status := COALESCE(trim(v_row->>'title_status'), 'Aberto');
            
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
                trim(v_row->>'order_number'),
                v_customer,
                trim(v_row->>'customer_doc'),
                v_issue_date,
                v_due_date,
                public.parse_date_br(v_row->>'payment_prediction'),
                v_principal_value,
                COALESCE((v_row->>'fine')::NUMERIC, 0),
                COALESCE((v_row->>'interest')::NUMERIC, 0),
                v_updated_value,
                v_title_status,
                trim(v_row->>'seller'),
                trim(v_row->>'customer_code'),
                trim(v_row->>'uf'),
                trim(v_row->>'regional'),
                v_installment_norm, 
                COALESCE((v_row->>'days_overdue')::INTEGER, 0),
                trim(v_row->>'utilization'),
                trim(v_row->>'negativado'),
                trim(v_row->>'description'),
                trim(v_row->>'customer_name'),
                trim(v_row->>'new_status'),
                v_batch_id,
                p_file_name,
                v_idx,
                now()
            );
            
            v_imported_count := v_imported_count + 1;
            v_imported_amount := v_imported_amount + v_principal_value;
        END IF;
    END LOOP;

    -- 4. Post-Import Audit
    SELECT COUNT(*), COALESCE(SUM(principal_value), 0)
    INTO v_audit_rows, v_audit_value
    FROM public.receivables
    WHERE company_id = p_company_id;

    -- 5. Finalize Log
    UPDATE public.import_receivables_log
    SET 
        finished_at = now(),
        imported_rows = v_imported_count,
        rejected_rows = v_rejected_count,
        total_amount_imported = v_imported_amount,
        rejected_value = v_rejected_amount,
        total_value = v_total_amount,
        status = 'completed'
    WHERE id = v_batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'total_rows', v_total_rows,
        'imported_rows', v_imported_count,
        'rejected_rows', v_rejected_count,
        'imported_amount', v_imported_amount,
        'total_amount', v_total_amount,
        'rejected_amount', v_rejected_amount,
        'total_value', v_total_amount,
        'rejected_value', v_rejected_amount,
        'audit_db_rows', v_audit_rows,
        'audit_db_value', v_audit_value
    );

EXCEPTION WHEN OTHERS THEN
    IF v_batch_id IS NOT NULL THEN
        UPDATE public.import_receivables_log
        SET status = 'failed', error_message = SQLERRM, finished_at = now()
        WHERE id = v_batch_id;
    END IF;
    RAISE;
END;
$$;
