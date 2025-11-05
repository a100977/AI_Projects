import Airtable from 'airtable';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const airtablePAT = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;

console.log('🔍 Full AirTable Schema Test\n');
console.log('Base ID:', airtableBaseId);
console.log('');

if (!airtablePAT || !airtableBaseId) {
  console.error('❌ Missing credentials!');
  process.exit(1);
}

const airtable = new Airtable({ 
  apiKey: airtablePAT,
  endpointUrl: 'https://api.airtable.com'
});

const base = airtable.base(airtableBaseId);

async function testAllTables() {
  const tables = [
    { name: 'Users', description: 'User accounts' },
    { name: 'Portfolios', description: 'User portfolios' },
    { name: 'Stocks', description: 'Stock master data' },
    { name: 'Stock Analysis', description: 'Daily screener results' },
  ];
  
  const results = {
    accessible: [],
    inaccessible: [],
    schemas: {}
  };
  
  for (const table of tables) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Testing: ${table.name} (${table.description})`);
    console.log('='.repeat(70));
    
    try {
      const records = await base(table.name)
        .select({ maxRecords: 1 })
        .firstPage();
      
      console.log(`✅ SUCCESS - Table accessible`);
      console.log(`   Records found: ${records.length}`);
      
      if (records.length > 0) {
        const fields = Object.keys(records[0].fields);
        console.log(`   Fields (${fields.length}):`, fields.join(', '));
        
        results.schemas[table.name] = {
          fields: fields,
          sampleRecord: records[0].fields
        };
        
        console.log(`\n   📝 Sample Record:`);
        console.log(JSON.stringify(records[0].fields, null, 2));
      } else {
        console.log(`   ⚠️  Table is empty - no sample data`);
        results.schemas[table.name] = {
          fields: [],
          sampleRecord: null
        };
      }
      
      results.accessible.push(table.name);
      
    } catch (error) {
      console.log(`❌ FAILED - ${error.message}`);
      if (error.statusCode) {
        console.log(`   Status code: ${error.statusCode}`);
      }
      
      if (error.statusCode === 403) {
        console.log(`   💡 Token does not have access to this table`);
        console.log(`   Action: Add "${table.name}" to token access in AirTable`);
      } else if (error.statusCode === 404) {
        console.log(`   💡 Table does not exist`);
        console.log(`   Action: Create "${table.name}" table in AirTable`);
      }
      
      results.inaccessible.push(table.name);
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Accessible tables (${results.accessible.length}):`, results.accessible.join(', '));
  if (results.inaccessible.length > 0) {
    console.log(`❌ Inaccessible tables (${results.inaccessible.length}):`, results.inaccessible.join(', '));
  }
  
  // Field mapping analysis
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('🔧 FIELD MAPPING ANALYSIS');
  console.log('='.repeat(70));
  
  // Check Users table
  if (results.schemas['Users']) {
    console.log('\n👤 Users Table:');
    const userFields = results.schemas['Users'].fields;
    console.log('   Expected: Email, Name, Google ID, Subscription Tier');
    console.log('   Found:', userFields.join(', '));
    
    const mapping = {
      'Email Address': 'Email',
      'Full Name': 'Name',
      'Google ID': 'Need to add',
      'Subscription Tier': 'Need to add'
    };
    console.log('   Mapping needed:', JSON.stringify(mapping, null, 2));
  }
  
  // Check Portfolios table
  if (results.schemas['Portfolios']) {
    console.log('\n📁 Portfolios Table:');
    const portfolioFields = results.schemas['Portfolios'].fields;
    console.log('   Expected: Name, User (linked), Stocks (linked)');
    console.log('   Found:', portfolioFields.join(', '));
  }
  
  // Check Stocks table
  if (results.schemas['Stocks']) {
    console.log('\n📈 Stocks Table:');
    const stockFields = results.schemas['Stocks'].fields;
    console.log('   Expected: Ticker Symbol, Stock Name, Current Price');
    console.log('   Found:', stockFields.join(', '));
  }
  
  // Check Stock Analysis table
  if (results.schemas['Stock Analysis']) {
    console.log('\n🔬 Stock Analysis Table:');
    const analysisFields = results.schemas['Stock Analysis'].fields;
    console.log('   Expected: Stock (linked), Analysis Date, Total Score, Recommendation, etc.');
    console.log('   Found:', analysisFields.join(', '));
    
    const requiredFields = [
      'Stock', 'Analysis Date', 'Total Score', 'SMA Score', 'MACD Score',
      'RSI Score', 'Volume Score', 'High Score', 'Current Price',
      'Price Change Percent', 'Recommendation'
    ];
    
    const missing = requiredFields.filter(f => !analysisFields.includes(f));
    if (missing.length > 0) {
      console.log('   ⚠️  Missing fields:', missing.join(', '));
    } else {
      console.log('   ✅ All required fields present!');
    }
  }
  
  console.log('\n✨ Test complete!\n');
  
  return results;
}

testAllTables().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
