-- Update banks table with new columns
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'bank';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS agency TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS account_digit TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add unique constraint for code per company to prevent duplicates
-- We use a conditional block to avoid errors if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'banks_company_id_code_key'
    ) THEN
        ALTER TABLE public.banks ADD CONSTRAINT banks_company_id_code_key UNIQUE (company_id, code);
    END IF;
END $$;

-- Create import_logs table
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id),
    filename TEXT NOT NULL,
    status TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_details JSONB
);

-- Enable RLS for import_logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Policies for import_logs
CREATE POLICY "Users can view own import logs" ON public.import_logs
    FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE profile = 'Administrator'));

CREATE POLICY "Users can insert own import logs" ON public.import_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
