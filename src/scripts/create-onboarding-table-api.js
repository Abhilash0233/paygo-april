const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Supabase configuration
const supabaseUrl = 'https://qzbuzimlrhcchgnldnrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YnV6aW1scmhjY2hnbmxkbnJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzQwMzg5MCwiZXhwIjoyMDU4OTc5ODkwfQ.s245bS5ES4fsxyVUqvxqvutqQbpp9CemdMVumLC5aWk';

// Path to the SQL script
const sqlFilePath = path.join(__dirname, 'create-onboarding-table.sql');

async function createOnboardingTable() {
  try {
    console.log('Reading SQL file...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('SQL file read successfully. Content:');
    console.log(sqlContent);
    
    console.log('\nExecuting SQL against Supabase...');
    
    // Execute SQL via Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sqlContent
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error executing SQL: ${response.status} ${response.statusText}`);
      console.error(errorText);
      
      console.log('\nInstead, you should execute the SQL directly in the Supabase dashboard:');
      console.log('1. Log in to Supabase at https://app.supabase.com/');
      console.log('2. Select your project');
      console.log('3. Go to the SQL Editor');
      console.log('4. Paste the content of src/scripts/create-onboarding-table.sql');
      console.log('5. Run the script');
      return;
    }
    
    console.log('SQL executed successfully!');
    console.log('The onboarding table has been created in Supabase.');
  } catch (error) {
    console.error('Error creating onboarding table:', error);
    
    console.log('\nPlease execute the SQL directly in the Supabase dashboard:');
    console.log('1. Log in to Supabase at https://app.supabase.com/');
    console.log('2. Select your project');
    console.log('3. Go to the SQL Editor');
    console.log('4. Paste the content of src/scripts/create-onboarding-table.sql');
    console.log('5. Run the script');
  }
}

createOnboardingTable(); 