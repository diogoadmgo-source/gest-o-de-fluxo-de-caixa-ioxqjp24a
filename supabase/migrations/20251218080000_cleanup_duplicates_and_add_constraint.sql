-- Standardize NULLs to empty strings for the composite key columns to ensure uniqueness works as expected
UPDATE public.receivables SET invoice_number = '' WHERE invoice_number IS NULL;
UPDATE public.receivables SET order_number = '' WHERE order_number IS NULL;
UPDATE public.receivables SET installment = '' WHERE installment IS NULL;

-- Remove duplicates, keeping the most recent record (by created_at, then id)
DELETE FROM public.receivables
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY company_id, invoice_number, order_number, installment 
                ORDER BY created_at DESC, id DESC
            ) as rn
        FROM public.receivables
    ) t
    WHERE t.rn > 1
);

-- Add the unique constraint to prevent future duplicates
-- Wrapped in a DO block to prevent errors if the constraint/index already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'receivables_unique_import'
        AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.receivables
        ADD CONSTRAINT receivables_unique_import 
        UNIQUE (company_id, invoice_number, order_number, installment);
    END IF;
END $$;
