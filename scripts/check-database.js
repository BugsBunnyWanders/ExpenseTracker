/**
 * Database Verification Script
 * 
 * This script checks if the required tables exist in the Supabase database
 * and verifies their structure.
 * 
 * Run with: node scripts/check-database.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - copied from services/supabase.js
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Expected tables
const requiredTables = ['profiles', 'groups', 'expenses', 'settlements'];

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to check if table exists
const checkTable = async (tableName) => {
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // PostgreSQL code for undefined_table
        console.error(`❌ Table "${tableName}" does not exist`);
        return false;
      }
      
      // Other errors (e.g., permission issues)
      console.error(`❌ Error accessing table "${tableName}": ${error.message}`);
      return false;
    }
    
    console.log(`✅ Table "${tableName}" exists${data?.length ? ` and contains data (${data.length} rows retrieved)` : ''}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception checking table "${tableName}": ${err.message}`);
    return false;
  }
};

// Function to check the get_table_names function
const checkGetTableNamesFunction = async () => {
  try {
    const { data, error } = await supabase.rpc('get_table_names');
    
    if (error) {
      console.error(`❌ Function "get_table_names" is not available: ${error.message}`);
      console.error('   You need to run the SQL setup script that contains this function definition');
      return false;
    }
    
    console.log(`✅ Function "get_table_names" exists and returned ${data?.length || 0} tables`);
    
    if (data && data.length > 0) {
      const tableNames = data.map(t => t.table_name).join(', ');
      console.log(`   Tables found: ${tableNames}`);
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Exception checking "get_table_names" function: ${err.message}`);
    return false;
  }
};

// Function to check database triggers
const checkTriggers = async () => {
  try {
    // This query checks for triggers in the database
    const { data, error } = await supabase.rpc('get_triggers');
    
    if (error) {
      // The function doesn't exist yet, so we need to create it temporarily
      await supabase.rpc('create_get_triggers_function');
      
      // Try again with the newly created function
      const result = await supabase.rpc('get_triggers');
      
      if (result.error) {
        console.error(`❌ Could not check triggers: ${result.error.message}`);
        return false;
      }
      
      const hasTrigger = result.data?.some(t => 
        t.trigger_name === 'on_auth_user_created' && 
        t.event_manipulation === 'INSERT' &&
        t.event_object_table === 'users'
      );
      
      if (hasTrigger) {
        console.log('✅ Profile creation trigger is correctly set up');
      } else {
        console.error('❌ Profile creation trigger is missing');
        console.error('   Make sure you have run the full SQL setup script');
      }
      
      // Clean up the temporary function
      await supabase.rpc('drop_get_triggers_function');
      
      return hasTrigger;
    }
    
    // If the function already existed (unlikely in a fresh setup)
    const hasTrigger = data?.some(t => 
      t.trigger_name === 'on_auth_user_created' && 
      t.event_manipulation === 'INSERT' &&
      t.event_object_table === 'users'
    );
    
    if (hasTrigger) {
      console.log('✅ Profile creation trigger is correctly set up');
    } else {
      console.error('❌ Profile creation trigger is missing');
      console.error('   Make sure you have run the full SQL setup script');
    }
    
    return hasTrigger;
  } catch (err) {
    console.error(`❌ Exception checking triggers: ${err.message}`);
    return false;
  }
};

// Check for RLS policies
async function checkRLSPolicies() {
  try {
    console.log('\n--- Checking RLS Policies ---');
    
    // Check if RLS policies function exists
    const { data: rlsPolicies, error } = await supabase.rpc('get_rls_policies');
    
    if (error) {
      console.log('❌ Could not check RLS policies:', error.message);
      return false;
    }
    
    if (!rlsPolicies || rlsPolicies.length === 0) {
      console.log('❌ No RLS policies found. RLS may be disabled or not configured.');
      console.log('   Run "npm run fix-db-access" to fix this issue.');
      return false;
    }
    
    // Group policies by table
    const policiesByTable = {};
    rlsPolicies.forEach(policy => {
      if (!policiesByTable[policy.table_name]) {
        policiesByTable[policy.table_name] = [];
      }
      policiesByTable[policy.table_name].push(policy);
    });
    
    // Check each required table has policies
    const requiredTables = ['profiles', 'groups', 'expenses', 'settlements'];
    let allTablesHavePolicies = true;
    
    for (const table of requiredTables) {
      if (!policiesByTable[table] || policiesByTable[table].length === 0) {
        console.log(`❌ Table "${table}" has no RLS policies`);
        allTablesHavePolicies = false;
      } else {
        console.log(`✅ Table "${table}" has ${policiesByTable[table].length} RLS policies`);
      }
    }
    
    if (!allTablesHavePolicies) {
      console.log('   Run "npm run fix-db-access" to fix missing RLS policies.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error checking RLS policies:', error.message);
    return false;
  }
}

// Create and drop helper functions for checking triggers and RLS policies
const createHelperFunctions = async () => {
  // Function to get triggers
  await supabase.rpc('create_get_triggers_function', null, {
    head: false,
    count: null,
    body: `
    CREATE OR REPLACE FUNCTION public.get_triggers()
    RETURNS TABLE(
      trigger_name text,
      event_manipulation text,
      event_object_table text,
      action_statement text
    )
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT 
        tgname::text as trigger_name,
        tgtype::text as event_manipulation,
        tgrelid::regclass::text as event_object_table,
        tgqual::text as action_statement
      FROM pg_trigger
      WHERE tgisinternal = false;
    $$;
    GRANT EXECUTE ON FUNCTION public.get_triggers() TO anon, authenticated;
    `
  });

  // Function to get RLS policies
  await supabase.rpc('create_get_rls_policies_function', null, {
    head: false,
    count: null,
    body: `
    CREATE OR REPLACE FUNCTION public.get_rls_policies()
    RETURNS TABLE(
      policy_name text,
      table_name text,
      policy_command text,
      policy_using text,
      policy_with_check text
    )
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT 
        polname::text as policy_name,
        relname::text as table_name,
        (CASE WHEN polcmd = 'r' THEN 'SELECT'
              WHEN polcmd = 'a' THEN 'INSERT'
              WHEN polcmd = 'w' THEN 'UPDATE'
              WHEN polcmd = 'd' THEN 'DELETE'
              ELSE polcmd::text END) as policy_command,
        pg_get_expr(polqual, polrelid)::text as policy_using,
        pg_get_expr(polwithcheck, polrelid)::text as policy_with_check
      FROM pg_policy
      JOIN pg_class ON pg_class.oid = pg_policy.polrelid
      WHERE pg_class.relnamespace = 'public'::regnamespace;
    $$;
    GRANT EXECUTE ON FUNCTION public.get_rls_policies() TO anon, authenticated;
    `
  });
};

// Main function to run checks
const runChecks = async () => {
  console.log('=== ExpenseTracker Database Verification ===\n');

  // Step 1: Check connection
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error(`❌ Failed to connect to Supabase: ${error.message}`);
      console.error('   Check your Supabase URL and anon key in the script.');
      return;
    }
    
    console.log('✅ Successfully connected to Supabase\n');
  } catch (err) {
    console.error(`❌ Exception connecting to Supabase: ${err.message}`);
    console.error('   Check your Supabase URL and anon key in the script.');
    return;
  }
  
  // Step 2: Check get_table_names function
  console.log('\n--- Checking Helper Functions ---');
  const functionExists = await checkGetTableNamesFunction();
  
  if (!functionExists) {
    console.log('\n⚠️ Creating temporary helper functions for the checks...');
    try {
      await createHelperFunctions();
    } catch (err) {
      console.error(`❌ Failed to create helper functions: ${err.message}`);
    }
  }
  
  // Step 3: Check tables
  console.log('\n--- Checking Required Tables ---');
  const tableResults = [];
  
  for (const table of requiredTables) {
    const exists = await checkTable(table);
    tableResults.push({ table, exists });
  }
  
  // Step 4: Check triggers
  console.log('\n--- Checking Database Triggers ---');
  await checkTriggers();
  
  // Step 5: Check RLS policies
  const rlsPoliciesOk = await checkRLSPolicies();
  
  // Step 6: Summary
  console.log('\n--- Verification Summary ---');
  const missingTables = tableResults.filter(r => !r.exists).map(r => r.table);
  
  if (missingTables.length > 0) {
    console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
  } else {
    console.log('✅ All required tables exist');
  }
  
  console.log(rlsPoliciesOk ? '✅ RLS policies are configured' : '❌ RLS policies need to be fixed');
  
  if (missingTables.length === 0 && rlsPoliciesOk) {
    console.log('\nYour database setup looks good! The app should now work correctly.');
  } else {
    console.log('\nSome issues were found with your database setup.');
    
    if (missingTables.length > 0) {
      console.log('- Run the database setup script to create missing tables.');
    }
    
    if (!rlsPoliciesOk) {
      console.log('- Run "npm run fix-db-access" to fix RLS policies.');
    }
  }
  
  console.log('\n=== Verification Complete ===');
};

// Run the checks
runChecks(); 