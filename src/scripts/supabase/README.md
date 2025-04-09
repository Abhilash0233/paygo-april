# Supabase Migration Scripts

This directory contains SQL migration scripts for Supabase. These scripts help set up the necessary tables and data structures for the app.

## Policy Pages Migration

The `policy_pages_migration.sql` script sets up the policy pages table in Supabase, which stores content for the following pages:

- About Us
- Privacy Policy
- Terms & Conditions
- Cancellation Policy

### How to Run the Migration

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `policy_pages_migration.sql` and paste it into the SQL Editor
4. Run the query to create the table and insert initial data

### Table Structure

The `policy_pages` table has the following structure:

- `id`: UUID, primary key
- `title`: TEXT, the page title
- `content`: TEXT, HTML content of the page
- `slug`: TEXT, unique identifier for the page (e.g., 'about-us')
- `is_published`: BOOLEAN, whether the page is visible to users
- `last_updated`: TIMESTAMP, when the content was last updated
- `created_at`: TIMESTAMP, when the record was created
- `updated_at`: TIMESTAMP, automatically updated when the record changes

### Row-Level Security (RLS)

The table has RLS policies that allow:
- Anyone to read published pages
- Only authenticated users with admin role to create/update/delete pages

### Updating Content Via Supabase Dashboard

To update page content as an admin:

1. Login to the Supabase dashboard
2. Navigate to the Table Editor
3. Select the `policy_pages` table
4. Find the page you want to update and click Edit
5. Update the `content` field with the new HTML content
6. Update the `last_updated` field to the current timestamp
7. Click Save

Changes will be reflected in the app in real-time thanks to Supabase's realtime features.

## Using Policy Pages in the App

The app uses the `PolicyPageContent` component to display these pages. This component:

1. Fetches the content from Supabase based on the page slug
2. Displays a loading spinner while data is being fetched
3. Renders the HTML content once available
4. Falls back to hardcoded content if Supabase data cannot be fetched
5. Subscribes to real-time updates, so changes from the admin dashboard appear immediately

To add a new policy page to the app:

1. Add a new entry in the `PolicyPageType` enum in `src/services/supabase/policyPagesService.ts`
2. Create a new screen component that uses the `PolicyPageContent` component
3. Add the screen to your navigation

## Users & Wallet Migration

The `users_migration.sql` script sets up the users table in Supabase with integrated wallet functionality. This migration combines user profiles and wallet data into a single table for simpler data management.

### How to Run the Migration

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. First, run the `users_migration.sql` script to create the users and wallet_transactions tables
4. Then, run the `increment_login_count.sql` script to create the function for incrementing login counts

### Test User Support

If you need to use test users (with IDs starting with 'DEV-') in your development environment:

1. Execute the `enable_test_users.sql` script in the SQL Editor
2. This script:
   - Creates a policy to allow wallet transactions for test users
   - Updates the `increment_login_count` function to handle test users properly

### Migration Features

- Integrated wallet balance in the user profile table
- Wallet transactions stored in a separate table
- Automatic balance updates through database triggers
- Row-level security policies for secure access control
- Functions to generate short user IDs and increment login counts

### Table Structure

#### Users Table

The `users` table has the following structure:

- `id`: UUID, primary key
- `user_id`: TEXT, unique short ID (e.g., PG-1234-ABCD)
- `phone_number`: TEXT, unique user phone number
- `display_name`: TEXT, user's name
- `email`: TEXT, user's email address
- `photo_url`: TEXT, profile image URL
- `whatsapp_enabled`: BOOLEAN, whether WhatsApp notifications are enabled
- `profile_complete`: BOOLEAN, whether profile setup is complete
- `email_verified`: BOOLEAN, whether email is verified
- `notifications_enabled`: BOOLEAN, whether notifications are enabled
- `is_first_time_user`: BOOLEAN, whether this is the user's first login
- `login_count`: INTEGER, number of times user has logged in
- `username`: TEXT, username for display
- `device_info`: TEXT, information about user's device
- `wallet_balance`: DECIMAL, user's wallet balance
- `wallet_created_at`: TIMESTAMP, when wallet was created
- `created_at`: TIMESTAMP, when user was created
- `last_login`: TIMESTAMP, when user last logged in
- `last_updated`: TIMESTAMP, when user was last updated

#### Wallet Transactions Table

The `wallet_transactions` table has the following structure:

- `id`: UUID, primary key
- `user_id`: TEXT, references users.user_id
- `amount`: DECIMAL, transaction amount (positive for deposits/refunds, negative for deductions)
- `type`: TEXT, transaction type (deposit, booking, refund)
- `description`: TEXT, transaction description
- `reference`: TEXT, optional reference ID (for booking or refund)
- `created_at`: TIMESTAMP, when transaction was created

### Row-Level Security (RLS)

The tables have RLS policies that allow:
- Anyone to check if a phone number exists
- Users to view and update their own profiles
- Users to view their own wallet transactions
- Service role to manage all users and transactions

## Using These Tables in the App

The app uses the Supabase service to interact with these tables. To use these tables in your app:

1. Set up the Supabase client in your app
2. Use the service files in `src/services/supabase/` to interact with the data
3. Update your UI components to use the new data structures

For example, to get a user's profile:

```typescript
import { getUserProfile } from '../../services/supabase/userService';

// In your component
const userProfile = await getUserProfile(userId);
```

To add funds to a wallet:

```typescript
import { addToWallet } from '../../services/supabase/userService';

// In your component
const { success, balance } = await addToWallet(userId, amount, 'Wallet recharge');
```

## Troubleshooting

### Test User Creation
If you're encountering issues with creating test users in the development environment (those with IDs starting with 'DEV-'), run the `enable_test_users.sql` script:

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `enable_test_users.sql`
4. Run the script

This script adds specific policies that allow test users to be created without normal authentication requirements, which is useful for development and testing.

### Issues with UUID Generation
If you're seeing errors related to invalid UUID formats, ensure you're using the most recent version of the `userService.ts` file, which includes robust UUID generation that works in all environments including React Native.

## Wallet Functionality

In the Firebase implementation, wallet functionality was in a separate service. With the migration to Supabase, the wallet functionality has been fully integrated into the user service for simplicity and performance.

### Wallet Features in User Service

The following wallet functions are now available in `src/services/supabase/userService.ts`:

1. **Getting Wallet Balance**
   ```typescript
   const balance = await getWalletBalance(userId);
   ```

2. **Adding Funds to Wallet**
   ```typescript
   const { success, balance } = await addToWallet(userId, amount, 'Wallet recharge');
   ```

3. **Deducting Funds for Bookings**
   ```typescript
   const { success, balance } = await deductFromWallet(userId, amount, 'Booking payment', bookingId);
   ```

4. **Processing Refunds**
   ```typescript
   const { success, balance } = await processRefund(userId, amount, 'Booking refund', bookingId);
   ```

5. **Getting Transaction History**
   ```typescript
   const transactions = await getWalletTransactions(userId, 20);
   ```

### Database Structure

Wallet data is stored in two tables:
- `users` table contains the `wallet_balance` field
- `wallet_transactions` table contains the transaction history

The wallet balance is automatically updated through database triggers when transactions are added. 