#!/bin/bash

# Install Supabase dependencies

echo "Installing Supabase dependencies..."
npm install @supabase/supabase-js

echo "Checking installation..."
if npm list @supabase/supabase-js > /dev/null 2>&1; then
  echo "✅ @supabase/supabase-js installed successfully!"
else
  echo "❌ Error: @supabase/supabase-js installation failed. Please check your npm setup."
  exit 1
fi

echo "Done! You can now use Supabase in your app." 