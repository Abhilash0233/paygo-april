# Migrating Onboarding Screens from Firebase to Supabase

This document outlines the steps to migrate the onboarding screen data from Firebase to Supabase.

## Status Update - ✅ COMPLETED

The migration from Firebase to Supabase for onboarding screens has been completed. The following Firebase files have been removed:

- `src/firebase/services/onboardingService.ts`
- `src/firebase/scripts/importOnboardingData.ts`

The application now exclusively uses Supabase for onboarding data.

## Overview

The onboarding feature displays a series of introductory screens to new users, showing the app's key features. The data for these screens was previously stored in Firebase and is now being migrated to Supabase.

## Migration Steps

### 1. Install Supabase Dependencies

Run the installation script to add the Supabase SDK:

```sh
./src/scripts/install-supabase-deps.sh
```

### 2. Create the Onboarding Table in Supabase

Run the SQL script in the Supabase SQL Editor:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `src/scripts/create-onboarding-table.sql`
4. Run the script to create the onboarding table and insert default data

### 3. Test the Supabase Onboarding Setup

Run the test script to verify the table creation and data:

```sh
node src/scripts/test-supabase-onboarding.js
```

This script will:
- Check if the onboarding table exists
- Fetch and display the onboarding slides
- Verify everything is working correctly

### 4. Code Changes

The following files have been modified or created:

1. **src/config/supabaseConfig.ts**
   - Initializes the Supabase client for use across the app

2. **src/services/supabase/onboardingService.ts**
   - Implements functions to interact with the onboarding data in Supabase
   - Mirrors the Firebase functions for easy replacement

3. **src/screens/onboarding/OnboardingScreen.tsx**
   - Updated to use the Supabase service instead of Firebase
   - Adjusted field names to match Supabase column names

## Data Structure

### Firebase Structure (Old)
```typescript
interface OnboardingItem {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  order: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Supabase Structure (New)
```typescript
interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  order_number: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}
```

## Notes

- The app includes fallback data in case the Supabase fetch fails, ensuring a smooth experience for users
- The onboarding flow and UI remain unchanged - only the data source has been migrated
- Row Level Security is configured to allow public read access but only admin write access

## Troubleshooting

If onboarding screens don't appear or show errors:

1. Check if the onboarding table exists in Supabase
2. Verify the data in the onboarding table
3. Make sure Supabase credentials are correct in `src/config/supabaseConfig.ts`
4. Run the test script to diagnose issues

## Policy Pages Migration

Following the onboarding migration, policy pages (About Us, Terms & Conditions, Privacy Policy, and Cancellation Policy) have also been migrated to Supabase. See `src/scripts/supabase/README.md` for details on this implementation. 