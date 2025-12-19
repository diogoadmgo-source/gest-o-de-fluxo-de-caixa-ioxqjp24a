-- Add new columns to product_imports table to match the requirements
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS line TEXT;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS situation TEXT;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS nf_number TEXT;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS clearance_forecast_date DATE;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS estimate_without_tax NUMERIC DEFAULT 0;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS icms_tax NUMERIC DEFAULT 0;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS final_clearance_estimate NUMERIC DEFAULT 0;
ALTER TABLE product_imports ADD COLUMN IF NOT EXISTS clearance_status TEXT;

-- Create function for KPI stats
CREATE OR REPLACE FUNCTION get_product_import_stats(
  p_company_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  total_balance NUMERIC,
  total_estimate NUMERIC,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pi.clearance_status, 'Não Definido') as status,
    SUM(COALESCE(pi.balance, 0)) as total_balance,
    SUM(COALESCE(pi.final_clearance_estimate, 0)) as total_estimate,
    COUNT(*) as count
  FROM product_imports pi
  WHERE pi.company_id = p_company_id
    AND (p_start_date IS NULL OR pi.due_date >= p_start_date)
    AND (p_end_date IS NULL OR pi.due_date <= p_end_date)
  GROUP BY pi.clearance_status;
END;
$$ LANGUAGE plpgsql;
