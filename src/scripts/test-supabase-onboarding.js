const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://qzbuzimlrhcchgnldnrv.supabase.co';
// Fixed key with proper 'role' field
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YnV6aW1scmhjY2hnbmxkbnJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzQwMzg5MCwiZXhwIjoyMDU4OTc5ODkwfQ.s245bS5ES4fsxyVUqvxqvutqQbpp9CemdMVumLC5aWk';

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Function to test fetching onboarding data
async function testOnboardingFetch() {
  console.log('Testing Supabase onboarding data fetch...');
  
  try {
    // Check if the onboarding table exists
    console.log('\nChecking if onboarding table exists...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'onboarding');
    
    if (tableError) {
      console.error('Error checking table existence:', tableError);
    } else {
      const tableExists = tableInfo && tableInfo.length > 0;
      console.log(`Onboarding table exists: ${tableExists}`);
      
      if (!tableExists) {
        console.log('\n⚠️ The onboarding table does not exist yet!');
        console.log('Please run the create-onboarding-table.sql script in the Supabase SQL Editor first.');
        return;
      }
    }
    
    // Fetch all onboarding slides
    console.log('\nFetching onboarding slides...');
    const { data: slides, error: slidesError } = await supabase
      .from('onboarding')
      .select('*')
      .order('order_number', { ascending: true });
    
    if (slidesError) {
      console.error('Error fetching onboarding slides:', slidesError);
      return;
    }
    
    if (!slides || slides.length === 0) {
      console.log('No onboarding slides found.');
      console.log('Please insert sample data into the onboarding table.');
      return;
    }
    
    console.log(`Found ${slides.length} onboarding slides:`);
    slides.forEach((slide, index) => {
      console.log(`\nSlide ${index + 1}:`);
      console.log(`ID: ${slide.id}`);
      console.log(`Title: ${slide.title}`);
      console.log(`Description: ${slide.description}`);
      console.log(`Image URL: ${slide.image_url}`);
      console.log(`Order: ${slide.order_number}`);
      console.log(`Active: ${slide.active}`);
    });
    
    console.log('\n✅ Supabase onboarding setup looks good!');
    console.log('The app should now be able to fetch onboarding data from Supabase.');
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

// Run the test
testOnboardingFetch()
  .then(() => {
    console.log('\nTest completed.');
  })
  .catch(error => {
    console.error('Test failed:', error);
  }); 