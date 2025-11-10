/**
 * Bulk add stocks to portfolios
 * Adds 13 new stocks to "Breakout Stocks" and "MyBreakOut Stocks" portfolios
 */
import * as airtable from '../server/airtable';
import { validateStockSymbol } from '../server/marketData';

const NEW_STOCKS = [
  // Skipping GOOG as requested
  { symbol: 'KD', name: 'Kyndryl Holdings, Inc.' },
  { symbol: 'PSTG', name: 'Pure Storage, Inc.' },
  { symbol: 'HUBS', name: 'HubSpot, Inc.' },
  { symbol: 'INTU', name: 'Intuit Inc.' },
  { symbol: 'NTAP', name: 'NetApp, Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation' },
  { symbol: 'CMG', name: 'Chipotle Mexican Grill, Inc.' },
  { symbol: 'PEP', name: 'PepsiCo, Inc.' },
  { symbol: 'CART', name: 'Maplebear Inc. (Instacart)' },
  { symbol: 'HIMS', name: 'Hims & Hers Health, Inc.' },
  { symbol: 'CELH', name: 'Celsius Holdings, Inc.' },
  { symbol: 'NKE', name: 'Nike Inc.' },
  { symbol: 'ELF', name: 'e.l.f. Beauty, Inc.' },
];

async function main() {
  console.log('\n🚀 Bulk Stock Addition Script\n');
  console.log(`Adding ${NEW_STOCKS.length} stocks to portfolios...\n`);

  // Get target portfolios
  const allPortfolios = await airtable.getAllPortfolios();
  const targetNames = ['Breakout Stocks', 'MyBreakOut Stocks'];
  const targetPortfolios = allPortfolios.filter(p => 
    targetNames.some(name => p.fields.Name?.toLowerCase() === name.toLowerCase())
  );

  if (targetPortfolios.length === 0) {
    console.error('❌ No matching portfolios found!');
    return;
  }

  console.log(`Found ${targetPortfolios.length} portfolios:\n`);
  for (const p of targetPortfolios) {
    console.log(`  📁 ${p.fields.Name} (${p.fields.Stock?.length || 0} stocks)`);
  }
  console.log('');

  // Process each stock
  const allStocks = await airtable.getAllStocks();
  let stocksCreated = 0;
  let stocksSkipped = 0;

  for (const { symbol, name } of NEW_STOCKS) {
    console.log(`\n📊 Processing ${symbol} - ${name}`);
    
    // Check if stock exists in AirTable
    let stock = allStocks.find(s => s.fields['Ticker Symbol'] === symbol);
    
    if (!stock) {
      console.log(`  Creating new stock record...`);
      
      // Validate symbol first
      const isValid = await validateStockSymbol(symbol);
      if (!isValid) {
        console.log(`  ⚠️  Symbol validation failed, creating anyway...`);
      }
      
      stock = await airtable.createStock({
        'Ticker Symbol': symbol,
        'Stock Name': name,
      });
      stocksCreated++;
      console.log(`  ✅ Created stock record (ID: ${stock.id})`);
    } else {
      console.log(`  ℹ️  Stock already exists in AirTable (ID: ${stock.id})`);
    }

    // Add to both portfolios
    for (const portfolio of targetPortfolios) {
      const currentStocks = portfolio.fields.Stock || [];
      
      if (currentStocks.includes(stock.id!)) {
        console.log(`  ⏭️  Already in "${portfolio.fields.Name}"`);
        stocksSkipped++;
      } else {
        await airtable.updatePortfolio(portfolio.id!, {
          Stock: [...currentStocks, stock.id!],
        });
        console.log(`  ✅ Added to "${portfolio.fields.Name}"`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total stocks processed: ${NEW_STOCKS.length}`);
  console.log(`New stock records created: ${stocksCreated}`);
  console.log(`Duplicate additions skipped: ${stocksSkipped}`);
  console.log(`Portfolios updated: ${targetPortfolios.length}`);
  console.log('='.repeat(60) + '\n');
  console.log('✨ Done!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
