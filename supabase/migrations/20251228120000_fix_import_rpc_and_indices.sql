-- 1. Optimize Indices for Performance
-- Receivables Indices
CREATE INDEX IF NOT EXISTS idx_receivables_company_status_due 
ON public.receivables(company_id, title_status, due_date);

CREATE INDEX IF NOT EXISTS idx_receivables_invoice_search
ON public.receivables(company_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_receivables_customer_search
ON public.receivables(company_id, customer);

CREATE INDEX IF NOT EXISTS idx_receivables_order_search
ON public.receivables(company_id, order_number);

CREATE INDEX IF NOT EXISTS idx_receivables_created_at
ON public.receivables(created_at);

-- Payables (Transactions) Indices
CREATE INDEX IF NOT EXISTS idx_transactions_company_type_status
ON public.transactions(company_id, type, status);

CREATE INDEX IF NOT EXISTS idx_transactions_due_date_sort
ON public.transactions(company_id, due_date);

CREATE INDEX IF NOT EXISTS idx_transactions_entity_search
ON public.transactions(company_id, entity_name);

CREATE INDEX IF NOT EXISTS idx_transactions_document_search
ON public.transactions(company_id, document_number);

-- Performance Logs Indices
CREATE INDEX IF NOT EXISTS idx_performance_logs_route_action
ON public.performance_logs(route, action);


-- 2. Improved RPC for Strict Import with Deduplication
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
  v_deleted INTEGER;
  v_inserted INTEGER;
  v_skipped INTEGER;
BEGIN
  -- Get stats before deletion
  SELECT count(*) INTO v_count_before FROM receivables WHERE company_id = p_company_id;

  -- Atomic Deletion for the specific company
  DELETE FROM receivables WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Insert with robust deduplication
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
    -- Explicitly deduplicate on the columns that form the unique constraint
    -- Constraint: (company_id, invoice_number, order_number, installment, principal_value)
    SELECT DISTINCT ON (invoice_number, order_number, installment, principal_value)
      *
    FROM input_rows
    -- Order by ensures deterministic selection if needed, though usually arbitrary for identical keys
    ORDER BY invoice_number, order_number, installment, principal_value
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
      CASE WHEN issue_date = '' THEN NULL ELSE (issue_date)::date END,
      CASE WHEN due_date = '' THEN NULL ELSE (due_date)::date END,
      CASE WHEN payment_prediction = '' THEN NULL ELSE (payment_prediction)::date END,
      COALESCE((principal_value)::numeric, 0),
      COALESCE((fine)::numeric, 0),
      COALESCE((interest)::numeric, 0),
      COALESCE((updated_value)::numeric, 0),
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
    -- Final safety net against race conditions or elusive duplicates
    ON CONFLICT (company_id, invoice_number, order_number, installment, principal_value) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM inserted_rows;

  -- Calculate skipped count (approximate based on JSON array length)
  v_skipped := jsonb_array_length(p_rows) - v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'stats', jsonb_build_object(
      'count_before', v_count_before,
      'deleted', v_deleted,
      'inserted', v_inserted,
      'skipped', v_skipped
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
