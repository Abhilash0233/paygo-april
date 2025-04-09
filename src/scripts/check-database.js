const { createClient } = require('@supabase/supabase-js');

// Current Supabase credentials
const currentUrl = 'https://qzbuzimlrhcchgnldnrv.supabase.co';
const currentKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YnV6aW1scmhjY2hnbmxkbnJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzQwMzg5MCwiZXhwIjoyMDU4OTc5ODkwfQ.s245bS5ES4fsxyVUqvxqvutqQbpp9CemdMVumLC5aWk';

// Create the client
const supabase = createClient(currentUrl, currentKey);

// Check database connection and project info
async function checkDatabase() {
  console.log('Database URL:', currentUrl);
  console.log('Key Type:', currentKey.includes('service_role') ? 'Service Role Key' : 'Anon Key');
  
  try {
    // Get system info
    console.log('\nChecking connection...');
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.error('Connection error:', error);
    } else {
      console.log('Connected successfully!');
      console.log('PostgreSQL version:', data);
    }

    // Check Supabase configuration in environment
    console.log('\nEnvironment variables:');
    console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL || 'Not set');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'Not set');
    
    // Check for other Supabase URLs in code
    // This requires file system access, which we're skipping for simplicity

    // Check tables to confirm we're connected to the right DB
    console.log('\nChecking tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
      
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else if (tables && tables.length > 0) {
      console.log('Tables in database:', tables.map(t => t.table_name).join(', '));
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkDatabase(); 