# ExpenseTracker App

A mobile application for tracking personal and shared expenses, inspired by Splitwise.

## Features

- **User Authentication**: Secure login and registration using Supabase Auth
- **Group Management**: Create groups for shared expenses with friends, family, or colleagues
- **Expense Tracking**: Log personal and group expenses with categories, notes, and split options
- **Balance Calculation**: Automatically calculate who owes what to whom
- **Settlement**: Generate optimal settlement plans to minimize the number of transactions
- **INR Currency**: Built with ₹ (Indian Rupee) as the default currency

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (Auth, Database, Storage)
- **State Management**: React Context API
- **Navigation**: Expo Router

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ExpenseTracker.git
   cd ExpenseTracker
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up Supabase
   - Create a new Supabase project
   - Run the SQL scripts in the `scripts` folder to set up the database schema
   - Update the Supabase URL and key in `services/supabase.js`

4. Start the development server
   ```bash
   npm start
   ```

5. Run on your device
   - Scan the QR code with the Expo Go app
   - Or press 'a' to run on Android emulator
   - Or press 'i' to run on iOS simulator

## Database Schema

- **profiles**: User profiles with names, emails, and profile pictures
- **groups**: Group information including members, name, and description
- **expenses**: Expense records with amount, category, split information
- **settlements**: Records of completed settlements between users

## Screenshots

(Coming soon)

## License

MIT

## Contributors

(Your name here)
