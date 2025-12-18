CREATE OR REPLACE FUNCTION append_payables_skipping_duplicates(
  p_company_id UUID,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_skipped INTEGER := 0;
  v_total INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM jsonb_to_recordset(p_rows) AS x(
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
  LOOP
    v_total := v_total + 1;

    -- Check for duplicates based on business keys + principal value
    IF EXISTS (
      SELECT 1 FROM transactions
      WHERE company_id = p_company_id
        AND type = 'payable'
        AND document_number = r.document_number
        AND entity_name = r.entity_name
        AND due_date = (r.due_date)::date
        AND principal_value = (r.principal_value)::numeric
    ) THEN
      v_skipped := v_skipped + 1;
    ELSE
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
      ) VALUES (
        p_company_id,
        'payable',
        r.entity_name,
        r.document_number,
        COALESCE((r.issue_date)::date, CURRENT_DATE),
        (r.due_date)::date,
        COALESCE((r.principal_value)::numeric, 0),
        COALESCE((r.fine)::numeric, 0),
        COALESCE((r.interest)::numeric, 0),
        COALESCE((r.amount)::numeric, 0),
        r.status,
        COALESCE(r.category, 'Geral'),
        COALESCE(r.description, 'Importado via Planilha'),
        now()
      );
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'skipped', v_skipped,
    'total', v_total
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
