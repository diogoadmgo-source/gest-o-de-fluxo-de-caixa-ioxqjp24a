-- Create payables table as per acceptance criteria
CREATE TABLE IF NOT EXISTS public.payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    issue_date DATE,
    due_date DATE,
    payment_prediction DATE,
    principal_value NUMERIC(15, 2) DEFAULT 0,
    fine NUMERIC(15, 2) DEFAULT 0,
    interest NUMERIC(15, 2) DEFAULT 0,
    title_status TEXT DEFAULT 'Aberto',
    description TEXT,
    supplier_cnpj TEXT,
    supplier_name TEXT,
    nf TEXT
);

-- Enable RLS
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

-- Create policies for payables (matching receivables/transactions patterns)
CREATE POLICY "Authenticated users can view payables" ON public.payables
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert payables" ON public.payables
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update payables" ON public.payables
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete payables" ON public.payables
    FOR DELETE
    USING (auth.role() = 'authenticated');
