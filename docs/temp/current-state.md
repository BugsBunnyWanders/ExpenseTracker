# ExpenseTracker Project - Current State

## Overview

The ExpenseTracker is a React Native mobile application built with Expo and Supabase for tracking personal and group expenses. The app allows users to:

- Create and manage user accounts
- Create expense groups and add members
- Track personal and group expenses
- Calculate balances and settle debts
- Invite non-registered users via email

## Current Status

### Completed Features

- User authentication (signup, login, logout) using Supabase Auth
- User profile management
- Core database schema in Supabase for:
  - User profiles
  - Groups
  - Expenses
  - Settlements
  - Group invitations
- Proper Row Level Security (RLS) policies for data access
- Improved error handling for database operations
- Database verification utilities
- Complete expense tracking UI with INR currency support
- Expense details page with edit and delete functionality
- Settlement process implementation in groups
- Settle up functionality for recording completed settlements
- Real-time UI updates after settlement completion using RefreshContext
- Group invitation system with email notifications
- Multi-tier email sending system with fallback options
- Custom split functionality for group expenses:
  - UI for specifying custom split amounts for each member
  - Real-time validation of split amounts
  - Visual indicators for split status (correct, incomplete, excess)
  - Balance calculations supporting both equal and custom splits

### In Progress Features

- Data visualization for expense trends
- Attachment handling for expense receipts

### Fixed Issues

1. **Empty Error Objects**: Fixed issue with empty error objects being returned from Supabase operations which indicated missing database tables or incorrect permissions
2. **Profile Creation Race Conditions**: Improved the profile creation process to handle situations where the database trigger and manual creation might conflict
3. **Database Verification**: Added a comprehensive database check script to verify if required tables exist
4. **Missing getUsersByIds Function**: Added missing function in userService.js to retrieve multiple user profiles by their IDs in a single operation, enabling proper group member data display
5. **Missing calculateSettlementPlan Function**: Added missing function in settlementService.js to calculate an optimal debt settlement plan for a group, minimizing the number of transactions needed
6. **Currency Display**: Updated all currency displays to use INR (₹) as the default currency instead of USD
7. **Settlement Flow**: Implemented a complete settlement flow for groups, allowing users to record completed settlements
8. **Settlement UI Updates**: Fixed issue where settlement updates weren't reflecting in the UI until manual refresh
9. **Permission Denied for Group Invitations**: Fixed RLS policies to eliminate "permission denied for table users" errors
10. **User ID Reference Issues**: Fixed references to user IDs to consistently use Supabase conventions

### Known Issues

1. **SQL Script Execution**: The custom script for executing SQL statements requires the `run_sql_query` RPC function, which may not exist in all Supabase instances. Manual SQL execution in the Supabase dashboard is recommended.

## Technical Implementation

### Key Files

- `services/supabase.js`: Enhanced with robust error handling and table existence checks
- `utils/AuthContext.js`: Improved error handling and profile management
- `services/userService.js`: Added functions for user profile management and retrieval
- `services/expenseService.js`: Added comprehensive expense management features
- `services/settlementService.js`: Implemented settlement calculations and recording functionality
- `services/emailService.js`: Added email sending capabilities with multiple fallback methods
- `utils/RefreshContext.js`: Context provider for real-time UI updates
- `utils/InvitationContext.js`: Context provider for managing group invitations
- `app/settle.js`: Created new screen for settling up expenses
- `app/expense/[id].js`: Added detailed expense view
- `app/invitations.js`: Added screen for managing pending invitations
- `utils/formatters.js`: Added utilities for formatting dates and currency
- `constants/categories.js`: Defined expense categories

### Database Schema

The database includes the following tables:
- `profiles`: User profile information
- `groups`: Group information and members
- `expenses`: Expense records (personal and group)
- `settlements`: Records of debt settlements
- `group_invitations`: Invitations to join groups for non-registered users

Each table has appropriate RLS policies to ensure proper access control.

## Technical Issues Fixed

- Database RLS policies for accessing profiles and expenses
- Email confirmation flow for new user registration
- Group invitation and member management
- Node.js module compatibility issues in React Native environment
  - Fixed ws module dependency on Node.js stream module
  - Created polyfills for required Node.js built-in modules
  - Configured Metro bundler with custom resolvers

## Next Steps

1. Complete data visualization for expense trends
2. Implement budget tracking features
3. Add attachments for expense receipts
4. Improve notification system for new expenses and settlements
5. Enhance UI/UX with animations and transitions
6. Add offline support with data syncing
7. Implement recurring expenses functionality