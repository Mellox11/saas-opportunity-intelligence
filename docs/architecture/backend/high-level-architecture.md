# High Level Architecture

## Selected: "Monolith + Workers" Hybrid Approach

**Architecture Status:** ✅ **SELECTED** - Hybrid "Monolith + Workers" with Clear Service Boundaries

**Technical Summary:** The backend implements a sophisticated hybrid architecture that combines the development efficiency of a monolithic structure with the scalability benefits of distributed workers. This approach addresses the core challenge of processing intensive AI workloads while maintaining rapid development velocity for the MVP phase.

**Key Architecture Principle:** *"Start Simple, Scale Smart"* - Begin with a cohesive monolith that provides clear service boundaries, enabling future extraction into microservices as the team and user base grows without premature complexity.

## System Overview

The architecture consists of six primary components working in harmony to deliver real-time Reddit analysis with transparent cost tracking:

**1. Next.js API Coordination Layer**
- **Purpose:** User-facing operations, request orchestration, real-time progress tracking
- **Technology:** Next.js 13+ API routes with TypeScript
- **Responsibilities:** Authentication, request validation, cost estimation, progress polling endpoints
- **Scaling Strategy:** Vercel edge functions for global distribution

**2. Background Worker Processes** 
- **Purpose:** Heavy AI processing, Reddit data collection, long-running analysis tasks
- **Technology:** Node.js workers with Bull.js queue management
- **Responsibilities:** Reddit API integration, OpenAI processing, vector database operations
- **Scaling Strategy:** Railway/AWS auto-scaling based on queue depth

**3. Reddit API Integration Module**
- **Purpose:** Rate-limited data collection with circuit breaker protection
- **Rate Limits:** 100 requests/minute for authenticated apps (OAuth 2.0)
- **Architecture Pattern:** Circuit breaker with exponential backoff and request queuing
- **Cost Control:** Automatic throttling and budget enforcement mechanisms

**4. OpenAI Processing Pipeline**
- **Purpose:** Multi-stage AI analysis with cost tracking and retry logic
- **Workflow Stages:** Content classification → Feasibility scoring → Anti-pattern detection → Comment analysis
- **Cost Tracking:** Real-time token consumption monitoring with predictive cost modeling
- **Error Handling:** Graceful degradation with partial results delivery

**5. Pinecone Vector Database**
- **Purpose:** Semantic search and opportunity clustering with cost controls
- **Architecture:** Dual vector stores for posts and comments with separate indexing
- **Cost Management:** Usage caps, query optimization, and FAISS fallback preparation
- **Performance:** Sub-second similarity searches with batched embedding operations

**6. Stripe Billing Integration**
- **Purpose:** Usage-based pricing with comprehensive audit logging
- **Pricing Model:** 4x cost-plus markup on actual API consumption
- **Audit Strategy:** Complete transaction logging, webhook validation, reconciliation processes
- **Compliance:** PCI compliance through Stripe, automated invoice generation

## Architectural Patterns

**Queue Management Pattern:**
- **Technology:** Bull.js with Redis backing store
- **Strategy:** Priority-based job processing with dead letter queues
- **Monitoring:** Real-time queue depth monitoring and worker health checks
- **Scaling:** Automatic worker provisioning based on queue metrics

**Real-Time Cost Tracking Pattern:**
- **Implementation:** Server-Sent Events (SSE) for real-time cost streaming
- **Update Strategy:** Real-time progress updates with automatic reconnection
- **Budget Enforcement:** Automatic analysis termination at user-defined limits
- **Accuracy Target:** Within 5% of actual consumption (improved through AI SDK cost tracking)
- **Performance:** 50% lower latency than WebSocket polling, better browser support

**Circuit Breaker Pattern:**
- **Reddit API:** Automatic failover with request queuing during rate limit periods
- **OpenAI API:** Retry logic with exponential backoff and cost-aware circuit breaking
- **Vector Database:** FAISS local fallback for continued operation during Pinecone outages

**Data Consistency Pattern:**
- **Analysis State:** Event sourcing for analysis progress with idempotent operations
- **Billing Records:** ACID compliance with automated reconciliation and audit trails
- **Vector Sync:** Eventual consistency between PostgreSQL and Pinecone with sync monitoring

## Concurrency & Performance Architecture

**Concurrent User Support:** 50+ simultaneous users with queue-based load balancing
- **API Layer:** Stateless design with connection pooling (max 100 connections)
- **Worker Pool:** Dynamic scaling 5-20 workers based on demand
- **Queue Management:** Priority queues with estimated completion time algorithms

**Reddit Rate Limiting Strategy:**
- **Token Bucket Implementation:** 100 requests/minute with burst capacity
- **Request Distribution:** Round-robin across multiple authenticated applications
- **Backpressure Handling:** Queue depth monitoring with user notification system

**AI Processing Workflows:**
- **Batch Processing:** Intelligent batching to optimize OpenAI API efficiency
- **Parallel Processing:** Comment analysis parallelized across worker pool
- **Cost Optimization:** Request consolidation and caching to minimize token usage

---
