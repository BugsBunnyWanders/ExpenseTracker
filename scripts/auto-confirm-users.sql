-- Auto-confirm user emails in Supabase Auth
-- This script adds a function and trigger to automatically confirm user emails
-- without requiring them to click on a confirmation link

-- Function to automatically confirm user emails
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Set confirmation fields
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function on user creation
DROP TRIGGER IF EXISTS confirm_user_email ON auth.users;
CREATE TRIGGER confirm_user_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

-- Existing users: Update any unconfirmed users
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email_confirmed_at IS NULL; 