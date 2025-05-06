# Changelog

## [Unreleased]

### Added
- **Group Invitation System**: Implemented a complete system for inviting non-registered users to join groups via email.
  - Added `emailService.js` with functions for handling invitations
  - Created SQL scripts to set up the `group_invitations` table
  - Added `InvitationContext.js` to track and manage invitations
  - Enhanced `add-member.js` to support inviting users by email
  - Added a new `invitations.js` screen for managing pending invitations
  - Updated the app layout to include the invitation system

- **Real-time Data Refresh System**: Implemented a global state management solution using React Context to automatically refresh UI when settlements are recorded.
  - Added `RefreshContext.js` to manage refresh state across the app
  - Updated `app/_layout.tsx` to provide the refresh context to all screens
  - Modified `app/settle.js` to trigger refresh events when settlements are created
  - Enhanced `app/group/[id].js` to listen and respond to refresh events
  - Enhanced `app/(tabs)/index.tsx` (Home screen) to listen and respond to refresh events

- **Enhanced Email Sending System**: Implemented a robust email system for group invitations.
  - Created a multi-tier approach with Google API and EmailJS integrations
  - Added development mode that logs emails instead of sending them
  - Enhanced error handling with fallback mechanisms
  - Implemented configuration system for email credentials

### Fixed
- **Fixed permission errors in group invitations**: Modified RLS policies to resolve "permission denied for table users" error
  - Updated RLS policies to not reference auth.users table in USING clause
  - Enhanced invitation handling in emailService.js with better error handling and logging
  - Added script to fix permissions in existing databases

- **Fixed User ID reference issues**: Updated InvitationContext to use correct Supabase user ID property
  - Changed currentUser.uid references to currentUser.id to match Supabase conventions
  - Added validation for user IDs before database operations
  - Enhanced error logging for user ID related issues

- **Settlement data now properly updates across all relevant screens when settlements are recorded**
- **Balance information is kept in sync between the database and UI**
- **Fixed settlement balances not reflecting in UI**: Modified `calculateGroupBalances` function to consider settlements when calculating balances
- **Fixed home page balance calculation**: Enhanced Home page to calculate accurate user balances across all groups
- **Standardized currency to INR**: Updated all currency displays to use the Indian Rupee (₹) symbol

### Documentation
- **Added comprehensive documentation for RLS issues**: Created detailed guidance on fixing permission problems
- **Enhanced invitation system documentation**: Added details about email sending implementation and troubleshooting
- **Updated memory.md with lessons learned**: Documented insights about email integration in React Native apps

## [Previous Changes]

### Removed
- Reverted previously added EventEmitter-based refresh system
- Removed duplicate dashboard tab

## [1.0.0] - Current Development

### Added
- Initial project setup with Expo
- Authentication system using Supabase
- User profile management
- Group creation and management
- Expense tracking for personal and group expenses
- Settlement tracking
- Database verification utilities
- Database warning component to notify users of setup issues
- Profile recovery script for fixing missing profiles
- App wrapper component for global UI elements

### Fixed
- Enhanced error handling for Supabase operations
- Fixed empty error object detection and reporting
- Improved profile creation during signup process
- Added database verification to check table existence
- Disabled WebSocket connections for better compatibility
- Added fallback profile creation mechanism
- Fixed race conditions in profile management
- Added database availability state to the auth context
- Added detailed setup instructions for Supabase database setup
- Improved auth context to better handle missing database tables

### Changed
- Migrated from Firebase to Supabase for backend services
- Enhanced logging for better debugging
- Improved error messages for database operations
- Updated README with better setup instructions
- Added detailed documentation for database setup
- Improved AuthContext with better error handling

### Security
- Implemented proper RLS policies for database tables
- Added secure user profile management
- Implemented proper authentication flow with email verification
- Added secure database access patterns

## [0.1.0] - Initial Setup - 2023-05-05
### Added
- Initialized React Native project with Expo
- Installed dependencies: React Navigation, Firebase, AsyncStorage
- Created basic project structure
- Added documentation files
- Set up feature design specification

## [0.2.0] - Authentication & Basic UI - 2023-05-05
### Added
- Firebase configuration setup
- Authentication Context for managing user state
- Login, Register, and Forgot Password screens
- Dashboard with balance overview
- Groups management screen with create group functionality
- Expenses tracking screen with add expense functionality
- User profile screen with edit profile and logout features
- Tab-based navigation structure

## [0.3.0] - Firebase Services & Data Models - 2023-05-06
### Added
- Firebase Firestore services for groups, expenses, users, and settlements
- Implemented data models for expenses, groups, and users
- Balance calculation logic for group expenses
- Group membership management

### Fixed
- Firebase initialization with AsyncStorage persistence
- Resolved circular dependency in Firebase service initialization

## [0.4.0] - Migration to Supabase - 2023-05-07
### Changed
- Migrated from Firebase to Supabase for authentication and database
- Updated all service files to use Supabase client
- Modified data models to match Supabase's conventions (snake_case fields)
- Updated AuthContext to use Supabase authentication

### Added
- Added Supabase client configuration
- Implemented profile picture storage using Supabase Storage
- Added friend relationship management in Supabase

### Fixed
- Resolved persistent Firebase initialization issues by switching to Supabase

## [0.4.1] - Supabase Compatibility Fixes - 2023-05-07
### Added
- Created polyfills for Node.js modules used by WebSocket dependencies
- Added a postinstall script to automatically set up polyfills
- Implemented custom fetch handler to block WebSocket connections

### Fixed
- Fixed "attempted to import Node standard library module 'stream'" error
- Disabled Supabase realtime subscriptions that were causing compatibility issues
- Resolved persistent Firebase initialization issues by switching to Supabase 

## [0.5.0] - CRUD Operations & Error Handling Improvements - 2023-05-08
### Added
- Database setup script with SQL for creating tables and RLS policies
- Network diagnostics tool for debugging Supabase connectivity
- Detailed setup instructions for Supabase
- Enhanced logging for Supabase operations
- Database trigger for automatic profile creation

### Fixed
- Profile creation issues during signup
- Group management CRUD operations
- Expense tracking CRUD operations
- User profile updates
- Authentication session persistence
- Error handling throughout the application

### Changed
- Improved error reporting with detailed logs
- Enhanced validation for user inputs
- Added fallback mechanisms for critical operations
- Updated authentication flow with better session management

## [1.0.1] - Database Setup Improvements - 2023-05-09
### Added
- New `check-db` and `fix-profiles` npm scripts
- Comprehensive database checking script
- Profile recovery script for fixing missing profiles
- User-friendly database warning component
- AppWrapper component for global UI overlays

### Fixed
- Database missing tables now properly detected and reported
- Added clear setup instructions for Supabase
- Improved AuthContext with database availability tracking
- Better error messaging for database setup issues

## [1.0.2] - "Profiles Table Not Found" Fix - 2023-05-10
### Added
- Created test-table-function.js script to directly test database functions
- Added clear-cache script to reset local storage and Metro cache
- Enhanced troubleshooting documentation with step-by-step solutions

### Fixed
- Fixed issue with "Profiles table not found" error when table exists
- Improved table existence check in AuthContext
- Updated checkDatabaseAvailability to handle different response formats
- Added direct table access verification as a fallback check
- Enhanced the DatabaseWarning component with more detailed instructions
- Structured troubleshooting guide in setup-instructions.txt

### Changed
- Made AuthContext more resilient to different response formats
- Added extensive debugging logs for database availability checks 

## 2025-05-05
- Fixed: Modified authentication system to bypass email confirmation requirement
- Enhanced: Created a SQL script with trigger to automatically confirm user emails
- Added: New apply-db-changes.js script to make database modifications easier
- Added: Comprehensive documentation for disabling email confirmation
- Updated: README.md with instructions for handling email confirmation issues
- Enhanced: Added npm scripts for applying database changes and disabling email confirmation
- Fixed: Resolved "invalid input syntax for type uuid: undefined" errors in profile updates
- Added: UserAdapter utility to provide consistent access to user properties across auth providers
- Enhanced: Added validation in updateUserProfile and createProfile functions
- Fixed: Updated screens to properly access user properties using adapter functions
- Enhanced: Added detailed error logging for user ID related issues 

## 2025-05-06
- Fixed: Added proper RLS policies to resolve "Table does not exist" errors
- Added: SQL script to configure Row Level Security policies for all tables
- Added: get_rls_policies() function to check RLS configuration
- Enhanced: Documented process for fixing database access issues
- Added: New fix-db-access npm script 

## [1.0.3] - 2025-05-11
### Added
- Implemented getUsersByIds function in userService.js to efficiently retrieve multiple user profiles in one operation
- Added calculateSettlementPlan function to settlementService.js to generate optimal debt settlement plans for groups
- Created comprehensive expense detail page at app/expense/[id].js
- Created settlement workflow with app/settle.js for recording settlements
- Added utility functions for date and currency formatting
- Created constants file for expense categories
- Added INR (₹) currency support across the application

### Fixed
- Fixed "[TypeError: 0, _userService.getUsersByIds is not a function (it is undefined)]" error in group details screen
- Fixed "[TypeError: 0, _settlementService.calculateSettlementPlan is not a function (it is undefined)]" error in settlement plan generation
- Improved group member data display in group details page
- Enhanced settlement tab in group details page with proper transaction recommendations

### Changed
- Updated currency display from USD ($) to INR (₹) throughout the application
- Enhanced expense list items with formatted date and currency
- Improved expense input form with dedicated currency symbol display 