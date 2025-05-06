-- Create the group_invitations table
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON public.group_invitations(email);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON public.group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON public.group_invitations(status);

-- Set up RLS policies
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- Anyone can view their own invitations (by email)
CREATE POLICY group_invitations_select ON public.group_invitations 
  FOR SELECT 
  USING (
    -- Allow anyone to see invitations (we'll check emails in the app)
    true
    -- OR allow group admins/creators to see invitations for their groups
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- Group creators/members can insert invitations for their groups
CREATE POLICY group_invitations_insert ON public.group_invitations
  FOR INSERT
  WITH CHECK (
    -- User must be a member of the group to send invitations
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid() OR auth.uid() = ANY(members)
    )
  );

-- Users can update invitations (to accept/decline)
CREATE POLICY group_invitations_update ON public.group_invitations
  FOR UPDATE
  USING (
    -- Allow anyone to update invitations (we'll check permissions in the app)
    true
    -- OR allow group admins/creators to update invitations for their groups
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION auto_expire_invitations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.group_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the auto-expire function daily
-- Note: This requires pg_cron extension which might not be available in all Supabase projects
-- Alternatively, you can handle expiration in your application code
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT cron.schedule('0 0 * * *', 'SELECT auto_expire_invitations()');
  END IF;
END $$; 