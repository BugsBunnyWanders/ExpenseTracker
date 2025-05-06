/**
 * Profile Recovery Script
 * 
 * This script creates profiles for existing users who signed up
 * before the database tables were properly set up.
 * 
 * Run with: node scripts/fix-missing-profiles.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - copied from services/supabase.js
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const fixMissingProfiles = async () => {
  console.log('=== Profile Recovery Tool ===\n');
  
  // Step 1: Verify database access
  try {
    const { data: tableCheck, error: tableError } = await supabase.rpc('get_table_names');
    
    if (tableError) {
      console.error(`❌ Database verification failed: ${tableError.message}`);
      console.error('Please run the SQL setup script first to create the required tables.');
      return;
    }
    
    const profileTableExists = tableCheck?.some(t => t.table_name === 'profiles');
    
    if (!profileTableExists) {
      console.error('❌ Profiles table does not exist!');
      console.error('Please run the SQL setup script first to create the required tables.');
      return;
    }
    
    console.log('✅ Database access verified, profiles table exists\n');
  } catch (err) {
    console.error(`❌ Database check failed: ${err.message}`);
    return;
  }
  
  // Step 2: Get all users
  try {
    console.log('Fetching users from Supabase...');
    
    // Note: This requires admin privileges, so it might not work
    // If this doesn't work, you'll need to handle the recovery manually or through the Supabase dashboard
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error(`❌ Error fetching users: ${usersError.message}`);
      console.error('This operation requires admin privileges.');
      console.log('\nAlternative: You will need to create the profiles manually for each user');
      console.log('You can sign in as each user and the app will attempt to create their profile automatically.');
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('No users found in the database');
      return;
    }
    
    console.log(`Found ${users.length} users\n`);
    
    // Step 3: Check and create missing profiles
    console.log('Checking for missing profiles...');
    let createdCount = 0;
    
    for (const user of users) {
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error(`❌ Error checking profile for user ${user.id}: ${profileError.message}`);
        continue;
      }
      
      if (!profileCheck) {
        console.log(`Creating missing profile for user ${user.id} (${user.email})...`);
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: user.user_metadata?.name || user.email.split('@')[0],
            email: user.email,
            profile_picture: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Error creating profile for user ${user.id}: ${insertError.message}`);
        } else {
          console.log(`✅ Profile created successfully for ${user.email}`);
          createdCount++;
        }
      } else {
        console.log(`Profile exists for user ${user.email}`);
      }
    }
    
    console.log(`\nCreated ${createdCount} missing profiles`);
    console.log('=== Recovery Complete ===');
  } catch (err) {
    console.error(`❌ Error during profile recovery: ${err.message}`);
  }
};

// Run the recovery process
fixMissingProfiles(); 