-- Function to ensure company exists and link to user safely
CREATE OR REPLACE FUNCTION ensure_company_and_link_user(
  p_user_id UUID,
  p_company_name TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_clean_name TEXT;
BEGIN
  v_clean_name := TRIM(p_company_name);
  
  -- Check if input is a valid UUID (assuming it might be an ID passed as name)
  IF v_clean_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_company_id FROM companies WHERE id = v_clean_name::UUID;
    
    -- If UUID provided but not found, we raise error as we can't "create" a specific UUID easily 
    -- or implies logic error in caller
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID % not found', v_clean_name;
    END IF;
  ELSE
    -- It is a name. Attempt to find by name (case insensitive for user friendliness)
    SELECT id INTO v_company_id FROM companies WHERE name ILIKE v_clean_name LIMIT 1;
    
    IF v_company_id IS NULL THEN
      -- Insert new company
      INSERT INTO companies (name, origin)
      VALUES (v_clean_name, 'Import/Manual')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name -- No-op to support RETURNING in case of race condition
      RETURNING id INTO v_company_id;
      
      -- Fallback if RETURNING didn't yield (rare driver/pg version specific race conditions)
      IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM companies WHERE name = v_clean_name;
      END IF;
    END IF;
  END IF;

  -- Ensure User-Company Link exists
  IF v_company_id IS NOT NULL THEN
    INSERT INTO user_companies (user_id, company_id)
    VALUES (p_user_id, v_company_id)
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;

  RETURN v_company_id;
END;
$$;
