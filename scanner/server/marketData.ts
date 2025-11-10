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
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        console.error(`[MarketData] Yahoo Finance returned HTML (status ${response.status}) for ${symbol}`);
        throw new Error(`Unable to fetch stock data for ${symbol}. The market data service may be temporarily unavailable. Please try again later.`);
      }
      throw new Error(`Yahoo Finance API returned status ${response.status} for ${symbol}`);
    }

    if (!response.data || typeof response.data !== 'object') {
      console.error(`[MarketData] Invalid response format for ${symbol}:`, response.data);
      throw new Error(`Invalid response from market data service for ${symbol}`);
    }

    if (!response.data.chart) {
      console.error(`[MarketData] Missing chart data for ${symbol}`);
      throw new Error(`No chart data available for ${symbol}. Please check the stock symbol is correct.`);
    }

    if (response.data.chart.error) {
      throw new Error(`Yahoo Finance API error: ${response.data.chart.error.description || 'Unknown error'}`);
    }

    const result = response.data.chart.result?.[0];
    if (!result) {
      throw new Error(`No data found for symbol: ${symbol}. Please verify the stock symbol is correct.`);
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0];

    if (!quotes) {
      throw new Error(`No price data available for ${symbol}`);
    }

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
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error(`[MarketData] Timeout fetching ${symbol}`);
        throw new Error(`Request timeout while fetching ${symbol}. Please try again.`);
      }
      if (error.response) {
        console.error(`[MarketData] HTTP ${error.response.status} for ${symbol}:`, error.message);
      } else {
        console.error(`[MarketData] Network error fetching ${symbol}:`, error.message);
      }
      throw new Error(`Failed to fetch stock data for ${symbol}. Please check your internet connection and try again.`);
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
 * Search for stock symbols
 * Searches through all stocks in AirTable database plus common stocks
 */
export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>> {
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
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'ADBE', name: 'Adobe Inc.' },
    { symbol: 'CRM', name: 'Salesforce Inc.' },
    { symbol: 'INTC', name: 'Intel Corporation' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
    { symbol: 'ORCL', name: 'Oracle Corporation' },
    { symbol: 'IBM', name: 'IBM Corporation' },
    { symbol: 'SHOP', name: 'Shopify Inc.' },
    { symbol: 'UBER', name: 'Uber Technologies Inc.' },
    { symbol: 'DASH', name: 'DoorDash Inc.' },
    { symbol: 'ABNB', name: 'Airbnb Inc.' },
    { symbol: 'LYFT', name: 'Lyft Inc.' },
    { symbol: 'SOFI', name: 'SoFi Technologies Inc.' },
    { symbol: 'HOOD', name: 'Robinhood Markets Inc.' },
    { symbol: 'UPST', name: 'Upstart Holdings Inc.' },
    { symbol: 'AFRM', name: 'Affirm Holdings Inc.' },
    { symbol: 'PATH', name: 'UiPath Inc.' },
    { symbol: 'U', name: 'Unity Software Inc.' },
    { symbol: 'DKNG', name: 'DraftKings Inc.' },
    { symbol: 'MARA', name: 'Marathon Digital Holdings Inc.' },
    { symbol: 'RIOT', name: 'Riot Platforms Inc.' },
    { symbol: 'AI', name: 'C3.ai Inc.' },
    { symbol: 'OKTA', name: 'Okta Inc.' },
    { symbol: 'MDB', name: 'MongoDB Inc.' },
    { symbol: 'ESTC', name: 'Elastic N.V.' },
    { symbol: 'S', name: 'SentinelOne Inc.' },
    { symbol: 'IONQ', name: 'IonQ Inc.' },
    { symbol: 'RGTI', name: 'Rigetti Computing Inc.' },
    { symbol: 'QBTS', name: 'D-Wave Quantum Inc.' },
    { symbol: 'QUBT', name: 'Quantum Computing Inc.' },
    { symbol: 'ARQQ', name: 'Arqit Quantum Inc.' },
    { symbol: 'BBAI', name: 'BigBear.ai Holdings Inc.' },
    { symbol: 'SOUN', name: 'SoundHound AI Inc.' },
    { symbol: 'LAZR', name: 'Luminar Technologies Inc.' },
    { symbol: 'PLUG', name: 'Plug Power Inc.' },
    { symbol: 'FCEL', name: 'FuelCell Energy Inc.' },
    { symbol: 'BE', name: 'Bloom Energy Corporation' },
    { symbol: 'BLNK', name: 'Blink Charging Co.' },
    { symbol: 'CHPT', name: 'ChargePoint Holdings Inc.' },
    { symbol: 'GEVO', name: 'Gevo Inc.' },
    { symbol: 'QS', name: 'QuantumScape Corporation' },
    { symbol: 'ENPH', name: 'Enphase Energy Inc.' },
    { symbol: 'SEDG', name: 'SolarEdge Technologies Inc.' },
    { symbol: 'FSLR', name: 'First Solar Inc.' },
    { symbol: 'RUN', name: 'Sunrun Inc.' },
    { symbol: 'BLDP', name: 'Ballard Power Systems Inc.' },
    { symbol: 'FROG', name: 'JFrog Ltd.' },
    { symbol: 'MSTR', name: 'MicroStrategy Incorporated' },
    { symbol: 'NU', name: 'Nu Holdings Ltd.' },
    { symbol: 'AMRC', name: 'Ameresco Inc.' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.' },
    { symbol: 'SQ', name: 'Block Inc.' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation' },
    { symbol: 'CMG', name: 'Chipotle Mexican Grill Inc.' },
    { symbol: 'NKE', name: 'Nike Inc.' },
    { symbol: 'CART', name: 'Maplebear Inc. (Instacart)' },
    { symbol: 'HIMS', name: 'Hims & Hers Health Inc.' },
    { symbol: 'CELH', name: 'Celsius Holdings Inc.' },
    { symbol: 'ELF', name: 'e.l.f. Beauty Inc.' },
    { symbol: 'KD', name: 'Kyndryl Holdings Inc.' },
    { symbol: 'PSTG', name: 'Pure Storage Inc.' },
    { symbol: 'HUBS', name: 'HubSpot Inc.' },
    { symbol: 'INTU', name: 'Intuit Inc.' },
    { symbol: 'NTAP', name: 'NetApp Inc.' },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C' },
    { symbol: 'BTC-USD', name: 'Bitcoin USD' },
    { symbol: 'ETH-USD', name: 'Ethereum USD' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
    { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  ];

  const upperQuery = query.toUpperCase();
  const filtered = commonStocks.filter(
    stock =>
      stock.symbol.includes(upperQuery) ||
      stock.name.toUpperCase().includes(upperQuery)
  );

  // Limit results to 50 to avoid overwhelming the UI
  return filtered.slice(0, 50);
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
      title: 'Live Market Updates',
      url: 'https://www.cnbc.com/markets/',
      source: 'CNBC',
    },
    {
      title: 'Latest Market News',
      url: 'https://www.marketwatch.com/latest-news',
      source: 'MarketWatch',
    },
    {
      title: 'Markets & Economy',
      url: 'https://www.bloomberg.com/markets',
      source: 'Bloomberg',
    },
    {
      title: 'Stock Market News',
      url: 'https://finance.yahoo.com/',
      source: 'Yahoo Finance',
    },
  ];
}
