# AirTable Schema Specification for Bullish Breakout Screener

## Overview

This document defines the complete AirTable database schema for the Bullish Breakout Screener web application. The schema consists of three tables designed to support user management, portfolio tracking, and screener results storage.

## Table 1: Users

This table stores all user account information and authentication details.

| Field Name | Field Type | Description | Options/Constraints |
|------------|------------|-------------|---------------------|
| Email | Single line text (Primary) | User's email address from Google OAuth | Required, Unique |
| Name | Single line text | User's full name from Google profile | Required |
| Google ID | Single line text | Unique Google user identifier | Required, Unique |
| Subscription Tier | Single select | Current subscription level | Options: Free, Pro, Premium (Default: Free) |
| Created At | Date | Account creation timestamp | Auto-populated |
| Last Login | Date | Most recent login timestamp | Updated on each login |
| Profile Picture | URL | Google profile picture URL | Optional |

**Views:**
- All Users (default grid view)
- Free Tier Users (filtered by Subscription Tier = Free)
- Pro Tier Users (filtered by Subscription Tier = Pro)
- Premium Tier Users (filtered by Subscription Tier = Premium)

## Table 2: Portfolios

This table stores user-created stock portfolios with linked stocks.

| Field Name | Field Type | Description | Options/Constraints |
|------------|------------|-------------|---------------------|
| Portfolio ID | Autonumber (Primary) | Unique portfolio identifier | Auto-generated |
| User | Linked record | Link to Users table | Required, Link to Users.Email |
| Portfolio Name | Single line text | User-defined portfolio name | Required |
| Description | Long text | Optional portfolio description | Optional |
| Stock Symbols | Long text | Comma-separated list of stock symbols | Required, e.g., "AAPL,MSFT,GOOGL" |
| Stock Count | Formula | Number of stocks in portfolio | Formula: `LEN(SUBSTITUTE({Stock Symbols}, ',', '')) + 1` |
| Created At | Created time | Portfolio creation timestamp | Auto-populated |
| Updated At | Last modified time | Last modification timestamp | Auto-updated |

**Business Logic (enforced in frontend):**
- Free tier: Maximum 1 portfolio, 10 stocks per portfolio
- Pro tier: Maximum 5 portfolios, 50 stocks per portfolio
- Premium tier: Unlimited portfolios and stocks

**Views:**
- All Portfolios (default grid view)
- By User (grouped by User)
- Recently Updated (sorted by Updated At descending)

## Table 3: Screener Results

This table stores daily screener analysis results for each stock symbol.

| Field Name | Field Type | Description | Options/Constraints |
|------------|------------|-------------|---------------------|
| Result ID | Autonumber (Primary) | Unique result identifier | Auto-generated |
| Stock Symbol | Single line text | Stock ticker symbol | Required, e.g., "AAPL" |
| Analysis Date | Date | Date of analysis | Required |
| Total Score | Number | Overall breakout score (0-100) | Integer, 0-100 range |
| SMA Score | Number | Simple Moving Average score | Integer, 0-25 range |
| MACD Score | Number | MACD indicator score | Integer, 0-20 range |
| RSI Score | Number | RSI indicator score | Integer, 0-20 range |
| Volume Score | Number | Volume analysis score | Integer, 0-15 range |
| High Score | Number | 52-week high breakout score | Integer, 0-15 range |
| Current Price | Currency | Stock price at analysis time | USD format |
| Price Change % | Percent | Daily price change percentage | Decimal, can be negative |
| Recommendation | Single select | Trading recommendation | Options: STRONG BUY, BUY, WATCH, PASS |
| Alerts | Long text | Special alerts (JSON array) | e.g., ["GOLDEN_CROSS", "VOLUME_SURGE_3X"] |
| SMA 10 | Number | 10-day simple moving average | Decimal, 2 places |
| SMA 50 | Number | 50-day simple moving average | Decimal, 2 places |
| SMA 200 | Number | 200-day simple moving average | Decimal, 2 places |
| RSI Value | Number | RSI indicator value (0-100) | Decimal, 1 place |
| MACD Line | Number | MACD line value | Decimal, 2 places |
| Signal Line | Number | MACD signal line value | Decimal, 2 places |
| Volume Ratio | Number | Current volume / 20-day avg volume | Decimal, 2 places |
| 52W High | Currency | 52-week high price | USD format |
| Created At | Created time | Result creation timestamp | Auto-populated |

**Recommendation Logic:**
- STRONG BUY: Total Score 70-100
- BUY: Total Score 50-69
- WATCH: Total Score 30-49
- PASS: Total Score 0-29

**Views:**
- All Results (default grid view)
- Latest Analysis (filtered by Analysis Date = today, sorted by Total Score descending)
- Strong Buy Signals (filtered by Recommendation = STRONG BUY)
- By Stock Symbol (grouped by Stock Symbol)
- High Scorers (filtered by Total Score >= 70)

## AirTable API Configuration

### Base Configuration
- Base Name: `Bullish Breakout Screener`
- Tables: 3 (Users, Portfolios, Screener Results)
- API Access: Enabled with Personal Access Token

### Required Permissions
- `data.records:read` - Read records from all tables
- `data.records:write` - Create and update records
- `schema.bases:read` - Read base schema

### Rate Limits
- 5 requests per second per base
- Use batching for bulk operations (up to 10 records per request)

## Data Relationships

### Users → Portfolios
- One-to-many relationship
- Each user can have multiple portfolios
- Portfolios are linked to users via the User field (linked record)

### Portfolios → Screener Results
- Indirect relationship via Stock Symbols
- Frontend queries Screener Results table filtering by symbols in portfolio
- No direct AirTable link to maintain flexibility

## Sample Data Structure

### Users Table Sample Record
```json
{
  "Email": "john.doe@gmail.com",
  "Name": "John Doe",
  "Google ID": "108234567890123456789",
  "Subscription Tier": "Pro",
  "Created At": "2025-01-15",
  "Last Login": "2025-01-20",
  "Profile Picture": "https://lh3.googleusercontent.com/a/..."
}
```

### Portfolios Table Sample Record
```json
{
  "Portfolio ID": 1,
  "User": ["john.doe@gmail.com"],
  "Portfolio Name": "Tech Growth",
  "Description": "High-growth technology stocks",
  "Stock Symbols": "AAPL,MSFT,GOOGL,NVDA,META",
  "Stock Count": 5,
  "Created At": "2025-01-15T10:30:00.000Z",
  "Updated At": "2025-01-20T14:22:00.000Z"
}
```

### Screener Results Table Sample Record
```json
{
  "Result ID": 1001,
  "Stock Symbol": "AAPL",
  "Analysis Date": "2025-01-20",
  "Total Score": 75,
  "SMA Score": 20,
  "MACD Score": 15,
  "RSI Score": 18,
  "Volume Score": 12,
  "High Score": 10,
  "Current Price": 185.50,
  "Price Change %": 2.35,
  "Recommendation": "STRONG BUY",
  "Alerts": "[\"GOLDEN_CROSS\"]",
  "SMA 10": 182.30,
  "SMA 50": 178.45,
  "SMA 200": 165.20,
  "RSI Value": 68.5,
  "MACD Line": 2.45,
  "Signal Line": 1.80,
  "Volume Ratio": 1.85,
  "52W High": 190.00,
  "Created At": "2025-01-20T11:00:00.000Z"
}
```

## Migration and Setup Instructions

### Step 1: Create AirTable Base
1. Log in to AirTable
2. Create new base named "Bullish Breakout Screener"
3. Delete default tables

### Step 2: Import Tables via CSV
1. Import Users.csv to create Users table
2. Import Portfolios.csv to create Portfolios table
3. Import Screener_Results.csv to create Screener Results table

### Step 3: Configure Field Types
After CSV import, update field types according to schema above:
- Convert text fields to appropriate types (Date, Currency, Percent, etc.)
- Set up Single Select options for Subscription Tier and Recommendation
- Configure linked records for Portfolios.User → Users.Email
- Set up formula fields for Stock Count

### Step 4: Create Views
Create the views specified in each table section above.

### Step 5: Generate API Key
1. Go to Account settings → Developer hub
2. Create Personal Access Token with required permissions
3. Add scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
4. Copy token for use in application configuration

### Step 6: Note Base and Table IDs
1. Go to AirTable API documentation (https://airtable.com/api)
2. Select your base
3. Copy Base ID (starts with "app...")
4. Copy Table IDs for Users, Portfolios, and Screener Results

## Security Considerations

### Data Protection
- Store AirTable API token securely (environment variables only)
- Never expose API token in client-side code
- Use server-side proxy for all AirTable API calls
- Implement row-level security by filtering records by user email

### Access Control
- Users can only access their own portfolios
- Screener results are read-only for users
- Admin access required for direct AirTable modifications

### Data Validation
- Validate stock symbols against known exchanges before saving
- Enforce portfolio and stock count limits based on subscription tier
- Sanitize user inputs to prevent injection attacks
- Validate date formats and numeric ranges

## Performance Optimization

### Caching Strategy
- Cache screener results for current day (refresh every 15 minutes)
- Cache user profile and subscription tier (refresh on login)
- Cache portfolio lists (invalidate on portfolio changes)

### Query Optimization
- Use filterByFormula to reduce data transfer
- Request only required fields using fields parameter
- Batch create/update operations when possible
- Implement pagination for large result sets

### Rate Limit Management
- Implement exponential backoff for failed requests
- Queue batch operations to stay under 5 req/sec limit
- Use webhooks for real-time updates instead of polling
- Cache frequently accessed data to reduce API calls
