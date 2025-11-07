# Overview

This repository contains multiple AI-focused projects and marketing materials. The primary active project is a **Bullish Breakout Screener** - a stock analysis application that uses technical indicators to identify bullish trading opportunities. The repository also includes business strategy documents for AI agent consulting services and IoT marketing materials.

The Bullish Breakout Screener is a full-stack web application that:
- Analyzes stocks using 5 technical indicators (SMA, MACD, RSI, Volume, 52-week highs)
- Provides portfolio management with subscription tiers (Free, Pro, Premium)
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

**Key Design Patterns**:
- Component-based architecture with shadcn/ui primitives
- Theme system with light/dark mode support via Context API
- Error boundaries for graceful error handling
- Type-safe API calls using tRPC client with superjson transformer

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

**Technical Indicator Scoring System**:
- SMA Breakout Analysis: 25 points maximum
- MACD (Moving Average Convergence Divergence): 20 points maximum
- RSI (Relative Strength Index): 20 points maximum
- Volume Analysis: 15 points maximum
- 52-Week High Breakout: 15 points maximum
- Total possible score: 100 points
- Recommendations: STRONG BUY (70-100), BUY (50-69), WATCH (30-49), PASS (0-29)

**Subscription Tier Limits**:
- Free: 1 portfolio, 10 stocks maximum
- Pro: 5 portfolios, 50 stocks per portfolio
- Premium: Unlimited portfolios and stocks

## Data Storage Solutions

**Primary Database**: AirTable with 4 tables
1. **Users**: Full Name, Email Address, Google ID, Subscription Tier, Profile Photo, Date Joined, Portfolios (linked)
2. **Portfolios**: Name, User (linked), Stock (linked), Date Added, Notes
3. **Stocks**: Ticker Symbol, Stock Name, Exchange, Current Price, Logo, Sector, Market Cap
4. **Stock Analysis**: 22 fields storing technical indicators and scores

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