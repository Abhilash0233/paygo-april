# Migrating User Profiles and Wallet from Firebase to Supabase

This document outlines the steps to migrate user profiles and wallet functionality from Firebase to Supabase.

## Migration Status: ✅ Complete

### Completed:
- ✅ Created Supabase database schema for users and wallet transactions
- ✅ Created SQL migration script (`users_migration.sql`)
- ✅ Fixed pg_crypto extension issue in SQL migration script
- ✅ Created SQL function for incrementing login count (`increment_login_count.sql`)
- ✅ Implemented Supabase user service (`src/services/supabase/userService.ts`)
- ✅ Created Supabase authentication service (`src/services/supabase/authService.ts`)
- ✅ Updated authentication context to use Supabase (`src/services/authContext.tsx`)
- ✅ Updated profile creation screen to use Supabase (`src/screens/auth/ProfileCreationScreen.tsx`)
- ✅ Marked Firebase wallet service as deprecated (`src/services/walletService.ts`)
- ✅ Marked Firebase user service as deprecated (`src/services/userService.ts`)
- ✅ Created data migration script to move existing users from Firebase to Supabase (`src/scripts/firebase-to-supabase-migration.js`)

### Next Steps:
- Run the migration script to transfer user data
- Test the authentication flow end-to-end
- Remove deprecated Firebase files once migration is confirmed successful

## Overview

In this migration, we're moving the following functionality from Firebase to Supabase:

1. User profiles - store user account information
2. Wallet functionality - integrated into the user profile table
3. Wallet transactions - stored in a separate table

A major improvement in this migration is combining the user profile and wallet into a single table, simplifying the data model and reducing the need for multiple queries.

## Migration Steps

### 1. Create Tables in Supabase

Run the SQL migration scripts in the Supabase SQL Editor:

1. Run `src/scripts/supabase/users_migration.sql` to create the users and wallet_transactions tables
2. Run `src/scripts/supabase/increment_login_count.sql` to create the function for incrementing login counts

### 2. Create Service Files

Create the Supabase service implementation:

1. `src/services/supabase/userService.ts` - User profile and wallet functionality combined in one service

### 3. Update Authentication Flow

Update the authentication flow to use Supabase:

1. Update `authContext.ts` to use Supabase for phone OTP authentication
2. Update `PhoneAuthScreen.tsx` to work with the new authentication flow
3. Update `ProfileCreationScreen.tsx` to use the Supabase user service

### 4. Update UI Components

Update UI components that use user profiles and wallet functionality:

1. Profile settings screens
2. Wallet balance display
3. Transaction history views

### 5. Migrate Data

Create a data migration script to move existing users from Firebase to Supabase.

## Data Structure Migration

### Firebase Structure (Old)

#### User Profile
```typescript
interface UserProfile {
  id: string;
  phoneNumber: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  whatsappEnabled?: boolean;
  profileComplete?: boolean;
  emailVerified?: boolean;
  createdAt: any; // Firestore timestamp
  lastLogin: any; // Firestore timestamp
  lastUpdated?: any; // Firestore timestamp
  deviceInfo?: string;
  notificationsEnabled?: boolean;
  isFirstTimeUser: boolean;
  loginCount?: number;
  username?: string;
}
```

#### Wallet Document
```typescript
interface Wallet {
  balance: number;
  updatedAt: any; // Firestore timestamp
  createdAt: any; // Firestore timestamp
  userId: string;
}
```

#### Wallet Transaction
```typescript
interface WalletTransaction {
  userId: string;
  amount: number;
  type: TransactionType; // 'deposit' | 'booking' | 'refund'
  description: string;
  timestamp: any; // Firestore timestamp
  reference?: string;
  id?: string;
}
```

### Supabase Structure (New)

#### User Profile with Integrated Wallet
```typescript
interface UserProfile {
  id: string; // UUID from Supabase
  user_id: string; // Short format ID (e.g., PG-1234-ABCD)
  phone_number: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  whatsapp_enabled?: boolean;
  profile_complete?: boolean;
  email_verified?: boolean;
  created_at: string;
  last_login: string;
  last_updated?: string;
  device_info?: string;
  notifications_enabled?: boolean;
  is_first_time_user: boolean;
  login_count?: number;
  username?: string;
  
  // Wallet fields
  wallet_balance: number;
  wallet_created_at?: string;
}
```

#### Wallet Transaction
```typescript
interface WalletTransaction {
  id?: string;
  user_id: string;
  amount: number;
  type: TransactionType; // 'deposit' | 'booking' | 'refund'
  description: string;
  reference?: string;
  created_at?: string;
}
```

## Testing Strategy

1. Test user creation and login flow
2. Test profile creation and updates
3. Test wallet operations:
   - Adding funds
   - Deducting funds
   - Processing refunds
   - Viewing transaction history
4. Test error handling and edge cases

## Benefits of Migration

1. **Simplified Data Model**: User profile and wallet are combined in one table
2. **Improved Performance**: Fewer database queries needed
3. **Better Data Consistency**: Database triggers ensure wallet balances are accurate
4. **Enhanced Security**: Row-level security policies ensure proper access control
5. **Real-time Updates**: Supabase offers real-time subscriptions for live updates

## Troubleshooting

If issues arise during or after migration:

1. Check Supabase dashboard for error logs
2. Verify SQL migration scripts executed correctly
3. Ensure proper formatting of phone numbers and user IDs
4. Test with sample data before full migration
5. Implement fallback mechanisms for critical operations

## Future Improvements

1. Add migration script to move Firebase users to Supabase
2. Implement real-time subscriptions for wallet updates
3. Add comprehensive error handling and recovery mechanisms
4. Create admin dashboard for user management
5. Enhance wallet features with transaction categorization and analytics 