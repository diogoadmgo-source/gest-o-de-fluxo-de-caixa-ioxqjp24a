-- Migration to enforce company association and clean up orphan data

-- 1. Clean up existing data with NULL company_id to allow NOT NULL constraints
DELETE FROM public.receivables WHERE company_id IS NULL;
DELETE FROM public.transactions WHERE company_id IS NULL;
DELETE FROM public.banks WHERE company_id IS NULL;
DELETE FROM public.bank_balances WHERE company_id IS NULL;
DELETE FROM public.financial_adjustments WHERE company_id IS NULL;

-- 2. Enforce NOT NULL on company_id for financial tables
ALTER TABLE public.receivables ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.banks ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.bank_balances ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.financial_adjustments ALTER COLUMN company_id SET NOT NULL;

-- 3. Update import_logs table
-- First, delete existing logs as we cannot determine their company_id reliably and we need to enforce NOT NULL
DELETE FROM public.import_logs;

-- Add company_id column
ALTER TABLE public.import_logs ADD COLUMN company_id UUID NOT NULL;

-- Add Foreign Key constraint
ALTER TABLE public.import_logs
    ADD CONSTRAINT import_logs_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id);

-- 4. Ensure Foreign Keys exist for other tables (idempotent checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receivables_company_id_fkey') THEN
        ALTER TABLE public.receivables ADD CONSTRAINT receivables_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_company_id_fkey') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'banks_company_id_fkey') THEN
        ALTER TABLE public.banks ADD CONSTRAINT banks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_balances_company_id_fkey') THEN
        ALTER TABLE public.bank_balances ADD CONSTRAINT bank_balances_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_adjustments_company_id_fkey') THEN
        ALTER TABLE public.financial_adjustments ADD CONSTRAINT financial_adjustments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;
END $$;
