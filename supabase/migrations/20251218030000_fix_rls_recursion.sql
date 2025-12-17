-- Migration to fix infinite recursion in user_profiles RLS policies

-- 1. Create is_admin function (Security Definer to bypass RLS)
-- This function allows secure checking of admin status without triggering infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
  SELECT 1
  FROM public.user_profiles
  WHERE id = auth.uid()
  AND profile = 'Administrator'
);
$$;

-- 2. Drop existing policies on user_profiles that might cause recursion
-- Removing policies that reference user_profiles directly or indirectly in a way that causes loops
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- 3. Enable RLS (ensure it is enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create new specific policies for user_profiles
-- Select own profile: Allow users to view only their own profile
CREATE POLICY "select own profile"
ON public.user_profiles
FOR SELECT
USING (id = auth.uid());

-- Update own profile: Allow users to update only their own profile
CREATE POLICY "update own profile"
ON public.user_profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Insert own profile: Allow users to insert only their own profile (e.g. during signup/first login)
CREATE POLICY "insert own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (id = auth.uid());
