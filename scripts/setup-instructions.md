# Supabase Setup Instructions

To set up your Supabase project for the ExpenseTracker app, follow these steps:

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com/](https://app.supabase.com/) and sign in
2. Click "New Project"
3. Enter a project name (e.g., "ExpenseTracker")
4. Set a secure database password
5. Choose a region close to your users
6. Click "Create new project"

## 2. Set Up Database Tables and Policies

1. In your Supabase project, go to the SQL Editor
2. Copy the entire content from `scripts/setup-supabase.js`
3. Paste it into the SQL editor
4. Click "Run" to execute the SQL

This will create the following tables with appropriate RLS (Row Level Security) policies:
- `profiles` - User profiles
- `groups` - User groups for expense sharing
- `expenses` - Expense records
- `settlements` - Settlement records between users

It will also set up triggers to automatically create user profiles when users sign up.

## 3. Configure Authentication

1. Go to Authentication → Settings
2. Under Email Auth, ensure "Enable Email Signup" is turned on
3. Under Email Templates, you may want to customize the confirmation email template
4. Set Site URL to your app's URL (for development, use your Expo URL or localhost)

## 4. Get Your API Keys

1. Go to Project Settings → API
2. Copy the URL and anon key
3. Update these values in `services/supabase.js`

```javascript
// Supabase configuration
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

## 5. Test Connection

Run the diagnostic tool to verify your connection:

```
npm run diagnose
```

If everything is set up correctly, you should see successful connection tests.

## Troubleshooting

- If you see "relation does not exist" errors, make sure you've run the SQL script from step 2.
- If you encounter auth issues, check your Site URL configuration in Authentication settings.
- If your app can't connect to Supabase, verify the API keys are correct in `services/supabase.js`.
- For RLS policy issues, check the SQL script to ensure policies are properly configured. 