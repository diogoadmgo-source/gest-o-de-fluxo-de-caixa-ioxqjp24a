CREATE OR REPLACE FUNCTION get_cash_flow_aggregates(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    day DATE,
    total_receivables NUMERIC,
    total_payables NUMERIC,
    import_payments NUMERIC,
    customs_cost NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE AS d
    ),
    receivables_agg AS (
        SELECT due_date, SUM(updated_value) as total
        FROM receivables
        WHERE company_id = p_company_id
          AND title_status = 'Aberto'
          AND due_date BETWEEN p_start_date AND p_end_date
        GROUP BY due_date
    ),
    payables_agg AS (
        SELECT due_date, SUM(amount) as total
        FROM transactions
        WHERE company_id = p_company_id
          AND type = 'payable'
          AND status = 'pending'
          AND due_date BETWEEN p_start_date AND p_end_date
        GROUP BY due_date
    ),
    imports_pay_agg AS (
        SELECT start_date as date_ref, SUM(foreign_currency_value * exchange_rate) as total
        FROM product_imports
        WHERE company_id = p_company_id
          AND start_date BETWEEN p_start_date AND p_end_date
        GROUP BY start_date
    ),
    imports_customs_agg AS (
        SELECT COALESCE(actual_arrival_date, expected_arrival_date, start_date) as date_ref, 
               SUM(COALESCE(logistics_costs, 0) + COALESCE(taxes, 0) + COALESCE(nationalization_costs, 0)) as total
        FROM product_imports
        WHERE company_id = p_company_id
          AND COALESCE(actual_arrival_date, expected_arrival_date, start_date) BETWEEN p_start_date AND p_end_date
        GROUP BY COALESCE(actual_arrival_date, expected_arrival_date, start_date)
    )
    SELECT
        ds.d,
        COALESCE(r.total, 0) as total_receivables,
        COALESCE(p.total, 0) as total_payables,
        COALESCE(i.total, 0) as import_payments,
        COALESCE(c.total, 0) as customs_cost
    FROM date_series ds
    LEFT JOIN receivables_agg r ON r.due_date = ds.d
    LEFT JOIN payables_agg p ON p.due_date = ds.d
    LEFT JOIN imports_pay_agg i ON i.date_ref = ds.d
    LEFT JOIN imports_customs_agg c ON c.date_ref = ds.d
    ORDER BY ds.d;
END;
$$;

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
    v_receivables_current NUMERIC;
    v_receivables_overdue NUMERIC;
    v_receivables_received NUMERIC;
    v_total_payables NUMERIC;
    v_imports_pending NUMERIC;
    v_customs_pending NUMERIC;
    v_overdue_count INTEGER;
    v_avg_daily_outflow NUMERIC;
    v_runway_days NUMERIC;
    v_pmr NUMERIC := 30;
    v_pmp NUMERIC := 45;
BEGIN
    v_ref_date := COALESCE(p_date, CURRENT_DATE);

    -- 1. Current Balance
    SELECT COALESCE(SUM(amount), 0)
    INTO v_current_balance
    FROM (
        SELECT DISTINCT ON (bank_id) amount
        FROM bank_balances
        WHERE company_id = p_company_id
        ORDER BY bank_id, reference_date DESC
    ) latest_balances;

    -- 2. Receivables
    SELECT COALESCE(SUM(updated_value), 0) INTO v_receivables_current
    FROM receivables
    WHERE company_id = p_company_id AND title_status = 'Aberto' AND due_date >= v_ref_date;

    SELECT COALESCE(SUM(updated_value), 0) INTO v_receivables_overdue
    FROM receivables
    WHERE company_id = p_company_id AND title_status = 'Aberto' AND due_date < v_ref_date;

    SELECT COUNT(*) INTO v_overdue_count
    FROM receivables
    WHERE company_id = p_company_id AND title_status = 'Aberto' AND due_date < v_ref_date;

    SELECT COALESCE(SUM(updated_value), 0) INTO v_receivables_received
    FROM receivables
    WHERE company_id = p_company_id AND title_status = 'Liquidado' 
      AND due_date BETWEEN date_trunc('month', v_ref_date) AND (date_trunc('month', v_ref_date) + interval '1 month' - interval '1 day');

    -- 3. Payables (Transactions)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_payables
    FROM transactions
    WHERE company_id = p_company_id AND type = 'payable' AND status = 'pending';

    -- 3b. Import Payables (Pending/Future)
    SELECT COALESCE(SUM(foreign_currency_value * exchange_rate), 0) INTO v_imports_pending
    FROM product_imports
    WHERE company_id = p_company_id AND start_date >= v_ref_date;

    -- 3c. Customs Pending (Future)
    SELECT COALESCE(SUM(COALESCE(logistics_costs, 0) + COALESCE(taxes, 0) + COALESCE(nationalization_costs, 0)), 0) INTO v_customs_pending
    FROM product_imports
    WHERE company_id = p_company_id AND COALESCE(actual_arrival_date, expected_arrival_date, start_date) >= v_ref_date;

    -- Update total payables to include imports
    v_total_payables := v_total_payables + v_imports_pending + v_customs_pending;
      
    -- 4. Runway Calculation (Average Daily Outflow last 30 days)
    SELECT COALESCE(
        (
            (SELECT COALESCE(SUM(amount), 0) FROM transactions 
             WHERE company_id = p_company_id AND type = 'payable' 
             AND (status = 'paid' OR due_date BETWEEN v_ref_date - 30 AND v_ref_date))
            +
            (SELECT COALESCE(SUM(foreign_currency_value * exchange_rate), 0) FROM product_imports
             WHERE company_id = p_company_id AND start_date BETWEEN v_ref_date - 30 AND v_ref_date)
            +
            (SELECT COALESCE(SUM(COALESCE(logistics_costs, 0) + COALESCE(taxes, 0) + COALESCE(nationalization_costs, 0)), 0) FROM product_imports
             WHERE company_id = p_company_id AND COALESCE(actual_arrival_date, expected_arrival_date, start_date) BETWEEN v_ref_date - 30 AND v_ref_date)
        ) / 30, 
    0) INTO v_avg_daily_outflow;
      
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
