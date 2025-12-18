CREATE OR REPLACE FUNCTION strict_replace_receivables(
  p_company_id UUID,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_before INTEGER;
  v_total_before NUMERIC;
  v_count_after INTEGER;
  v_deleted INTEGER;
  v_inserted INTEGER;
  v_skipped INTEGER;
BEGIN
  -- 1. Get stats before deletion for audit/verification
  SELECT count(*), COALESCE(sum(updated_value), 0)
  INTO v_count_before, v_total_before
  FROM receivables
  WHERE company_id = p_company_id;

  -- 2. Atomic Deletion
  DELETE FROM receivables WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- 3. Verification: Ensure table is clean for this company
  SELECT count(*) INTO v_count_after FROM receivables WHERE company_id = p_company_id;

  IF v_count_after > 0 THEN
    -- ABORT TRANSACTION
    RAISE EXCEPTION 'Validation Error: Deletion failed. % rows remaining for company %.', v_count_after, p_company_id;
  END IF;

  -- 4. Batch Insertion with Deduplication (Safety Net)
  WITH input_rows AS (
    SELECT * FROM jsonb_to_recordset(p_rows) AS x(
      invoice_number text,
      order_number text,
      customer text,
      customer_doc text,
      issue_date text,
      due_date text,
      payment_prediction text,
      principal_value numeric,
      fine numeric,
      interest numeric,
      updated_value numeric,
      title_status text,
      seller text,
      customer_code text,
      uf text,
      regional text,
      installment text,
      days_overdue numeric,
      utilization text,
      negativado text,
      description text,
      customer_name text,
      new_status text
    )
  ),
  distinct_rows AS (
    -- Deduplicate based on the unique constraint keys to prevent internal collisions
    SELECT DISTINCT ON (invoice_number, order_number, installment, principal_value)
      *
    FROM input_rows
  ),
  inserted_rows AS (
    INSERT INTO receivables (
      company_id, invoice_number, order_number, customer, customer_doc,
      issue_date, due_date, payment_prediction, principal_value, fine,
      interest, updated_value, title_status, seller, customer_code,
      uf, regional, installment, days_overdue, utilization, negativado, description,
      customer_name, new_status,
      created_at
    )
    SELECT
      p_company_id,
      invoice_number,
      order_number,
      customer,
      customer_doc,
      (issue_date)::date,
      (due_date)::date,
      (payment_prediction)::date,
      (principal_value)::numeric,
      (fine)::numeric,
      (interest)::numeric,
      (updated_value)::numeric,
      title_status,
      seller,
      customer_code,
      uf,
      regional,
      installment,
      (days_overdue)::integer,
      utilization,
      negativado,
      description,
      customer_name,
      new_status,
      now()
    FROM distinct_rows
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM inserted_rows;

  -- Calculate skipped records count (difference between input and inserted)
  v_skipped := jsonb_array_length(p_rows) - v_inserted;

  -- 5. Return success with detailed stats
  RETURN jsonb_build_object(
    'success', true,
    'stats', jsonb_build_object(
      'count_before', v_count_before,
      'total_before', v_total_before,
      'deleted', v_deleted,
      'remaining', v_count_after,
      'inserted', v_inserted,
      'skipped', v_skipped
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Catch any error (including unique violation if it still happens) and return structured error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
