CREATE OR REPLACE FUNCTION get_product_import_financial_totals(
  p_company_ids uuid[],
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_search_term text DEFAULT NULL
)
RETURNS TABLE (
  total_balance numeric,
  total_estimate_without_tax numeric,
  total_icms_tax numeric,
  total_final_estimate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(pi.balance), 0) as total_balance,
    COALESCE(SUM(pi.estimate_without_tax), 0) as total_estimate_without_tax,
    COALESCE(SUM(pi.icms_tax), 0) as total_icms_tax,
    COALESCE(SUM(pi.final_clearance_estimate), 0) as total_final_estimate
  FROM product_imports pi
  WHERE pi.company_id = ANY(p_company_ids)
  AND (p_start_date IS NULL OR pi.due_date >= p_start_date)
  AND (p_end_date IS NULL OR pi.due_date <= p_end_date)
  AND (
    p_search_term IS NULL OR p_search_term = '' OR
    pi.process_number ILIKE '%' || p_search_term || '%' OR
    pi.nf_number ILIKE '%' || p_search_term || '%' OR
    pi.international_supplier ILIKE '%' || p_search_term || '%'
  );
END;
$$;
