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