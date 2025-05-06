# ExpenseTracker

A mobile app for tracking and splitting expenses with friends and family, similar to Splitwise. Built with React Native and Expo, with Supabase as the backend.

## Features

- Create and manage expense groups
- Add expenses and split them among group members
- Calculate balances for each member
- Settle debts between members
- Invite new users via email to join groups
- Real-time UI updates when settlements are recorded

## Tech Stack

- **Frontend**: React Native, Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: React Context API
- **Navigation**: Expo Router

## Project Structure

```
/app                    # Main application screens using Expo Router
  /(tabs)               # Tab-based navigation screens
  /group                # Group-related screens
/components             # Reusable UI components
/services               # API and service layer
/utils                  # Utility functions and context providers
/supabase               # Supabase related files (Edge Functions)
/scripts                # Database setup scripts
/docs                   # Documentation
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- A Supabase account and project

### Setup

1. Clone the repository
   ```
   git clone <repository-url>
   cd ExpenseTracker
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL scripts from the `/scripts` directory to set up the database schema
   
4. Create a `.env` file with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. (Optional) Configure email sending for invitations:
   ```
   # Google Email (primary method)
   EXPO_PUBLIC_GOOGLE_EMAIL=your-gmail-address@gmail.com
   EXPO_PUBLIC_GOOGLE_APP_PASSWORD=your-app-password

   # EmailJS (alternative method)
   EXPO_PUBLIC_EMAILJS_SERVICE_ID=your-emailjs-service-id
   EXPO_PUBLIC_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
   EXPO_PUBLIC_EMAILJS_USER_ID=your-emailjs-user-id
   
   # App URL for deep links
   EXPO_PUBLIC_APP_URL=expensetracker://app
   ```
   
   Note: If email configuration is not provided, the app will run in development mode and log emails instead of sending them.

6. Start the development server
   ```
   npm start
   ```

## Database Setup

The application requires several tables in your Supabase project:

- `profiles`: User profiles
- `groups`: Expense groups
- `expenses`: Individual expenses
- `settlements`: Records of debt settlements
- `group_invitations`: Invitations to join groups

Run the SQL scripts in the `/scripts` directory to set up these tables with the correct relationships and policies.

## Group Invitation System

The app includes a complete system for inviting non-registered users to join groups:

1. **Inviting Users**:
   - Search for users by email in the Add Member screen
   - If no user is found, send an invitation to their email

2. **Managing Invitations**:
   - Pending invitations are tracked in the database
   - Users can view and manage their invitations in the Invitations screen
   - Invitations can be accepted or declined

3. **Email Notifications**:
   - Emails can be sent using Google credentials or EmailJS
   - Emails include a deep link to open the app and view the invitation
   - Development mode logs emails instead of sending them

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.