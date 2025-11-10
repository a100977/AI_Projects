import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from 'zod';
import * as airtable from './airtable';
import { fetchMultipleStocks, validateStockSymbol, searchStocks, fetchMarketIndexes, getMarketNews, fetchStockData } from './marketData';
import { analyzeStock } from './screener';

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      // Logout is handled by /api/logout endpoint
      return { success: true, redirectUrl: '/api/logout' } as const;
    }),
    
    // Sync user with AirTable on login
    syncUser: protectedProcedure.mutation(async ({ ctx }) => {
      const { user } = ctx;
      
      // Check if user exists in AirTable
      let airtableUser = await airtable.findUserByEmail(user.email!);
      
      if (!airtableUser) {
        // Create new user in AirTable
        const fullName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.firstName || user.lastName || '';
        
        airtableUser = await airtable.createUser({
          'Full Name': fullName,
          'Email Address': user.email!,
          'Google ID': user.id,
          'Subscription Tier': 'Free',
        });
      } else if (!airtableUser.fields['Google ID']) {
        // Update existing user with Replit ID
        airtableUser = await airtable.updateUser(airtableUser.id!, {
          'Google ID': user.id,
        });
      }
      
      return {
        airtableId: airtableUser.id,
        subscriptionTier: airtableUser.fields['Subscription Tier'] || 'Free',
      };
    }),
  }),

  portfolios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Get user from AirTable
      const user = await airtable.findUserByEmail(ctx.user.email!);
      
      if (!user) {
        return [];
      }
      
      const portfolios = await airtable.getUserPortfolios(user.id!);
      
      // Get stock details for each portfolio
      const result = await Promise.all(portfolios.map(async (p) => {
        const stockIds = p.fields.Stock || [];
        const stocks = await airtable.getStocksByIds(stockIds);
        
        return {
          id: p.id!,
          name: p.fields.Name,
          notes: p.fields.Notes || '',
          notesSummary: p.fields['Notes Summary (AI)'],
          stockSentiment: p.fields['Stock Sentiment (AI)'],
          daysHeld: p.fields['Days Held'],
          portfolioValue: p.fields['Portfolio Value'],
          stocks: stocks.map(s => ({
            id: s.id!,
            symbol: s.fields['Ticker Symbol'],
            name: s.fields['Stock Name'],
            price: s.fields['Current Price'],
            exchange: s.fields['Exchange'],
            sector: s.fields['Sector'],
            marketCap: s.fields['Market Cap'],
            aiSummary: s.fields['Stock Summary (AI)'],
            aiSentiment: s.fields['Investment Sentiment (AI)'],
          })),
          stockCount: stocks.length,
          dateAdded: p.fields['Date Added'],
        };
      }));
      
      return result;
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await airtable.findUserByEmail(ctx.user.email!);
        if (!user) {
          throw new Error('User not found in AirTable. Please refresh the page.');
        }
        
        const tier = user.fields['Subscription Tier'] || 'Free';
        const existingPortfolios = await airtable.getUserPortfolios(user.id!);
        
        // Check portfolio limits
        if (tier === 'Free' && existingPortfolios.length >= 1) {
          throw new Error('Free tier limited to 1 portfolio. Upgrade to Pro for 5 portfolios.');
        }
        if (tier === 'Pro' && existingPortfolios.length >= 5) {
          throw new Error('Pro tier limited to 5 portfolios. Upgrade to Premium for unlimited.');
        }
        
        const portfolio = await airtable.createPortfolio({
          Name: input.name,
          User: [user.id!],
          Notes: input.notes,
        });
        
        return {
          id: portfolio.id!,
          name: portfolio.fields.Name,
          notes: portfolio.fields.Notes || '',
          stocks: [],
          stockCount: 0,
        };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const updates: any = {};
        if (input.name) updates.Name = input.name;
        if (input.notes !== undefined) updates.Notes = input.notes;
        
        const portfolio = await airtable.updatePortfolio(input.id, updates);
        return {
          id: portfolio.id!,
          name: portfolio.fields.Name,
          notes: portfolio.fields.Notes || '',
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await airtable.deletePortfolio(input.id);
        return { success: true };
      }),

    addStock: protectedProcedure
      .input(z.object({
        portfolioId: z.string(),
        symbol: z.string().toUpperCase(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate symbol
        const isValid = await validateStockSymbol(input.symbol);
        if (!isValid) {
          throw new Error(`Invalid stock symbol: ${input.symbol}`);
        }
        
        // Find or create stock in AirTable
        let stock = await airtable.findStockBySymbol(input.symbol);
        if (!stock) {
          // Fetch stock data to get name
          const stockData = await fetchMultipleStocks([input.symbol]);
          const data = stockData.get(input.symbol);
          
          stock = await airtable.createStock({
            'Ticker Symbol': input.symbol,
            'Stock Name': input.symbol, // Will be updated with real name later
            'Current Price': data?.prices[data.prices.length - 1],
          });
        }
        
        // Get portfolio and check limits
        const user = await airtable.findUserByEmail(ctx.user.email!);
        const tier = user?.fields['Subscription Tier'] || 'Free';
        const stockLimit = tier === 'Free' ? 10 : tier === 'Pro' ? 50 : Infinity;
        
        const portfolios = await airtable.getUserPortfolios(user!.id!);
        const portfolio = portfolios.find(p => p.id === input.portfolioId);
        if (!portfolio) {
          throw new Error('Portfolio not found');
        }
        
        const currentStocks = portfolio.fields.Stock || [];
        if (currentStocks.includes(stock.id!)) {
          throw new Error('Stock already in portfolio');
        }
        
        if (currentStocks.length >= stockLimit) {
          throw new Error(`${tier} tier limited to ${stockLimit} stocks per portfolio.`);
        }
        
        // Add stock to portfolio
        await airtable.updatePortfolio(input.portfolioId, {
          Stock: [...currentStocks, stock.id!],
        });
        
        return { success: true, stockId: stock.id };
      }),

    removeStock: protectedProcedure
      .input(z.object({
        portfolioId: z.string(),
        stockId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await airtable.findUserByEmail(ctx.user.email!);
        const portfolios = await airtable.getUserPortfolios(user!.id!);
        const portfolio = portfolios.find(p => p.id === input.portfolioId);
        
        if (!portfolio) {
          throw new Error('Portfolio not found');
        }
        
        const currentStocks = portfolio.fields.Stock || [];
        const updatedStocks = currentStocks.filter(id => id !== input.stockId);
        
        await airtable.updatePortfolio(input.portfolioId, {
          Stock: updatedStocks,
        });
        
        return { success: true };
      }),
  }),

  screener: router({
    getResults: protectedProcedure
      .input(z.object({
        portfolioId: z.string(),
        date: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const user = await airtable.findUserByEmail(ctx.user.email!);
        const portfolios = await airtable.getUserPortfolios(user!.id!);
        const portfolio = portfolios.find(p => p.id === input.portfolioId);
        
        if (!portfolio) {
          throw new Error('Portfolio not found');
        }
        
        const stockIds = portfolio.fields.Stock || [];
        if (stockIds.length === 0) {
          return [];
        }
        
        const stocks = await airtable.getStocksByIds(stockIds);
        const analyses = await airtable.getAnalysisForStocks(stockIds, input.date);
        
        // Merge stock and analysis data
        return stocks.map(stock => {
          const analysis = analyses.find(a => a.fields.Stock[0] === stock.id);
          
          if (!analysis) {
            return {
              stockId: stock.id!,
              symbol: stock.fields['Ticker Symbol'],
              name: stock.fields['Stock Name'],
              price: stock.fields['Current Price'],
              hasAnalysis: false,
            };
          }
          
          return {
            stockId: stock.id!,
            symbol: stock.fields['Ticker Symbol'],
            name: stock.fields['Stock Name'],
            hasAnalysis: true,
            totalScore: analysis.fields['Total Score'],
            recommendation: analysis.fields.Recommendation,
            currentPrice: analysis.fields['Current Price'],
            priceChange: analysis.fields['Price Change Percent'],
            alerts: analysis.fields.Alerts ? analysis.fields.Alerts.split(', ') : [],
            scores: {
              sma: analysis.fields['SMA Score'],
              macd: analysis.fields['MACD Score'],
              rsi: analysis.fields['RSI Score'],
              volume: analysis.fields['Volume Score'],
              high: analysis.fields['High Score'],
            },
            indicators: {
              sma10: analysis.fields['SMA 10'],
              sma50: analysis.fields['SMA 50'],
              sma200: analysis.fields['SMA 200'],
              rsi: analysis.fields['RSI Value'],
              macdLine: analysis.fields['MACD Line'],
              signalLine: analysis.fields['Signal Line'],
              volumeRatio: analysis.fields['Volume Ratio'],
              high52w: analysis.fields['52 Week High'],
            },
          };
        });
      }),

    getTopOpportunities: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(10),
        date: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const analyses = await airtable.getTopAnalysis(input.limit, input.date);
        
        // Get stock details
        const stockIds = analyses.map(a => a.fields.Stock[0]);
        const stocks = await airtable.getStocksByIds(stockIds);
        
        return analyses.map(analysis => {
          const stock = stocks.find(s => s.id === analysis.fields.Stock[0]);
          
          return {
            symbol: stock?.fields['Ticker Symbol'] || '',
            name: stock?.fields['Stock Name'] || '',
            totalScore: analysis.fields['Total Score'],
            currentPrice: analysis.fields['Current Price'],
            priceChange: analysis.fields['Price Change Percent'],
            recommendation: analysis.fields.Recommendation,
            alerts: analysis.fields.Alerts ? analysis.fields.Alerts.split(', ') : [],
          };
        });
      }),

    runScreener: protectedProcedure
      .input(z.object({
        portfolioId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await airtable.findUserByEmail(ctx.user.email!);
        const portfolios = await airtable.getUserPortfolios(user!.id!);
        const portfolio = portfolios.find(p => p.id === input.portfolioId);
        
        if (!portfolio) {
          throw new Error('Portfolio not found');
        }
        
        const stockIds = portfolio.fields.Stock || [];
        if (stockIds.length === 0) {
          throw new Error('Portfolio has no stocks');
        }
        
        const stocks = await airtable.getStocksByIds(stockIds);
        const symbols = stocks.map(s => s.fields['Ticker Symbol']);
        
        // Fetch market data
        const stockDataMap = await fetchMultipleStocks(symbols);
        
        // Analyze each stock
        const results = [];
        for (const [symbol, data] of Array.from(stockDataMap.entries())) {
          const stock = stocks.find(s => s.fields['Ticker Symbol'] === symbol);
          if (!stock) continue;
          
          const analysis = analyzeStock(data);
          
          // Store in AirTable
          await airtable.createAnalysis({
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
          
          results.push(analysis);
        }
        
        return { success: true, count: results.length };
      }),

    searchStocks: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        return await searchStocks(input.query);
      }),
  }),

  marketData: router({
    getIndexes: publicProcedure.query(async () => {
      return await fetchMarketIndexes();
    }),
    
    getNews: publicProcedure.query(async () => {
      return await getMarketNews();
    }),
  }),

  reports: router({
    getDailyReports: protectedProcedure
      .input(z.object({
        dateFilter: z.enum(['today', 'yesterday', 'week', 'month']).default('today'),
      }))
      .query(async ({ ctx, input }) => {
        const user = await airtable.findUserByEmail(ctx.user.email!);
        if (!user) return [];

        const portfolios = await airtable.getUserPortfolios(user.id!);
        const reports = [];

        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        switch (input.dateFilter) {
          case 'yesterday':
            // Yesterday only - single day
            startDate.setDate(now.getDate() - 1);
            endDate.setDate(now.getDate() - 1);
            break;
          case 'week':
            // Last 7 days including today
            startDate.setDate(now.getDate() - 7);
            endDate = now;
            break;
          case 'month':
            // Last 30 days including today
            startDate.setDate(now.getDate() - 30);
            endDate = now;
            break;
          default:
            // Today only
            startDate = now;
            endDate = now;
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch stocks and analyses once for all portfolios (performance optimization)
        const allStocks = await airtable.getStocks();
        const allAnalyses = await airtable.getAnalyses();

        // Filter analyses within date range (inclusive)
        const filteredAnalyses = allAnalyses.filter(a => {
          const analysisDate = a.fields['Analysis Date'];
          return analysisDate >= startDateStr && analysisDate <= endDateStr;
        });

        for (const portfolio of portfolios) {
          const stockIds = portfolio.fields.Stock || [];
          if (stockIds.length === 0) continue;

          const portfolioStocks = allStocks.filter(s => stockIds.includes(s.id!));
          
          // Get analyses for this portfolio within the date range
          const portfolioAnalysesRaw = filteredAnalyses.filter(a => 
            a.fields.Stock && 
            stockIds.includes(a.fields.Stock[0])
          );

          // Deduplicate analyses by stock - keep only the latest analysis per stock
          const latestAnalysesByStock = new Map<string, typeof portfolioAnalysesRaw[0]>();
          for (const analysis of portfolioAnalysesRaw) {
            const stockId = analysis.fields.Stock![0];
            const existing = latestAnalysesByStock.get(stockId);
            const analysisTime = new Date(analysis.fields['Created At'] || analysis.fields['Analysis Date']).getTime();
            const existingTime = existing ? new Date(existing.fields['Created At'] || existing.fields['Analysis Date']).getTime() : 0;
            
            if (!existing || analysisTime > existingTime) {
              latestAnalysesByStock.set(stockId, analysis);
            }
          }
          const portfolioAnalyses = Array.from(latestAnalysesByStock.values());

          // Map all analyzed stocks
          const allAnalyzedStocks = portfolioAnalyses.map(a => {
            const stock = portfolioStocks.find(s => s.id === a.fields.Stock![0]);
            return {
              symbol: stock?.fields['Ticker Symbol'] || '',
              name: stock?.fields['Stock Name'] || '',
              score: a.fields['Total Score'] || 0,
              price: a.fields['Current Price'] || 0,
              change: (a.fields['Price Change Percent'] || 0) * a.fields['Current Price']! || 0,
              changePercent: (a.fields['Price Change Percent'] || 0) * 100,
              rsi: a.fields['RSI Value'] || 0,
              volumeRatio: a.fields['Volume Ratio'] || 0,
              recommendation: a.fields.Recommendation || 'PASS',
              sector: stock?.fields.Sector || 'Technology',
              // Indicator scores for buy rationale
              smaScore: a.fields['SMA Score'] || 0,
              macdScore: a.fields['MACD Score'] || 0,
              rsiScore: a.fields['RSI Score'] || 0,
              volumeScore: a.fields['Volume Score'] || 0,
              highScore: a.fields['High Score'] || 0,
              // Technical indicator values
              sma10: a.fields['SMA 10'] || 0,
              sma50: a.fields['SMA 50'] || 0,
              sma200: a.fields['SMA 200'] || 0,
              macdLine: a.fields['MACD Line'] || 0,
              signalLine: a.fields['Signal Line'] || 0,
              high52w: a.fields['52 Week High'] || 0,
              alerts: a.fields.Alerts || '',
              // Trading levels
              atr: a.fields['ATR'],
              entryPrice: a.fields['Entry Price'],
              stopLoss: a.fields['Stop Loss'],
              target1: a.fields['Target 1'],
              target2: a.fields['Target 2'],
              target3: a.fields['Target 3'],
              riskReward: a.fields['Risk Reward Ratio'],
            };
          }).sort((a, b) => b.score - a.score);

          // Filter only buy recommendations (score >= 70)
          const recommendations = allAnalyzedStocks.filter(a => a.score >= 70);

          // Sector analysis from ALL analyzed stocks (not just buy recommendations)
          const sectorMap = new Map<string, { count: number; scores: number[] }>();
          allAnalyzedStocks.forEach(r => {
            if (!sectorMap.has(r.sector)) {
              sectorMap.set(r.sector, { count: 0, scores: [] });
            }
            const sector = sectorMap.get(r.sector)!;
            sector.count++;
            sector.scores.push(r.score);
          });

          const sectorAnalysis = Array.from(sectorMap.entries())
            .map(([sector, data]) => ({
              sector,
              count: data.count,
              avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
              topScore: Math.max(...data.scores),
            }))
            .sort((a, b) => b.avgScore - a.avgScore);

          // Calculate execution metadata from analyses
          const latestAnalysis = portfolioAnalyses.length > 0 
            ? portfolioAnalyses.sort((a, b) => 
                new Date(b.fields['Created At'] || b.fields['Analysis Date']).getTime() - 
                new Date(a.fields['Created At'] || a.fields['Analysis Date']).getTime()
              )[0]
            : null;

          const executionStatus = portfolioAnalyses.length === stockIds.length 
            ? 'success' 
            : portfolioAnalyses.length > 0 
              ? 'partial' 
              : 'failed';

          reports.push({
            id: portfolio.id!,
            date: endDateStr,
            portfolioId: portfolio.id!,
            portfolioName: portfolio.fields.Name,
            totalStocks: stockIds.length,
            analyzedStocks: portfolioAnalyses.length,
            strongBuyCount: recommendations.filter(r => r.score >= 80).length,
            buyCount: recommendations.filter(r => r.score >= 70 && r.score < 80).length,
            watchCount: recommendations.filter(r => r.score >= 60 && r.score < 70).length,
            recommendations,
            allAnalyzedStocks,
            sectorAnalysis,
            executionTime: latestAnalysis?.fields['Created At'] || latestAnalysis?.fields['Analysis Date'],
            executionStatus: executionStatus as 'success' | 'partial' | 'failed',
            errorCount: stockIds.length - portfolioAnalyses.length,
            lastAnalysisTime: latestAnalysis?.fields['Created At'] || latestAnalysis?.fields['Analysis Date'],
          });
        }

        return reports;
      }),

    generateReport: protectedProcedure
      .mutation(async ({ ctx }) => {
        const startTime = Date.now();
        const user = await airtable.findUserByEmail(ctx.user.email!);
        if (!user) throw new Error('User not found');

        const portfolios = await airtable.getUserPortfolios(user.id!);
        let totalStocks = 0;
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        
        for (const portfolio of portfolios) {
          const stockIds = portfolio.fields.Stock || [];
          if (stockIds.length === 0) continue;

          const stocks = await airtable.getStocks();
          const portfolioStocks = stocks.filter(s => stockIds.includes(s.id!));
          totalStocks += portfolioStocks.length;

          for (const stock of portfolioStocks) {
            try {
              const stockData = await fetchStockData(stock.fields['Ticker Symbol']);
              const analysis = analyzeStock(stockData);
              
              await airtable.createAnalysis({
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
              successCount++;
            } catch (error) {
              errorCount++;
              const errorMsg = `${stock.fields['Ticker Symbol']}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              console.error(`Failed to analyze ${stock.fields['Ticker Symbol']}:`, error);
            }
          }
        }

        const duration = Date.now() - startTime;
        const status = errorCount === 0 ? 'success' : errorCount < totalStocks ? 'partial' : 'failed';

        return { 
          success: true, 
          executionTime: new Date().toISOString(),
          executionDuration: duration,
          totalStocks,
          successCount,
          errorCount,
          executionStatus: status,
          errors: errors.slice(0, 5),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
