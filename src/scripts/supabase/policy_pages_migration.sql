-- Policy Pages Migration for Supabase
-- This script creates a table for storing policy pages content
-- such as About Us, Privacy Policy, Terms & Conditions, and Cancellation Policy

-- Create policy_pages table
CREATE TABLE IF NOT EXISTS policy_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_published BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create RLS policies for policy_pages
-- Policy pages are readable by everyone but only writable by authenticated users with admin role
ALTER TABLE policy_pages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published policy pages
CREATE POLICY "Policy pages are viewable by everyone" 
  ON policy_pages 
  FOR SELECT 
  USING (is_published = TRUE);

-- Allow authenticated admin users to insert policy pages
CREATE POLICY "Policy pages are insertable by admins" 
  ON policy_pages 
  FOR INSERT 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Allow authenticated admin users to update policy pages
CREATE POLICY "Policy pages are updatable by admins" 
  ON policy_pages 
  FOR UPDATE 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Allow authenticated admin users to delete policy pages
CREATE POLICY "Policy pages are deletable by admins" 
  ON policy_pages 
  FOR DELETE 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create an updated_at trigger for policy_pages
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON policy_pages
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Insert initial policy pages
INSERT INTO policy_pages (title, content, slug, is_published, last_updated)
VALUES 
  (
    'About Us',
    '<div><h1>PayGo Fitness</h1><p>Your Fitness Journey, Your Way</p><h2>Our Mission</h2><p>At PayGo Fitness, we''re revolutionizing the way people access fitness facilities. Our mission is to make fitness accessible, flexible, and affordable for everyone. We believe that everyone deserves the opportunity to maintain a healthy lifestyle without the constraints of traditional gym memberships.</p><h2>Our Vision</h2><p>We envision a future where fitness is seamlessly integrated into daily life. Through our innovative pay-per-use model, we''re creating a network of premium fitness centers that are accessible to everyone, empowering individuals to take control of their fitness journey.</p><h2>What We Offer</h2><ul><li>Pay-per-use access to premium fitness centers</li><li>No long-term commitments or memberships</li><li>Flexible booking options</li><li>Digital wallet for seamless payments</li><li>Wide network of partner facilities</li><li>Professional fitness environment</li></ul><h2>Our Values</h2><ul><li><strong>Accessibility</strong> - Making fitness available to everyone</li><li><strong>Flexibility</strong> - Adapting to your schedule and needs</li><li><strong>Quality</strong> - Partnering with premium fitness facilities</li><li><strong>Innovation</strong> - Leveraging technology for better fitness access</li><li><strong>Community</strong> - Building a supportive fitness community</li></ul></div>',
    'about-us',
    TRUE,
    CURRENT_TIMESTAMP
  ),
  (
    'Privacy Policy',
    '<div><p><em>Effective Date: 1st Sep, 2024</em></p><p>Paygo.fit is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our app, website, and any related services (collectively, the "Services"). By accessing or using the Services, you agree to the terms of this Privacy Policy.</p><h2>1. Information We Collect</h2><h3>1.1 Personal Information</h3><p>When you create an account or use the Services, we may collect personal information that you voluntarily provide, including:</p><ul><li>Name</li><li>Phone number</li><li>Location data</li></ul><h3>1.2 Payment Information</h3><p>We collect payment information when you make a purchase through the Services. Payment details, such as credit card numbers, are processed by a secure third-party payment processor and are not stored on our servers.</p><h3>1.3 Activity Data</h3><p>We collect information about the fitness sessions and activities you book through the Services, including:</p><ul><li>Type of activity</li><li>Date and time of the session</li><li>Location of the activity</li><li>Attendance records</li></ul><h3>1.4 Device and Usage Information</h3><p>We may collect information about the device you use to access our Services, including:</p><ul><li>IP address</li><li>Browser type</li><li>Operating system</li><li>Device identifier</li><li>App usage data</li></ul></div>',
    'privacy-policy',
    TRUE,
    CURRENT_TIMESTAMP
  ),
  (
    'Terms of Service',
    '<div><p><em>Effective Date: 1st Sep, 2024</em></p><p>Welcome to Paygo.fit! These Terms of Service govern your use of our app, website, and any related services. By accessing or using the Services, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our Services.</p><h2>1. Acceptance of Terms</h2><p>By accessing or using the Services, you affirm that you are at least 18 years old, or if you are under 18, that you have received parental or guardian consent to use the Services. If you are using the Services on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these Terms.</p><h2>2. Account Registration</h2><h3>Account Creation</h3><p>To use certain features of the Services, you must create an account. You agree to provide accurate and complete information when registering and to update this information as necessary.</p><h3>Account Security</h3><p>You are responsible for maintaining the confidentiality of your account login information and for all activities that occur under your account. You agree to notify us immediately of any unauthorised use of your account.</p></div>',
    'terms-and-conditions',
    TRUE,
    CURRENT_TIMESTAMP
  ),
  (
    'Cancellation Policy',
    '<div><p>We understand that plans can change. Our cancellation policy is designed to be fair to both our users and fitness centers while maintaining the quality of service.</p><h2>Free Cancellation</h2><p>Cancel up to 3 hours before your scheduled session for a full refund to your wallet.</p><ul><li>100% refund to wallet</li><li>No questions asked</li><li>Instant processing</li></ul><h2>Late Cancellation</h2><p>Cancellations made less than 3 hours before the session:</p><ul><li>50% refund to wallet</li><li>Processing time: 24-48 hours</li></ul><h2>No-Show Policy</h2><p>If you don''t show up for your booked session:</p><ul><li>No refund will be provided</li><li>Session will be marked as used</li></ul><h2>How to Cancel</h2><p>To cancel a booking:</p><ol><li>Go to ''My Bookings''</li><li>Select the booking you want to cancel</li><li>Tap on ''Cancel Booking''</li><li>Confirm your cancellation</li></ol><h2>Special Circumstances</h2><p>For cancellations due to medical emergencies or exceptional circumstances, please contact our support team with relevant documentation for special consideration.</p></div>',
    'cancellation-policy',
    TRUE,
    CURRENT_TIMESTAMP
  ); 