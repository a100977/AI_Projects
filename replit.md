# Overview

This repository contains multiple AI-focused projects and marketing materials. The primary active project is a **Bullish Breakout Screener** - a stock analysis application that uses technical indicators to identify bullish trading opportunities. The repository also includes business strategy documents for AI agent consulting services and IoT marketing materials.

The Bullish Breakout Screener is a full-stack web application that:
- Analyzes stocks using 5 technical indicators (SMA, MACD, RSI, Volume, 52-week highs)
- Provides portfolio management with subscription tiers (Free, Pro, Premium)
- Uses AirTable as the backend database
- Integrates with Yahoo Finance for real-time market data
- Implements Google OAuth authentication via Manus

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
- **AirTable** (primary): No-SQL database for users, portfolios, stocks, and analysis results
- **MySQL** (optional): Traditional SQL database via Drizzle ORM for potential future migration

**Authentication Flow**:
- Manus OAuth integration for Google Sign-In
- Session-based authentication with HTTP-only cookies
- JWT token management with cookie secret
- User synchronization between OAuth provider and AirTable

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

**Alternative Database**: MySQL via Drizzle ORM
- Schema defined in `drizzle/schema.ts`
- Users table with authentication fields
- Migration system available but not primary storage

**File Storage**: Manus storage proxy with Bearer token authentication for media uploads

## Authentication and Authorization

**OAuth Provider**: Manus OAuth with Google as identity provider

**Authentication Mechanisms**:
- HTTP-only cookies for session management
- Cookie domain and security settings based on request protocol (HTTP/HTTPS)
- SameSite=none for cross-origin support
- Session synchronization with AirTable on login

**Authorization Levels**:
- Public procedures: No authentication required
- Protected procedures: Requires valid user session
- Admin procedures: Requires admin role (configured in MySQL schema)

**User Session Flow**:
1. User initiates Google Sign-In via OAuth portal
2. OAuth callback validates token and creates/updates user in MySQL
3. User profile synced to AirTable for application data
4. Session cookie issued for subsequent requests

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

3. **Manus OAuth** (Authentication)
   - Google Sign-In integration
   - OAuth server URL configuration
   - App ID and redirect URI management

4. **Manus Forge API** (Platform Services)
   - Image generation service
   - Data API for external integrations
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