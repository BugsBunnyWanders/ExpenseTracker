# Disabling Email Confirmations in Supabase

This document explains how to disable email confirmations for your ExpenseTracker app's authentication flow.

## Option 1: Using the SQL Script (Recommended)

The most reliable method is to use the provided SQL script to create a database trigger that automatically confirms users.

1. Log in to your Supabase dashboard: https://app.supabase.com/
2. Go to your project
3. Navigate to the SQL Editor
4. Open a new query
5. Copy and paste the contents of the `scripts/auto-confirm-users.sql` file
6. Run the query

This will:
- Create a function that automatically sets confirmation timestamps
- Create a trigger that runs this function whenever a new user is created
- Update any existing unconfirmed users

## Option 2: Using Dashboard Settings

You can also try disabling email confirmations via the dashboard:

1. Log in to your Supabase dashboard
2. Go to your project
3. Navigate to Authentication > Providers
4. Find Email provider settings
5. Toggle off "Confirm email" option
6. Save changes

**Note:** This method may not work for all setups and may only apply to new users created after the change.

## Option 3: Using Admin API

If you're creating users programmatically via the admin API, you can set `email_confirm: true`:

```javascript
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'password123',
  user_metadata: { name: 'User Name' },
  email_confirm: true
});
```

This requires using the service role key, not the anon key.

## Testing Your Setup

After applying any of these methods:

1. Restart your app
2. Try to sign up a new user
3. Verify that you can immediately log in without needing to confirm the email

## Troubleshooting

If you're still experiencing issues:

1. Check the Supabase logs for any auth-related errors
2. Try clearing your app's local storage using `scripts/clear-local-storage.js`
3. Verify that the SQL trigger is properly installed by checking the auth schema tables 