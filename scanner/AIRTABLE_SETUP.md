# AirTable Setup Guide for Bullish Breakout Screener

## Quick Start

This guide walks you through setting up your AirTable base for the Bullish Breakout Screener application.

## Step 1: Create AirTable Account

1. Go to https://airtable.com
2. Sign up for a free account (or use existing account)
3. Verify your email address

## Step 2: Create New Base

1. Click "Create a base" from your workspace
2. Choose "Start from scratch"
3. Name it: **Bullish Breakout Screener**
4. Click "Create base"

## Step 3: Create Tables

You need to create 4 tables with specific fields. You can use AirTable's AI agent to speed up this process.

### Method 1: Using AirTable AI Agent (Recommended)

For each table below, copy the prompt and paste it into AirTable's AI agent:

#### Users Table Prompt
```
Create a table called "Users" with these fields:
- Full Name (single line text)
- Email Address (email field)
- Google ID (single line text)
- Subscription Tier (single select with options: Free, Pro, Premium, default: Free)
- Profile Photo (attachment field)
- Date Joined (date field)
- Portfolios (linked records to Portfolios table)
```

#### Portfolios Table Prompt
```
Create a table called "Portfolios" with these fields:
- Name (single line text, primary field)
- User (linked records to Users table)
- Stock (linked records to Stocks table)
- Date Added (date field)
- Notes (long text field)
```

#### Stocks Table Prompt
```
Create a table called "Stocks" with these fields:
- Ticker Symbol (single line text, primary field)
- Stock Name (single line text)
- Exchange (single line text)
- Current Price (currency field, USD)
- Logo (attachment field)
- Sector (single line text)
- Market Cap (number field)
- Portfolios (linked records to Portfolios table)
```

#### Stock Analysis Table Prompt
```
Create a table called "Stock Analysis" with these fields:
- Stock (linked records to Stocks table)
- Analysis Date (date field)
- Total Score (number field, integer format)
- SMA Score (number field, integer format)
- MACD Score (number field, integer format)
- RSI Score (number field, integer format)
- Volume Score (number field, integer format)
- High Score (number field, integer format)
- Current Price (currency field, USD)
- Price Change Percent (percent field)
- Recommendation (single select with options: STRONG BUY, BUY, WATCH, PASS)
- Alerts (long text field)
- SMA 10 (number field, decimal, 2 precision)
- SMA 50 (number field, decimal, 2 precision)
- SMA 200 (number field, decimal, 2 precision)
- RSI Value (number field, decimal, 1 precision)
- MACD Line (number field, decimal, 2 precision)
- Signal Line (number field, decimal, 2 precision)
- Volume Ratio (number field, decimal, 2 precision)
- 52 Week High (currency field, USD)
- Created At (formula field: CREATED_TIME())
```

### Method 2: Manual Creation

If you prefer to create tables manually, follow the detailed field specifications in DEPLOYMENT.md.

## Step 4: Get Your Base ID

1. Open your "Bullish Breakout Screener" base
2. Look at the URL in your browser
3. The Base ID starts with "app" followed by 14 characters
4. Example: `https://airtable.com/appHKBkiFZvcJZi8c/...`
5. Your Base ID is: `appHKBkiFZvcJZi8c`
6. Copy and save this ID

## Step 5: Create Personal Access Token (PAT)

1. Go to https://airtable.com/create/tokens
2. Click "Create new token"
3. Enter token name: **Bullish Screener API**

4. Add these scopes (click "Add a scope"):
   - ✓ `data.records:read` - See the data in records
   - ✓ `data.records:write` - Create, edit, and delete records
   - ✓ `data.recordComments:read` - See comments in records
   - ✓ `data.recordComments:write` - Create, edit, and delete record comments
   - ✓ `schema.bases:read` - See the structure of a base
   - ✓ `schema.bases:write` - Edit the structure of a base
   - ✓ `webhook:manage` - View, create, delete webhooks
   - ✓ `block:manage` - Create new releases for custom extensions
   - ✓ `user.email:read` - See the user's email address

5. Under "Access" section, click "Add a base"
6. Select "Bullish Breakout Screener" from the list
7. Click "Create token"
8. **IMPORTANT:** Copy the token immediately - you won't be able to see it again!
9. Save the token securely

## Step 6: Configure Application

In your Manus project or deployment platform, add these environment variables:

```bash
AIRTABLE_API_KEY=your_personal_access_token_here
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

Replace:
- `your_personal_access_token_here` with the PAT you created
- `appXXXXXXXXXXXXXX` with your Base ID

## Step 7: Test Connection

1. Start your application
2. Sign in with Google
3. Try creating a portfolio
4. If successful, your AirTable integration is working!

## Verification Checklist

Before deploying, verify:

- [ ] All 4 tables created (Users, Portfolios, Stocks, Stock Analysis)
- [ ] All fields match the specifications
- [ ] Linked record relationships are set up correctly
- [ ] Personal Access Token has all required scopes
- [ ] Base is added to the token's access list
- [ ] Base ID copied correctly (starts with "app")
- [ ] Environment variables configured in deployment platform

## Sample Data (Optional)

You can add sample data to test the application:

### Sample Stocks
| Ticker Symbol | Stock Name | Exchange | Current Price | Sector |
|---------------|------------|----------|---------------|---------|
| AAPL | Apple Inc. | NASDAQ | 185.50 | Technology |
| MSFT | Microsoft Corporation | NASDAQ | 378.25 | Technology |
| GOOGL | Alphabet Inc. | NASDAQ | 142.80 | Technology |
| TSLA | Tesla, Inc. | NASDAQ | 242.15 | Automotive |
| NVDA | NVIDIA Corporation | NASDAQ | 495.30 | Technology |

## Troubleshooting

### "You are not authorized to perform this operation"

**Cause:** Token doesn't have access to the table

**Solution:**
1. Go to https://airtable.com/create/tokens
2. Find your "Bullish Screener API" token
3. Click "Edit"
4. Under "Access", verify "Bullish Breakout Screener" base is listed
5. If not, click "Add a base" and select it
6. Save changes

### "Table not found" or "Could not find table"

**Cause:** Table name doesn't match exactly

**Solution:**
1. Check table names are exactly: Users, Portfolios, Stocks, Stock Analysis
2. Names are case-sensitive
3. Check for extra spaces in table names

### "Unknown field name"

**Cause:** Field name doesn't match specification

**Solution:**
1. Review field names in your tables
2. Compare with specifications in this guide
3. Field names must match exactly (case-sensitive)
4. Example: "Full Name" not "FullName" or "full name"

### Token expired or invalid

**Cause:** Token was deleted or regenerated

**Solution:**
1. Create a new Personal Access Token
2. Update `AIRTABLE_API_KEY` environment variable
3. Restart your application

## Security Best Practices

1. **Never commit tokens to Git** - Use environment variables
2. **Rotate tokens periodically** - Create new tokens every 90 days
3. **Use minimum required scopes** - Only grant necessary permissions
4. **Monitor token usage** - Check AirTable logs for suspicious activity
5. **Revoke unused tokens** - Delete tokens you're no longer using

## Next Steps

After completing AirTable setup:

1. Deploy your application (see DEPLOYMENT.md)
2. Test user sign-in and portfolio creation
3. Add stocks and run the screener
4. Monitor AirTable for data updates

## Support Resources

- **AirTable Documentation:** https://support.airtable.com
- **AirTable API Reference:** https://airtable.com/developers/web/api/introduction
- **Personal Access Tokens Guide:** https://support.airtable.com/docs/creating-personal-access-tokens

## CSV Templates

If you prefer to import data via CSV, here are the templates:

### Users.csv
```csv
Full Name,Email Address,Google ID,Subscription Tier,Date Joined
John Doe,john@example.com,google_123456,Free,2025-11-05
```

### Portfolios.csv
```csv
Name,Date Added,Notes
Tech Growth Stocks,2025-11-05,Focus on high-growth technology companies
```

### Stocks.csv
```csv
Ticker Symbol,Stock Name,Exchange,Current Price,Sector,Market Cap
AAPL,Apple Inc.,NASDAQ,185.50,Technology,2900000000000
MSFT,Microsoft Corporation,NASDAQ,378.25,Technology,2800000000000
```

### Stock Analysis.csv
```csv
Analysis Date,Total Score,SMA Score,MACD Score,RSI Score,Volume Score,High Score,Current Price,Price Change Percent,Recommendation
2025-11-05,75,20,15,18,12,10,185.50,0.0235,STRONG BUY
```

**Note:** After importing CSVs, you'll need to manually link records between tables.

---

**Ready to deploy?** Continue to DEPLOYMENT.md for deployment instructions.
