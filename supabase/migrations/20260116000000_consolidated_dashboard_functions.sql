-- Migration to support Consolidated Dashboard (All Companies)
-- Updates get_dashboard_kpis, get_latest_balances, and get_cash_flow_aggregates
-- to handle NULL p_company_id as "All companies linked to the current user"

-- 1. Update get_dashboard_kpis
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
    v_user_id UUID;
BEGIN
    v_end_date := v_ref_date + (p_days || ' days')::interval;
    v_user_id := auth.uid();

    -- 1. Current Balance (Latest known from bank_balances)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_current_balance
    FROM (
        SELECT DISTINCT ON (bank_id) amount
        FROM bank_balances
        WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
        ORDER BY bank_id, reference_date DESC
    ) latest_balances;

    -- 2. Receivables Breakdown
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_current
    FROM receivables
    WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
      AND title_status = 'Aberto'
      AND due_date BETWEEN v_ref_date AND v_end_date;

    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_overdue
    FROM receivables
    WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
      AND title_status = 'Aberto'
      AND due_date < v_ref_date;

    SELECT COUNT(*)
    INTO v_overdue_count
    FROM receivables
    WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
      AND title_status = 'Aberto'
      AND due_date < v_ref_date;

    -- Received in current month
    SELECT COALESCE(SUM(updated_value), 0)
    INTO v_receivables_received
    FROM receivables
    WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
      AND title_status = 'Liquidado'
      AND due_date BETWEEN date_trunc('month', v_ref_date) 
                       AND (date_trunc('month', v_ref_date) + interval '1 month' - interval '1 day');

    -- 3. Payables (Pending)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_payables
    FROM transactions
    WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
      AND type = 'payable'
      AND status = 'pending'
      AND due_date BETWEEN v_ref_date AND v_end_date;
      
    -- 4. Runway Calculation
    SELECT COALESCE(SUM(amount) / 30, 0)
    INTO v_avg_daily_outflow
    FROM transactions
    WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
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

-- 2. Update get_latest_balances
CREATE OR REPLACE FUNCTION public.get_latest_balances(
    p_company_id UUID
) 
RETURNS TABLE (
    bank_id UUID,
    bank_name TEXT,
    bank_type TEXT,
    account_number TEXT,
    reference_date DATE,
    balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    RETURN QUERY
    SELECT DISTINCT ON (b.id)
        b.id AS bank_id,
        COALESCE(b.name, 'Banco Desconhecido') AS bank_name,
        COALESCE(b.type, 'bank') AS bank_type,
        COALESCE(b.account_number, '') AS account_number,
        bb.reference_date,
        bb.amount AS balance
    FROM banks b
    LEFT JOIN bank_balances bb ON b.id = bb.bank_id
    WHERE ((p_company_id IS NULL AND b.company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
       OR (p_company_id IS NOT NULL AND b.company_id = p_company_id))
      AND (b.active IS TRUE OR b.active IS NULL)
    ORDER BY b.id, bb.reference_date DESC;
END;
$$;

-- 3. Update get_cash_flow_aggregates
CREATE OR REPLACE FUNCTION public.get_cash_flow_aggregates(
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
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS d
    ),
    receivables_agg AS (
        SELECT 
            due_date AS date, 
            SUM(updated_value) AS amount
        FROM receivables
        WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
          AND title_status = 'Aberto'
          AND due_date BETWEEN p_start_date AND p_end_date
        GROUP BY due_date
    ),
    payables_agg AS (
        SELECT 
            due_date AS date, 
            SUM(amount) AS amount
        FROM transactions
        WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
          AND type = 'payable'
          AND status = 'pending'
          AND due_date BETWEEN p_start_date AND p_end_date
        GROUP BY due_date
    ),
    imports_agg AS (
        SELECT
            start_date::date AS date,
            SUM(foreign_currency_value * exchange_rate) AS amount
        FROM product_imports
        WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
          AND status != 'Concluído'
          AND start_date::date BETWEEN p_start_date AND p_end_date
        GROUP BY start_date::date
    ),
    customs_agg AS (
        SELECT
            actual_arrival_date::date AS date,
            SUM(taxes + nationalization_costs) AS amount
        FROM product_imports
        WHERE ((p_company_id IS NULL AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = v_user_id))
           OR (p_company_id IS NOT NULL AND company_id = p_company_id))
          AND status != 'Concluído'
          AND actual_arrival_date IS NOT NULL
          AND actual_arrival_date::date BETWEEN p_start_date AND p_end_date
        GROUP BY actual_arrival_date::date
    )
    SELECT
        ds.d AS day,
        COALESCE(ra.amount, 0) AS total_receivables,
        COALESCE(pa.amount, 0) AS total_payables,
        COALESCE(ia.amount, 0) AS import_payments,
        COALESCE(ca.amount, 0) AS customs_cost
    FROM date_series ds
    LEFT JOIN receivables_agg ra ON ds.d = ra.date
    LEFT JOIN payables_agg pa ON ds.d = pa.date
    LEFT JOIN imports_agg ia ON ds.d = ia.date
    LEFT JOIN customs_agg ca ON ds.d = ca.date
    ORDER BY ds.d;
END;
$$;
