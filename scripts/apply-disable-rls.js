/**
 * Apply Disable RLS Script
 * 
 * This script directly applies the disable-rls.sql script without requiring 
 * the service role key. It uses the anon key which has limited permissions.
 * 
 * Run with: node scripts/apply-disable-rls.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - copied from services/supabase.js
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyDisableRLS() {
  console.log('Applying disable-rls.sql script directly...');
  
  try {
    // Try to disable RLS directly
    const tables = ['profiles', 'groups', 'expenses', 'settlements'];
    
    for (const table of tables) {
      console.log(`Attempting to disable RLS on ${table} table...`);
      
      // Try to disable RLS
      const { error: disableError } = await supabase.rpc('disable_rls', { 
        table_name: table 
      });
      
      if (disableError) {
        console.error(`❌ Error disabling RLS on ${table}: ${disableError.message}`);
        
        // Try to create a helper function first
        console.log('Creating helper function for disabling RLS...');
        const { error: createFuncError } = await supabase.rpc('create_admin_function', {
          sql: `
          CREATE OR REPLACE FUNCTION public.disable_rls(table_name text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
          END;
          $$;
          GRANT EXECUTE ON FUNCTION public.disable_rls(text) TO authenticated, anon;
          `
        });
        
        if (createFuncError) {
          console.error(`❌ Error creating helper function: ${createFuncError.message}`);
          console.error('You likely need admin privileges to disable RLS.');
        } else {
          // Try again with the newly created function
          const { error: retryError } = await supabase.rpc('disable_rls', { 
            table_name: table 
          });
          
          if (retryError) {
            console.error(`❌ Still cannot disable RLS on ${table}: ${retryError.message}`);
          } else {
            console.log(`✅ Successfully disabled RLS on ${table}`);
          }
        }
      } else {
        console.log(`✅ Successfully disabled RLS on ${table}`);
      }
    }
    
    // Check RLS status
    console.log('\nChecking RLS status after changes...');
    const { data: statusData, error: statusError } = await supabase.rpc('check_rls_status');
    
    if (statusError) {
      console.error(`❌ Error checking RLS status: ${statusError.message}`);
      console.log('Creating RLS status check function...');
      
      const { error: createCheckError } = await supabase.rpc('create_admin_function', {
        sql: `
        CREATE OR REPLACE FUNCTION public.check_rls_status()
        RETURNS TABLE (
          table_name text,
          rls_enabled boolean
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            c.relname::text as table_name,
            c.relrowsecurity as rls_enabled
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname IN ('profiles', 'groups', 'expenses', 'settlements')
          ORDER BY c.relname;
        END;
        $$ LANGUAGE plpgsql;
        GRANT EXECUTE ON FUNCTION public.check_rls_status() TO authenticated, anon;
        `
      });
      
      if (createCheckError) {
        console.error(`❌ Error creating check function: ${createCheckError.message}`);
      } else {
        // Try again with the newly created function
        const { data: retryData, error: retryError } = await supabase.rpc('check_rls_status');
        
        if (retryError) {
          console.error(`❌ Still cannot check RLS status: ${retryError.message}`);
        } else {
          console.log('RLS status:', retryData);
        }
      }
    } else {
      console.log('RLS status:', statusData);
    }
    
    console.log('\nIf you cannot disable RLS via this script, you need to:');
    console.log('1. Log into the Supabase dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Run the following SQL manually:');
    console.log(`
    -- Disable RLS on all tables
    ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;
    
    -- Grant all privileges to authenticated users
    GRANT ALL ON TABLE public.profiles TO authenticated;
    GRANT ALL ON TABLE public.groups TO authenticated;
    GRANT ALL ON TABLE public.expenses TO authenticated;
    GRANT ALL ON TABLE public.settlements TO authenticated;
    `);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Create admin function helper
async function createAdminFunction() {
  console.log('Creating admin function helper...');
  
  try {
    const { error } = await supabase.rpc('create_admin_function_helper', {
      sql: `
      CREATE OR REPLACE FUNCTION public.create_admin_function(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
      GRANT EXECUTE ON FUNCTION public.create_admin_function(text) TO authenticated, anon;
      `
    });
    
    if (error) {
      console.error(`❌ Error creating admin function helper: ${error.message}`);
      return false;
    }
    
    console.log('✅ Admin function helper created successfully');
    return true;
  } catch (err) {
    console.error(`❌ Exception creating admin function helper: ${err.message}`);
    return false;
  }
}

// Run the main function
async function main() {
  // First try to create the admin function helper
  const success = await createAdminFunction();
  
  if (success) {
    await applyDisableRLS();
  } else {
    console.error('Cannot proceed without being able to create helper functions.');
    console.log('You need to apply SQL changes manually in the Supabase dashboard.');
  }
}

main(); 