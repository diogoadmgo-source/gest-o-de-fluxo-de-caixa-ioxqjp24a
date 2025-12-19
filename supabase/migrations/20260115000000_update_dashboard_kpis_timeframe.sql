DROP FUNCTION IF EXISTS public.get_dashboard_kpis(uuid);
DROP FUNCTION IF EXISTS public.get_dashboard_kpis(uuid, date);

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
    p_company_id UUID,
    p_days INTEGER DEFAULT 30
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ref_date DATE := CURRENT_DATE;
    v_end_date DATE;
    v_current_balance NUMERIC;
    v_receivables_current NUMERIC; -- A Vencer (Open) within timeframe
    v_receivables_overdue NUMERIC; -- Vencido (Everything before today)
    v_receivables_received NUMERIC; -- Liquidado (Month)
    v_total_payables NUMERIC;      -- Within timeframe
    v_overdue_count INTEGER;
    v_avg_daily_outflow NUMERIC;
    v_runway_days NUMERIC;
    v_pmr NUMERIC := 30;
    v_pmp NUMERIC := 45;
BEGIN
    v_end_date := v_ref_date + (p_days || ' days')::interval;

    -- 1. Current Balance (Latest known from bank_balances)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_current_balance
    FROM (
        SELECT DISTINCT ON (bank_id) amount
        FROM bank_balances
        WHERE company_id = p_company_id
        ORDER BY bank_id, reference_date DESC
    ) latest_balances;

    -- 2. Receivables Breakdown (Timeframe restricted for Future)
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_current
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date BETWEEN v_ref_date AND v_end_date;

    -- Overdue is strictly past, regardless of timeframe filter (usually)
    -- But if user wants "Clean view", maybe we keep it as Total Overdue to alert them.
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_overdue
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < v_ref_date;

    SELECT COUNT(*)
    INTO v_overdue_count
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < v_ref_date;

    -- Received in current month (independent of timeframe, context metric)
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_received
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Liquidado'
      AND due_date BETWEEN date_trunc('month', v_ref_date) 
                       AND (date_trunc('month', v_ref_date) + interval '1 month' - interval '1 day');

    -- 3. Payables (Pending) (Timeframe restricted)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_payables
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND status = 'pending'
      AND due_date BETWEEN v_ref_date AND v_end_date;
      
    -- 4. Runway Calculation (Historical avg, not affected by projection timeframe)
    SELECT COALESCE(SUM(amount) / 30, 0)
    INTO v_avg_daily_outflow
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND (status = 'paid' OR due_date BETWEEN v_ref_date - 30 AND v_ref_date);
      
    IF v_avg_daily_outflow > 0 THEN
        v_runway_days := v_current_balance / v_avg_daily_outflow;
    ELSE
        v_runway_days := 999;
    END IF;

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
        'cash_gap', (v_pmr - v_pmp),
        'total_receivables', (v_receivables_current + v_receivables_overdue),
        'total_payables', v_total_payables
    );
END;
$$;
