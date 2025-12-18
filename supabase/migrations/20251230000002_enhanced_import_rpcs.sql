-- Enhanced RPCs to support detailed verification stats

-- 1. Get Company Integrity Stats
-- Used to verify that all records for a company share the same creation timestamp batch (proof of clean slate)
CREATE OR REPLACE FUNCTION get_company_integrity_stats(
  p_company_id UUID,
  p_table_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_sum_value NUMERIC;
  v_min_created TIMESTAMP WITH TIME ZONE;
  v_max_created TIMESTAMP WITH TIME ZONE;
  v_distinct_batches INTEGER;
BEGIN
  IF p_table_name = 'receivables' THEN
    SELECT 
      count(*), 
      COALESCE(sum(updated_value), 0), 
      min(created_at), 
      max(created_at),
      count(DISTINCT date_trunc('second', created_at))
    INTO v_count, v_sum_value, v_min_created, v_max_created, v_distinct_batches
    FROM receivables 
    WHERE company_id = p_company_id;
  ELSIF p_table_name = 'payables' THEN
    SELECT 
      count(*), 
      COALESCE(sum(amount), 0), 
      min(created_at), 
      max(created_at),
      count(DISTINCT date_trunc('second', created_at))
    INTO v_count, v_sum_value, v_min_created, v_max_created, v_distinct_batches
    FROM transactions 
    WHERE company_id = p_company_id AND type = 'payable';
  ELSE
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  RETURN jsonb_build_object(
    'count', v_count,
    'total_value', v_sum_value,
    'min_created_at', v_min_created,
    'max_created_at', v_max_created,
    'distinct_batches', v_distinct_batches
  );
END;
$$;

-- 2. Audit Isolation Check
-- Groups records by minute to visualize import batches
CREATE OR REPLACE FUNCTION get_data_isolation_audit(
  p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receivables JSONB;
  v_payables JSONB;
BEGIN
  SELECT jsonb_agg(t) INTO v_receivables FROM (
    SELECT 
      date_trunc('minute', created_at) as batch_time,
      count(*) as count,
      sum(updated_value) as total_value
    FROM receivables
    WHERE company_id = p_company_id
    GROUP BY 1
    ORDER BY 1 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_payables FROM (
    SELECT 
      date_trunc('minute', created_at) as batch_time,
      count(*) as count,
      sum(amount) as total_value
    FROM transactions
    WHERE company_id = p_company_id AND type = 'payable'
    GROUP BY 1
    ORDER BY 1 DESC
  ) t;

  RETURN jsonb_build_object(
    'receivables', COALESCE(v_receivables, '[]'::jsonb),
    'payables', COALESCE(v_payables, '[]'::jsonb)
  );
END;
$$;

