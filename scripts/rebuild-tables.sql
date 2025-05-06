-- Rebuild Tables Script for ExpenseTracker
-- This script drops and recreates all tables with the proper schema

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS public.settlements;
DROP TABLE IF EXISTS public.expenses;
DROP TABLE IF EXISTS public.groups;
DROP TABLE IF EXISTS public.profiles;

-- Recreate profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  profile_picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recreate groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  members TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recreate expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  paid_by UUID REFERENCES auth.users(id),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  participants TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recreate settlements table
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL NOT NULL,
  payer UUID REFERENCES auth.users(id),
  receiver UUID REFERENCES auth.users(id),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable RLS for troubleshooting
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.groups TO authenticated;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.settlements TO authenticated;

-- Grant read access to anonymous users
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.groups TO anon;
GRANT SELECT ON TABLE public.expenses TO anon;
GRANT SELECT ON TABLE public.settlements TO anon;

-- Create trigger function to create a profile when a user is created
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create trigger to execute the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_user();

-- Create helper function to get table names
CREATE OR REPLACE FUNCTION public.get_table_names()
RETURNS TABLE (table_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name::text
  FROM information_schema.tables
  WHERE table_schema = 'public';
$$;
GRANT EXECUTE ON FUNCTION public.get_table_names() TO anon, authenticated;

-- Create function to check for RLS status
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE (table_name text, rls_enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text AS table_name,
    c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('profiles', 'groups', 'expenses', 'settlements')
  ORDER BY c.relname;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO anon, authenticated; 