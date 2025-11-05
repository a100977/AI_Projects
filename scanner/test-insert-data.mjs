import Airtable from 'airtable';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const airtablePAT = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;

console.log('🧪 Testing AirTable Schema with Sample Data\n');

if (!airtablePAT || !airtableBaseId) {
  console.error('❌ Missing credentials!');
  process.exit(1);
}

const airtable = new Airtable({ 
  apiKey: airtablePAT,
  endpointUrl: 'https://api.airtable.com'
});

const base = airtable.base(airtableBaseId);

async function testSchema() {
  try {
    // Step 1: Get a stock record to link to
    console.log('📊 Step 1: Finding a stock to link to...');
    const stocks = await base('Stocks').select({ maxRecords: 1 }).firstPage();
    
    if (stocks.length === 0) {
      console.error('❌ No stocks found in Stocks table. Please add at least one stock first.');
      return;
    }
    
    const stockRecord = stocks[0];
    console.log(`✅ Found stock: ${stockRecord.fields['Ticker Symbol']} - ${stockRecord.fields['Stock Name']}`);
    console.log(`   Stock Record ID: ${stockRecord.id}`);
    
    // Step 2: Create a test analysis record
    console.log('\n📊 Step 2: Creating test Stock Analysis record...');
    
    const testData = {
      'Stock': [stockRecord.id], // Link to stock
      'Analysis Date': '2025-11-05',
      'Total Score': 75,
      'SMA Score': 20,
      'MACD Score': 15,
      'RSI Score': 18,
      'Volume Score': 12,
      'High Score': 10,
      'Current Price': 185.50,
      'Price Change Percent': 0.0235, // 2.35%
      'Recommendation': 'STRONG BUY',
      'Alerts': 'GOLDEN_CROSS, VOLUME_SURGE_3X',
      'SMA 10': 182.30,
      'SMA 50': 178.45,
      'SMA 200': 165.20,
      'RSI Value': 68.5,
      'MACD Line': 2.45,
      'Signal Line': 1.80,
      'Volume Ratio': 1.85,
      '52 Week High': 190.00,
    };
    
    console.log('Attempting to create record with fields:', Object.keys(testData).join(', '));
    
    try {
      const createdRecord = await base('Stock Analysis').create(testData);
      console.log('✅ SUCCESS! Test record created.');
      console.log('   Record ID:', createdRecord.id);
      console.log('\n📝 Created record fields:');
      console.log(JSON.stringify(createdRecord.fields, null, 2));
      
      // Step 3: Verify by reading it back
      console.log('\n📊 Step 3: Verifying record...');
      const verifyRecord = await base('Stock Analysis').find(createdRecord.id);
      const fieldCount = Object.keys(verifyRecord.fields).length;
      console.log(`✅ Record verified! Has ${fieldCount} fields populated.`);
      
      // Step 4: Clean up test record
      console.log('\n📊 Step 4: Cleaning up test record...');
      await base('Stock Analysis').destroy(createdRecord.id);
      console.log('✅ Test record deleted.');
      
      console.log('\n✨ Schema test PASSED! All fields are working correctly.');
      
    } catch (createError) {
      console.error('❌ Failed to create test record:', createError.message);
      if (createError.statusCode) {
        console.error('   Status code:', createError.statusCode);
      }
      
      // Try to identify which fields are causing issues
      if (createError.message.includes('Unknown field name')) {
        console.error('\n💡 Some fields do not exist in the table.');
        console.error('   Please check the Stock Analysis table structure in AirTable.');
      }
      
      // Try with minimal fields
      console.log('\n🔧 Attempting to create with minimal fields...');
      try {
        const minimalData = {
          'Recommendation': 'BUY',
        };
        const minimalRecord = await base('Stock Analysis').create(minimalData);
        console.log('✅ Minimal record created successfully.');
        console.log('   This confirms the table is accessible but may be missing fields.');
        await base('Stock Analysis').destroy(minimalRecord.id);
      } catch (minimalError) {
        console.error('❌ Even minimal record failed:', minimalError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.statusCode) {
      console.error('   Status code:', error.statusCode);
    }
  }
}

testSchema().then(() => {
  console.log('\n✨ Test complete!\n');
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
