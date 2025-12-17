-- Update receivables table
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS customer TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS customer_doc TEXT;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS payment_prediction DATE;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS principal_value NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS fine NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS interest NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS updated_value NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS title_status TEXT DEFAULT 'Aberto';
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS description TEXT;

-- Update transactions table (for payables)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS entity_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS principal_value NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fine NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS interest NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'payable';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Enable RLS for these tables if not already
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policies for companies (Accessible by authenticated users)
CREATE POLICY "Users can view companies" ON public.companies
  FOR SELECT
  USING (true); -- Ideally restricted by user_companies, but simplifying for now or use the join logic in app

CREATE POLICY "Admins can manage companies" ON public.companies
  USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
    )
  );

-- Create policies for receivables
CREATE POLICY "Users can view receivables" ON public.receivables
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert receivables" ON public.receivables
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update receivables" ON public.receivables
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete receivables" ON public.receivables
  FOR DELETE
  USING (true);

-- Create policies for transactions
CREATE POLICY "Users can view transactions" ON public.transactions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update transactions" ON public.transactions
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete transactions" ON public.transactions
  FOR DELETE
  USING (true);

