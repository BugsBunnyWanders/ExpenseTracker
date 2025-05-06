# Project Memory

## Learnings
- When working with Windows, use standard mkdir commands and avoid -p flag as it may not be supported in some Windows environments.
- Ensure Firebase configuration is properly set up before implementing authentication features.
- Keep track of installed dependencies to avoid conflicts.
- Avoid circular dependencies when initializing Firebase services. The specific issue we encountered was:
  - App.js was initializing Firebase and exporting services
  - services/firebase.js was importing from App.js and re-exporting
  - AuthContext.js was importing from services/firebase.js
  - App layout was importing AuthContext
  
  This created a circular dependency that caused "Component auth has not been registered yet" errors.
  Solution: Initialize Firebase in one central location (services/firebase.js) and import from there.

- When facing persistent initialization issues with Firebase in React Native/Expo, consider switching to an alternative service like Supabase:
  - More straightforward initialization process
  - No circular dependency issues with the client setup
  - Similar API surface for authentication and database operations
  - Built-in support for row-level security and relational data
  - Strong TypeScript support

- When using Supabase with React Native, be aware of Node.js dependencies in the WebSocket library:
  - The error "attempted to import the Node standard library module 'stream'" indicates missing Node.js polyfills
  - Solutions:
    1. Disable realtime subscriptions in the Supabase client config
    2. Create a custom fetch implementation that blocks WebSocket connections
    3. Set up polyfills for Node.js modules by creating empty shims
    4. Use a postinstall script to automatically set up these polyfills when dependencies change

- CRUD Operations with Supabase in React Native:
  - Common issues and fixes:
    1. Make sure database tables actually exist before trying to query them
    2. RLS (Row Level Security) policies must be properly set up to allow authorized operations
    3. Add ample logging to track request/response cycle and identify issues
    4. Use try/catch blocks around all database operations to handle errors gracefully
    5. Be aware of the difference between `insert().select()` (returns inserted data) vs just `insert()` (returns only count)
    6. When no data is returned, check if your RLS policies are restricting access
  
  - Debugging Supabase connection issues:
    1. Create a diagnostics tool to test connectivity to Supabase endpoints
    2. Check network access to make sure your device can reach Supabase servers
    3. Verify API keys are correct and haven't expired
    4. Test simple operations first (like SELECT) before attempting more complex operations

  - User profile creation patterns:
    1. Use a database trigger to automatically create profiles on user signup
    2. As a fallback, attempt manual profile creation in the app code
    3. Handle potential race conditions between the trigger and manual profile creation

  - Authentication flow improvements:
    1. Add proper session handling with AsyncStorage persistence
    2. Set up listeners for auth state changes
    3. Provide clear feedback during email verification process
    4. Add detailed error handling for login/signup operations 

# Project Learnings and Insights

## Encountered Issues and Solutions

### 1. Empty Error Objects from Supabase

**Problem**: Supabase operations were returning empty error objects (`{}`) instead of meaningful error messages, making debugging difficult.

**Cause**: This typically occurred when attempting to operate on database tables that didn't exist or when RLS (Row Level Security) policies prevented the action.

**Solution**: 
- Enhanced error handling in the Supabase service to detect and better report empty error objects
- Added specific checks for table existence before performing operations
- Created a database verification script to check for required tables and proper setup

**Learning**: When working with Supabase (or any serverless database), always validate that tables exist and have proper permissions before performing operations. Empty error objects often indicate permission or resource existence issues rather than operation errors.

### 2. Profile Creation Race Conditions

**Problem**: Sometimes user profiles wouldn't be created correctly during signup, leading to authentication but missing user data.

**Cause**: Race condition between the database trigger that should create a profile automatically and the manual profile creation in code.

**Solution**:
- Improved the user profile creation flow with better error handling
- Added fallback profile creation if the automatic trigger fails
- Implemented profile existence checks with automatic recovery

**Learning**: In systems with both automatic (trigger-based) and manual operations, implement fallback mechanisms and existence checks to handle potential race conditions.

### 3. Database Verification and Setup

**Problem**: Users were experiencing errors when database tables weren't set up correctly.

**Cause**: The setup process relied on manually running SQL scripts, which could be incomplete or forgotten.

**Solution**:
- Created a comprehensive `check-database.js` script to verify all required database components
- Added functionality to determine if tables, functions, triggers, and RLS policies exist
- Improved documentation and error messages to guide users through proper setup

**Learning**: Provide automated verification tools for critical infrastructure components and clear instructions for fixing issues when they're detected.

### 4. Supabase WebSocket Compatibility

**Problem**: WebSocket connections were causing issues in the React Native environment.

**Cause**: Incompatibility between Supabase's realtime features and the React Native runtime.

**Solution**:
- Implemented a custom fetch implementation that disables WebSocket connections
- Explicitly disabled realtime subscriptions in the Supabase client configuration

**Learning**: When integrating libraries into React Native, be aware of web-specific features that might not work correctly in the mobile environment, and provide appropriate fallbacks or disabling mechanisms.

### 5. "Profiles Table Not Found" Despite Table Existing

**Problem**: Users were seeing "Profiles table not found in database" errors even though the database verification script confirmed the table existed.

**Cause**: The issue was related to how the `get_table_names` function response was processed in the AuthContext. The function returns an array of objects with a `table_name` property, but the code was treating it as an array of strings.

**Solution**:
- Improved the table existence check in AuthContext to handle different response formats
- Added direct verification of table access by attempting to query the table
- Created clear cache utility to help users reset their app state
- Added comprehensive debugging and error reporting

**Learning**: When working with RPC functions like `get_table_names`, ensure the response format is properly handled, and implement fallback checks to verify table access directly. Additionally, provide clear cache management tools for users to resolve persistent issues.

### 6. Firebase to Supabase User Property Mapping Issues

**Problem**: After migrating from Firebase to Supabase, the app was experiencing "invalid input syntax for type uuid: undefined" errors when trying to update profiles or fetch user data. This occurred because the code was still trying to access user properties using Firebase property names (like `currentUser.uid`) instead of Supabase's property names (`currentUser.id`).

**Cause**: The issue was related to how the code was accessing user properties.

**Solution**:
1. Created a `UserAdapter.js` utility to provide consistent access to user properties regardless of the auth provider:
   - `getUserId()` - Gets the user ID safely, checking both Firebase and Supabase property names
   - `getUserName()` - Gets the display name with fallbacks
   - `getUserEmail()` - Gets the email consistently
   - `getUserProfilePicture()` - Gets the profile picture URL with appropriate fallbacks

2. Modified all code that interacts with user properties to use the adapter functions, specifically:
   - Profile screen
   - Dashboard screen
   - Expenses screen

3. Added validation in both `updateUserProfile` and `createProfile` functions to check for valid user IDs before attempting database operations.

**Learning**: When migrating between authentication providers, create an adapter layer to handle property name differences. Always validate IDs before using them in database operations. Add detailed error messages that specifically identify the root cause of the issue. Logging the full user object structure during transitions helps identify mapping issues.

## Best Practices Identified

1. **Robust Error Handling**: Always implement comprehensive error handling with detailed logging, especially for external service integrations.

2. **Database Verification**: Create tools to verify database setup and integrity, particularly for applications that rely on a specific schema.

3. **Fallback Mechanisms**: Implement fallback paths for critical operations to ensure system resilience.

4. **Detailed Logging**: Add descriptive logging to help identify issues, especially in areas involving external services.

5. **Environment-Specific Adaptations**: Adjust libraries and services to work correctly in the target environment, disabling incompatible features when necessary.

6. **Client-Side Cache Management**: Provide tools for users to clear cached data and reset the application state when troubleshooting persistent issues.

7. **Comprehensive Testing**: Test database functions directly with dedicated test scripts that verify both the function response and direct table access.

## Email Confirmation and Supabase Authentication

### Issue
When users register with the application, Supabase sends a confirmation email. The default confirmation link points to localhost:3000, which isn't useful for mobile app users.

### Solution
Several approaches were tried to resolve this issue:

1. **Client-side configuration**: Modified the Supabase client to set `emailConfirmationRequired: false` in signup options. This didn't work because this option is not actually supported in the Supabase JS client.

2. **Automatic login attempt**: Added code to attempt an automatic login after signup to bypass email confirmation, but this also fails if the email isn't confirmed.

3. **SQL Trigger solution**: Created a SQL script (`scripts/auto-confirm-users.sql`) that sets up a database trigger to automatically confirm user emails when new accounts are created. This is the most reliable method.

### Learning
- Supabase email confirmation can be controlled at multiple levels:
  - Client-side (limited options and may not work in all scenarios)
  - Dashboard settings (may only apply to new users)
  - Database triggers (most reliable, affects all users)

- When working with authentication flows, always implement and test the full user journey from registration to login to ensure a smooth experience.

- For mobile apps, email confirmation adds friction to the onboarding process and should be disabled during early development unless specifically required for security reasons.

## Note on Database Access Issues

While fixing the undefined user ID issue, we discovered a separate problem: the app reports "Table does not exist" errors even though the database verification script confirms the tables exist. This indicates a likely RLS (Row Level Security) policy issue.

Possible causes:
1. RLS policies are not properly configured for the authenticated user
2. The table exists but the current user doesn't have permission to access it
3. The database connection is using different credentials than the verification script

This will need to be addressed as a separate issue.

## Row Level Security (RLS) and Database Access Issues

### Issue
While tables were confirmed to exist via the database verification script, the app was still receiving "Table does not exist or is not accessible" errors when attempting to access the tables.

### Cause
The issue was related to Supabase's Row Level Security (RLS) policies. RLS was enabled on the tables, but no policies were defined to give the authenticated user permission to perform operations on the tables.

### Solution
1. Created a comprehensive SQL script (`scripts/setup-rls-policies.sql`) that:
   - Ensures RLS is enabled on all tables
   - Defines appropriate policies for each table (profiles, groups, expenses, settlements)
   - Adds a `get_rls_policies()` function to help verify policy configuration

2. Updated the database changes script to support applying this fix via command line

3. Created detailed documentation explaining:
   - The cause of the "Table does not exist" error
   - How to apply the fix both via SQL editor and command line
   - How to verify RLS policy configuration
   - Common issues and their solutions

### Learning
- In Supabase, when RLS is enabled on a table but no policies are defined, the default behavior is to deny all access
- RLS policies need to be carefully designed to give users appropriate access to their own data
- Different operations (SELECT, INSERT, UPDATE, DELETE) require separate policies
- The policy expressions need to correctly use `auth.uid()` to identify the current user
- Debugging RLS issues can be challenging because you might not see detailed error messages, just "Table does not exist" errors 

## Function Implementation Issues

### Missing getUsersByIds Function

**Problem**: The application showed an error: "[TypeError: 0, _userService.getUsersByIds is not a function (it is undefined)]" when trying to load group details, preventing group member information from displaying.

**Cause**: The function `getUsersByIds` was imported and used in the group details screen (`app/group/[id].js`), but it wasn't implemented in the userService.js file.

**Solution**:
1. Implemented the `getUsersByIds` function in `services/userService.js` that:
   - Takes an array of user IDs as input
   - Queries the Supabase profiles table for all users with matching IDs in a single operation
   - Converts the result array to an object map with user IDs as keys for efficient lookups
   - Handles edge cases like empty arrays gracefully

**Learning**:
- When developing with multiple services and data models, ensure all required functions are implemented before using them
- Batch operations (like retrieving multiple user profiles in a single query) are more efficient than multiple individual requests
- Using object maps with IDs as keys provides efficient lookups in UI rendering, especially for lists of items
- Always include proper error handling and logging in service functions to help identify issues

### Missing calculateSettlementPlan Function

**Problem**: After fixing the getUsersByIds issue, a new error appeared: "[TypeError: 0, _settlementService.calculateSettlementPlan is not a function (it is undefined)]" when trying to generate settlement plans in the group details screen.

**Cause**: Similar to the previous issue, the function `calculateSettlementPlan` was imported and used in the group details screen, but was not implemented in the settlementService.js file.

**Solution**:
1. Implemented the `calculateSettlementPlan` function in `services/settlementService.js` that:
   - Takes a group ID as input
   - Retrieves current balances for all group members using the existing calculateGroupBalances function
   - Separates members into "creditors" (positive balance) and "debtors" (negative balance)
   - Uses a greedy algorithm to create an optimized settlement plan that minimizes the number of transactions
   - Returns an array of transactions with payerId, payeeId, and amount

**Learning**:
- Financial applications require careful handling of balances and settlement calculations
- Debt settlement is a classic optimization problem that can be solved efficiently with greedy algorithms
- Floating-point calculations require special handling (like using toFixed() and an epsilon value for comparisons)
- When implementing financial features, add comprehensive logging to track the values at each step 

# Project Memory: Lessons Learned

## Expense and Settlement Management

### Settlement Balance Calculation Bug (2024-06-06)
**Problem:** When settling debts in the app, the settlement records were correctly saved in the database, but the balances shown in the UI weren't updating.

**Root Cause:** The `calculateGroupBalances` function in `expenseService.js` was only considering expense records when calculating balances but wasn't taking settlement records into account.

**Solution:**
1. Modified `calculateGroupBalances` to also fetch and consider all completed settlements for the group
2. Enhanced the `createSettlement` function to set a default status of 'completed' if not specified
3. Added additional logging to help identify similar issues in the future

**Lessons Learned:**
1. When implementing financial calculations, all transactions (both expenses and settlements) must be considered
2. A proper testing framework would have caught this issue earlier
3. Detailed logging helps identify calculation discrepancies

## Supabase Row Level Security (RLS) Issues

### Permission Denied for Users Table (2024-06-07)
**Problem:** When trying to invite users by email, we received a "permission denied for table users" error even though the RLS policy for the group_invitations table seemed correct.

**Root Cause:** The RLS policy was referencing the `auth.users` table in its USING clause, which requires elevated permissions that our service role doesn't have.

**Solution:**
1. Modified the RLS policies to not reference the auth.users table directly
2. Changed the policies to be more permissive (allowing SELECT and UPDATE operations) while moving permission checks to application code
3. Enhanced the emailService.js code with better error handling and duplicate invitation checking

**Lessons Learned:**
1. Avoid cross-schema references in RLS policies whenever possible
2. RLS policies can reference the current user (auth.uid()) but should avoid querying other auth tables
3. Sometimes it's better to implement certain permission checks in application code rather than RLS policies
4. More detailed error logging helps identify the exact source of permission issues
5. Always test RLS policies with the actual service role that will be used in production

## Email Sending Implementation

### Email Service Integration (2024-06-08)
**Problem:** The invitation system required sending emails, but React Native doesn't directly support server-side email sending libraries like nodemailer.

**Root Cause:** Email sending typically requires server-side code with access to SMTP servers or mail APIs, which isn't directly available in a React Native client.

**Solution:**
1. Implemented a multi-tier email sending strategy:
   - Primary: Direct Gmail API integration using app password credentials
   - Secondary: EmailJS integration for a more reliable third-party service
   - Development mode: Logging email content instead of actually sending it
2. Enhanced error handling and added fallback mechanisms
3. Created configuration system for email credentials in the .env file

**Lessons Learned:**
1. Mobile apps need to use third-party services or dedicated backends for sending emails
2. Always implement a development mode that doesn't actually send emails
3. Multiple fallback mechanisms ensure higher reliability
4. Comprehensive logging helps debug email sending issues
5. Clear separation of configuration from code makes deployment easier

### User ID Reference Issues (2024-06-08)
**Problem:** When accepting invitations, the app was using `currentUser.uid` instead of `currentUser.id`, causing invitation acceptances to fail.

**Root Cause:** Supabase uses `id` for user IDs, but some parts of the code were still using Firebase conventions with `uid`.

**Solution:**
1. Updated the InvitationContext to use `currentUser.id` instead of `currentUser.uid`
2. Added better error reporting when user IDs are invalid or missing
3. Enhanced the invitation acceptance flow with more detailed logging

**Lessons Learned:**
1. When migrating between auth providers, consistently update all property references
2. Add validation for critical IDs before using them in operations
3. Monitor auth provider documentation for naming conventions

## Database and API Access

### SQL Query Execution (2024-06-08)
**Problem:** Needed to execute SQL scripts to update RLS policies, but the custom script attempted to use a non-existent RPC function.

**Root Cause:** The script assumed the existence of a `run_sql_query` function in Supabase, which doesn't exist by default.

**Solution:**
1. Created documentation on how to run the SQL scripts directly in the Supabase SQL Editor
2. Added instructions for manually updating RLS policies
3. Updated the database scripts to be more self-explanatory

**Lessons Learned:**
1. Don't assume the existence of custom database functions unless they're explicitly created
2. Provide multiple ways to apply database changes (UI, API, scripts)
3. Document all steps required for database changes
4. Test scripts in the exact environment they'll be used in 