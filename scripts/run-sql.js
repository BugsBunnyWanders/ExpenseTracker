const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runSqlFromFile(sqlFilePath) {
  try {
    // Read the SQL file
    const filePath = path.resolve(sqlFilePath);
    console.log(`Reading SQL from file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    console.log('SQL content loaded successfully');
    
    // Split the SQL into statements
    const statements = sqlContent
      .replace(/--.*$/gm, '') // Remove comments
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each SQL statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      console.log(`Executing statement ${i+1}/${statements.length}:`);
      console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));
      
      const { data, error } = await supabase.rpc('run_sql_query', { query: stmt });
      
      if (error) {
        console.error(`Error executing statement ${i+1}:`, error);
      } else {
        console.log(`Statement ${i+1} executed successfully`);
      }
    }
    
    console.log('All SQL statements executed');
  } catch (error) {
    console.error('Error running SQL:', error);
    process.exit(1);
  }
}

// Get the SQL file path from command line arguments
const sqlFilePath = process.argv[2];

if (!sqlFilePath) {
  console.error('Please provide the path to the SQL file');
  console.error('Usage: node run-sql.js <path-to-sql-file>');
  process.exit(1);
}

// Run the SQL
runSqlFromFile(sqlFilePath); 