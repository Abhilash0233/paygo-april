-- Create onboarding table for Supabase
CREATE TABLE IF NOT EXISTS public.onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read onboarding data
CREATE POLICY "Allow public read access to onboarding" 
  ON public.onboarding
  FOR SELECT
  USING (true);

-- Create policy to allow only authenticated users with service_role to modify data
-- This avoids the dependency on the profiles table
CREATE POLICY "Allow service role write access to onboarding" 
  ON public.onboarding
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add default onboarding screens (only if they don't exist already)
INSERT INTO public.onboarding (title, description, image_url, order_number, active)
VALUES 
  ('Find Fitness Centers', 'Discover the best fitness centers near you with real-time availability.', 'https://firebasestorage.googleapis.com/v0/b/paygo-2.appspot.com/o/onboarding%2Fonboarding1.jpg?alt=media', 1, true),
  ('Pay-as-you-go', 'No monthly commitments. Pay only for the sessions you attend.', 'https://firebasestorage.googleapis.com/v0/b/paygo-2.appspot.com/o/onboarding%2Fonboarding2.jpg?alt=media', 2, true),
  ('Start your journey', 'Book your first session and start your fitness journey today!', 'https://firebasestorage.googleapis.com/v0/b/paygo-2.appspot.com/o/onboarding%2Fonboarding3.jpg?alt=media', 3, true)
ON CONFLICT DO NOTHING; 