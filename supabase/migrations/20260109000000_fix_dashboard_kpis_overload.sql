-- Migration to fix PGRST203 error by consolidating get_dashboard_kpis overloaded functions
-- This drops both existing signatures and creates a unified one with optional p_date

DROP FUNCTION IF EXISTS public.get_dashboard_kpis(uuid);
DROP FUNCTION IF EXISTS public.get_dashboard_kpis(uuid, date);

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
    p_company_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ref_date DATE;
    v_current_balance NUMERIC;
    v_receivables_current NUMERIC; -- A Vencer (Open)
    v_receivables_overdue NUMERIC; -- Vencido
    v_receivables_received NUMERIC; -- Liquidado (Month)
    v_total_payables NUMERIC;
    v_overdue_count INTEGER;
    v_avg_daily_outflow NUMERIC;
    v_runway_days NUMERIC;
    v_pmr NUMERIC := 0;
    v_pmp NUMERIC := 0;
    v_cash_gap NUMERIC := 0;
BEGIN
    -- Ensure we have a date
    v_ref_date := COALESCE(p_date, CURRENT_DATE);

    -- 1. Current Balance (Latest known from bank balances)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_current_balance
    FROM (
        SELECT DISTINCT ON (bank_id) amount
        FROM bank_balances
        WHERE company_id = p_company_id
        ORDER BY bank_id, reference_date DESC
    ) latest_balances;

    -- 2. Receivables Breakdown
    
    -- A Vencer: Status 'Aberto' AND Due Date >= Reference Date
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_current
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date >= v_ref_date;

    -- Vencido: Status 'Aberto' AND Due Date < Reference Date
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_overdue
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < v_ref_date;

    -- Overdue Count
    SELECT COUNT(*)
    INTO v_overdue_count
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < v_ref_date;

    -- Recebido: Status 'Liquidado' AND Due Date within the month of Reference Date
    -- Using due_date as proxy for performance period since payment_date is not strictly available in this schema subset
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_received
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Liquidado'
      AND due_date BETWEEN date_trunc('month', v_ref_date) 
                       AND (date_trunc('month', v_ref_date) + interval '1 month' - interval '1 day');

    -- 3. Payables (Pending)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_payables
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND status = 'pending';
      
    -- 4. Avg Daily Outflow (Last 30 days) for Runway calculation
    SELECT COALESCE(SUM(amount) / 30, 0)
    INTO v_avg_daily_outflow
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND (status = 'paid' OR due_date BETWEEN v_ref_date - 30 AND v_ref_date);
      
    -- Runway Calculation
    IF v_avg_daily_outflow > 0 THEN
        v_runway_days := v_current_balance / v_avg_daily_outflow;
    ELSE
        v_runway_days := 999; -- Infinite/Safe
    END IF;

    -- Return JSONB matching the KPI interface
    RETURN jsonb_build_object(
        'current_balance', v_current_balance,
        'receivables_amount_open', v_receivables_current,
        'receivables_amount_overdue', v_receivables_overdue,
        'receivables_amount_received', v_receivables_received,
        'payables_amount_pending', v_total_payables,
        'overdue_count', v_overdue_count,
        'avg_daily_outflow', v_avg_daily_outflow,
        'runway_days', v_runway_days,
        'days_until_zero', v_runway_days,
        'pmr', v_pmr,
        'pmp', v_pmp,
        'cash_gap', v_cash_gap,
        'total_receivables', (v_receivables_current + v_receivables_overdue),
        'total_payables', v_total_payables
    );
END;
$$;
