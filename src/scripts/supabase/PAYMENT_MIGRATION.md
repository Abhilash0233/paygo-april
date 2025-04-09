# Payment Gateway Configuration Migration

This document outlines the process of migrating the payment gateway configuration from Firebase to Supabase.

## Overview

The application uses Razorpay as the payment gateway, with the ability to switch between test and production modes. Previously, this configuration was stored in Firebase Firestore. Now, we've moved this functionality to Supabase for better integration with the rest of the application.

## Migration Steps

### 1. Create the Supabase Table

Run the SQL migration script to create the `payment_config` table in Supabase:

```bash
# From the project root directory
npx supabase migration up 20230615_add_payment_config_table.sql
```

This creates a table with proper RLS (Row Level Security) policies to ensure only admin users can view or modify the configuration.

### 2. Migrate Existing Configuration

To transfer the existing configuration from Firebase to Supabase, run the migration script:

```bash
# From the project root directory
npx ts-node src/scripts/migrate-payment-config.ts
```

This script will:
- Fetch the current configuration from Firebase
- Create or update the configuration in Supabase
- Log the results of the migration

### 3. Update Application Code

The application code has been updated to use the new Supabase-based payment configuration service:

1. A new `paymentConfigService.ts` file has been created in the `src/services/supabase` directory
2. The Razorpay service has been updated to import from the new service
3. The old Firebase-based service can be deleted after confirming everything works correctly

## Admin Interface

An admin panel component has been created to manage the payment gateway configuration:

- Located at `src/components/admin/PaymentConfigPanel.tsx`
- Only visible to users with admin privileges
- Allows toggling between test and live modes with confirmation prompts

## Data Structure

The payment configuration is stored in Supabase with the following structure:

```typescript
interface PaymentConfig {
  isLiveMode: boolean;  // Whether to use live (true) or test (false) mode
  lastUpdated: string;  // ISO date string of when the config was last updated
  updatedBy: string;    // User ID who last updated the configuration
}
```

## Security

Access to the payment configuration is restricted by Row Level Security policies in Supabase:

- Only users with admin privileges can view or modify the configuration
- The `isPaymentAdmin` function checks if a user has the necessary privileges

## Default Configuration

If no configuration exists, the system will default to test mode for safety.

## Troubleshooting

If you encounter issues with the payment configuration:

1. Check the Supabase database to ensure the `payment_config` table exists and has the correct record
2. Verify that your user account has the necessary admin privileges
3. Look for errors in the console logs related to payment configuration
4. Try running the migration script again if necessary

For additional support, refer to the application's main documentation or contact the development team. 