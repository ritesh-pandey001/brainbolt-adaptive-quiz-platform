# BrainBolt — Architecture Document

## System Overview

BrainBolt is an enterprise adaptive quiz platform built as a monorepo with three packages: a Fastify backend, a Next.js frontend, and a shared type/schema library. The platform uses PostgreSQL for persistence, Redis for caching and real-time leaderboards, and implements a custom adaptive difficulty algorithm.

---

## High-Level Architecture

```
                    ┌──────────────────────────────┐
                    │         Client Browser        │
                    │   (Next.js 14 App Router)     │
                    │                                │
                    │  TanStack Query 5 ◄──► API    │
                    │  React 18  │  Tailwind CSS    │
                    └──────────────┬─────────────────┘
                                   │ HTTP (REST)
                                   │ Port 3000 → 3001
                                   ▼
                    ┌──────────────────────────────┐
                    │      API Gateway Layer        │
                    │         (Fastify 4)           │
                    │                                │
                    │  ┌─────┐ ┌──────┐ ┌────────┐ │
                    │  │CORS │ │Helmet│ │RateLimit│ │
                    │  └─────┘ └──────┘ └────────┘ │
                    │                                │
                    │  Zod Request Validation        │
                    │  Pino Structured Logging       │
                    └──────────────┬─────────────────┘
                                   │
                    ┌──────────────┴─────────────────┐
                    │         Module Router           │
                    ├────────┬──────────┬─────────────┤
                    │        │          │             │
               ┌────▼───┐ ┌─▼──────┐ ┌─▼──────────┐ │
               │Session │ │ Quiz   │ │Leaderboard │ │
               │Module  │ │Module  │ │  Module    │ │
               └───┬────┘ └───┬────┘ └────┬───────┘ │
                   │          │            │         │
                   └──────────┼────────────┘         │
                              │                      │
               ┌──────────────▼────────────────────┐ │
               │      Shared Services Layer        │ │
               │                                    │ │
               │  ┌──────────────┐ ┌─────────────┐ │ │
               │  │  Adaptive    │ │   Cache     │ │ │
               │  │  Difficulty  │ │  Service    │ │ │
               │  │  Engine      │ │  (Redis)    │ │ │
               │  └──────────────┘ └─────────────┘ │ │
               └──────────┬──────────────┬─────────┘ │
                          │              │           │
                   ┌──────▼──────┐ ┌─────▼──────┐   │
                   │ PostgreSQL  │ │   Redis    │   │
                   │    15       │ │    7       │   │
                   │             │ │            │   │
                   │  ┌────────┐ │ │  ┌──────┐  │   │
                   │  │ Prisma │ │ │  │Sorted│  │   │
                   │  │  ORM   │ │ │  │ Sets │  │   │
                   │  └────────┘ │ │  └──────┘  │   │
                   └─────────────┘ └────────────┘   │
                                                     │
                    └────────────────────────────────┘
```

---

## Request Flow

### 1. Session Start Flow

```
Client                    Backend                   PostgreSQL           Redis
  │                         │                          │                   │
  │  POST /v1/session/start │                          │                   │
  │────────────────────────▶│                          │                   │
  │                         │  Find/Create UserState   │                   │
  │                         │─────────────────────────▶│                   │
  │                         │◀─────────────────────────│                   │
  │                         │                          │                   │
  │                         │  Build Question Pool     │                   │
  │                         │  (difficulty spread)     │                   │
  │                         │─────────────────────────▶│                   │
  │                         │◀─────────────────────────│                   │
  │                         │                          │                   │
  │                         │  Create QuizSession +    │                   │
  │                         │  QuizSessionQuestions     │                   │
  │                         │  (Prisma transaction)    │                   │
  │                         │─────────────────────────▶│                   │
  │                         │◀─────────────────────────│                   │
  │                         │                          │                   │
  │  SessionStateResponse   │                          │                   │
  │◀────────────────────────│                          │                   │
```

### 2. Answer Submission Flow (with Idempotency + Optimistic Locking)

```
Client                    Backend                   PostgreSQL           Redis
  │                         │                          │                   │
  │  POST /v1/session/answer│                          │                   │
  │  (idempotencyKey,       │                          │                   │
  │   stateVersion)         │                          │                   │
  │────────────────────────▶│                          │                   │
  │                         │                          │                   │
  │                         │  Check idempotency       │                   │
  │                         │  (AnswerLog lookup)      │                   │
  │                         │─────────────────────────▶│                   │
  │                         │◀─────────────────────────│                   │
  │                         │                          │                   │
  │                         │  [If duplicate → return cached result]       │
  │                         │                          │                   │
  │                         │  INTERACTIVE TRANSACTION:│                   │
  │                         │  1. Lock UserState       │                   │
  │                         │     (stateVersion check) │                   │
  │                         │─────────────────────────▶│                   │
  │                         │◀─────────────────────────│                   │
  │                         │                          │                   │
  │                         │  [409 if version mismatch]                   │
  │                         │                          │                   │
  │                         │  2. Calculate adaptive   │                   │
  │                         │     difficulty + score   │                   │
  │                         │                          │                   │
  │                         │  3. Update UserState     │                   │
  │                         │     (version++)          │                   │
  │                         │  4. Create AnswerLog     │                   │
  │                         │  5. Update SessionQuestion│                  │
  │                         │─────────────────────────▶│                   │
  │                         │◀─────────────────────────│                   │
  │                         │                          │                   │
  │                         │  Update Leaderboard      │                   │
  │                         │─────────────────────────────────────────────▶│
  │                         │◀─────────────────────────────────────────────│
  │                         │                          │                   │
  │                         │  Invalidate Cache        │                   │
  │                         │─────────────────────────────────────────────▶│
  │                         │                          │                   │
  │  SessionAnswerResponse  │                          │                   │
  │◀────────────────────────│                          │                   │
```

### 3. Leaderboard Query Flow

```
Client                    Backend                   PostgreSQL           Redis
  │                         │                          │                   │
  │  GET /v1/leaderboard/   │                          │                   │
  │      score?limit=10     │                          │                   │
  │────────────────────────▶│                          │                   │
  │                         │                          │                   │
  │                         │  ZREVRANGE leaderboard:  │                   │
  │                         │  score 0 9 WITHSCORES    │                   │
  │                         │─────────────────────────────────────────────▶│
  │                         │◀─────────────────────────────────────────────│
  │                         │                          │                   │
  │                         │  [If Redis empty/down]   │                   │
  │                         │  Fallback to DB query    │                   │
  │                         │─────────────────────────▶│                   │
  │                         │◀─────────────────────────│                   │
  │                         │                          │                   │
  │                         │  Get user rank:          │                   │
  │                         │  ZREVRANK + ZSCORE       │                   │
  │                         │─────────────────────────────────────────────▶│
  │                         │                          │                   │
  │  LeaderboardResponse    │                          │                   │
  │◀────────────────────────│                          │                   │
```

---

## Module Architecture

### Backend Module Structure

Each feature module follows a consistent pattern:

```
modules/<feature>/
├── <feature>.routes.ts    # HTTP route handlers (Fastify plugin)
├── <feature>.service.ts   # Business logic (singleton class)
└── index.ts               # Barrel export
```

**Module Responsibilities:**

| Module | Routes | Service | Description |
|--------|--------|---------|-------------|
| **session** | 6 endpoints | SessionService | Exam lifecycle: start, answer, navigate, flag, finish |
| **quiz** | 3 endpoints | QuizService | Legacy infinite quiz mode: next question, answer, metrics |
| **leaderboard** | 2 endpoints | LeaderboardService | Redis-backed score + streak rankings |
| **health** | 2 endpoints | — | Database + Redis health probes |

**Shared Services (cross-cutting):**

| Service | Purpose |
|---------|---------|
| `AdaptiveDifficultyService` | Difficulty calculation, score computation, inactivity decay |
| `CacheService` | Redis-backed caching with TTL and graceful fallback |

### Frontend Component Structure

```
components/
├── layout/       # Page-level layout: Header
├── quiz/         # Exam-specific: QuestionCard, ExamSidebar
├── metrics/      # Data display: StatCard, StatsCard, PerformanceBar
└── ui/           # Reusable primitives: Button, Modal, Toast, etc.
```

---

## Data Flow Architecture

### State Management (Frontend)

```
┌─────────────────────────────────────────────┐
│              TanStack Query 5               │
│                                             │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Query Cache  │  │ Mutation Pipeline   │  │
│  │             │  │                     │  │
│  │ session/    │◄─┤ optimistic update   │  │
│  │ metrics/    │  │ invalidation        │  │
│  │ leaderboard/│  │ retry logic         │  │
│  └─────────────┘  └─────────────────────┘  │
│                                             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│              API Client Layer               │
│                                             │
│  apiClient.startSession()                   │
│  apiClient.submitSessionAnswer()            │
│  apiClient.getCurrentSession()              │
│  apiClient.navigateSession()                │
│  apiClient.toggleFlag()                     │
│  apiClient.finishSession()                  │
│                                             │
└──────────────────┬──────────────────────────┘
                   │ fetch()
                   ▼
              Backend API
```

### Optimistic Update Pattern (Answer Submission)

1. User clicks answer option
2. Frontend generates `answerIdempotencyKey` (UUID v4)
3. `useMutation` sends POST with `stateVersion` for optimistic locking
4. `onSuccess` callback updates TanStack Query cache:
   - Updates question status (pending → correct/wrong)
   - Recalculates stats (attempted, correct, wrong, flagged)
   - Updates score, streak, difficulty, stateVersion
5. Invalidates related queries (metrics, leaderboards)

---

## Concurrency & Safety

### Optimistic Locking

```
UserState {
  stateVersion: Int  // Incremented on every answer
}

// In transaction:
WHERE stateVersion = $expectedVersion
// If 0 rows updated → 409 Conflict
```

This prevents race conditions where two concurrent requests could both read the same state and apply conflicting updates.

### Answer Idempotency

```
AnswerLog {
  idempotencyKey: String @unique
}

// Before processing:
existingAnswer = findUnique(idempotencyKey)
if (existingAnswer) return cachedResult
```

This ensures network retries or duplicate submissions never double-count scores.

### Prisma Interactive Transactions

All answer submissions use Prisma's `$transaction` with serializable isolation:
1. Read UserState + verify version
2. Calculate difficulty + score
3. Update UserState (version++)
4. Create AnswerLog
5. Update QuizSessionQuestion

If any step fails, the entire transaction rolls back.

---

## Caching Strategy

### Multi-Layer Cache

```
Request → Redis Cache (CacheService)
             │
             ├─ HIT → Return cached data
             │
             └─ MISS/FAILURE → PostgreSQL (Prisma)
                                    │
                                    └─ Write-back to Redis
```

### Cache Keys

| Pattern | TTL | Description |
|---------|-----|-------------|
| `user:state:{userId}` | 300s | User difficulty, score, streak |
| `questions:difficulty:{level}` | 3600s | Question pool per difficulty |
| `leaderboard:score` | — | Redis Sorted Set (persistent) |
| `leaderboard:streak` | — | Redis Sorted Set (persistent) |

### Cache Invalidation

- **On answer submit:** Invalidate `user:state:{userId}`
- **On session finish:** Invalidate session-related caches
- **Leaderboard:** Updated in real-time via ZADD (no explicit invalidation needed)

---

## Scaling Considerations

### Horizontal Scaling

```
                    ┌──────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼───┐  ┌────▼───┐  ┌────▼───┐
         │Backend │  │Backend │  │Backend │
         │  #1    │  │  #2    │  │  #3    │
         └────┬───┘  └────┬───┘  └────┬───┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
         ┌────▼──────┐          ┌──────▼────┐
         │PostgreSQL │          │  Redis    │
         │ (Primary) │          │ (Cluster) │
         └───────────┘          └───────────┘
```

**Why this works:**
- **Stateless backend** — No server-side sessions; all state in DB/Redis
- **Optimistic locking** — Prevents concurrent write conflicts across instances
- **Redis leaderboard** — Shared state across all backend instances
- **Prisma connection pooling** — Efficient DB connection sharing

### Performance Characteristics

| Operation | Latency | Bottleneck |
|-----------|---------|------------|
| Start session | ~50ms | DB transaction (pool build) |
| Submit answer | ~30ms | DB transaction (atomic) |
| Navigate | ~10ms | Single DB query |
| Leaderboard | ~5ms | Redis ZREVRANGE |
| Health check | ~10ms | DB + Redis ping |

---

## Security Model

| Layer | Mechanism | Config |
|-------|-----------|--------|
| **Transport** | Helmet security headers | CSP, HSTS, X-Frame-Options |
| **CORS** | Whitelist-based origin check | `CORS_ORIGIN` env var |
| **Rate Limiting** | Token bucket per IP | 100 req/window (configurable) |
| **Input Validation** | Zod schemas on all inputs | Shared between FE + BE |
| **SQL Injection** | Prisma parameterized queries | — |
| **Error Exposure** | Structured errors, no stack traces in production | Pino log levels |

---

## Docker Architecture

```yaml
services:
  postgres:     # Port 5432, healthcheck: pg_isready
  redis:        # Port 6379, healthcheck: redis-cli ping
  backend:      # Port 3001, depends_on: postgres + redis (healthy)
  frontend:     # Port 3000, depends_on: backend (healthy)
```

All services share a Docker bridge network (`brainbolt-network`) and use named volumes for data persistence (`postgres-data`, `redis-data`).

---

## Error Handling Strategy

| Status Code | Condition | Handler |
|-------------|-----------|---------|
| **400** | Zod validation failure | Global error handler |
| **404** | Resource not found | Route-level |
| **409** | `stateVersion` conflict (optimistic lock) | Global 409 handler |
| **429** | Rate limit exceeded | `@fastify/rate-limit` |
| **500** | Unhandled server error | Fastify default + Pino log |

Each error response follows a consistent shape:
```json
{
  "error": "Human-readable message",
  "statusCode": 409
}
```
