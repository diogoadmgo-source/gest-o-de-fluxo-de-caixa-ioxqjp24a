-- Function to replace payables (transactions of type 'payable') for a company atomically
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
