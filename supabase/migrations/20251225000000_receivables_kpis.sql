-- Migration to add KPI statistics function for Receivables Dashboard

CREATE OR REPLACE FUNCTION get_receivables_dashboard_stats(
    p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_open NUMERIC;
    v_total_overdue NUMERIC;
    v_count_open INTEGER;
    v_count_overdue INTEGER;
    v_total_received_month NUMERIC;
    v_today DATE := CURRENT_DATE;
    v_start_of_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
    -- Total Open (All time future + past open)
    SELECT
        COALESCE(SUM(updated_value), 0),
        COUNT(*)
    INTO
        v_total_open,
        v_count_open
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto';

    -- Total Overdue (Open AND due_date < today)
    SELECT
        COALESCE(SUM(updated_value), 0),
        COUNT(*)
    INTO
        v_total_overdue,
        v_count_overdue
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < v_today;

    -- Total Received (Liquidado with issue_date in current month as a proxy for recent activity)
    SELECT
        COALESCE(SUM(principal_value), 0)
    INTO
        v_total_received_month
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Liquidado'
      AND issue_date >= v_start_of_month;

    RETURN jsonb_build_object(
        'total_open', v_total_open,
        'count_open', v_count_open,
        'total_overdue', v_total_overdue,
        'count_overdue', v_count_overdue,
        'received_month', v_total_received_month
    );
END;
$$;
