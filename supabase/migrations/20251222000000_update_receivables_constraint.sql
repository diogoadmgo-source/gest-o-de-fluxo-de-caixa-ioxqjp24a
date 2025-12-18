-- Drop the existing strict constraint that prevented same-installment duplicates with different values
ALTER TABLE public.receivables DROP CONSTRAINT IF EXISTS receivables_unique_import;

-- Ensure principal_value is not null before adding it to constraint (though logic handles it)
UPDATE public.receivables SET principal_value = 0 WHERE principal_value IS NULL;

-- Add new composite unique constraint including principal_value
-- This allows multiple records with same Invoice+Installment if the Value differs
ALTER TABLE public.receivables
ADD CONSTRAINT receivables_unique_import_v2
UNIQUE (company_id, invoice_number, order_number, installment, principal_value);
