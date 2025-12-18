-- Update strict_replace_payables to return inserted amount for integrity checks
CREATE OR REPLACE FUNCTION strict_replace_payables(
  p_company_id UUID,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
  v_inserted INTEGER;
  v_inserted_amount NUMERIC;
BEGIN
  -- 1. Delete existing payable transactions for the company
  DELETE FROM transactions 
  WHERE company_id = p_company_id 
    AND type = 'payable';
    
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- 2. Insert new records
  WITH inserted_rows AS (
    INSERT INTO transactions (
      company_id,
      type,
      entity_name,
      document_number,
      issue_date,
      due_date,
      principal_value,
      fine,
      interest,
      amount,
      status,
      category,
      description,
      created_at
    )
    SELECT
      p_company_id,
      'payable',
      x.entity_name,
      x.document_number,
      COALESCE((x.issue_date)::date, CURRENT_DATE),
      (x.due_date)::date,
      COALESCE((x.principal_value)::numeric, 0),
      COALESCE((x.fine)::numeric, 0),
      COALESCE((x.interest)::numeric, 0),
      COALESCE((x.amount)::numeric, 0),
      x.status,
      COALESCE(x.category, 'Geral'),
      COALESCE(x.description, 'Importado via Planilha'),
      now()
    FROM jsonb_to_recordset(p_rows) AS x(
      entity_name text,
      document_number text,
      issue_date text,
      due_date text,
      principal_value numeric,
      fine numeric,
      interest numeric,
      amount numeric,
      status text,
      category text,
      description text
    )
    RETURNING amount
  )
  SELECT count(*), COALESCE(sum(amount), 0) INTO v_inserted, v_inserted_amount FROM inserted_rows;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted,
    'inserted', v_inserted,
    'inserted_amount', v_inserted_amount
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Update strict_replace_receivables to return inserted amount for integrity checks
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
  v_inserted_amount NUMERIC;
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

  -- 4. Batch Insertion
  WITH inserted_rows AS (
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
      x.invoice_number,
      x.order_number,
      x.customer,
      x.customer_doc,
      (x.issue_date)::date,
      (x.due_date)::date,
      (x.payment_prediction)::date,
      (x.principal_value)::numeric,
      (x.fine)::numeric,
      (x.interest)::numeric,
      (x.updated_value)::numeric,
      x.title_status,
      x.seller,
      x.customer_code,
      x.uf,
      x.regional,
      x.installment,
      (x.days_overdue)::integer,
      x.utilization,
      x.negativado,
      x.description,
      x.customer_name,
      x.new_status,
      now()
    FROM jsonb_to_recordset(p_rows) AS x(
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
    RETURNING updated_value
  )
  SELECT count(*), COALESCE(sum(updated_value), 0) INTO v_inserted, v_inserted_amount FROM inserted_rows;

  -- 5. Return success with detailed stats
  RETURN jsonb_build_object(
    'success', true,
    'stats', jsonb_build_object(
      'count_before', v_count_before,
      'total_before', v_total_before,
      'deleted', v_deleted,
      'remaining', v_count_after,
      'inserted', v_inserted,
      'inserted_amount', v_inserted_amount
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Catch any error (including our RAISE EXCEPTION) and return structured error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
