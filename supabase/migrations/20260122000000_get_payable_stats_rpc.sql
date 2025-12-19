CREATE OR REPLACE FUNCTION get_payable_stats(
  p_company_id uuid,
  p_search text DEFAULT NULL,
  p_supplier text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_date_range_start date DEFAULT NULL,
  p_date_range_end date DEFAULT NULL,
  p_min_value numeric DEFAULT NULL,
  p_max_value numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  WITH filtered_payables AS (
    SELECT *
    FROM transactions t
    WHERE t.company_id = p_company_id
      AND t.type = 'payable'
      AND (p_search IS NULL OR p_search = '' OR (t.document_number ILIKE '%' || p_search || '%' OR t.entity_name ILIKE '%' || p_search || '%'))
      AND (p_supplier IS NULL OR p_supplier = '' OR t.entity_name ILIKE '%' || p_supplier || '%')
      AND (
        p_status IS NULL OR p_status = 'all' OR
        (p_status = 'overdue' AND t.status = 'pending' AND t.due_date < CURRENT_DATE) OR
        (p_status = 'due_today' AND t.due_date = CURRENT_DATE) OR
        (p_status = 'upcoming' AND t.status = 'pending' AND t.due_date >= CURRENT_DATE) OR
        (p_status NOT IN ('all', 'overdue', 'due_today', 'upcoming') AND t.status = p_status)
      )
      AND (p_date_range_start IS NULL OR t.due_date >= p_date_range_start)
      AND (p_date_range_end IS NULL OR t.due_date <= p_date_range_end)
      AND (p_min_value IS NULL OR t.amount >= p_min_value)
      AND (p_max_value IS NULL OR t.amount <= p_max_value)
  ),
  stats AS (
    SELECT
      COUNT(*) as total_count,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as total_to_pay,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE), 0) as overdue,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + 7), 0) as due_in_7_days,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + 30), 0) as due_in_30_days
    FROM filtered_payables
  ),
  next_maturity AS (
    SELECT due_date, SUM(amount) as val
    FROM filtered_payables
    WHERE status = 'pending' AND due_date >= CURRENT_DATE
    GROUP BY due_date
    ORDER BY due_date ASC
    LIMIT 1
  )
  SELECT json_build_object(
    'total_count', (SELECT total_count FROM stats),
    'total_to_pay', (SELECT total_to_pay FROM stats),
    'overdue', (SELECT overdue FROM stats),
    'due_in_7_days', (SELECT due_in_7_days FROM stats),
    'due_in_30_days', (SELECT due_in_30_days FROM stats),
    'next_maturity_date', (SELECT due_date FROM next_maturity),
    'next_maturity_value', COALESCE((SELECT val FROM next_maturity), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
