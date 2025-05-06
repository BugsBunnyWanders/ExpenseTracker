# Fixing Database Access Issues in ExpenseTracker

This document explains how to resolve the "Table does not exist or is not accessible" errors that can occur even when the database tables are confirmed to exist.

## Understanding the Issue

The problem occurs because of Row Level Security (RLS) in Supabase. While tables exist, the app's user might not have permission to access them. There are several possible causes:

1. RLS is enabled but no policies have been defined
2. RLS policies are incorrectly configured
3. The authentication isn't properly connecting the app user to the database user

## Solution: Set Up Proper RLS Policies

### Method 1: Using the SQL Editor in Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard: https://app.supabase.com/
2. Go to your project
3. Navigate to the SQL Editor
4. Create a new query
5. Copy and paste the contents of the `scripts/setup-rls-policies.sql` file
6. Run the query

This will:
- Enable RLS on all tables
- Define appropriate policies for each table
- Create a helper function to check RLS policies

### Method 2: Using the Command Line Tool

If you've set up your service role key in the `apply-db-changes.js` script, you can run:

```bash
node scripts/apply-db-changes.js setup-rls-policies
```

This will apply the same changes programmatically.

## Verify RLS Policies

After applying the fix, you can verify the policies are correctly set up by:

1. In the Supabase dashboard, go to the Database section
2. Choose a table (e.g., "groups")
3. Go to the "Policies" tab
4. You should see policies like "Users can view groups they belong to", etc.

## Common Issues

### Still Can't Access Tables

If you still can't access tables after setting up RLS policies:

1. Check if you're properly authenticated in the app
2. Log out and log back in to refresh your authentication token
3. Make sure the tables have the expected column names (e.g., `id`, `created_by`, etc.)
4. Verify RLS is enabled on the tables

### Anonymous Access

If you need to allow anonymous access to some tables:

1. Create a policy with `USING (auth.role() = 'anon')` for anonymous access
2. Be careful with what operations you allow anonymously

## Testing the Fix

After applying the RLS policy fixes, restart your app and try the following:

1. Creating a new group
2. Adding an expense
3. Viewing your profile

If these operations work without the "Table does not exist" errors, the fix was successful. 