# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a SaaS Opportunity Intelligence Tool built with Next.js 14 that analyzes Reddit discussions to identify SaaS opportunities using AI analysis. The project uses a custom JWT authentication system and PostgreSQL database with Prisma ORM.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs on port 3002)
- `npm run build` - Build for production
- `npm run start` - Start production server

### Testing & Quality
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode  
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Database Operations
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio

## Architecture

### Core Structure
- **Frontend**: Next.js 14 App Router with server components
- **Backend**: Next.js API routes with custom JWT authentication
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: Bull queues with Redis (optional for Epic 2+)
- **AI Processing**: OpenAI integration with circuit breakers and cost tracking

### Key Services
- `RedditClient` (`lib/services/reddit-client.ts`) - Handles Reddit API interactions with rate limiting
- `AIProcessingService` (`lib/services/ai-processing.service.ts`) - AI-powered SaaS opportunity classification
- `CostTrackingService` (`lib/services/cost-tracking.service.ts`) - Tracks API costs and budget limits
- `AnalysisOrchestrationService` - Coordinates the full analysis pipeline

### Infrastructure Components
- Circuit breakers for external API resilience (`lib/infrastructure/circuit-breaker-registry.ts`)
- Structured logging with correlation IDs (`lib/observability/logger.ts`)
- Rate limiting and security middleware (`lib/security/rate-limiter.ts`)
- Queue-based job processing for scalability (`lib/queues/`)

### Data Models (Prisma Schema)
- `User` - Authentication and user management
- `Analysis` - Main analysis jobs with configuration and results
- `RedditPost` / `RedditComment` - Reddit data storage
- `Opportunity` - AI-classified SaaS opportunities with scoring
- `CostEvent` - API cost tracking events

## Authentication
Custom JWT implementation with:
- Email verification required for registration
- Session management with secure cookies
- Password reset functionality
- Rate limiting on auth endpoints

## Environment Setup
Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - For AI processing
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` - Reddit API credentials
- Email configuration for verification

## Testing Strategy
- Jest with React Testing Library for frontend components
- API route testing with mock data
- Database operations tested against test database
- Coverage reporting enabled

## Cost Management
The application includes comprehensive cost tracking:
- Reddit API requests are metered and tracked
- OpenAI token usage is estimated and logged
- Budget limits enforced before analysis execution
- Real-time cost monitoring during analysis

## Queue System (Epic 2+)
Optional Redis-based queue system for scalability:
- Analysis orchestration queue
- Reddit data collection queue  
- AI processing queue
- Background job monitoring

## Development Notes
- Uses TypeScript with strict type checking
- Tailwind CSS for styling with custom Mercury.com-inspired theme
- Zod schemas for runtime validation
- Error boundaries for graceful error handling
- Comprehensive logging with structured metadata