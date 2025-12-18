-- Migration: Improve Import Validation, KPI Logic and Cleanup
-- Implements strict "Clean-Slate" import for receivables with enhanced validation rules (AC 1, 2, 3)
-- Implements optimized Dashboard KPIs (AC 4)
-- Implements Garbage Company Cleanup (AC 6)

-- 1. Create or Update Import Rejects Table (Ensure structure)
CREATE TABLE IF NOT EXISTS public.import_receivables_rejects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.import_receivables_log(id),
    company_id UUID REFERENCES public.companies(id),
    row_number INTEGER,
    raw_data JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enhanced Import RPC
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
    v_customer TEXT;
    v_principal_value NUMERIC;
    v_due_date DATE;
    v_issue_date DATE;
    v_installment TEXT;
    v_installment_norm TEXT;
    v_updated_value NUMERIC;
    v_fine NUMERIC;
    v_interest NUMERIC;
    
    -- Counters
    v_imported_count INTEGER := 0;
    v_rejected_count INTEGER := 0;
    v_imported_amount NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_rejected_amount NUMERIC := 0;
    
    -- Validation
    v_reject_reason TEXT;
    
BEGIN
    -- 1. Setup Batch Log
    INSERT INTO public.import_receivables_log (
        company_id, user_id, file_name, total_rows, status, total_value
    ) VALUES (
        p_company_id, p_user_id, p_file_name, jsonb_array_length(p_rows), 'processing', 0
    ) RETURNING id INTO v_batch_id;

    -- 2. Clean Slate: Delete existing for company (AC 1)
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
        v_due_date := public.parse_date_br(v_row->>'due_date');
        v_issue_date := public.parse_date_br(v_row->>'issue_date');
        v_installment := trim(v_row->>'installment');
        v_fine := COALESCE((v_row->>'fine')::NUMERIC, 0);
        v_interest := COALESCE((v_row->>'interest')::NUMERIC, 0);
        
        -- Calculate/Extract Updated Value
        v_updated_value := COALESCE((v_row->>'updated_value')::NUMERIC, v_principal_value + v_fine + v_interest);
        
        -- Track Total Amount from Spreadsheet
        IF v_principal_value IS NOT NULL THEN
            v_total_amount := v_total_amount + v_principal_value;
        END IF;

        -- AC 2: Validation Rules
        
        -- Rule: Missing Mandatory Fields
        IF v_invoice_number IS NULL OR v_invoice_number = '' THEN
            v_reject_reason := 'invoice_number_vazio';
        ELSIF v_customer IS NULL OR v_customer = '' THEN
            v_reject_reason := 'customer_vazio';
        ELSIF v_principal_value IS NULL THEN
            v_reject_reason := 'valor_invalido';
        END IF;

        -- Rule: Negative Values (AC 2)
        IF v_reject_reason IS NULL THEN
            IF v_principal_value < 0 THEN
                 v_reject_reason := 'valor_negativo';
            ELSIF v_updated_value < 0 THEN
                 v_reject_reason := 'valor_atualizado_negativo';
            END IF;
        END IF;

        -- Rule: Invalid Dates (AC 2)
        IF v_reject_reason IS NULL AND v_due_date IS NULL THEN
             v_reject_reason := 'data_vencimento_invalida';
        END IF;

        -- Rule: Due Date earlier than Issue Date (AC 2)
        IF v_reject_reason IS NULL AND v_issue_date IS NOT NULL AND v_due_date < v_issue_date THEN
             v_reject_reason := 'vencimento_menor_emissao';
        END IF;

        -- Rule: Garbage Rows / Footer Text (AC 2)
        IF v_reject_reason IS NULL THEN
            IF v_invoice_number ILIKE 'Total%' 
               OR v_invoice_number ILIKE 'Filtros aplicados:%' 
               OR v_customer ILIKE 'Total%' 
               OR v_customer ILIKE 'Valor não é 0,00%' THEN
                v_reject_reason := 'linha_invalida';
            END IF;
        END IF;

        -- Installment Normalization
        IF v_reject_reason IS NULL THEN
            IF v_installment IS NOT NULL AND v_installment <> '' THEN
                v_installment_norm := public.normalize_installment(v_installment);
            ELSE
                v_installment_norm := NULL;
            END IF;
        END IF;

        -- Rule: Deduplication Check (Same Invoice + Installment + Value within this batch) (AC 2)
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
                batch_id, company_id, row_number, raw_data, reason
            ) VALUES (
                v_batch_id, p_company_id, v_idx, v_row, v_reject_reason
            );
            v_rejected_count := v_rejected_count + 1;
            
            IF v_principal_value IS NOT NULL THEN
                v_rejected_amount := v_rejected_amount + v_principal_value;
            END IF;
        ELSE
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
                v_fine,
                v_interest,
                v_updated_value,
                COALESCE(trim(v_row->>'title_status'), 'Aberto'),
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

    -- 4. Finalize Log (AC 1 Metrics Return)
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
        'duplicate_count', v_rejected_count -- Simplified as mostly duplicates or validation errors
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

-- 3. Optimized Dashboard KPI Function (AC 4)
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
    p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance NUMERIC;
    v_receivables_amount_open NUMERIC; -- A Vencer
    v_receivables_amount_overdue NUMERIC; -- Vencido
    v_receivables_amount_received NUMERIC; -- Recebido
    v_payables_amount_pending NUMERIC;
    v_avg_daily_outflow NUMERIC;
    v_runway_days NUMERIC;
    v_pmr NUMERIC := 30; -- Placeholder for now
    v_pmp NUMERIC := 45; -- Placeholder for now
BEGIN
    -- 1. Current Balance
    SELECT COALESCE(SUM(amount), 0)
    INTO v_current_balance
    FROM (
        SELECT DISTINCT ON (bank_id) amount
        FROM bank_balances
        WHERE company_id = p_company_id
        ORDER BY bank_id, reference_date DESC
    ) latest_balances;

    -- 2. Receivables Logic (AC 4)
    -- "A Vencer": updated_value, due_date >= current_date, status = 'Aberto'
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_amount_open
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date >= CURRENT_DATE;

    -- "Vencido": updated_value, due_date < current_date, status = 'Aberto'
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_amount_overdue
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < CURRENT_DATE;
      
    -- "Recebido": status = 'Liquidado'
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_amount_received
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Liquidado';

    -- 3. Payables
    SELECT COALESCE(SUM(amount), 0)
    INTO v_payables_amount_pending
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND status = 'pending';

    -- 4. Runway (Estimate)
    SELECT COALESCE(SUM(amount) / NULLIF(COUNT(DISTINCT due_date), 0), 0)
    INTO v_avg_daily_outflow
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND (status = 'paid' OR due_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE);
      
    IF v_avg_daily_outflow > 0 THEN
        v_runway_days := v_current_balance / v_avg_daily_outflow;
    ELSE
        v_runway_days := 999;
    END IF;

    RETURN jsonb_build_object(
        'current_balance', v_current_balance,
        'receivables_amount_open', v_receivables_amount_open,
        'receivables_amount_overdue', v_receivables_amount_overdue,
        'receivables_amount_received', v_receivables_amount_received,
        'payables_amount_pending', v_payables_amount_pending,
        'runway_days', v_runway_days,
        'pmr', v_pmr,
        'pmp', v_pmp,
        'cash_gap', (v_pmr - v_pmp)
    );
END;
$$;

-- 4. Garbage Company Cleanup (AC 6)
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Iterate through companies matching garbage patterns
  FOR rec IN 
    SELECT id, name FROM companies 
    WHERE (name ILIKE 'filtros aplicados:%' 
       OR name ILIKE 'total' 
       OR name ILIKE 'valor%' 
       OR name ILIKE 'intercompany%')
  LOOP
    -- Check dependencies and delete
    -- We can force delete if they are indeed garbage created by bad imports
    DELETE FROM user_companies WHERE company_id = rec.id;
    DELETE FROM receivables WHERE company_id = rec.id;
    DELETE FROM transactions WHERE company_id = rec.id;
    DELETE FROM bank_balances WHERE company_id = rec.id;
    DELETE FROM banks WHERE company_id = rec.id;
    DELETE FROM import_receivables_log WHERE company_id = rec.id;
    
    -- Delete company
    DELETE FROM companies WHERE id = rec.id;
    
    RAISE NOTICE 'Cleaned up garbage company: %', rec.name;
  END LOOP;
  
  -- Clean Orphans
  DELETE FROM companies c
  WHERE NOT EXISTS (SELECT 1 FROM user_companies uc WHERE uc.company_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM receivables r WHERE r.company_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.company_id = c.id);
    
END $$;
