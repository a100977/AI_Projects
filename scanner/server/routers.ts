import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from 'zod';
import * as airtable from './airtable';
import { fetchMultipleStocks, validateStockSymbol, searchStocks } from './marketData';
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
          stocks: stocks.map(s => ({
            id: s.id!,
            symbol: s.fields['Ticker Symbol'],
            name: s.fields['Stock Name'],
            price: s.fields['Current Price'],
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
});

export type AppRouter = typeof appRouter;
