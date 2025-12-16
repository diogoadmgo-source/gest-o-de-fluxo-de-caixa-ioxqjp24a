-- Create Enum Types
CREATE TYPE user_status AS ENUM ('Pending', 'Active', 'Inactive', 'Blocked');
CREATE TYPE user_role AS ENUM ('Administrator', 'User');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile user_role NOT NULL DEFAULT 'User',
  status user_status NOT NULL DEFAULT 'Pending',
  last_access TIMESTAMP WITH TIME ZONE,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
-- Admins can view and edit all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
    )
  );

CREATE POLICY "Admins can insert profiles" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
    )
  );

CREATE POLICY "Admins can update profiles" ON public.user_profiles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
    )
  );

CREATE POLICY "Admins can delete profiles" ON public.user_profiles
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
    )
  );

-- Users can view and edit their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  user_id UUID REFERENCES public.user_profiles(id),
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit_logs
-- Admins can view logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
    )
  );

-- All authenticated users can insert logs (for their actions)
CREATE POLICY "Users can insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to handle new user creation from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, profile, status, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'profile')::user_role, 'User'),
    COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'Pending'),
    (NEW.raw_user_meta_data->>'company_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update user_profile on auth update (e.g. email change)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    email = NEW.email,
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user update
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

