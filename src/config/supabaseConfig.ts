import { createClient } from '@supabase/supabase-js';

// Supabase URL and anon key
const supabaseUrl = 'https://qzbuzimlrhcchgnldnrv.supabase.co';
// Corrected anon key - ensure the JWT has the correct "role" field
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YnV6aW1scmhjY2hnbmxkbnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MDM4OTAsImV4cCI6MjA1ODk3OTg5MH0.Jgvf23jr3CEteD8wXYNCp0wq22M2cLNDjsCZITjjXqU';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Service role key - ONLY use on server-side code, not client
export const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YnV6aW1scmhjY2hnbmxkbnJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzQwMzg5MCwiZXhwIjoyMDU4OTc5ODkwfQ.s245bS5ES4fsxyVUqvxqvutqQbpp9CemdMVumLC5aWk';

/**
 * Get a Supabase client with service role access
 * This bypasses RLS and should be used carefully
 */
export function getServiceRoleClient() {
  return createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
} 