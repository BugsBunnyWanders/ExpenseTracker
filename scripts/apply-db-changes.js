/**
 * Apply Database Changes Script
 * 
 * This script applies specific database changes to the Supabase project.
 * It reads SQL files and executes them against your Supabase database.
 * 
 * Usage:
 *   node scripts/apply-db-changes.js [change-name]
 * 
 * Examples:
 *   node scripts/apply-db-changes.js auto-confirm-users
 *   node scripts/apply-db-changes.js setup-rls-policies
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - copied from services/supabase.js
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// IMPORTANT: For making database changes, we need the service role key
// You must replace this with your actual service role key from the Supabase dashboard
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY';

// Available changes and their SQL file paths
const availableChanges = {
  'auto-confirm-users': 'auto-confirm-users.sql',
  'setup-rls-policies': 'setup-rls-policies.sql',
};

async function applyChanges(changeName) {
  if (!availableChanges[changeName]) {
    console.error(`Error: Change "${changeName}" not found.`);
    console.log('Available changes:');
    Object.keys(availableChanges).forEach(name => console.log(`  - ${name}`));
    process.exit(1);
  }

  const sqlFilePath = path.join(__dirname, availableChanges[changeName]);
  
  try {
    // Check if the file exists
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`Error: SQL file not found at ${sqlFilePath}`);
      process.exit(1);
    }
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`Read SQL file: ${sqlFilePath}`);
    console.log('SQL content:', sqlContent.substring(0, 150) + '...');
    
    // Check if service key is provided
    if (supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY') {
      console.error('Error: You must replace the placeholder service role key with your actual key.');
      console.error('Find your service role key in the Supabase dashboard under Settings > API.');
      console.log('\nSince the service key is not provided, I cannot execute the SQL directly.');
      console.log('\nManual instructions:');
      console.log('1. Log in to your Supabase dashboard');
      console.log('2. Go to the SQL Editor');
      console.log('3. Copy and paste the SQL content below:');
      console.log('\n------ BEGIN SQL ------');
      console.log(sqlContent);
      console.log('------ END SQL ------\n');
      console.log('4. Click "Run" to execute the SQL');
      process.exit(1);
    }
    
    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`Applying ${changeName} to database...`);
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error applying changes:', error);
      process.exit(1);
    }
    
    console.log('Changes applied successfully!');
    console.log('Response:', data);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Parse command line arguments
const changeName = process.argv[2];

if (!changeName) {
  console.error('Error: Please specify a change name.');
  console.log('Usage: node scripts/apply-db-changes.js [change-name]');
  console.log('Available changes:');
  Object.keys(availableChanges).forEach(name => console.log(`  - ${name}`));
  process.exit(1);
}

// Run the script
applyChanges(changeName); 