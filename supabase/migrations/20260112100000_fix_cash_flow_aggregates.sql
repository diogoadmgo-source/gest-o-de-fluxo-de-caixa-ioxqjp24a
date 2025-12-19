CREATE OR REPLACE FUNCTION get_cash_flow_aggregates(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    day DATE,
    total_receivables NUMERIC,
    total_payables NUMERIC
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
    )
    SELECT
        ds.d,
        COALESCE(r.total, 0) as total_receivables,
        COALESCE(p.total, 0) as total_payables
    FROM date_series ds
    LEFT JOIN receivables_agg r ON r.due_date = ds.d
    LEFT JOIN payables_agg p ON p.due_date = ds.d
    ORDER BY ds.d;
END;
$$;
