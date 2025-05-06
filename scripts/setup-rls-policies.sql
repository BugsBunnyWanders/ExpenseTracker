-- RLS Policy Setup Script for ExpenseTracker
-- Run this script in your Supabase SQL Editor to fix table access issues

-- First, let's make sure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Define policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Define policies for groups table
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
CREATE POLICY "Users can view groups they belong to"
  ON public.groups
  FOR SELECT
  USING (members @> ARRAY[auth.uid()::text] OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can insert groups" ON public.groups;
CREATE POLICY "Users can insert groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update groups they created" ON public.groups;
CREATE POLICY "Users can update groups they created"
  ON public.groups
  FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete groups they created" ON public.groups;
CREATE POLICY "Users can delete groups they created"
  ON public.groups
  FOR DELETE
  USING (auth.uid() = created_by);

-- Define policies for expenses table
DROP POLICY IF EXISTS "Users can view expenses they are involved in" ON public.expenses;
CREATE POLICY "Users can view expenses they are involved in"
  ON public.expenses
  FOR SELECT
  USING (
    paid_by = auth.uid() 
    OR (
      group_id IN (
        SELECT id FROM public.groups 
        WHERE members @> ARRAY[auth.uid()::text]
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert expenses" ON public.expenses;
CREATE POLICY "Users can insert expenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid() = paid_by);

DROP POLICY IF EXISTS "Users can update expenses they created" ON public.expenses;
CREATE POLICY "Users can update expenses they created"
  ON public.expenses
  FOR UPDATE
  USING (auth.uid() = paid_by);

DROP POLICY IF EXISTS "Users can delete expenses they created" ON public.expenses;
CREATE POLICY "Users can delete expenses they created"
  ON public.expenses
  FOR DELETE
  USING (auth.uid() = paid_by);

-- Define policies for settlements table
DROP POLICY IF EXISTS "Users can view settlements they are involved in" ON public.settlements;
CREATE POLICY "Users can view settlements they are involved in"
  ON public.settlements
  FOR SELECT
  USING (payer = auth.uid() OR receiver = auth.uid());

DROP POLICY IF EXISTS "Users can insert settlements" ON public.settlements;
CREATE POLICY "Users can insert settlements"
  ON public.settlements
  FOR INSERT
  WITH CHECK (payer = auth.uid() OR receiver = auth.uid());

DROP POLICY IF EXISTS "Users can update their own settlements" ON public.settlements;
CREATE POLICY "Users can update their own settlements"
  ON public.settlements
  FOR UPDATE
  USING (payer = auth.uid() OR receiver = auth.uid());

-- Add a function to check if RLS policies are properly set up
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE (
  table_name text,
  policy_name text,
  operation text,
  using_expr text,
  with_check_expr text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.relname,
    p.polname,
    CASE 
      WHEN p.polpermissive THEN 'PERMISSIVE'::text
      ELSE 'RESTRICTIVE'::text
    END,
    pg_get_expr(p.polqual, p.polrelid),
    pg_get_expr(p.polwithcheck, p.polrelid)
  FROM 
    pg_policy p
    JOIN pg_class pc ON pc.oid = p.polrelid
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace
  WHERE pn.nspname = 'public'
  ORDER BY table_name, policy_name;
END;
$$ LANGUAGE plpgsql; 