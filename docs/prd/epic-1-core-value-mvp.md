# Epic 1: Core Value MVP

**Epic Goal:** Prove market demand by delivering a working Reddit analysis tool that users will pay for, establishing the core value proposition of AI-powered SaaS opportunity identification with transparent usage-based pricing within 6-8 weeks.

## Story 1.1: Basic User Authentication

As a developer exploring SaaS opportunities,
I want to create an account with email and password,
so that I can access the analysis tool and track my usage history.

### Acceptance Criteria

1. User can register with email, password, and basic profile information
2. System validates email format and password strength (8+ characters)
3. User receives email verification with activation link
4. User can login with verified credentials
5. User can reset password through email recovery flow
6. Session management keeps user logged in for 7 days with secure cookies
7. Basic profile page shows user information and analysis history placeholder
8. All authentication forms follow dark mode design system with dot grid patterns

## Story 1.2: Reddit Data Collection Configuration

As a user wanting to analyze opportunities,
I want to select 2-3 subreddits and a time range (30/60/90 days),
I want to customize keyword filters for pain point detection,
so that I can define the scope of my analysis.

### Acceptance Criteria

1. Analysis configuration page with clean form interface and dot grid background
2. Dropdown/autocomplete for popular subreddits (r/Entrepreneur, r/SideProject, r/startups, r/freelance)
3. Custom subreddit input field with validation (r/ format, exists check)
4. Time range selector with radio buttons (30, 60, 90 days)
5. Pre-populated keyword lists with checkboxes ("I hate," "I need a tool," "frustrating," etc.)
6. Custom keyword input field for additional pain point terms
7. Configuration saves to user profile for future use
8. Form validation prevents submission with invalid subreddit names
9. Real-time preview showing estimated post count for selected configuration

## Story 1.3: Cost Estimation & Budget Approval

As a cost-conscious indie hacker,
I want to see estimated costs before starting analysis,
I want to set spending limits and approve charges,
so that I can control my expenses and avoid surprises.

### Acceptance Criteria

1. Cost estimation calculator shows breakdown: Reddit API ($X), AI Analysis ($Y), Total ($Z)
2. Cost calculation updates in real-time as user modifies analysis scope
3. User can set maximum spending limit with slider or input field
4. Clear warning if estimated cost exceeds user-defined budget
5. Cost approval modal with itemized breakdown before starting analysis
6. "Proceed" button disabled until user explicitly approves estimated cost
7. Cost estimation accuracy within 25% of actual charges (tracked for improvement)
8. Progress indicator shows cost accumulation during analysis
9. Automatic stop mechanism if actual costs approach user-approved limit

## Story 1.4: Basic AI Analysis Pipeline

As a user seeking validated opportunities,
I want the system to analyze Reddit posts for SaaS feasibility and basic scoring,
so that I can identify promising opportunities without manual research.

### Acceptance Criteria

1. System collects Reddit posts from configured subreddits within time range
2. Keyword filtering removes posts not matching pain point criteria
3. AI classifies posts for SaaS feasibility (binary classification with confidence)
4. Basic opportunity scoring on 3 key dimensions: urgency, market signals, feasibility
5. Posts scored above threshold (70+) included in final analysis
6. Real-time progress tracking shows current processing stage and estimated completion
7. Error handling for Reddit API failures with partial results delivery
8. Analysis completes within 10 minutes for standard configuration (2 subreddits, 30 days)
9. System stores analysis results for user access and future reference
10. Circuit breaker prevents runaway costs if AI processing fails

## Story 1.5: Simple Payment Processing

As a user who received valuable analysis,
I want to pay for my analysis using a credit card,
so that I can access my results and support the service.

### Acceptance Criteria

1. Stripe payment form integrated with analysis completion workflow
2. Final cost calculation shows actual Reddit API and AI processing charges
3. 4x markup applied to actual costs for transparent pricing model
4. Payment form accepts major credit cards with Stripe validation
5. Successful payment unlocks analysis results immediately
6. Payment confirmation email with cost breakdown and receipt
7. Failed payment handling with retry options and clear error messages
8. Webhook validation ensures payment completion before result access
9. Basic invoice generation for user records
10. Payment history accessible in user profile

## Story 1.6: Basic Analysis Report Generation

As a user who completed payment,
I want to view my analysis results with opportunity scores and key insights,
so that I can evaluate potential SaaS projects to pursue.

### Acceptance Criteria

1. Clean, professional report interface with dot grid background styling
2. Executive summary showing total posts analyzed, top opportunities count
3. Opportunity cards displaying: problem title, score (1-100), subreddit source
4. Each card includes pain level evidence (direct quotes from posts)
5. Basic anti-pattern warnings for obviously problematic opportunities
6. Sortable/filterable results by score, subreddit, or problem type
7. Export functionality for PDF download of complete report
8. Analysis metadata: date, configuration used, total cost paid
9. Results remain accessible in user account for future reference
10. Share functionality generates secure link for report viewing (optional)

---
