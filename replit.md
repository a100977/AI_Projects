# Overview

This repository contains multiple AI-focused projects and marketing materials. The primary active project is a **Bullish Breakout Screener** - a stock analysis application that uses technical indicators to identify bullish trading opportunities. The repository also includes business strategy documents for AI agent consulting services and IoT marketing materials.

The Bullish Breakout Screener is a full-stack web application that:
- Analyzes stocks using 5 technical indicators (SMA, MACD, RSI, Volume, 52-week highs)
- Provides portfolio management with subscription tiers (Free, Pro, Premium)
- Generates automated daily reports at 6:00 AM PST with execution statistics
- Uses AirTable as the backend database for application data
- Uses PostgreSQL for user authentication and session management
- Integrates with Yahoo Finance for real-time market data
- Implements Replit Auth for multi-provider authentication (Google, GitHub, X, Apple, email/password)

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**: React 19 with TypeScript, Tailwind CSS 4, and shadcn/ui component library

**State Management**: TanStack Query (React Query) for server state, with tRPC for type-safe API communication

**Routing**: wouter for lightweight client-side routing

**UI Layout**:
- **Portfolio View**: 3-panel responsive layout
  - **Left Panel**: Live market indexes (S&P 500, NASDAQ, Dow Jones) with price changes, market news headlines, and links to financial resources
  - **Center Panel**: Interactive stock table with sortable columns (Symbol, Name, Price, Score, Rating), row selection for detailed view
  - **Right Panel**: Selected stock analysis with technical indicator progress bars, alerts, and "View Live Charts" button; shows "Run Screener" prompt when no analysis exists
- **Reports View**: Daily consolidated reports with execution statistics
  - **Execution Statistics Section**: Shows Last Run timestamp, Status badge (Success/Partial/Failed), Success Rate percentage, and Error count
  - **Executive Summary**: Total Stocks, Analyzed count, STRONG BUY count, BUY count
  - **Top Opportunities Table**: Sortable table showing stocks with scores ≥ 70, including Symbol, Company, Score, Rating, and Buy Rationale
  - **Sector Analysis**: Distribution of strong stocks across market sectors

**Key Design Patterns**:
- Component-based architecture with shadcn/ui primitives
- Theme system with light/dark mode support via Context API
- Error boundaries for graceful error handling
- Type-safe API calls using tRPC client with superjson transformer
- Real-time market data integration with auto-refresh

**Build System**: Vite with custom configuration for development HMR and production builds

## Backend Architecture

**Runtime**: Node.js with Express server

**API Layer**: tRPC 11 for end-to-end type safety between frontend and backend

**Database Strategy**: Dual database approach
- **AirTable** (primary): No-SQL database for portfolios, stocks, and analysis results
- **PostgreSQL** (authentication): Relational database for user authentication and sessions via Drizzle ORM with Neon-backed Replit database

**Authentication Flow**:
- Replit Auth integration for multi-provider sign-in (Google, GitHub, X, Apple, email/password)
- Session-based authentication with HTTP-only cookies stored in PostgreSQL
- JWT token management via Replit Auth SDK
- User data stored in PostgreSQL (auth) and synchronized to AirTable (application data)

**Core Services**:
1. **Market Data Service** (`marketData.ts`): Yahoo Finance API integration for real-time stock data
2. **Screener Algorithm** (`screener.ts`): Technical analysis engine with scoring system
3. **AirTable Integration** (`airtable.ts`): Database operations for all entities
4. **Scheduler Service** (`scheduler.ts`): node-cron for automated daily report generation at 6:00 AM PST with execution tracking

**Report Execution Metadata**:
- **Execution Time**: Timestamp of when screener last ran (from AirTable 'Created At' field)
- **Execution Status**: Success (all stocks analyzed), Partial (some stocks failed), Failed (no stocks analyzed)
- **Success Rate**: Percentage of stocks successfully analyzed vs total stocks in portfolio
- **Error Count**: Number of stocks that failed analysis
- **Deduplication**: Reports deduplicate multiple analyses per stock (keeps latest) to ensure accurate metrics

**Technical Indicator Scoring System**:
- SMA Breakout Analysis: 25 points maximum
- MACD (Moving Average Convergence Divergence): 20 points maximum
- RSI (Relative Strength Index): 20 points maximum
- Volume Analysis: 15 points maximum
- 52-Week High Breakout: 15 points maximum
- Total possible score: 100 points
- Recommendations: STRONG BUY (70-100), BUY (50-69), WATCH (30-49), PASS (0-29)

**Trading Levels System**:
- **ATR (Average True Range)**: 14-period volatility measure using close-to-close differences (Wilder's smoothing method)
- **Entry Price**: Current market price at analysis time
- **Stop Loss**: Tighter (higher) of two candidates, with 5% hard floor:
  - Candidate 1: Entry - 1.5×ATR (volatility-based stop)
  - Candidate 2: Nearest SMA support - 2% (technical support-based stop)
- **Target 1**: Entry + 10% (quick profit target)
- **Target 2**: Entry + 20% (swing trade target)
- **Target 3**: Minimum of (Entry + 3×ATR) or 52-week high, with validation to ensure T3 > T2
- **Risk/Reward Ratio**: (Target1 - Entry) / (Entry - StopLoss), favorable if ≥ 2.0
- **Note**: ATR uses close-to-close price differences (simplified approach), which may understate volatility on gap-heavy stocks

**Subscription Tier Limits**:
- Free: 1 portfolio, 10 stocks maximum
- Pro: 5 portfolios, 50 stocks per portfolio
- Premium: Unlimited portfolios and stocks

## Data Storage Solutions

**Primary Database**: AirTable with 4 tables
1. **Users**: Full Name, Email Address, Google ID, Subscription Tier, Profile Photo, Date Joined, Portfolios (linked)
2. **Portfolios**: Name, User (linked), Stock (linked), Date Added, Notes
3. **Stocks**: Ticker Symbol, Stock Name, Exchange, Current Price, Logo, Sector, Market Cap

**Important AirTable Quirk**: AirTable's `filterByFormula` does not work reliably with linked record fields via the API. The `SEARCH()`, `FIND()`, and similar formulas fail to match records even when the linked IDs are present. Solution: Fetch all records and filter in application code using JavaScript's array methods (`filter`, `includes`, etc.).
4. **Stock Analysis**: 29 fields total
   - 22 original fields: technical indicators, scores, alerts, price data
   - 7 new trading level fields: ATR (Number), Entry Price (Currency), Stop Loss (Currency), Target 1-3 (Currency), Risk Reward Ratio (Number with 2 decimals)

**Authentication Database**: PostgreSQL via Drizzle ORM
- Schema defined in `shared/schema.ts`
- Users table with Replit Auth fields (id, name, email, image)
- Sessions table for authentication state management
- Drizzle migrations system with PostgreSQL dialect

## Authentication and Authorization

**Authentication Provider**: Replit Auth with multiple identity providers (Google, GitHub, X, Apple, email/password)

**Authentication Mechanisms**:
- HTTP-only cookies for session management stored in PostgreSQL sessions table
- OAuth callback URLs use Replit domain (*.repl.co) for compatibility with Replit OIDC
- Session cookies configured for HTTPS access
- User authentication data stored in PostgreSQL
- AirTable synchronization available via `auth.syncUser` mutation after login

**API Endpoints**:
- `/api/login` - Initiates authentication flow
- `/api/callback` - OAuth callback handler
- `/api/logout` - Destroys user session
- `/api/auth/user` - Returns authenticated user data

**Authorization Levels**:
- Public procedures: No authentication required
- Protected procedures: Requires valid user session via isAuthenticated middleware
- Admin procedures: Reserved for future role-based access control

**User Session Flow**:
1. User clicks "Sign In" button which redirects to `/api/login`
2. Replit Auth handles OAuth flow with selected provider
3. OAuth callback (`/api/callback`) validates token and creates/updates user in PostgreSQL
4. Session cookie issued and stored in PostgreSQL sessions table
5. Frontend queries `/api/auth/user` to fetch authenticated user data
6. Future: AirTable synchronization will be implemented to link auth users with portfolio data

## External Dependencies

**Third-Party Services**:
1. **AirTable** (Primary Database)
   - API Key authentication via Personal Access Token (PAT)
   - Base ID configuration for multi-table access
   - Real-time data synchronization

2. **Yahoo Finance API** (Market Data)
   - Free, no API key required
   - Chart data endpoint for historical prices
   - Alternative: Alpha Vantage (mentioned but not implemented)

3. **Replit Auth** (Authentication)
   - Multi-provider authentication (Google, GitHub, X, Apple, email/password)
   - Built-in session management with PostgreSQL storage
   - Automatic OAuth flow handling and token management
   - Storage proxy for file uploads
   - Bearer token authentication

**External APIs Referenced** (not actively used):
- n8n workflows for automation (JSON configuration files present)
- Newsletter RSS feeds (AI news aggregation project)

**Development Dependencies**:
- Vite for development server and HMR
- TypeScript for type checking
- Drizzle Kit for database migrations
- ESBuild for production bundling

**UI Component Libraries**:
- Radix UI primitives (20+ components)
- shadcn/ui component system
- Tailwind CSS for styling
- tw-animate-css for animations

**Data Validation**: Zod for runtime type validation in tRPC procedures