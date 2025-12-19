CREATE OR REPLACE FUNCTION get_latest_balances(p_company_id UUID)
RETURNS TABLE (
    bank_id UUID,
    balance NUMERIC,
    reference_date DATE,
    bank_name TEXT,
    account_number TEXT,
    bank_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bank_id,
        COALESCE(bb.amount, 0) as balance,
        COALESCE(bb.reference_date, CURRENT_DATE) as reference_date,
        b.name as bank_name,
        COALESCE(b.account_number, '') as account_number,
        COALESCE(b.type, 'bank') as bank_type
    FROM banks b
    LEFT JOIN LATERAL (
        SELECT amount, reference_date
        FROM bank_balances
        WHERE bank_id = b.id
        ORDER BY reference_date DESC
        LIMIT 1
    ) bb ON true
    WHERE b.company_id = p_company_id
      AND b.active = true;
END;
$$;
