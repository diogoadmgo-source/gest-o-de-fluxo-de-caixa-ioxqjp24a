-- Migration to ensure accurate KPI statistics for Receivables Dashboard (v0.77 restoration)
-- Replaces previous logic to ensure full table scan for sums without limits

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
    -- 1. Total Open (All time future + past open)
    -- Using updated_value to reflect interest/fines
    SELECT
        COALESCE(SUM(updated_value), 0),
        COUNT(*)
    INTO
        v_total_open,
        v_count_open
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto';

    -- 2. Total Overdue (Open AND due_date < today)
    -- Strict comparison for past due
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

    -- 3. Total Received (Liquidado with issue_date in current month)
    -- Using principal_value as that's usually what is reconciled, or updated_value if available
    SELECT
        COALESCE(SUM(COALESCE(updated_value, principal_value)), 0)
    INTO
        v_total_received_month
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Liquidado'
      AND issue_date >= v_start_of_month;

    -- Return JSONB with all keys required by the frontend
    RETURN jsonb_build_object(
        'total_open', v_total_open,
        'count_open', v_count_open,
        'total_overdue', v_total_overdue,
        'count_overdue', v_count_overdue,
        'received_month', v_total_received_month
    );
END;
$$;
