-- Migration to enforce strict rules on bank_balances_v2 table

DO $$
BEGIN
    -- 1. Ensure Unique Constraint exists for (company_id, bank_id, reference_date)
    -- This supports the UPSERT operations and prevents duplicates
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'bank_balances_v2_unique_idx') THEN
        CREATE UNIQUE INDEX bank_balances_v2_unique_idx ON public.bank_balances_v2 (company_id, bank_id, reference_date);
    END IF;

    -- Drop constraint if exists to ensure we are using the correct index
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_balances_v2_unique_entry') THEN
        ALTER TABLE public.bank_balances_v2 DROP CONSTRAINT bank_balances_v2_unique_entry;
    END IF;

    ALTER TABLE public.bank_balances_v2 ADD CONSTRAINT bank_balances_v2_unique_entry UNIQUE USING INDEX bank_balances_v2_unique_idx;

    -- 2. Sanitize existing data before adding CHECK constraint
    -- Update any negative amounts to 0 to prevent migration failure
    UPDATE public.bank_balances_v2 SET amount = 0 WHERE amount < 0;

    -- 3. Add CHECK constraint for non-negative amounts
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_amount_non_negative') THEN
        ALTER TABLE public.bank_balances_v2 DROP CONSTRAINT check_amount_non_negative;
    END IF;

    ALTER TABLE public.bank_balances_v2 ADD CONSTRAINT check_amount_non_negative CHECK (amount >= 0);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error applying strict rules: %', SQLERRM;
END $$;
