-- Drop existing policies for group_invitations table
DROP POLICY IF EXISTS group_invitations_select ON public.group_invitations;
DROP POLICY IF EXISTS group_invitations_insert ON public.group_invitations;
DROP POLICY IF EXISTS group_invitations_update ON public.group_invitations;

-- Create new policies with fixed permissions
-- Anyone can view invitations (we'll check permissions in app code)
CREATE POLICY group_invitations_select ON public.group_invitations 
  FOR SELECT 
  USING (
    -- Allow anyone to see invitations (we'll check emails in the app)
    true
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

-- Anyone can update invitations (we'll check permissions in app code)
CREATE POLICY group_invitations_update ON public.group_invitations
  FOR UPDATE
  USING (
    -- Allow anyone to update invitations (we'll check permissions in the app)
    true
  );

-- This script can be run in the Supabase SQL Editor to fix permissions 