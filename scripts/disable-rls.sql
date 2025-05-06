-- Disable RLS Policy Script for ExpenseTracker
-- IMPORTANT: This script disables Row Level Security completely
-- Only use this for testing or in cases where you don't need security

-- Disable RLS on all tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;

-- Grant all privileges to authenticated users
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.groups TO authenticated;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.settlements TO authenticated;

-- Grant select privileges to anonymous users
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.groups TO anon;
GRANT SELECT ON TABLE public.expenses TO anon;
GRANT SELECT ON TABLE public.settlements TO anon;

-- Add a function to verify RLS status
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text as table_name,
    c.relrowsecurity as rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('profiles', 'groups', 'expenses', 'settlements')
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- Grant execute privileges on the check function
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO authenticated, anon; 