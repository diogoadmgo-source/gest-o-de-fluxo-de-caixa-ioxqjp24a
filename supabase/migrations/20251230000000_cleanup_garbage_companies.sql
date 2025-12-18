-- Migration to cleanup garbage companies
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Iterate through companies matching garbage patterns
  FOR r IN 
    SELECT id, name FROM companies 
    WHERE (name ILIKE 'filtros aplicados:%' 
       OR name ILIKE 'total' 
       OR name ILIKE 'valor%' 
       OR name ILIKE 'intercompany%')
  LOOP
    -- Check if company has dependencies
    IF NOT EXISTS (SELECT 1 FROM receivables WHERE company_id = r.id) AND
       NOT EXISTS (SELECT 1 FROM transactions WHERE company_id = r.id) AND
       NOT EXISTS (SELECT 1 FROM banks WHERE company_id = r.id) AND
       NOT EXISTS (SELECT 1 FROM bank_balances WHERE company_id = r.id) 
    THEN
       -- Safe to delete
       DELETE FROM user_companies WHERE company_id = r.id;
       DELETE FROM companies WHERE id = r.id;
       RAISE NOTICE 'Deleted garbage company: %', r.name;
    ELSE
       RAISE NOTICE 'Skipped garbage company (has dependencies): %', r.name;
    END IF;
  END LOOP;
END $$;
