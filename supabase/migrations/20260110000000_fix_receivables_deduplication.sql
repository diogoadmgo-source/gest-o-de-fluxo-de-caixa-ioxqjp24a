-- Migration: Fix Receivables Deduplication and Strict Import Logic
-- Date: 2026-01-10

-- 1. Enhanced Normalization Function
-- Normalizes "01 / 02" -> "1/2", " 01 " -> "1", removes spaces.
CREATE OR REPLACE FUNCTION public.normalize_installment(p_inst TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_clean TEXT;
  v_parts TEXT[];
BEGIN
  IF p_inst IS NULL OR trim(p_inst) = '' THEN RETURN NULL; END IF;
  
  -- Remove all spaces
  v_clean := regexp_replace(p_inst, '\s+', '', 'g');
  
  -- Case 1: Simple Integer (e.g. "01" -> "1")
  IF v_clean ~ '^\d+$' THEN
    RETURN v_clean::INTEGER::TEXT;
  END IF;
  
  -- Case 2: X/Y Format (e.g. "01/05" -> "1/5")
  IF v_clean ~ '^\d+/\d+$' THEN
    v_parts := regexp_split_to_array(v_clean, '/');
    -- Strip leading zeros by casting to int then back to text
    RETURN v_parts[1]::INTEGER::TEXT || '/' || v_parts[2]::INTEGER::TEXT;
  END IF;
  
  -- Fallback: Just return the space-stripped version (e.g. "1/2/3" or alphanumeric codes)
  RETURN v_clean;
EXCEPTION WHEN OTHERS THEN
  -- Safe fallback
  RETURN regexp_replace(p_inst, '\s+', '', 'g');
END;
$$;

-- 2. Update Database Constraints
-- Drop conflicting constraints if they exist
ALTER TABLE public.receivables DROP CONSTRAINT IF EXISTS receivables_strict_unique;
ALTER TABLE public.receivables DROP CONSTRAINT IF EXISTS receivables_unique_import;
ALTER TABLE public.receivables DROP CONSTRAINT IF EXISTS receivables_unique_import_v2;
DROP INDEX IF EXISTS receivables_dedup_idx;

-- Create new Unique Index supporting the Composite Key (Company, Doc, Installment, Value)
-- We use COALESCE on installment to ensure NULLs are treated as empty string for uniqueness
CREATE UNIQUE INDEX receivables_dedup_idx 
ON public.receivables (company_id, invoice_number, COALESCE(installment, ''), principal_value);


-- 3. Robust Import RPC
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
    -- 1. Initialize Log (Transaction begins)
    INSERT INTO public.import_receivables_log (
        company_id, user_id, file_name, total_rows, status, total_value
    ) VALUES (
        p_company_id, p_user_id, p_file_name, jsonb_array_length(p_rows), 'processing', 0
    ) RETURNING id INTO v_batch_id;

    -- 2. Atomic Deletion: Wipe existing data for this company (Full Replacement)
    DELETE FROM public.receivables WHERE company_id = p_company_id;

    v_total_rows := jsonb_array_length(p_rows);

    -- 3. Loop and Process Rows
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_idx := v_idx + 1;
        v_reject_reason := NULL;
        
        -- Extraction
        v_invoice_number := trim(v_row->>'invoice_number');
        v_customer := trim(v_row->>'customer');
        v_principal_value := (v_row->>'principal_value')::NUMERIC;
        v_due_date := public.parse_date_br(v_row->>'due_date');
        v_issue_date := public.parse_date_br(v_row->>'issue_date');
        v_installment := trim(v_row->>'installment');
        
        -- Default Issue Date to Now if missing
        IF v_issue_date IS NULL THEN
            v_issue_date := CURRENT_DATE;
        END IF;

        -- Updated Value Logic
        v_updated_value := COALESCE((v_row->>'updated_value')::NUMERIC, v_principal_value);
        
        -- Normalization: Installment
        IF v_installment IS NOT NULL AND v_installment <> '' THEN
            -- Reject invalid formats like month names
            IF v_installment ~* '[a-z]{3}' THEN 
                 v_reject_reason := 'parcela_formato_invalido';
            ELSE
                 v_installment_norm := public.normalize_installment(v_installment);
            END IF;
        ELSE
            v_installment_norm := NULL;
        END IF;

        -- Accumulate Total File Amount
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
            ELSIF v_principal_value <= 0 THEN -- Strict: Positive values only
                v_reject_reason := 'valor_negativo_ou_zero';
            ELSIF v_due_date IS NULL THEN
                v_reject_reason := 'data_vencimento_invalida';
            ELSIF v_due_date < v_issue_date THEN
                v_reject_reason := 'vencimento_menor_emissao';
            END IF;
        END IF;

        -- Deduplication: Strict Composite Key Check (Doc + Installment + Value)
        -- We check against the table which currently contains only rows from THIS batch
        IF v_reject_reason IS NULL THEN
            PERFORM 1 FROM public.receivables 
            WHERE company_id = p_company_id 
              AND invoice_number = v_invoice_number 
              -- Handle NULL installment equality
              AND COALESCE(installment, '') = COALESCE(v_installment_norm, '')
              AND principal_value = v_principal_value;
            
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
            -- Valid Insert
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
    -- In case of catastrophic failure, try to log it (though main transaction rolls back)
    -- The caller will receive the error and the DB will remain in state before transaction (clean for company usually)
    IF v_batch_id IS NOT NULL THEN
        -- We can't really update the log if we rollback, but we re-raise for client awareness
        -- Usually in Supabase/Postgres, the whole transaction fails.
    END IF;
    RAISE;
END;
$$;
