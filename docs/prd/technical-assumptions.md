# Technical Assumptions

## Repository Structure: Monorepo

**Decision:** Single repository with well-structured internal organization, starting as a "majestic monolith" with clear service boundaries that can be extracted later as the team grows.

**Rationale:** Optimizes for solo developer productivity while maintaining ability to scale. Avoids premature microservices complexity that would slow MVP development.

## Service Architecture

**High-Level Architecture:** "Monolith + Workers" hybrid approach with clear service boundaries:

- **Frontend:** React/Next.js application with modern design system
- **API Layer:** Next.js API routes for coordination and user-facing operations
- **Worker Processes:** Separate long-running workers for AI processing (Railway/AWS)
- **Queue System:** Bull.js for job distribution between API and workers
- **Reddit Integration:** Dedicated module with rate limiting and circuit breakers
- **AI Processing:** OpenAI integration with retry logic and cost tracking
- **Database Layer:** PostgreSQL with Prisma ORM, connection pooling, read replicas
- **Vector Operations:** Pinecone with cost caps and alternative providers ready
- **Billing Integration:** Stripe with comprehensive webhook handling and audit logging
- **Real-time Updates:** Smart polling with exponential backoff + WebSocket fallback

**Critical Decision Rationale:** Hybrid architecture solves Vercel timeout limitations while maintaining development simplicity. Clear service boundaries enable future microservice extraction when needed.

## Testing Requirements

**Testing Strategy:** Focused testing pyramid emphasizing business logic and integration points:

- **Unit Tests:** Core business logic, cost calculations, AI response parsing
- **Integration Tests:** Reddit API integration, OpenAI classification accuracy, Stripe billing flows
- **End-to-End Tests:** Critical user journeys from analysis setup to payment completion
- **Manual Testing:** UI/UX validation for modern design system and dark mode

**Special Requirements:** AI output validation with golden dataset, cost calculation accuracy testing, and billing reconciliation verification.

## Additional Technical Assumptions and Requests

**Frontend Technology Stack:**
- **Framework:** React 18+ with Next.js 13+ for full-stack development
- **UI Components:** Headless UI or Radix UI for accessible, customizable components
- **State Management:** Zustand for simple, effective state management
- **Styling:** Tailwind CSS with custom design system (dot grid patterns, Mercury.com-inspired aesthetics)
- **Real-time Updates:** Polling every 5-10 seconds for cost tracking (MVP approach)

**Backend Technology Stack:**
- **Runtime:** Node.js 18+ with TypeScript for type safety
- **API Framework:** Next.js API routes + separate worker processes for long-running tasks
- **Queue System:** Bull.js with Redis for job management and distribution
- **Database:** PostgreSQL with Prisma ORM, connection pooling, and read replicas
- **Vector Database:** Pinecone with cost monitoring, caps, and FAISS/Chroma alternatives ready
- **Payment Processing:** Stripe with usage-based billing, cost caps, and comprehensive audit logging
- **Worker Infrastructure:** Railway or AWS for scalable AI processing workers

**Infrastructure and Deployment:**
- **Frontend + API:** Vercel for Next.js application (frontend + coordination API)
- **Workers:** Railway or AWS for long-running AI processing infrastructure
- **Database:** Railway PostgreSQL or Supabase with connection pooling
- **Queue:** Redis instance for Bull.js job management
- **Monitoring:** Comprehensive logging, error tracking (Sentry), and cost analytics
- **CI/CD:** GitHub Actions for automated testing and multi-environment deployment
- **Cost Controls:** Real-time cost tracking with automatic stopping at user-defined limits

**Design System Requirements:**
- **Primary Aesthetic:** Clean, modern design with subtle dot grid background patterns
- **Alternative Inspiration:** Mercury.com fintech design system (sophisticated, professional)
- **Dark Mode:** Default dark theme with light mode toggle
- **Accessibility:** WCAG AA compliance with focus on dark mode contrast ratios

---
