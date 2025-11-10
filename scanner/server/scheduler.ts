/**
 * Scheduled Tasks
 * 
 * Runs daily report generation every day at 6:00 AM PST
 */

import cron from 'node-cron';
import { getUsers, getUserPortfolios, getStocks, createAnalysis } from './airtable';
import { fetchStockData } from './marketData';
import { analyzeStock } from './screener';

export function startScheduler() {
  console.log('[Scheduler] Initializing scheduled tasks...');

  // Schedule daily report generation at 6:00 AM PST
  // Cron format: minute hour day month day-of-week
  // 0 6 * * * = Every day at 6:00 AM (in America/Los_Angeles timezone)
  cron.schedule('0 6 * * *', async () => {
    console.log('═══════════════════════════════════════');
    console.log('[Daily Reports] Starting scheduled report generation');
    console.log('[Daily Reports] Timestamp:', new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }), 'PST');
    console.log('═══════════════════════════════════════');

    try {
      await generateDailyReports();
    } catch (error) {
      console.error('[Daily Reports] Fatal error during scheduled report generation:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });

  console.log('[Scheduler] ✓ Daily reports scheduled for 6:00 AM PST');
}

async function generateDailyReports() {
  const startTime = Date.now();
  
  try {
    const users = await getUsers();
    console.log(`[Daily Reports] Found ${users.length} users`);

    let totalPortfolios = 0;
    let totalStocks = 0;
    let totalStocksAnalyzed = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const portfolios = await getUserPortfolios(user.id!);
        console.log(`[Daily Reports] Processing ${portfolios.length} portfolios for ${user.fields['Email Address']}`);

        for (const portfolio of portfolios) {
          totalPortfolios++;
          const stockIds = portfolio.fields.Stock || [];
          
          if (stockIds.length === 0) {
            console.log(`[Daily Reports] Portfolio "${portfolio.fields.Name}" has no stocks, skipping`);
            continue;
          }

          console.log(`[Daily Reports] Analyzing ${stockIds.length} stocks in portfolio "${portfolio.fields.Name}"`);

          const stocks = await getStocks();
          const portfolioStocks = stocks.filter((s: any) => stockIds.includes(s.id!));
          totalStocks += portfolioStocks.length;

          for (const stock of portfolioStocks) {
            try {
              console.log(`[Daily Reports] Analyzing ${stock.fields['Ticker Symbol']}...`);
              
              const stockData = await fetchStockData(stock.fields['Ticker Symbol']);
              const analysis = analyzeStock(stockData);
              
              await createAnalysis({
                Stock: [stock.id!],
                'Analysis Date': new Date().toISOString().split('T')[0],
                'Total Score': analysis.totalScore,
                'SMA Score': analysis.scores.sma,
                'MACD Score': analysis.scores.macd,
                'RSI Score': analysis.scores.rsi,
                'Volume Score': analysis.scores.volume,
                'High Score': analysis.scores.highBreakout,
                'Current Price': analysis.indicators.currentPrice,
                'Price Change Percent': analysis.priceChange / 100,
                Recommendation: analysis.recommendation,
                Alerts: analysis.alerts.join(', '),
                'SMA 10': analysis.indicators.sma10,
                'SMA 50': analysis.indicators.sma50,
                'SMA 200': analysis.indicators.sma200,
                'RSI Value': analysis.indicators.rsi,
                'MACD Line': analysis.indicators.macdLine,
                'Signal Line': analysis.indicators.signalLine,
                'Volume Ratio': analysis.indicators.volumeRatio,
                '52 Week High': analysis.indicators.high52w,
                'ATR': analysis.indicators.atr,
                'Entry Price': analysis.tradingLevels.entry,
                'Stop Loss': analysis.tradingLevels.stopLoss,
                'Target 1': analysis.tradingLevels.target1,
                'Target 2': analysis.tradingLevels.target2,
                'Target 3': analysis.tradingLevels.target3,
                'Risk Reward Ratio': analysis.tradingLevels.riskReward,
              });

              totalStocksAnalyzed++;
              console.log(`[Daily Reports] ✓ ${stock.fields['Ticker Symbol']} analyzed (Score: ${analysis.totalScore})`);
              
            } catch (error) {
              totalErrors++;
              const errorMsg = `${stock.fields['Ticker Symbol']}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              console.error(`[Daily Reports] ✗ Failed to analyze ${stock.fields['Ticker Symbol']}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`[Daily Reports] Error processing user ${user.fields['Email Address']}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    const successRate = totalStocks > 0 ? ((totalStocksAnalyzed / totalStocks) * 100).toFixed(1) : '0';
    const status = totalErrors === 0 ? 'SUCCESS' : totalErrors < totalStocks ? 'PARTIAL' : 'FAILED';

    console.log('═══════════════════════════════════════');
    console.log('[Daily Reports] Report generation completed!');
    console.log(`[Daily Reports] Status: ${status}`);
    console.log(`[Daily Reports] Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`[Daily Reports] Portfolios processed: ${totalPortfolios}`);
    console.log(`[Daily Reports] Stocks analyzed: ${totalStocksAnalyzed}/${totalStocks} (${successRate}%)`);
    if (totalErrors > 0) {
      console.log(`[Daily Reports] Errors: ${totalErrors}`);
      console.log(`[Daily Reports] Failed stocks: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? '...' : ''}`);
    }
    console.log('═══════════════════════════════════════');

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('═══════════════════════════════════════');
    console.error('[Daily Reports] Fatal error during report generation');
    console.error(`[Daily Reports] Duration: ${(duration / 1000).toFixed(2)}s`);
    console.error('[Daily Reports] Error:', error);
    console.error('═══════════════════════════════════════');
  }
}
