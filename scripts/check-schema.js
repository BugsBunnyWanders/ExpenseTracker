/**
 * Database Schema Check Script
 * 
 * This script checks the actual schema of the database tables and compares it with 
 * the expected schema in our code, to detect any mismatches that might cause errors.
 * 
 * Run with: node scripts/check-schema.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expected schema structure based on our code
const expectedSchema = {
  profiles: {
    columns: ['id', 'name', 'email', 'profile_picture', 'created_at', 'updated_at'],
    primary_key: 'id'
  },
  groups: {
    columns: ['id', 'name', 'description', 'members', 'created_by', 'created_at', 'updated_at'],
    primary_key: 'id'
  },
  expenses: {
    columns: ['id', 'description', 'amount', 'paid_by', 'group_id', 'participants', 'created_at', 'updated_at'],
    primary_key: 'id'
  },
  settlements: {
    columns: ['id', 'amount', 'payer', 'receiver', 'group_id', 'status', 'created_at', 'updated_at'],
    primary_key: 'id'
  }
};

// Function to check a table's structure
async function checkTableStructure(tableName) {
  console.log(`\n--- Checking table: ${tableName} ---`);
  
  try {
    // First, verify the table exists by attempting to select a row
    const { data: rowData, error: rowError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (rowError) {
      console.error(`❌ Error accessing table: ${rowError.message}`);
      return false;
    }
    
    console.log(`✅ Table ${tableName} exists and is accessible`);
    
    // Try to detect the column structure
    // First check if there's data we can inspect
    if (rowData && rowData.length > 0) {
      const actualColumns = Object.keys(rowData[0]);
      console.log(`Detected columns (from data): ${actualColumns.join(', ')}`);
      
      // Compare with expected columns
      const expectedColumns = expectedSchema[tableName]?.columns || [];
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.error(`❌ Missing expected columns: ${missingColumns.join(', ')}`);
      }
      
      if (extraColumns.length > 0) {
        console.warn(`⚠️ Extra columns not in expected schema: ${extraColumns.join(', ')}`);
      }
      
      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log('✅ Column structure matches expected schema');
      }
    } else {
      console.log('No data to inspect column structure. Will try introspection...');
      
      // Try to introspect the schema using a Supabase function (if available)
      try {
        // First check if our helper function exists, if not try to create it
        const { error: funcCheckError } = await supabase.rpc('get_table_structure', {
          table_name: tableName
        });
        
        if (funcCheckError) {
          console.log('Creating schema introspection function...');
          
          // Create a function to introspect the schema
          const { error: createFuncError } = await supabase.rpc('create_structure_function', {
            sql: `
            CREATE OR REPLACE FUNCTION public.get_table_structure(table_name text)
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
                  ''columns'', (
                    SELECT json_agg(json_build_object(
                      ''name'', att.attname,
                      ''type'', pg_catalog.format_type(att.atttypid, att.atttypmod)
                    ))
                    FROM pg_catalog.pg_attribute att
                    JOIN pg_catalog.pg_class cls ON att.attrelid = cls.oid
                    JOIN pg_catalog.pg_namespace ns ON cls.relnamespace = ns.oid
                    WHERE ns.nspname = ''public''
                    AND cls.relname = %L
                    AND att.attnum > 0
                    AND NOT att.attisdropped
                  ),
                  ''primary_key'', (
                    SELECT json_agg(pg_attribute.attname)
                    FROM pg_index, pg_class, pg_attribute, pg_namespace
                    WHERE pg_class.oid = %L::regclass
                    AND pg_class.relnamespace = pg_namespace.oid
                    AND pg_namespace.nspname = ''public''
                    AND pg_index.indrelid = pg_class.oid
                    AND pg_attribute.attrelid = pg_class.oid
                    AND pg_attribute.attnum = any(pg_index.indkey)
                    AND pg_index.indisprimary
                  )
                )
              ', table_name, table_name, table_name) INTO result;
              
              RETURN result;
            END;
            $$;
            GRANT EXECUTE ON FUNCTION public.get_table_structure(text) TO anon, authenticated;
            `
          });
          
          if (createFuncError) {
            console.error(`❌ Error creating structure function: ${createFuncError.message}`);
          } else {
            console.log('✅ Structure function created successfully');
            
            // Try introspection again
            const { data: structData, error: structError } = await supabase.rpc('get_table_structure', {
              table_name: tableName
            });
            
            if (structError) {
              console.error(`❌ Error getting table structure: ${structError.message}`);
            } else {
              console.log('Table structure:');
              console.log(JSON.stringify(structData, null, 2));
              
              if (structData && structData.columns) {
                const actualColumns = structData.columns.map(col => col.name);
                console.log(`Detected columns (from introspection): ${actualColumns.join(', ')}`);
                
                // Compare with expected columns
                const expectedColumns = expectedSchema[tableName]?.columns || [];
                const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
                const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
                
                if (missingColumns.length > 0) {
                  console.error(`❌ Missing expected columns: ${missingColumns.join(', ')}`);
                }
                
                if (extraColumns.length > 0) {
                  console.warn(`⚠️ Extra columns not in expected schema: ${extraColumns.join(', ')}`);
                }
                
                if (missingColumns.length === 0 && extraColumns.length === 0) {
                  console.log('✅ Column structure matches expected schema');
                }
              }
            }
          }
        } else {
          // Function exists, process its result
          const { data: structData, error: structError } = await supabase.rpc('get_table_structure', {
            table_name: tableName
          });
          
          if (structError) {
            console.error(`❌ Error getting table structure: ${structError.message}`);
          } else {
            console.log('Table structure:');
            console.log(JSON.stringify(structData, null, 2));
          }
        }
      } catch (err) {
        console.error(`❌ Error introspecting schema: ${err.message}`);
      }
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Exception checking table structure: ${err.message}`);
    return false;
  }
}

// Function to create helper functions
async function createHelperFunctions() {
  console.log('Setting up helper functions...');
  
  try {
    // Create a function to allow executing SQL commands
    const { error } = await supabase.rpc('create_structure_function_creator', {
      sql: `
      CREATE OR REPLACE FUNCTION public.create_structure_function(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
      GRANT EXECUTE ON FUNCTION public.create_structure_function(text) TO anon, authenticated;
      `
    });
    
    if (error) {
      console.error(`❌ Error creating helper function: ${error.message}`);
      return false;
    }
    
    console.log('✅ Helper functions created successfully');
    return true;
  } catch (err) {
    console.error(`❌ Exception creating helper function: ${err.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Database Schema Check ===\n');
  
  // Step 1: Create helper functions
  const helpersCreated = await createHelperFunctions();
  
  if (!helpersCreated) {
    console.log('\nCannot create helper functions to introspect schema.');
    console.log('Will proceed with limited checks...');
  }
  
  // Step 2: Check each table's structure
  for (const tableName of Object.keys(expectedSchema)) {
    await checkTableStructure(tableName);
  }
  
  console.log('\n=== Schema Check Complete ===');
  console.log('\nIf you identified schema issues, you need to:');
  console.log('1. Update your database schema using SQL in the Supabase dashboard');
  console.log('   OR');
  console.log('2. Update your code to match the actual database schema');
}

// Run the main function
main(); 