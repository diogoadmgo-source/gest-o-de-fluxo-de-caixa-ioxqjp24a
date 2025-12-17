-- Add new columns to receivables table as per User Story
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS regional TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS seller TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS installment TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS days_overdue INTEGER;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS utilization TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS negativado TEXT;

-- Update RLS policies to ensure users can manage receivables for their companies
-- Note: Existing policies might cover this if they rely on company_id, 
-- but we ensure companies and user_companies are accessible for the importer logic.

-- Ensure Authenticated users can read companies (needed to check existence)
CREATE POLICY "Authenticated users can view companies" ON public.companies
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Ensure Authenticated users can insert companies (needed for auto-creation)
CREATE POLICY "Authenticated users can insert companies" ON public.companies
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Ensure Authenticated users can insert user_companies (needed for linking)
CREATE POLICY "Authenticated users can insert user_companies" ON public.user_companies
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Ensure Authenticated users can select user_companies (needed for checking links)
CREATE POLICY "Authenticated users can view user_companies" ON public.user_companies
    FOR SELECT
    USING (auth.role() = 'authenticated');

