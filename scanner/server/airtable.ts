import Airtable from 'airtable';

/**
 * AirTable Configuration - Updated to match actual schema
 * 
 * Field Mappings:
 * Users: Full Name, Email Address, Google ID, Subscription Tier
 * Portfolios: Name, User (linked), Stock (linked)
 * Stocks: Ticker Symbol, Stock Name, Current Price
 * Stock Analysis: 22 fields for technical analysis
 */

const airtablePAT = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;

if (!airtablePAT || !airtableBaseId) {
  console.warn('[AirTable] Missing credentials. Set AIRTABLE_API_KEY (PAT) and AIRTABLE_BASE_ID environment variables.');
}

const airtable = new Airtable({ 
  apiKey: airtablePAT,
  endpointUrl: 'https://api.airtable.com'
});
const base = airtable.base(airtableBaseId || '');

export const TABLES = {
  USERS: 'Users',
  PORTFOLIOS: 'Portfolios',
  STOCKS: 'Stocks',
  STOCK_ANALYSIS: 'Stock Analysis',
} as const;

// Type definitions matching actual AirTable schema
export interface AirtableUser {
  id?: string;
  fields: {
    'Full Name': string;
    'Email Address': string;
    'Google ID'?: string;
    'Subscription Tier'?: 'Free' | 'Pro' | 'Premium';
    'Profile Photo'?: any[];
    'Date Joined'?: string;
    'Portfolios'?: string[]; // Linked records
  };
}

export interface AirtablePortfolio {
  id?: string;
  fields: {
    'Name': string;
    'User': string[]; // Linked to Users
    'Stock'?: string[]; // Linked to Stocks
    'Date Added'?: string;
    'Notes'?: string;
  };
}

export interface AirtableStock {
  id?: string;
  fields: {
    'Ticker Symbol': string;
    'Stock Name': string;
    'Exchange'?: string;
    'Current Price'?: number;
    'Sector'?: string;
    'Market Cap'?: number;
    'Logo'?: any[];
  };
}

export interface AirtableStockAnalysis {
  id?: string;
  fields: {
    'Stock': string[]; // Linked to Stocks
    'Analysis Date': string;
    'Total Score': number;
    'SMA Score': number;
    'MACD Score': number;
    'RSI Score': number;
    'Volume Score': number;
    'High Score': number;
    'Current Price': number;
    'Price Change Percent': number;
    'Recommendation': 'STRONG BUY' | 'BUY' | 'WATCH' | 'PASS';
    'Alerts'?: string;
    'SMA 10'?: number;
    'SMA 50'?: number;
    'SMA 200'?: number;
    'RSI Value'?: number;
    'MACD Line'?: number;
    'Signal Line'?: number;
    'Volume Ratio'?: number;
    '52 Week High'?: number;
    'Created At'?: string;
  };
}

/**
 * User operations
 */
export async function findUserByEmail(email: string): Promise<AirtableUser | null> {
  try {
    const records = await base(TABLES.USERS)
      .select({
        filterByFormula: `{Email Address} = '${email}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) return null;

    return {
      id: records[0].id,
      fields: records[0].fields as AirtableUser['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error finding user:', error);
    throw error;
  }
}

export async function findUserByGoogleId(googleId: string): Promise<AirtableUser | null> {
  try {
    const records = await base(TABLES.USERS)
      .select({
        filterByFormula: `{Google ID} = '${googleId}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) return null;

    return {
      id: records[0].id,
      fields: records[0].fields as AirtableUser['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error finding user by Google ID:', error);
    throw error;
  }
}

export async function createUser(user: Partial<AirtableUser['fields']>): Promise<AirtableUser> {
  try {
    const record = await base(TABLES.USERS).create({
      'Full Name': user['Full Name'] || '',
      'Email Address': user['Email Address'] || '',
      'Google ID': user['Google ID'],
      'Subscription Tier': user['Subscription Tier'] || 'Free',
      'Date Joined': new Date().toISOString().split('T')[0],
    });

    return {
      id: record.id,
      fields: record.fields as AirtableUser['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error creating user:', error);
    throw error;
  }
}

export async function updateUser(recordId: string, updates: Partial<AirtableUser['fields']>): Promise<AirtableUser> {
  try {
    const record = await base(TABLES.USERS).update(recordId, updates);
    return {
      id: record.id,
      fields: record.fields as AirtableUser['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error updating user:', error);
    throw error;
  }
}

/**
 * Portfolio operations
 */
export async function getUserPortfolios(userRecordId: string): Promise<AirtablePortfolio[]> {
  try {
    /**
     * SECURITY NOTE: AirTable's filterByFormula doesn't work with linked record fields via API
     * (SEARCH, FIND, ARRAYJOIN all fail to match linked records)
     * 
     * We fetch all portfolios and filter server-side as a workaround.
     * 
     * This is SECURE because:
     * 1. This function is ONLY called from protectedProcedure endpoints
     * 2. The userRecordId comes from authenticated session (ctx.user), not client input
     * 3. Filtering happens entirely server-side before returning to client
     * 4. Client never receives other users' data
     * 
     * Alternative solutions (require AirTable schema changes):
     * - Add a text field for user ID (duplicates data but enables formula filtering)
     * - Create a rollup field that converts linked User to searchable text
     */
    const records = await base(TABLES.PORTFOLIOS)
      .select({
        sort: [{ field: 'Date Added', direction: 'desc' }],
      })
      .all();

    // Server-side filter: Only return portfolios that belong to this user
    const userPortfolios = records.filter(record => {
      const userField = record.fields.User as string[] | undefined;
      return userField && userField.includes(userRecordId);
    });

    return userPortfolios.map(record => ({
      id: record.id,
      fields: record.fields as AirtablePortfolio['fields'],
    }));
  } catch (error) {
    console.error('[AirTable] Error getting user portfolios:', error);
    throw error;
  }
}

export async function createPortfolio(portfolio: Omit<AirtablePortfolio['fields'], 'Date Added'>): Promise<AirtablePortfolio> {
  try {
    const record = await base(TABLES.PORTFOLIOS).create({
      'Name': portfolio.Name,
      'User': portfolio.User,
      'Stock': portfolio.Stock || [],
      'Notes': portfolio.Notes || '',
      'Date Added': new Date().toISOString().split('T')[0],
    });

    return {
      id: record.id,
      fields: record.fields as AirtablePortfolio['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error creating portfolio:', error);
    throw error;
  }
}

export async function updatePortfolio(recordId: string, updates: Partial<AirtablePortfolio['fields']>): Promise<AirtablePortfolio> {
  try {
    const record = await base(TABLES.PORTFOLIOS).update(recordId, updates);
    return {
      id: record.id,
      fields: record.fields as AirtablePortfolio['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error updating portfolio:', error);
    throw error;
  }
}

export async function deletePortfolio(recordId: string): Promise<void> {
  try {
    await base(TABLES.PORTFOLIOS).destroy(recordId);
  } catch (error) {
    console.error('[AirTable] Error deleting portfolio:', error);
    throw error;
  }
}

/**
 * Stock operations
 */
export async function findStockBySymbol(symbol: string): Promise<AirtableStock | null> {
  try {
    const records = await base(TABLES.STOCKS)
      .select({
        filterByFormula: `{Ticker Symbol} = '${symbol}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) return null;

    return {
      id: records[0].id,
      fields: records[0].fields as AirtableStock['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error finding stock:', error);
    throw error;
  }
}

export async function createStock(stock: Partial<AirtableStock['fields']>): Promise<AirtableStock> {
  try {
    const record = await base(TABLES.STOCKS).create(stock);
    return {
      id: record.id,
      fields: record.fields as AirtableStock['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error creating stock:', error);
    throw error;
  }
}

export async function getStocksByIds(stockIds: string[]): Promise<AirtableStock[]> {
  try {
    if (stockIds.length === 0) return [];
    
    const records = await base(TABLES.STOCKS)
      .select({
        filterByFormula: `OR(${stockIds.map(id => `RECORD_ID() = '${id}'`).join(', ')})`,
      })
      .all();

    return records.map(record => ({
      id: record.id,
      fields: record.fields as AirtableStock['fields'],
    }));
  } catch (error) {
    console.error('[AirTable] Error getting stocks:', error);
    throw error;
  }
}

/**
 * Stock Analysis operations
 */
export async function getAnalysisForStocks(stockIds: string[], analysisDate?: string): Promise<AirtableStockAnalysis[]> {
  try {
    if (stockIds.length === 0) return [];
    
    const date = analysisDate || new Date().toISOString().split('T')[0];
    const stockFilters = stockIds.map(id => `SEARCH('${id}', ARRAYJOIN({Stock}))`).join(', ');
    const filterFormula = `AND(OR(${stockFilters}), {Analysis Date} = '${date}')`;

    const records = await base(TABLES.STOCK_ANALYSIS)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'Total Score', direction: 'desc' }],
      })
      .all();

    return records.map(record => ({
      id: record.id,
      fields: record.fields as AirtableStockAnalysis['fields'],
    }));
  } catch (error) {
    console.error('[AirTable] Error getting analysis:', error);
    throw error;
  }
}

export async function createAnalysis(analysis: Omit<AirtableStockAnalysis['fields'], 'Created At'>): Promise<AirtableStockAnalysis> {
  try {
    const record = await base(TABLES.STOCK_ANALYSIS).create(analysis);
    return {
      id: record.id,
      fields: record.fields as AirtableStockAnalysis['fields'],
    };
  } catch (error) {
    console.error('[AirTable] Error creating analysis:', error);
    throw error;
  }
}

export async function getTopAnalysis(limit: number = 10, analysisDate?: string): Promise<AirtableStockAnalysis[]> {
  try {
    const date = analysisDate || new Date().toISOString().split('T')[0];
    
    const records = await base(TABLES.STOCK_ANALYSIS)
      .select({
        filterByFormula: `{Analysis Date} = '${date}'`,
        sort: [{ field: 'Total Score', direction: 'desc' }],
        maxRecords: limit,
      })
      .all();

    return records.map(record => ({
      id: record.id,
      fields: record.fields as AirtableStockAnalysis['fields'],
    }));
  } catch (error) {
    console.error('[AirTable] Error getting top analysis:', error);
    throw error;
  }
}

export { base };
