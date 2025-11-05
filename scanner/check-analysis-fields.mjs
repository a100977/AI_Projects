import Airtable from 'airtable';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const airtablePAT = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;

const airtable = new Airtable({ 
  apiKey: airtablePAT,
  endpointUrl: 'https://api.airtable.com'
});

const base = airtable.base(airtableBaseId);

async function checkFields() {
  console.log('🔍 Checking Stock Analysis table fields...\n');
  
  try {
    // Get all records to see all possible fields
    const records = await base('Stock Analysis').select().all();
    
    console.log(`Found ${records.length} records\n`);
    
    // Collect all unique field names across all records
    const allFields = new Set();
    
    records.forEach((record, index) => {
      console.log(`\n📝 Record ${index + 1} (ID: ${record.id}):`);
      const fields = Object.keys(record.fields);
      console.log(`   Fields: ${fields.join(', ')}`);
      console.log(`   Data:`, JSON.stringify(record.fields, null, 2));
      
      fields.forEach(f => allFields.add(f));
    });
    
    console.log(`\n\n✅ All unique fields found across all records:`);
    console.log(Array.from(allFields).sort().join(', '));
    
    console.log(`\n\n📋 Expected fields for our application:`);
    const expectedFields = [
      'Stock',
      'Analysis Date',
      'Total Score',
      'SMA Score',
      'MACD Score',
      'RSI Score',
      'Volume Score',
      'High Score',
      'Current Price',
      'Price Change Percent',
      'Recommendation',
      'Alerts',
      'SMA 10',
      'SMA 50',
      'SMA 200',
      'RSI Value',
      'MACD Line',
      'Signal Line',
      'Volume Ratio',
      '52 Week High'
    ];
    
    console.log(expectedFields.join(', '));
    
    console.log(`\n\n🔧 Field comparison:`);
    const foundFields = Array.from(allFields);
    const missing = expectedFields.filter(f => !foundFields.includes(f));
    const extra = foundFields.filter(f => !expectedFields.includes(f) && f !== 'Created At');
    
    if (missing.length > 0) {
      console.log(`❌ Missing fields: ${missing.join(', ')}`);
    } else {
      console.log(`✅ All expected fields are present!`);
    }
    
    if (extra.length > 0) {
      console.log(`ℹ️  Extra fields (formula/computed): ${extra.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFields();
