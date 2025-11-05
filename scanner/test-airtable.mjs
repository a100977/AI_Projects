import Airtable from 'airtable';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const airtablePAT = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;

console.log('🔍 Testing AirTable Connection...\n');
console.log('PAT exists:', !!airtablePAT);
console.log('Base ID:', airtableBaseId);
console.log('');

if (!airtablePAT || !airtableBaseId) {
  console.error('❌ Missing credentials!');
  console.error('Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables.');
  process.exit(1);
}

const airtable = new Airtable({ 
  apiKey: airtablePAT,
  endpointUrl: 'https://api.airtable.com'
});

const base = airtable.base(airtableBaseId);

async function inspectTables() {
  const tablesToCheck = [
    'Users', 
    'Portfolios', 
    'Screener Results',
    'ScreenerResults',
    'Screener_Results',
    'Stock',
    'Stocks'
  ];
  
  for (const tableName of tablesToCheck) {
    console.log(`\n📊 Inspecting table: ${tableName}`);
    console.log('='.repeat(60));
    
    try {
      const records = await base(tableName)
        .select({
          maxRecords: 3,
        })
        .firstPage();
      
      console.log(`✅ Connected successfully! Found ${records.length} records.`);
      
      if (records.length > 0) {
        console.log('\n📝 Sample record structure:');
        const firstRecord = records[0];
        console.log('Record ID:', firstRecord.id);
        console.log('Fields:', Object.keys(firstRecord.fields));
        console.log('\nSample data:');
        console.log(JSON.stringify(firstRecord.fields, null, 2));
      } else {
        console.log('⚠️  Table is empty. No sample data available.');
      }
      
    } catch (error) {
      console.error(`❌ Error accessing table "${tableName}":`, error.message);
      if (error.statusCode) {
        console.error('Status code:', error.statusCode);
      }
      if (error.message.includes('NOT_FOUND')) {
        console.error(`\n💡 Table "${tableName}" does not exist in the base.`);
        console.error('Please create this table in AirTable or check the table name.');
      }
      if (error.statusCode === 403) {
        console.error(`\n💡 Access denied to table "${tableName}".`);
        console.error('The Personal Access Token may not have access to this table.');
        console.error('Check the token\'s "Access" settings and ensure the base is added.');
      }
    }
  }
  
  console.log('\n\n🔍 Attempting to list all tables in the base...');
  console.log('Note: The AirTable API does not provide a direct way to list tables.');
  console.log('Please check your AirTable base manually to see all table names.');
}

inspectTables().then(() => {
  console.log('\n✨ Inspection complete!');
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
