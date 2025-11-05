# AirTable Implementation Analysis

## Key Requirements from Spec

### Core Features
1. User authentication (Google OAuth)
2. Portfolio management (create, view, manage)
3. Stock tracking (add/remove stocks)
4. Daily screener execution with scoring algorithm
5. Dashboard with results display
6. Alerts and notifications

### Subscription Tiers
- Free: 1 portfolio, 10 stocks
- Pro: 5 portfolios, 50 stocks per portfolio
- Premium: Unlimited portfolios and stocks

### Technical Indicators (Scoring Algorithm)
1. SMA Breakout (25 points max)
2. MACD (20 points max)
3. RSI (20 points max)
4. Volume Analysis (15 points max)
5. 52-Week High Breakout (15 points max)
Total: 100 points max

### Recommendations
- STRONG BUY: 70-100 points
- BUY: 50-69 points
- WATCH: 30-49 points
- PASS: 0-29 points

## AirTable Schema Design (3 Tables)

### Table 1: Users
- Email (email, primary field)
- Name (text)
- Google ID (text)
- Subscription Tier (single select: Free, Pro, Premium)
- Created At (date)
- Last Login (date)

### Table 2: Portfolios
- Portfolio ID (autonumber, primary field)
- User Email (linked to Users)
- Portfolio Name (text)
- Description (long text)
- Created At (date)
- Stock Symbols (long text, comma-separated)

### Table 3: Screener Results
- Result ID (autonumber, primary field)
- Stock Symbol (text)
- Analysis Date (date)
- Total Score (number)
- SMA Score (number)
- MACD Score (number)
- RSI Score (number)
- Volume Score (number)
- High Score (number)
- Current Price (currency)
- Recommendation (single select: STRONG BUY, BUY, WATCH, PASS)
- Alerts (long text)
- Created At (date)

## Deployment Strategy
- Static frontend with client-side logic
- AirTable as backend database
- Google OAuth for authentication
- Market data from free API (Alpha Vantage or Yahoo Finance)
- Deploy to B12.io or similar static hosting
