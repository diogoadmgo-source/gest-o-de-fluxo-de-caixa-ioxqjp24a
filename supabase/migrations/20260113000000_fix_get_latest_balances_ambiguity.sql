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
        b.id AS bank_id,
        COALESCE(bb.amount, 0) AS balance,
        COALESCE(bb.reference_date, CURRENT_DATE) AS reference_date,
        b.name AS bank_name,
        COALESCE(b.account_number, '') AS account_number,
        COALESCE(b.type, 'bank') AS bank_type
    FROM banks b
    LEFT JOIN LATERAL (
        SELECT 
            tbl_bal.amount, 
            tbl_bal.reference_date
        FROM bank_balances tbl_bal
        WHERE tbl_bal.bank_id = b.id
        ORDER BY tbl_bal.reference_date DESC
        LIMIT 1
    ) bb ON true
    WHERE b.company_id = p_company_id
      AND b.active = true;
END;
$$;
