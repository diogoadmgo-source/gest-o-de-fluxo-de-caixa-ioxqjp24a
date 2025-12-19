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
    imports_agg AS (
        -- Aggregating import payments based on start_date (assumption for supplier payment)
        SELECT start_date::DATE as ref_date, SUM(foreign_currency_value * exchange_rate) as total
        FROM product_imports
        WHERE company_id = p_company_id
          AND start_date::DATE BETWEEN p_start_date AND p_end_date
          AND status != 'Cancelled'
        GROUP BY start_date::DATE
    ),
    customs_agg AS (
        -- Aggregating customs costs based on expected_arrival_date
        SELECT COALESCE(actual_arrival_date, expected_arrival_date)::DATE as ref_date, 
               SUM(COALESCE(taxes, 0) + COALESCE(nationalization_costs, 0) + COALESCE(logistics_costs, 0)) as total
        FROM product_imports
        WHERE company_id = p_company_id
          AND COALESCE(actual_arrival_date, expected_arrival_date)::DATE BETWEEN p_start_date AND p_end_date
          AND status != 'Cancelled'
        GROUP BY ref_date
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
    LEFT JOIN imports_agg i ON i.ref_date = ds.d
    LEFT JOIN customs_agg c ON c.ref_date = ds.d
    ORDER BY ds.d;
END;
$$;
