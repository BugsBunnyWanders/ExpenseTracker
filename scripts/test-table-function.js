/**
 * Test script for the get_table_names function
 * 
 * This script tests the get_table_names function directly
 * to verify it returns the correct tables.
 * 
 * Run with: node scripts/test-table-function.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - copied from services/supabase.js
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Direct test of the get_table_names function
const testGetTableNames = async () => {
  console.log('=== Testing get_table_names function ===\n');
  
  try {
    console.log('Calling get_table_names...');
    const { data, error } = await supabase.rpc('get_table_names');
    
    if (error) {
      console.error(`Error calling get_table_names: ${error.message}`);
      console.error('Details:', error);
      return;
    }
    
    console.log('Function call successful!');
    console.log('Tables returned:', data ? data.length : 0);
    
    if (data && data.length > 0) {
      console.log('\nTable names:');
      data.forEach(item => {
        console.log(`- ${item.table_name}`);
      });
      
      const profilesExist = data.some(item => item.table_name === 'profiles');
      console.log(`\nProfiles table exists: ${profilesExist ? 'YES' : 'NO'}`);
    } else {
      console.log('No tables returned');
    }
  } catch (err) {
    console.error(`Exception during test: ${err.message}`);
  }
  
  // Direct query to check tables
  try {
    console.log('\n=== Direct query to pg_tables ===');
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      console.error(`Error querying pg_tables: ${error.message}`);
      console.error('This is expected if RLS policies restrict access to system tables');
    } else if (data) {
      console.log('Tables found via direct query:', data.length);
      data.forEach(item => {
        console.log(`- ${item.tablename}`);
      });
    }
  } catch (err) {
    console.error(`Exception during direct query: ${err.message}`);
  }

  // Test direct query to profiles table
  try {
    console.log('\n=== Direct query to profiles table ===');
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error(`Error querying profiles table: ${error.message}`);
      console.error('Details:', error);
    } else {
      console.log('Profiles query successful!');
      console.log('Number of profiles returned:', data ? data.length : 0);
    }
  } catch (err) {
    console.error(`Exception during profiles query: ${err.message}`);
  }
};

// Run the test
testGetTableNames(); 