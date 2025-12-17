-- Add deleted_count to import_logs
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS deleted_count INTEGER DEFAULT 0;

-- Function to replace receivables for a company atomically
CREATE OR REPLACE FUNCTION replace_receivables_for_company(
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
BEGIN
  -- 1. Delete existing records for the company
  DELETE FROM receivables WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- 2. Insert new records
  WITH inserted_rows AS (
    INSERT INTO receivables (
      company_id, invoice_number, order_number, customer, customer_doc,
      issue_date, due_date, payment_prediction, principal_value, fine,
      interest, updated_value, title_status, seller, customer_code,
      uf, regional, installment, days_overdue, utilization, negativado, description,
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
      description text
    )
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM inserted_rows;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted,
    'inserted', v_inserted
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
