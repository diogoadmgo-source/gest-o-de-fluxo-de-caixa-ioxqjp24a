CREATE TABLE IF NOT EXISTS public.financial_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    user_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view adjustments" ON public.financial_adjustments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert adjustments" ON public.financial_adjustments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update adjustments" ON public.financial_adjustments
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete adjustments" ON public.financial_adjustments
    FOR DELETE USING (true);
