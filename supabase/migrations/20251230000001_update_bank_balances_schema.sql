-- Update bank_balances table to match enhanced requirements
-- Columns to ensure: bank_id, reference_date, amount
-- Constraint: unique (company_id, bank_id, reference_date)

-- 1. Ensure columns exist
ALTER TABLE public.bank_balances ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id);
ALTER TABLE public.bank_balances ADD COLUMN IF NOT EXISTS reference_date DATE;
ALTER TABLE public.bank_balances ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2);

-- 2. Ensure non-null constraints where appropriate (optional based on existing data, but good practice for new structure)
-- We use DO block to avoid errors if data violates it initially, but ideally this should be enforced.
-- For now, we leave them nullable if they were, or you can UPDATE existing rows first.

-- 3. Create Unique Index if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'bank_balances_uk') THEN
        CREATE UNIQUE INDEX bank_balances_uk ON public.bank_balances (company_id, bank_id, reference_date);
    END IF;
END $$;

-- 4. Add Constraint using the index (Safe operation)
DO $$
BEGIN
    -- Drop potential conflicting constraints if needed or just add if missing
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_balances_uk_constraint') THEN
         ALTER TABLE public.bank_balances ADD CONSTRAINT bank_balances_uk_constraint UNIQUE USING INDEX bank_balances_uk;
    END IF;
END $$;

-- 5. Add Check Constraint for non-negative amount (as per general financial logic usually, unless overdraft is allowed. AC didn't specify strict non-negative but User Story implies accuracy)
-- The UI code checks for negative. Let's enforce it in DB too if not present.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_amount_non_negative') THEN
         ALTER TABLE public.bank_balances ADD CONSTRAINT check_amount_non_negative CHECK (amount >= 0);
    END IF;
END $$;
