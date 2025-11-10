/**
 * Script to check current portfolio stocks and plan bulk additions
 */
import * as airtable from '../server/airtable';

async function main() {
  console.log('\n=== PORTFOLIO STOCK CHECK ===\n');
  
  // Get all portfolios
  const portfolios = await airtable.getAllPortfolios();
  
  // Find the two target portfolios
  const targetNames = ['Breakout Stocks', 'My Breakout Stocks', 'MyBreakOut Stocks'];
  const targetPortfolios = portfolios.filter(p => 
    targetNames.some(name => p.fields.Name?.toLowerCase().includes(name.toLowerCase()))
  );
  
  console.log(`Found ${targetPortfolios.length} matching portfolios:\n`);
  
  for (const portfolio of targetPortfolios) {
    console.log(`📁 Portfolio: "${portfolio.fields.Name}" (ID: ${portfolio.id})`);
    console.log(`   Stocks: ${portfolio.fields.Stock?.length || 0} stocks`);
    
    if (portfolio.fields.Stock && portfolio.fields.Stock.length > 0) {
      // Get stock details
      const stockIds = portfolio.fields.Stock;
      const stocks = await airtable.getAllStocks();
      const portfolioStocks = stocks.filter(s => stockIds.includes(s.id!));
      
      const symbols = portfolioStocks.map(s => s.fields['Ticker Symbol']).sort();
      console.log(`   Current stocks: ${symbols.join(', ')}`);
    } else {
      console.log(`   Current stocks: (empty)`);
    }
    console.log('');
  }
  
  // List of new stocks to add
  const newStocks = [
    // AI / Tech Stocks
    'AAPL', 'AMZN', 'GOOG', 'MSFT', 'NVDA', 'META', 'AI', 'PLTR', 'KD', 'PATH', 'PSTG',
    // Tech / Digital Stocks
    'CRM', 'HUBS', 'INTU', 'NTAP',
    // Consumer Favorites
    'TSLA', 'COST', 'NFLX', 'CMG', 'PEP', 'UBER', 'CART', 'HIMS', 'CELH', 'NKE', 'ELF'
  ];
  
  console.log(`\n=== NEW STOCKS TO ADD (${newStocks.length} total) ===\n`);
  console.log(newStocks.join(', '));
  
  // Check which stocks already exist in AirTable
  const allStocks = await airtable.getAllStocks();
  const existingSymbols = allStocks.map(s => s.fields['Ticker Symbol']);
  
  console.log(`\n=== DEDUPLICATION ANALYSIS ===\n`);
  
  for (const portfolio of targetPortfolios) {
    console.log(`\n📁 Portfolio: "${portfolio.fields.Name}"`);
    
    const currentStocks = portfolio.fields.Stock || [];
    const currentSymbols = allStocks
      .filter(s => currentStocks.includes(s.id!))
      .map(s => s.fields['Ticker Symbol']);
    
    const duplicates = newStocks.filter(symbol => currentSymbols.includes(symbol));
    const toAdd = newStocks.filter(symbol => !currentSymbols.includes(symbol));
    
    console.log(`   ✅ Already in portfolio (${duplicates.length}): ${duplicates.join(', ') || 'none'}`);
    console.log(`   ➕ To be added (${toAdd.length}): ${toAdd.join(', ')}`);
  }
  
  console.log(`\n=== STOCKS NOT YET IN AIRTABLE ===\n`);
  const newToAirtable = newStocks.filter(symbol => !existingSymbols.includes(symbol));
  console.log(`These ${newToAirtable.length} stocks will be created: ${newToAirtable.join(', ') || 'none'}`);
  
  console.log(`\n=== EXECUTION PLAN ===\n`);
  console.log(`1. Create ${newToAirtable.length} new stock records in Stocks table`);
  console.log(`2. Link stocks to both portfolios (avoiding duplicates)`);
  console.log(`3. Update Portfolio records with new Stock links`);
  console.log(`\nTotal operations: ~${newToAirtable.length + (targetPortfolios.length * 2)} AirTable writes`);
}

main().catch(console.error);
