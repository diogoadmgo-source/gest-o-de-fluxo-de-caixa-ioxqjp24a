CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- Admins can manage user_companies
CREATE POLICY "Admins can manage user_companies" ON public.user_companies
  USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
    )
  );

-- Users can view their own companies
CREATE POLICY "Users can view own companies" ON public.user_companies
  FOR SELECT
  USING (auth.uid() = user_id);
