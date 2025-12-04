# 📋 **Momentum - Bullish Breakout Screener | Developer Guide**

## **Project Overview**
Momentum is a full-stack stock analysis tool using 5 technical indicators to identify bullish breakout opportunities. It features portfolio management, automated daily reports, and trading level calculations.

---

## **Architecture**

### **Frontend** 
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State Management:** TanStack Query + tRPC (type-safe API)
- **Build:** Vite

### **Backend**
- **Runtime:** Node.js + Express
- **API:** tRPC 11 (end-to-end type safety)
- **Databases:** 
  - **PostgreSQL** (Replit): User auth + sessions via Drizzle ORM
  - **AirTable** (API): Portfolios, stocks, analysis results

### **Key Services**
1. **screener.ts** - Technical analysis engine with 5 indicators
2. **marketData.ts** - Yahoo Finance API integration
3. **airtable.ts** - Database operations
4. **scheduler.ts** - node-cron for daily 6 AM PST reports
5. **replitAuth.ts** - Replit Auth with multi-provider OAuth

---

## **Screener Algorithm (screener.ts)**

**5 Technical Indicators (100 points total):**
- **SMA Breakout** (25 pts): 10/50/200 period moving averages
- **MACD** (20 pts): 12/26 EMA with 9-day signal line
- **RSI** (20 pts): 14-period Relative Strength Index
- **Volume Analysis** (15 pts): 20-period average volume ratio
- **52-Week High** (15 pts): Distance from yearly high

**Scoring System:**
- STRONG BUY: 70-100 points
- BUY: 50-69 points
- WATCH: 30-49 points
- PASS: 0-29 points

**Key Functions:**
```typescript
- calculateSMA(prices, period) → SMA value
- calculateEMA(prices, period) → EMA value  
- calculateMACD(prices) → {macdLine, signalLine, histogram}
- calculateRSI(prices, period) → RSI (0-100)
- calculateATR(prices, period) → Volatility measure
- calculateTradingLevels(indicators) → Entry, Stop Loss, Targets
- analyzeStock(symbol, priceData) → ScreenerResult
```

---

## **Data Models**

### **ScreenerResult** (output)
```typescript
{
  symbol: string
  totalScore: 0-100
  scores: {sma, macd, rsi, volume, highBreakout}
  indicators: {sma10, sma50, sma200, rsi, macdLine, etc}
  recommendation: 'STRONG BUY' | 'BUY' | 'WATCH' | 'PASS'
  alerts: string[]
  tradingLevels: {entry, stopLoss, target1, target2, target3, riskReward}
}
```

### **Trading Levels Calculation**
- **Entry:** Current market price
- **Stop Loss:** Tighter of (Entry - 1.5×ATR) or (Nearest SMA - 2%), with 5% floor
- **Target 1-3:** Entry + 10%, Entry + 20%, Min(Entry + 3×ATR, 52-week high)
- **Risk/Reward:** Favorable if ≥ 2.0

---

## **API Layer (routers.ts)**

### **tRPC Endpoints**
```typescript
// Auth
- auth.me → Get current user
- auth.logout → End session
- auth.syncUser → Link PostgreSQL user to AirTable

// Portfolios
- portfolios.list → Get all user portfolios
- portfolios.create → Create new portfolio
- portfolios.addStock → Add stock to portfolio
- portfolios.removeStock → Remove stock

// Screener
- screener.analyze → Run analysis on stock
- screener.analyzePortfolio → Batch analyze all stocks
- screener.searchStocks → Search by symbol/name

// Market Data
- market.getIndexes → S&P 500, NASDAQ, Dow Jones live prices
- market.getNews → Market headlines
```

---

## **User ID Synchronization** ⚠️ **CRITICAL**

**Problem:** Two databases with different user IDs
- PostgreSQL User ID: UUID (from Replit Auth)
- AirTable User ID: Record ID (e.g., "recXXXXX")

**Solution:** 
- PostgreSQL `users` table has `airtableUserId` column
- On login (`replitAuth.ts`), automatically find/create AirTable user and save ID
- All API endpoints use `ctx.user.airtableUserId` to query AirTable

---

## **File Structure**
```
scanner/
├── server/
│   ├── _core/
│   │   ├── index.ts (Express setup)
│   │   ├── trpc.ts (tRPC router setup)
│   │   └── context.ts (Request context)
│   ├── screener.ts (Technical analysis engine)
│   ├── marketData.ts (Yahoo Finance)
│   ├── airtable.ts (Database operations)
│   ├── scheduler.ts (Daily reports)
│   ├── replitAuth.ts (Auth + AirTable sync)
│   └── routers.ts (tRPC procedures)
├── client/
│   ├── src/
│   │   ├── components/ (React UI)
│   │   ├── hooks/ (Custom hooks)
│   │   └── pages/ (Views)
└── shared/
    └── schema.ts (PostgreSQL Drizzle ORM)
```

---

## **AirTable Quirk** ⚠️
`filterByFormula` doesn't work with linked record fields. Solution: Fetch all records and filter in JavaScript using `array.filter()`.

---

## **Environment Variables Required**
```
AIRTABLE_API_KEY      # Personal Access Token
AIRTABLE_BASE_ID      # Base ID
DATABASE_URL          # PostgreSQL connection
SESSION_SECRET        # Session encryption key
```

---

## **Development Setup**
```bash
cd scanner
pnpm install
npm run db:push        # Sync PostgreSQL schema
pnpm dev              # Start dev server (port 5000)
```

---

## **Database Schema (PostgreSQL)**

### Users Table
```typescript
{
  id: UUID (primary key)
  email: string (unique)
  firstName: string
  lastName: string
  profileImageUrl: string
  airtableUserId: string (links to AirTable user record)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Sessions Table
```typescript
{
  sid: string (primary key)
  sess: JSONB
  expire: timestamp
}
```

---

## **Authentication Flow**

1. User clicks "Sign In"
2. Redirected to `/api/login`
3. Replit Auth handles OAuth (Google, GitHub, X, Apple, email/password)
4. Callback to `/api/callback` validates token
5. PostgreSQL user created/updated with Replit Auth ID
6. `replitAuth.ts` finds/creates AirTable user and saves ID to `airtableUserId`
7. Session cookie issued (HTTP-only, stored in PostgreSQL)
8. Frontend queries `/api/auth/user` for authenticated user data
9. All subsequent API calls use `ctx.user.airtableUserId` for AirTable queries

---

## **Key Implementation Details**

### Screener Algorithm Flow
1. Fetch historical price data (3 years) from Yahoo Finance
2. Calculate all 5 technical indicators
3. Score each indicator independently
4. Sum scores to get total (0-100)
5. Generate recommendation based on score threshold
6. Calculate trading levels (entry, stop loss, 3 targets)
7. Return complete analysis with alerts

### Portfolio Execution
1. User adds stocks to portfolio in AirTable
2. Scheduler runs daily at 6 AM PST
3. For each stock: fetch latest data → run screener → save analysis
4. Generate execution report with:
   - Success rate (% analyzed successfully)
   - Status (Success/Partial/Failed)
   - Error count
   - Deduplication (keeps latest analysis per stock)

### Real-time Market Integration
- Yahoo Finance API for stock prices and historical data
- No API key required
- Cached for performance
- Fallback handling for rate limits

---

## **Performance Considerations**

- **Market Data Caching:** Stock prices cached to minimize API calls
- **Batch Analysis:** Screener supports analyzing multiple stocks in parallel
- **AirTable Filtering:** Fetch all records and filter in JavaScript (not via API)
- **Report Deduplication:** Prevents duplicate analyses for same stock on same day

---

## **Future Enhancements**

- Real-time alerts for STRONG BUY signals
- Email notifications for portfolio changes
- Advanced charting with TradingView integration
- Machine learning for predictive analysis
- Options strategy recommendations
- Backtesting engine for historical validation
