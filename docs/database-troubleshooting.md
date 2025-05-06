# ExpenseTracker Database Troubleshooting Guide

This guide helps diagnose and fix database access issues with the ExpenseTracker app, specifically when encountering "Table does not exist or is not accessible" errors.

## Common Issues

1. **Row Level Security (RLS) policies** - Tables exist but you don't have permission to access them
2. **Schema mismatches** - Column names in the code don't match the actual database schema
3. **Authentication issues** - Problems with the authentication token or user ID
4. **Missing tables** - Tables referenced in the code haven't been created in the database

## Diagnostic Tools

The app includes several diagnostic tools to help identify the issue:

- `npm run check-db` - Verifies if required tables and RLS policies exist
- `npm run test-db-access` - Tests database access with detailed diagnostics
- `npm run check-schema` - Checks if table schemas match what the code expects

## Fixing Database Issues

### Method 1: Apply RLS Policies (Preferred)

If your database tables exist but you're getting "Table does not exist" errors, the issue is likely with RLS policies:

1. Log in to your [Supabase dashboard](https://app.supabase.com/)
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `scripts/setup-rls-policies.sql` file
5. Run the query

This script will:
- Enable RLS on all tables
- Define appropriate access policies 
- Create helper functions for checking policies

### Method 2: Disable RLS (For Testing Only)

If you're still having issues and want to test if RLS is the problem:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `scripts/disable-rls.sql` file
5. Run the query

**Warning**: This disables security protections and should only be used for testing!

### Method 3: Rebuild Tables (Last Resort)

If there are schema mismatches or table issues that can't be resolved:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `scripts/rebuild-tables.sql` file
5. Run the query

**Warning**: This will drop and recreate all tables, deleting any existing data!

## Authentication Issues

If the issue is with authentication:

1. Check for "undefined user ID" errors in the console
2. Try logging out and logging back in to refresh your auth token
3. Clear local storage with `npm run clear-cache`
4. Check if email confirmation is properly disabled with `npm run disable-email-confirm`

## Checking Specific Table Access

To check if you can access a specific table:

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY');

async function testTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  console.log(`Table ${tableName}:`, error ? `Error: ${error.message}` : `Success, rows: ${data?.length || 0}`);
}

testTable('groups');
testTable('expenses');
```

## Common Error Messages

- `Table "groups" does not exist or is not accessible` - Usually an RLS or permissions issue
- `Could not find the 'description' column of 'expenses'` - Schema mismatch
- `invalid input syntax for type uuid` - Incorrectly formatted UUID or user ID
- `Empty error object received` - Often indicates a table doesn't exist at all

## After Fixing Issues

After applying any fixes:

1. Run `npm run check-db` to verify tables and RLS policies
2. Restart your app completely
3. Try logging out and back in
4. Try creating a new group or expense to test if the fix worked

## Getting Further Help

If you're still experiencing issues:

1. Run the diagnostic tools and save the full output
2. Check the Supabase dashboard logs for additional errors
3. Look for RLS policy configurations in the dashboard under Database > Tables > [table name] > Policies
4. Create a post in the Supabase Forum or GitHub Issues with the diagnostic outputs 