CREATE OR REPLACE FUNCTION get_dashboard_kpis(
    p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_receivables NUMERIC;
    v_total_payables NUMERIC;
    v_current_balance NUMERIC;
    v_avg_daily_outflow NUMERIC;
    v_overdue_count INTEGER;
    v_runway_days NUMERIC;
BEGIN
    -- 1. Current Balance (Sum of all bank balances)
    -- Using the latest balance for each bank
    SELECT COALESCE(SUM(amount), 0)
    INTO v_current_balance
    FROM (
        SELECT DISTINCT ON (bank_id) amount
        FROM bank_balances
        WHERE company_id = p_company_id
        ORDER BY bank_id, reference_date DESC
    ) latest_balances;

    -- 2. Total Receivables (Open)
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_total_receivables
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto';

    -- 3. Total Payables (Pending)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_payables
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND status = 'pending';
      
    -- 4. Overdue Count (Receivables)
    SELECT COUNT(*)
    INTO v_overdue_count
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < CURRENT_DATE;

    -- 5. Avg Daily Outflow (Last 30 days of payables paid or due)
    -- Using 'paid' status transactions in the last 30 days as a proxy for burn rate
    SELECT COALESCE(SUM(amount) / 30, 0)
    INTO v_avg_daily_outflow
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND (status = 'paid' OR due_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE);
      
    -- Runway
    IF v_avg_daily_outflow > 0 THEN
        v_runway_days := v_current_balance / v_avg_daily_outflow;
    ELSE
        v_runway_days := 999; -- Infinite/Safe
    END IF;

    RETURN jsonb_build_object(
        'current_balance', v_current_balance,
        'total_receivables', v_total_receivables,
        'total_payables', v_total_payables,
        'overdue_count', v_overdue_count,
        'avg_daily_outflow', v_avg_daily_outflow,
        'runway_days', v_runway_days
    );
END;
$$;
