/**
 * Add Trading Level Fields to AirTable Stock Analysis Table
 * 
 * This script adds 7 new fields to the Stock Analysis table:
 * - ATR (Number)
 * - Entry Price (Currency)
 * - Stop Loss (Currency)
 * - Target 1 (Currency)
 * - Target 2 (Currency)
 * - Target 3 (Currency)
 * - Risk Reward Ratio (Number)
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables');
  process.exit(1);
}

interface FieldDefinition {
  name: string;
  type: string;
  description: string;
  options?: {
    precision?: number;
    symbol?: string;
  };
}

const TRADING_LEVEL_FIELDS: FieldDefinition[] = [
  {
    name: 'ATR',
    type: 'number',
    description: 'Average True Range (14-period volatility measure)',
    options: { precision: 2 }
  },
  {
    name: 'Entry Price',
    type: 'currency',
    description: 'Entry price for the trade (current market price)',
    options: { precision: 2, symbol: 'USD' }
  },
  {
    name: 'Stop Loss',
    type: 'currency',
    description: 'Stop loss price (tighter of ATR-based or SMA support)',
    options: { precision: 2, symbol: 'USD' }
  },
  {
    name: 'Target 1',
    type: 'currency',
    description: 'First price target (+10% quick profit)',
    options: { precision: 2, symbol: 'USD' }
  },
  {
    name: 'Target 2',
    type: 'currency',
    description: 'Second price target (+20% swing trade)',
    options: { precision: 2, symbol: 'USD' }
  },
  {
    name: 'Target 3',
    type: 'currency',
    description: 'Third price target (ATR-extended or 52w high)',
    options: { precision: 2, symbol: 'USD' }
  },
  {
    name: 'Risk Reward Ratio',
    type: 'number',
    description: 'Risk/Reward ratio (Target1 - Entry) / (Entry - Stop)',
    options: { precision: 2 }
  }
];

async function getTableId(tableName: string): Promise<string | null> {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    }
  });

  if (!response.ok) {
    console.error('Failed to fetch tables:', await response.text());
    return null;
  }

  const data = await response.json();
  const table = data.tables.find((t: any) => t.name === tableName);
  
  return table?.id || null;
}

async function getExistingFields(tableId: string): Promise<string[]> {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${tableId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    }
  });

  if (!response.ok) {
    console.error('Failed to fetch table schema:', await response.text());
    return [];
  }

  const data = await response.json();
  return data.fields.map((f: any) => f.name);
}

async function createField(tableId: string, field: FieldDefinition): Promise<boolean> {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${tableId}/fields`;
  
  const payload: any = {
    name: field.name,
    type: field.type,
    description: field.description
  };

  if (field.options) {
    payload.options = field.options;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`  ❌ Failed to create field "${field.name}":`, error);
    return false;
  }

  const result = await response.json();
  console.log(`  ✅ Created field "${field.name}" (ID: ${result.id})`);
  return true;
}

async function main() {
  console.log('\n🔧 Adding Trading Level Fields to AirTable\n');
  console.log('='.repeat(60));

  // Step 1: Get Stock Analysis table ID
  console.log('\n📋 Step 1: Finding Stock Analysis table...');
  const tableId = await getTableId('Stock Analysis');
  
  if (!tableId) {
    console.error('❌ Could not find "Stock Analysis" table');
    process.exit(1);
  }
  
  console.log(`✅ Found table ID: ${tableId}`);

  // Step 2: Check existing fields
  console.log('\n📋 Step 2: Checking existing fields...');
  const existingFields = await getExistingFields(tableId);
  console.log(`✅ Found ${existingFields.length} existing fields`);

  // Step 3: Create missing fields
  console.log('\n📋 Step 3: Creating missing fields...');
  
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const field of TRADING_LEVEL_FIELDS) {
    if (existingFields.includes(field.name)) {
      console.log(`  ⏭️  Field "${field.name}" already exists, skipping...`);
      skipped++;
    } else {
      console.log(`  ➕ Creating field "${field.name}"...`);
      const success = await createField(tableId, field);
      if (success) {
        created++;
        // Rate limit: 5 requests per second
        await new Promise(resolve => setTimeout(resolve, 250));
      } else {
        failed++;
      }
    }
  }

  // Step 4: Verify all fields exist
  console.log('\n📋 Step 4: Verifying fields...');
  const updatedFields = await getExistingFields(tableId);
  const allFieldsExist = TRADING_LEVEL_FIELDS.every(f => updatedFields.includes(f.name));

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Fields created:  ${created}`);
  console.log(`Fields skipped:  ${skipped}`);
  console.log(`Fields failed:   ${failed}`);
  console.log(`Total fields:    ${TRADING_LEVEL_FIELDS.length}`);
  console.log('='.repeat(60));

  if (allFieldsExist) {
    console.log('\n✅ SUCCESS! All trading level fields are now in AirTable');
    console.log('\n📌 Next steps:');
    console.log('   1. Run the screener on any stock to generate analysis');
    console.log('   2. Check the Reports page to see trading levels displayed');
    console.log('');
  } else {
    console.log('\n⚠️  Some fields may be missing. Check AirTable manually.');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
