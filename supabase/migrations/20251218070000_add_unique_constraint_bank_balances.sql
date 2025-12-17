-- Ensure unique constraint for atomic upserts on bank_balances
-- We want one balance record per bank per day per company

DO $$
BEGIN
    -- Drop existing constraint if it exists (handling potential naming variations)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_balances_unique_entry') THEN
        ALTER TABLE public.bank_balances DROP CONSTRAINT bank_balances_unique_entry;
    END IF;

    -- Create unique index if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'bank_balances_unique_idx') THEN
        CREATE UNIQUE INDEX bank_balances_unique_idx ON public.bank_balances (company_id, bank_id, reference_date);
    END IF;

    -- Add constraint using the index
    ALTER TABLE public.bank_balances ADD CONSTRAINT bank_balances_unique_entry UNIQUE USING INDEX bank_balances_unique_idx;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating constraint: %', SQLERRM;
END $$;
