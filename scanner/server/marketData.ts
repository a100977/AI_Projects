import axios from 'axios';
import { StockData } from './screener';

/**
 * Market Data API Integration
 * 
 * This module provides integration with Yahoo Finance API (free, no API key required)
 * Alternative: Alpha Vantage (requires API key but more reliable)
 * 
 * For production, consider using Alpha Vantage with API key from environment variable
 */

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: any;
  };
}

/**
 * Fetch stock data from Yahoo Finance
 * 
 * @param symbol Stock ticker symbol (e.g., "AAPL")
 * @param range Time range (e.g., "6mo", "1y")
 * @param interval Data interval (e.g., "1d", "1wk")
 */
export async function fetchStockData(
  symbol: string,
  range: string = '6mo',
  interval: string = '1d'
): Promise<StockData> {
  try {
    const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}`;
    const response = await axios.get<YahooFinanceResponse>(url, {
      params: {
        range,
        interval,
      },
      timeout: 10000,
    });

    if (response.data.chart.error) {
      throw new Error(`Yahoo Finance API error: ${response.data.chart.error.description}`);
    }

    const result = response.data.chart.result[0];
    if (!result) {
      throw new Error(`No data found for symbol: ${symbol}`);
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    // Convert timestamps to dates
    const dates = timestamps.map(ts => new Date(ts * 1000).toISOString().split('T')[0]);

    // Use closing prices
    const prices = quotes.close.filter(p => p !== null && p !== undefined) as number[];
    const volumes = quotes.volume.filter(v => v !== null && v !== undefined) as number[];

    if (prices.length === 0) {
      throw new Error(`No valid price data for symbol: ${symbol}`);
    }

    return {
      symbol,
      prices,
      volumes,
      dates,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[MarketData] Error fetching ${symbol}:`, error.message);
      throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch data for multiple stocks in parallel
 */
export async function fetchMultipleStocks(
  symbols: string[],
  range: string = '6mo',
  interval: string = '1d'
): Promise<Map<string, StockData>> {
  const results = new Map<string, StockData>();
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const promises = batch.map(async symbol => {
      try {
        const data = await fetchStockData(symbol, range, interval);
        return { symbol, data };
      } catch (error) {
        console.error(`[MarketData] Failed to fetch ${symbol}:`, error);
        return { symbol, data: null };
      }
    });

    const batchResults = await Promise.all(promises);
    
    for (const { symbol, data } of batchResults) {
      if (data) {
        results.set(symbol, data);
      }
    }

    // Rate limiting: wait 1 second between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Validate stock symbol
 * Returns true if symbol exists and has data
 */
export async function validateStockSymbol(symbol: string): Promise<boolean> {
  try {
    await fetchStockData(symbol, '5d', '1d');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current stock price
 */
export async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const data = await fetchStockData(symbol, '1d', '1m');
    return data.prices[data.prices.length - 1];
  } catch (error) {
    console.error(`[MarketData] Error getting current price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Search for stock symbols (basic implementation)
 * For production, consider using a dedicated search API
 */
export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>> {
  // This is a simplified implementation
  // In production, use Yahoo Finance search API or another service
  const commonStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'MA', name: 'Mastercard Inc.' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'KO', name: 'The Coca-Cola Company' },
    { symbol: 'PEP', name: 'PepsiCo Inc.' },
    { symbol: 'MCD', name: "McDonald's Corporation" },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
    { symbol: 'PLTR', name: 'Palantir Technologies Inc.' },
    { symbol: 'COIN', name: 'Coinbase Global Inc.' },
    { symbol: 'RBLX', name: 'Roblox Corporation' },
    { symbol: 'SNOW', name: 'Snowflake Inc.' },
    { symbol: 'NET', name: 'Cloudflare Inc.' },
    { symbol: 'DDOG', name: 'Datadog Inc.' },
    { symbol: 'CRWD', name: 'CrowdStrike Holdings Inc.' },
    { symbol: 'ZS', name: 'Zscaler Inc.' },
  ];

  const upperQuery = query.toUpperCase();
  return commonStocks.filter(
    stock =>
      stock.symbol.includes(upperQuery) ||
      stock.name.toUpperCase().includes(upperQuery)
  );
}

/**
 * Market Index data structure
 */
export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

/**
 * Fetch market index data (S&P 500, NASDAQ, DOW)
 */
export async function fetchMarketIndexes(): Promise<MarketIndex[]> {
  const indexes = [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^IXIC', name: 'NASDAQ' },
    { symbol: '^DJI', name: 'Dow Jones' },
  ];

  const results: MarketIndex[] = [];

  for (const index of indexes) {
    try {
      const url = `${YAHOO_FINANCE_BASE_URL}/${index.symbol}`;
      const response = await axios.get<YahooFinanceResponse>(url, {
        params: {
          range: '1d',
          interval: '1m',
        },
        timeout: 10000,
      });

      if (response.data.chart.error) {
        console.error(`Yahoo Finance API error for ${index.symbol}:`, response.data.chart.error);
        continue;
      }

      const result = response.data.chart.result[0];
      if (!result) continue;

      const meta = result.meta;
      const quotes = result.indicators.quote[0];
      const prices = quotes.close.filter(p => p !== null && p !== undefined) as number[];
      
      if (prices.length === 0) continue;

      const currentPrice = meta.regularMarketPrice || prices[prices.length - 1];
      const previousClose = prices.length > 1 ? prices[0] : currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      results.push({
        symbol: index.symbol,
        name: index.name,
        price: currentPrice,
        change,
        changePercent,
      });
    } catch (error) {
      console.error(`Failed to fetch index ${index.symbol}:`, error);
    }
  }

  return results;
}

/**
 * Market news headline structure
 */
export interface NewsHeadline {
  title: string;
  url: string;
  source: string;
}

/**
 * Get market news headlines
 */
export async function getMarketNews(): Promise<NewsHeadline[]> {
  return [
    {
      title: 'Live Market Updates - CNBC',
      url: 'https://www.cnbc.com/markets/',
      source: 'CNBC',
    },
    {
      title: 'Market News & Analysis - MarketWatch',
      url: 'https://www.marketwatch.com/latest-news',
      source: 'MarketWatch',
    },
  ];
}
