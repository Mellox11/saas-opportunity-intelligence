# 1. Data Models & Database Schema

## PostgreSQL Schema Design

The database schema is designed for ACID compliance in billing operations while supporting complex relationships between analyses, opportunities, and user data. All financial transactions require strict consistency, while analysis data can tolerate eventual consistency for performance.

### Core Entity Relationships

```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT FALSE,
    profile JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at);

-- Analysis Configurations and Execution
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status analysis_status DEFAULT 'pending',
    configuration JSONB NOT NULL, -- subreddits, timeframes, keywords
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    budget_limit DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_details JSONB,
    progress JSONB DEFAULT '{}', -- real-time progress tracking
    results_summary JSONB,
    metadata JSONB DEFAULT '{}'
);

CREATE TYPE analysis_status AS ENUM (
    'pending', 'cost_approved', 'processing', 'completed', 'failed', 'cancelled'
);

CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created ON analyses(created_at DESC);

-- Reddit Data Storage
CREATE TABLE reddit_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    reddit_id VARCHAR(20) UNIQUE NOT NULL, -- Reddit's post ID
    subreddit VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    author VARCHAR(100),
    score INTEGER,
    num_comments INTEGER,
    created_utc TIMESTAMPTZ,
    url TEXT,
    raw_data JSONB, -- full Reddit API response
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    embedding_id VARCHAR(255) -- Pinecone vector ID
);

CREATE INDEX idx_reddit_posts_analysis ON reddit_posts(analysis_id);
CREATE INDEX idx_reddit_posts_subreddit ON reddit_posts(subreddit);
CREATE INDEX idx_reddit_posts_score ON reddit_posts(score DESC);

CREATE TABLE reddit_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES reddit_posts(id) ON DELETE CASCADE,
    reddit_id VARCHAR(20) UNIQUE NOT NULL,
    parent_id VARCHAR(20), -- Reddit parent comment ID
    content TEXT NOT NULL,
    author VARCHAR(100),
    score INTEGER,
    created_utc TIMESTAMPTZ,
    raw_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    embedding_id VARCHAR(255)
);

CREATE INDEX idx_reddit_comments_post ON reddit_comments(post_id);
CREATE INDEX idx_reddit_comments_score ON reddit_comments(score DESC);

-- AI Analysis Results
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    source_post_id UUID REFERENCES reddit_posts(id),
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- 10-dimensional scoring
    scoring_dimensions JSONB NOT NULL, -- persona, emotion, market_size, etc.
    
    -- Anti-pattern detection
    anti_patterns JSONB DEFAULT '[]', -- array of detected anti-patterns
    
    -- Market analysis
    market_signals JSONB DEFAULT '{}',
    suggested_solutions JSONB DEFAULT '[]',
    competitive_analysis JSONB DEFAULT '{}',
    
    -- Evidence and supporting data
    supporting_evidence JSONB DEFAULT '[]', -- quotes, comment analysis
    related_comments INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opportunities_analysis ON opportunities(analysis_id);
CREATE INDEX idx_opportunities_score ON opportunities(opportunity_score DESC);
CREATE INDEX idx_opportunities_confidence ON opportunities(confidence_score DESC);

-- Cost Tracking and Billing
CREATE TABLE cost_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    event_type cost_event_type NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'reddit', 'openai', 'pinecone'
    quantity INTEGER NOT NULL, -- requests, tokens, operations
    unit_cost DECIMAL(10,6) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    event_data JSONB DEFAULT '{}', -- provider-specific details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE cost_event_type AS ENUM (
    'reddit_api_request', 'openai_tokens', 'pinecone_query', 'pinecone_upsert'
);

CREATE INDEX idx_cost_events_analysis ON cost_events(analysis_id);
CREATE INDEX idx_cost_events_type ON cost_events(event_type);
CREATE INDEX idx_cost_events_created ON cost_events(created_at);

-- Payment Processing
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    status payment_status DEFAULT 'pending',
    cost_breakdown JSONB NOT NULL, -- itemized costs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'succeeded', 'failed', 'cancelled'
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_analysis ON payments(analysis_id);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
```

### Prisma Schema Configuration

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["jsonProtocol", "postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgcrypto, vector]
}

model User {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email         String   @unique
  passwordHash  String   @map("password_hash")
  emailVerified Boolean  @default(false) @map("email_verified")
  profile       Json     @default("{}")
  preferences   Json     @default("{}")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  analyses Analysis[]
  payments Payment[]

  @@map("users")
}

model Analysis {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String         @map("user_id") @db.Uuid
  status          AnalysisStatus @default(PENDING)
  configuration   Json
  estimatedCost   Decimal?       @map("estimated_cost") @db.Decimal(10, 2)
  actualCost      Decimal?       @map("actual_cost") @db.Decimal(10, 2)
  budgetLimit     Decimal?       @map("budget_limit") @db.Decimal(10, 2)
  progress        Json           @default("{}")
  resultsSummary  Json?          @map("results_summary")
  metadata        Json           @default("{}")
  errorDetails    Json?          @map("error_details")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")

  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  redditPosts  RedditPost[]
  opportunities Opportunity[]
  costEvents   CostEvent[]
  payment      Payment?

  @@map("analyses")
}

enum AnalysisStatus {
  PENDING       @map("pending")
  COST_APPROVED @map("cost_approved")
  PROCESSING    @map("processing")
  COMPLETED     @map("completed")
  FAILED        @map("failed")
  CANCELLED     @map("cancelled")

  @@map("analysis_status")
}
```

## Vector Database Integration

### Pinecone Configuration

```typescript
// lib/pinecone.ts
import { PineconeClient } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENVIRONMENT!
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// Dual Vector Store Architecture
export const VECTOR_STORES = {
  POSTS: 'saas-opportunities-posts',
  COMMENTS: 'saas-opportunities-comments'
} as const

interface VectorMetadata {
  analysisId: string
  redditId: string
  subreddit: string
  createdUtc: number
  score?: number
  opportunityScore?: number
}

export class VectorService {
  private postsIndex: any
  private commentsIndex: any

  async initialize() {
    this.postsIndex = pinecone.Index(VECTOR_STORES.POSTS)
    this.commentsIndex = pinecone.Index(VECTOR_STORES.COMMENTS)
  }

  async embedText(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    })
    
    return response.data[0].embedding
  }

  async storePostVector(
    postId: string,
    text: string,
    metadata: VectorMetadata
  ): Promise<void> {
    const embedding = await this.embedText(text)
    
    await this.postsIndex.upsert({
      vectors: [{
        id: postId,
        values: embedding,
        metadata
      }]
    })
  }

  async findSimilarOpportunities(
    queryText: string,
    options: {
      topK?: number
      scoreThreshold?: number
      analysisId?: string
    } = {}
  ): Promise<Array<{
    id: string
    score: number
    metadata: VectorMetadata
  }>> {
    const { topK = 10, scoreThreshold = 0.7, analysisId } = options
    const embedding = await this.embedText(queryText)

    const filter = analysisId ? { analysisId } : {}

    const results = await this.postsIndex.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter
    })

    return results.matches
      .filter(match => match.score >= scoreThreshold)
      .map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata as VectorMetadata
      }))
  }
}
```

---
