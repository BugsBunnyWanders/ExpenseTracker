/**
 * Database Access Test Script
 * 
 * This script tests database access with authentication to diagnose
 * "Table does not exist or is not accessible" errors.
 * 
 * Run with: node scripts/test-db-access.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - copied from services/supabase.js
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Create a simple Supabase client without WebSocket connections
const fetchWithoutWebsocket = (...args) => {
  const url = args[0].url || args[0];
  if (typeof url === 'string' && url.includes('realtime')) {
    return Promise.reject(new Error('WebSocket connections are disabled'));
  }
  return fetch(...args);
};

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithoutWebsocket,
  },
  realtime: {
    enabled: false,
  },
});

// Debug function to log the table check process
async function checkTable(tableName) {
  try {
    console.log(`\n--- Testing access to ${tableName} table ---`);
    
    // First check if we're authenticated
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error(`❌ Authentication error: ${authError.message}`);
      console.log('Not authenticated - likely running with anon key only');
    } else {
      console.log(`✅ Authentication status: ${authData?.session ? 'Authenticated as ' + authData.session.user.id : 'Not authenticated'}`);
    }
    
    // Test with a direct query
    console.log(`\nTesting direct query to ${tableName} table:`);
    const { data: directData, error: directError } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);
    
    if (directError) {
      console.error(`❌ Direct query error: ${directError.message}`);
      console.error('Error details:', directError);
    } else {
      console.log(`✅ Direct query successful. Rows returned: ${directData?.length || 0}`);
      if (directData && directData.length > 0) {
        console.log(`First row: ${JSON.stringify(directData[0], null, 2)}`);
      }
    }
    
    // Test with RPC function
    console.log(`\nTesting RPC function call:`);
    try {
      const { data: funcData, error: funcError } = await supabase.rpc('get_table_data', {
        table_name: tableName,
        row_limit: 5
      });
      
      if (funcError) {
        console.error(`❌ RPC function error: ${funcError.message}`);
      } else {
        console.log(`✅ RPC function successful. Rows returned: ${funcData?.length || 0}`);
      }
    } catch (err) {
      console.error(`❌ RPC function exception: ${err.message}`);
    }
    
    // Test RLS status for the table
    console.log(`\nChecking RLS status for ${tableName} table:`);
    try {
      const { data: rlsData, error: rlsError } = await supabase.rpc('check_table_rls', {
        table_name: tableName
      });
      
      if (rlsError) {
        console.error(`❌ RLS check error: ${rlsError.message}`);
        console.log('Creating temporary RLS check function...');
        
        // Create temporary function to check RLS
        const { error: createError } = await supabase.rpc('create_rls_check_function', {
          sql: `
          CREATE OR REPLACE FUNCTION public.check_table_rls(table_name text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result json;
          BEGIN
            EXECUTE format('
              SELECT json_build_object(
                ''table_name'', %L,
                ''rls_enabled'', (
                  SELECT rel.relrowsecurity
                  FROM pg_class rel
                  JOIN pg_namespace ns ON rel.relnamespace = ns.oid
                  WHERE ns.nspname = ''public'' AND rel.relname = %L
                ),
                ''policies'', (
                  SELECT json_agg(
                    json_build_object(
                      ''policy_name'', pol.polname,
                      ''command'', CASE pol.polcmd
                                    WHEN ''r'' THEN ''SELECT''
                                    WHEN ''a'' THEN ''INSERT''
                                    WHEN ''w'' THEN ''UPDATE''
                                    WHEN ''d'' THEN ''DELETE''
                                    ELSE pol.polcmd::text
                                    END
                    )
                  )
                  FROM pg_policy pol
                  JOIN pg_class rel ON pol.polrelid = rel.oid
                  JOIN pg_namespace ns ON rel.relnamespace = ns.oid
                  WHERE ns.nspname = ''public'' AND rel.relname = %L
                )
              )
            ', table_name, table_name, table_name) INTO result;
            
            RETURN result;
          END;
          $$;
          `
        });
        
        if (createError) {
          console.error(`❌ Error creating RLS check function: ${createError.message}`);
        } else {
          // Try the check again
          const { data: retryData, error: retryError } = await supabase.rpc('check_table_rls', {
            table_name: tableName
          });
          
          if (retryError) {
            console.error(`❌ RLS retry check error: ${retryError.message}`);
          } else {
            console.log(`✅ RLS status: ${JSON.stringify(retryData, null, 2)}`);
          }
        }
      } else {
        console.log(`✅ RLS status: ${JSON.stringify(rlsData, null, 2)}`);
      }
    } catch (err) {
      console.error(`❌ RLS check exception: ${err.message}`);
    }
    
    // Try inserting a test row
    console.log(`\nTesting row insertion to ${tableName} table:`);
    
    // Get current user ID for the test
    const userId = authData?.session?.user?.id || 'test-user-id';
    
    // Prepare test data based on table name
    let testData = {};
    if (tableName === 'profiles') {
      testData = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else if (tableName === 'groups') {
      testData = {
        name: 'Test Group',
        description: 'Created for testing DB access',
        members: [userId],
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else if (tableName === 'expenses') {
      testData = {
        description: 'Test Expense',
        amount: 10.50,
        paid_by: userId,
        group_id: 'test-group-id', // This will likely fail without a valid group ID
        participants: [userId],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else if (tableName === 'settlements') {
      testData = {
        amount: 5.25,
        payer: userId,
        receiver: 'test-receiver-id',
        group_id: 'test-group-id', // This will likely fail without a valid group ID
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    try {
      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert(testData)
        .select();
      
      if (insertError) {
        console.error(`❌ Insert error: ${insertError.message}`);
        console.error('Error details:', insertError);
      } else {
        console.log(`✅ Insert successful. Result: ${JSON.stringify(insertData, null, 2)}`);
      }
    } catch (err) {
      console.error(`❌ Insert exception: ${err.message}`);
    }
  } catch (err) {
    console.error(`❌ Error testing ${tableName} table: ${err.message}`);
  }
}

// Create helper RPC functions for testing
async function createHelperFunctions() {
  console.log('Creating helper RPC functions for testing...');
  
  try {
    // Function to get data from a table
    const { error: getTableDataError } = await supabase.rpc('create_get_table_data_function', {
      sql: `
      CREATE OR REPLACE FUNCTION public.get_table_data(table_name text, row_limit int DEFAULT 10)
      RETURNS SETOF json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        query text;
        result json;
      BEGIN
        query := format('SELECT row_to_json(t) FROM %I t LIMIT $1', table_name);
        FOR result IN EXECUTE query USING row_limit LOOP
          RETURN NEXT result;
        END LOOP;
        RETURN;
      END;
      $$;
      GRANT EXECUTE ON FUNCTION public.get_table_data(text, int) TO anon, authenticated;
      `
    });
    
    if (getTableDataError) {
      console.error(`❌ Error creating get_table_data function: ${getTableDataError.message}`);
    } else {
      console.log('✅ get_table_data function created successfully');
    }
    
    // Function to create the RLS check function
    const { error: createFuncError } = await supabase.rpc('create_rls_check_function_creator', {
      sql: `
      CREATE OR REPLACE FUNCTION public.create_rls_check_function(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
      GRANT EXECUTE ON FUNCTION public.create_rls_check_function(text) TO anon, authenticated;
      `
    });
    
    if (createFuncError) {
      console.error(`❌ Error creating function creator: ${createFuncError.message}`);
    } else {
      console.log('✅ Function creator created successfully');
    }
  } catch (err) {
    console.error(`❌ Error creating helper functions: ${err.message}`);
  }
}

// Main function
async function runTests() {
  console.log('=== ExpenseTracker Database Access Testing ===\n');
  
  // Step 1: Create helper functions
  await createHelperFunctions();
  
  // Step 2: Test login with test user (if credentials provided)
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;
  
  if (testEmail && testPassword) {
    console.log(`\nAttempting to log in with test user: ${testEmail}`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (error) {
        console.error(`❌ Login error: ${error.message}`);
      } else {
        console.log(`✅ Login successful. User ID: ${data?.user?.id}`);
      }
    } catch (err) {
      console.error(`❌ Login exception: ${err.message}`);
    }
  } else {
    console.log('\nNo test credentials provided. Running in anonymous mode.');
  }
  
  // Step 3: Test each table
  for (const table of ['profiles', 'groups', 'expenses', 'settlements']) {
    await checkTable(table);
  }
  
  console.log('\n=== Testing Complete ===');
}

// Run the tests
runTests(); 