# ExpenseTracker Feature Design

## Overview

ExpenseTracker is a mobile application built with React Native and Expo that allows users to track personal and group expenses. It provides functionality similar to Splitwise, enabling users to create groups, add expenses, and settle debts.

## Core Features

### 1. User Authentication

**Description**: Users can create accounts, sign in, and recover passwords using email-based authentication.

**Implementation**:
- Supabase Auth for user management
- Email verification flow
- Profile creation on signup
- Custom AuthContext for managing authentication state

**Key Components**:
- `utils/AuthContext.js`: Manages authentication state and operations
- `services/supabase.js`: Handles interactions with Supabase Auth
- Auth-related screens in the app directory

### 2. User Profiles

**Description**: Each user has a profile with personal information.

**Implementation**:
- Profiles table in Supabase with RLS policies
- Profile creation triggered by user signup
- Profile management UI for user details

**Data Structure**:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile_picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Groups Management

**Description**: Users can create groups, add members, and manage group settings.

**Implementation**:
- Groups table in Supabase with member management
- Group creation UI
- Member invite/removal functionality

**Data Structure**:
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  members UUID[] NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Expense Tracking

**Description**: Users can add personal and group expenses, categorize them, and split costs among group members.

**Implementation**:
- Expenses table in Supabase with flexible splitting options
- Expense creation UI with category selection
- Support for different split types (equal, custom, percentage)

**Data Structure**:
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  paid_by UUID NOT NULL REFERENCES auth.users,
  category JSONB,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_personal BOOLEAN DEFAULT false,
  group_id UUID REFERENCES public.groups,
  split_type TEXT DEFAULT 'equal',
  splits JSONB,
  notes TEXT,
  attachments TEXT[],
  is_settled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Settlement Management

**Description**: Users can settle debts with other users through various payment methods.

**Implementation**:
- Settlements table in Supabase to track payments
- UI for initiating and confirming settlements
- Balance calculation based on expenses and settlements

**Data Structure**:
```sql
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID NOT NULL REFERENCES auth.users,
  to_user UUID NOT NULL REFERENCES auth.users,
  amount DECIMAL NOT NULL,
  group_id UUID REFERENCES public.groups,
  related_expenses UUID[],
  method TEXT,
  notes TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Architecture

### Frontend (React Native/Expo)

- **Navigation**: Tab-based navigation with nested stack navigators
- **State Management**: React Context API for authentication and user data
- **Component Structure**: Reusable UI components for consistency

### Backend (Supabase)

- **Authentication**: Email-based auth with JWT tokens
- **Database**: PostgreSQL with Row Level Security policies
- **Storage**: File storage for expense attachments
- **Security**: Row-level policies to ensure data access control

### Error Handling

- Centralized error handling in service layer
- Enhanced debugging with detailed logging
- Fallback mechanisms for critical operations
- Database verification tools to ensure proper setup

## User Experience Flow

1. **Authentication**:
   - User registers with email/password
   - Email verification
   - Profile creation
   - Login with credentials

2. **Home Screen**:
   - Overview of total balance
   - Recent activity feed
   - Quick actions (add expense, settle up)

3. **Groups**:
   - List of user's groups
   - Group creation flow
   - Group detail view with members and expenses

4. **Expenses**:
   - Add expense flow with split options
   - Expense history view
   - Expense detail view
   - Edit/delete expense options

5. **Settlements**:
   - View balances with other users
   - Settle up flow
   - Settlement confirmation
   - Settlement history

## Future Enhancements

1. **Notifications**: Push notifications for new expenses, settlements, and group invites
2. **Offline Support**: Local caching for offline operation
3. **Expense Categories**: Custom categories and reporting
4. **Data Visualization**: Charts and graphs for expense analysis
5. **Image Recognition**: Scan receipts to automatically add expenses

# Feature Design: Group Invitation System

## Problem Statement
Currently, users can only add existing app users to groups. There is no way to invite friends who haven't yet joined the app, limiting the growth potential of groups and the app itself.

## Solution Design
We've implemented a comprehensive group invitation system that allows users to invite anyone via email, whether or not they already have an account in the app.

### Key Components

1. **Group Invitations Database Table**
   - Stores pending invitations with email, group ID, inviter information, status, and expiration dates
   - Tracked states: pending, accepted, declined, expired

2. **Email Service**
   - API for sending invitation emails to non-registered users
   - Functions for checking pending invitations
   - Methods for accepting or declining invitations

3. **Invitation Context**
   - Global state management for tracking and handling invitations
   - Automatically checks for pending invitations on login
   - Provides hooks for components to access invitation data

4. **Integration Points**
   - **Add Member Screen**: Enhanced to allow inviting users by email if they're not found in the system
   - **Invitations Screen**: New dedicated screen for managing pending invitations 
   - **Email Integration**: Uses Supabase Edge Functions to deliver invitation emails

### User Flows

1. **Inviting a New User**
   - User searches for an email in the Add Member screen
   - If the email isn't found, the system offers to send an invitation
   - Invitation is recorded in the database and email is sent

2. **Accepting an Invitation (New User)**
   - User receives email with invitation link
   - User signs up for account
   - On first login, system detects pending invitations for the email
   - User is prompted to accept or decline the invitations

3. **Accepting an Invitation (Existing User)**
   - On login, system detects pending invitations for the user's email
   - User is notified and can view/manage invitations
   - User can accept or decline each invitation

### Technical Implementation

1. **Database Schema**
   - `group_invitations` table with proper indexing and relationships
   - Row-Level Security policies to control access

2. **API Design**
   - `sendGroupInvitation(email, groupId, groupName, inviterName)`
   - `getPendingInvitations(email)`
   - `acceptInvitation(invitationId, userId)`
   - `declineInvitation(invitationId)`

3. **UI Components**
   - Enhanced search in Add Member screen with invitation option
   - New Invitations screen with accept/decline functionality
   - Notification system for pending invitations

### Benefits
- Increases user acquisition through word-of-mouth invitations
- Improves group creation experience by removing friction
- Creates natural viral growth loops for the application
- Enhances overall user experience by supporting real-world social connections

# Feature Design: Real-time Data Refresh Implementation

## Problem Statement
When settlements are recorded in the ExpenseTracker app, the UI doesn't automatically refresh to show updated balances on the Group Details and Home screens. This creates a disconnect between the database state and what's displayed to the user, requiring manual refreshes.

## Solution Design
We've implemented a global state management solution using React Context API to automatically refresh relevant screens when data changes.

### Key Components

1. **RefreshContext**
   - A centralized state management system that tracks the last refresh timestamp for different data resources
   - Provides methods to trigger refreshes and check if data is stale

2. **Integration Points**
   - **Settle Screen**: Triggers a refresh when settlements are created
   - **Group Details Screen**: Listens for refresh events to update balances and settlement plans
   - **Home Screen**: Listens for refresh events to update user balances

### Implementation Details

#### RefreshContext
- Maintains timestamps for different data resources (settlements, expenses, groups, balances)
- Provides a `triggerRefresh` method to notify other components about data changes
- Provides a mechanism to check if data is stale and needs refreshing

#### Screen Updates
- Each relevant screen checks for changes in the refresh timestamps
- When timestamps indicate newer data is available, the screen automatically fetches fresh data
- This approach avoids unnecessary API calls while ensuring UI remains up-to-date

## Benefits
- **Improved User Experience**: Users see up-to-date balances without requiring manual refresh
- **Data Consistency**: UI accurately reflects the database state
- **Maintainability**: Using a context-based approach allows for easy extension to other screens and data types

## Future Enhancements
- Consider using React Query or SWR for more advanced caching and stale data management
- Implement optimistic UI updates for faster perceived performance
- Add websocket support for real-time updates across multiple devices 

# Feature Design: Custom Split for Group Expenses

## Problem Statement
When splitting expenses in a group, the default equal split doesn't always represent the actual distribution of costs. Users need a way to specify exactly how much each person owes for a particular expense instead of simply dividing the total equally.

## Solution Design
We've implemented a custom split feature that allows users to specify exactly how much each group member owes for a group expense, providing more flexibility and accuracy in expense tracking.

### Key Components

1. **Database Support**
   - The existing expenses table already supports custom splits through:
     - `split_type` field (can be 'equal' or 'custom')
     - `splits` JSONB field storing custom split amounts per user

2. **User Interface**
   - Split Type Selector: Toggle between "Equal Split" and "Custom Split"
   - Member Split Form: When "Custom Split" is selected, displays each group member with an input field
   - Real-time Validation: Visual feedback showing if splits are correct, incomplete, or excessive

3. **Balance Calculation**
   - The system already handles both equal and custom splits when calculating balances
   - For custom splits, each member owes exactly their specified amount

### User Flow

1. **Creating a Group Expense with Custom Split**
   - User selects a group for the expense
   - User enters expense details (title, amount, category)
   - User selects "Custom Split" option
   - User enters specific amount for each group member
   - System validates that the sum of splits equals the total expense amount
   - User creates the expense with custom splits

2. **Validation and Feedback**
   - Real-time sum calculation of all splits
   - Visual indicators showing:
     - "Splits are correct" (when sum equals total)
     - "X amount left to assign" (when sum is less than total)
     - "X excess assigned" (when sum exceeds total)

### Technical Implementation

1. **State Management**
   - `splitType` state to track split type ('equal' or 'custom')
   - `customSplits` object mapping member IDs to amount values
   - Functions to initialize splits, handle changes, and validate totals

2. **UI Components**
   - Split type selection buttons
   - Dynamic rendering of member input fields
   - Status indication with appropriate styling

3. **Input Validation**
   - Numeric input handling with decimal support
   - Precise calculation accounting for floating-point precision issues
   - Prevention of invalid expense creation

### Benefits
- More accurate expense division based on actual consumption or responsibility
- Flexibility for scenarios where equal splits don't make sense
- Better representation of real-world financial arrangements within groups
- Reduced need for adjustments and manual calculations outside the app 