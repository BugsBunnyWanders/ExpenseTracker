/**
 * This script is for reference only and would be executed directly in the Supabase SQL editor.
 * It defines the database schema and RLS policies needed for the ExpenseTracker app.
 */

/*
 * Utility functions
 */

-- Function to get table names (used by the app to check table existence)
CREATE OR REPLACE FUNCTION public.get_table_names()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT tablename::text as table_name
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public';
$$;

-- Grant access to the get_table_names function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_table_names() TO anon, authenticated;

/*
 * Profiles table - stores user profile information
 */
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile_picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Only authenticated users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

/*
 * Groups table - stores group information
 */
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  members UUID[] NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Users can view groups they are members of
CREATE POLICY "Users can view their groups" 
ON public.groups FOR SELECT USING (auth.uid() = ANY(members));

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" 
ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update groups they created
CREATE POLICY "Users can update groups they created" 
ON public.groups FOR UPDATE USING (auth.uid() = created_by);

-- Only the creator can delete a group
CREATE POLICY "Only creators can delete groups" 
ON public.groups FOR DELETE USING (auth.uid() = created_by);

/*
 * Expenses table - stores expense information
 */
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  paid_by UUID NOT NULL REFERENCES auth.users,
  category JSONB,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_personal BOOLEAN DEFAULT false,
  group_id UUID REFERENCES public.groups,
  split_type TEXT DEFAULT 'equal',
  splits JSONB,
  notes TEXT,
  attachments TEXT[],
  is_settled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Users can view their personal expenses
CREATE POLICY "Users can view their personal expenses" 
ON public.expenses FOR SELECT USING (
  auth.uid() = paid_by AND is_personal = true
);

-- Users can view expenses for groups they are members of
CREATE POLICY "Users can view their group expenses" 
ON public.expenses FOR SELECT USING (
  is_personal = false AND 
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE groups.id = expenses.group_id 
    AND auth.uid() = ANY(members)
  )
);

-- Authenticated users can create expenses
CREATE POLICY "Authenticated users can create expenses" 
ON public.expenses FOR INSERT WITH CHECK (auth.uid() = paid_by);

-- Users can update their own expenses
CREATE POLICY "Users can update their own expenses" 
ON public.expenses FOR UPDATE USING (auth.uid() = paid_by);

-- Users can delete their own expenses
CREATE POLICY "Users can delete their own expenses" 
ON public.expenses FOR DELETE USING (auth.uid() = paid_by);

/*
 * Settlements table - stores settlement information
 */
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID NOT NULL REFERENCES auth.users,
  to_user UUID NOT NULL REFERENCES auth.users,
  amount DECIMAL NOT NULL,
  group_id UUID REFERENCES public.groups,
  related_expenses UUID[],
  method TEXT,
  notes TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for settlements
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Users can view settlements they are involved in
CREATE POLICY "Users can view their settlements" 
ON public.settlements FOR SELECT USING (
  auth.uid() = from_user OR auth.uid() = to_user
);

-- Authenticated users can create settlements
CREATE POLICY "Authenticated users can create settlements" 
ON public.settlements FOR INSERT WITH CHECK (
  auth.uid() = from_user
);

-- Users can update settlements they created
CREATE POLICY "Users can update their settlements" 
ON public.settlements FOR UPDATE USING (
  auth.uid() = from_user
);

-- Users can delete settlements they created
CREATE POLICY "Users can delete their settlements" 
ON public.settlements FOR DELETE USING (
  auth.uid() = from_user
);

-- Create a function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a profile when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 