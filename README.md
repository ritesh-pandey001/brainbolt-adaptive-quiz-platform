# BrainBolt — Adaptive Quiz Platform

> Enterprise-grade adaptive quiz engine with real-time difficulty scaling, session-based examination mode, Redis-backed leaderboards, and full-stack TypeScript architecture.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Fastify](https://img.shields.io/badge/Fastify-4.25-black?logo=fastify)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-5.8-2D3748?logo=prisma)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Docker Setup](#docker-setup)
6. [API Reference](#api-reference)
7. [Adaptive Algorithm](#adaptive-algorithm)
8. [Database Schema](#database-schema)
9. [Testing](#testing)
10. [Production Hardening](#production-hardening)
11. [Project Structure](#project-structure)

---

## Overview

BrainBolt is a **full-stack adaptive quiz platform** that dynamically adjusts question difficulty based on user performance. It features a **session-based examination mode** where users complete a fixed set of questions with full navigation, flagging, and review capabilities — modeled after professional exam interfaces.

### Key Features

- **Adaptive Difficulty Engine** — Confidence-buffer algorithm with hysteresis prevents unstable difficulty jumps
- **Session-Based Exams** — Start exams with 5–120 questions, navigate freely, flag for review, finish when ready
- **Real-Time Leaderboard** — Redis Sorted Sets (ZADD/ZREVRANGE) for O(log N) score + streak rankings
- **Optimistic Locking** — `stateVersion` field prevents concurrent answer conflicts (409 Conflict)
- **Answer Idempotency** — Duplicate submissions return cached results, never double-count
- **Multi-Layer Caching** — Redis caches user state, question pools; graceful fallback to PostgreSQL
- **Enterprise UI** — Dark/light theme, mobile-responsive exam sidebar, real-time score animations
- **Production-Ready** — Rate limiting, Helmet security headers, structured logging (pino), health checks

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                │
│  App Router │ TanStack Query │ Tailwind CSS │ Recharts  │
│                                                         │
│  ┌──────────┐ ┌────────────┐ ┌─────────────┐          │
│  │  Quiz    │ │ Leaderboard│ │   Metrics    │          │
│  │  (Exam)  │ │   Page     │ │    Page      │          │
│  └────┬─────┘ └──────┬─────┘ └──────┬──────┘          │
└───────┼──────────────┼──────────────┼──────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│               BACKEND (Fastify 4.25)                    │
│   /v1/session  │  /v1/leaderboard  │  /v1/quiz         │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Session    │  │  Leaderboard │  │    Quiz      │  │
│  │   Module     │  │    Module    │  │   Module     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│  ┌──────┴─────────────────┴─────────────────┴───────┐  │
│  │            Shared Services Layer                  │  │
│  │   Adaptive Difficulty  │  Cache Service           │  │
│  └───────────┬──────────────────────┬───────────────┘  │
└──────────────┼──────────────────────┼──────────────────┘
               │                      │
        ┌──────┴──────┐        ┌──────┴──────┐
        │ PostgreSQL  │        │    Redis    │
        │   15        │        │     7       │
        │ (Prisma ORM)│        │ (ioredis)  │
        └─────────────┘        └─────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design and data flows.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | SSR/CSR React framework |
| **State Management** | TanStack Query 5 | Server state, caching, optimistic updates |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS with dark mode |
| **Charts** | Recharts | Performance metrics visualization |
| **Backend** | Fastify 4.25 | High-performance HTTP framework |
| **ORM** | Prisma 5.8 | Type-safe database queries |
| **Database** | PostgreSQL 15 | Primary data store |
| **Cache/Leaderboard** | Redis 7 (ioredis) | Sorted Sets, state caching |
| **Validation** | Zod | Runtime schema validation (shared) |
| **Logging** | Pino + pino-pretty | Structured JSON logging |
| **Monorepo** | npm workspaces | Package management |
| **Types** | TypeScript 5.3 (strict) | End-to-end type safety |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & **Docker Compose** (for PostgreSQL + Redis)
- **npm** ≥ 9

### Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd BrainBolt
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env if you need to change ports/credentials

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 4. Initialize database
cd apps/backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# 5. Start development servers
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/v1/health

### Environment Variables

See [.env.example](.env.example) for all configurable values:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `PORT` | `3001` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `RATE_LIMIT_MAX` | `100` | Max requests per rate limit window |
| `CACHE_TTL_SECONDS` | `300` | Redis cache TTL |

---

## Docker Setup

### Full Stack (All Services)

```bash
docker compose up --build
```

This starts 4 services:
- **postgres** — PostgreSQL 15 with healthcheck
- **redis** — Redis 7 with healthcheck
- **backend** — Fastify API (waits for pg + redis)
- **frontend** — Next.js app (waits for backend)

### Infrastructure Only

```bash
docker compose up -d postgres redis
```

### Useful Commands

```bash
# View logs
docker compose logs -f backend

# Reset database
docker compose exec backend npx prisma db push --force-reset
docker compose exec backend npx prisma db seed

# Stop all
docker compose down

# Stop and remove volumes
docker compose down -v
```

---

## API Reference

### Session Endpoints (Exam Mode)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/session/start` | Start a new exam session |
| `GET` | `/v1/session/current?userId=` | Get current session state |
| `POST` | `/v1/session/answer` | Submit answer (idempotent) |
| `POST` | `/v1/session/navigate` | Navigate to question by index |
| `POST` | `/v1/session/flag` | Toggle question flag |
| `POST` | `/v1/session/finish` | Complete exam, get summary |

### Quiz Endpoints (Legacy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/quiz/next?userId=` | Get next adaptive question |
| `POST` | `/v1/quiz/answer` | Submit answer |
| `GET` | `/v1/quiz/metrics?userId=` | Get user performance metrics |

### Leaderboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/leaderboard/score?limit=&userId=` | Top scores (Redis Sorted Set) |
| `GET` | `/v1/leaderboard/streak?limit=&userId=` | Top streaks (Redis Sorted Set) |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/health` | Full health check (DB + Redis) |
| `GET` | `/v1/health/ready` | Readiness probe |

### Example: Start Exam Session

```bash
curl -X POST http://localhost:3001/v1/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "be5aa44a-6511-4214-9751-8f1004af5b0d",
    "totalQuestions": 30
  }'
```

### Example: Submit Answer (Idempotent)

```bash
curl -X POST http://localhost:3001/v1/session/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "be5aa44a-6511-4214-9751-8f1004af5b0d",
    "sessionId": "<session-id>",
    "questionId": "<question-id>",
    "selectedAnswer": 2,
    "answerIdempotencyKey": "<uuid-v4>",
    "stateVersion": 1
  }'
```

> **409 Conflict** is returned if `stateVersion` doesn't match (optimistic locking).

---

## Adaptive Algorithm

BrainBolt implements a **confidence-buffer adaptive difficulty** algorithm with hysteresis to prevent unstable difficulty oscillations.

### How It Works

1. **Confidence Buffer** — Maintains a sliding window (`CONFIDENCE_BUFFER_SIZE = 2`). Difficulty only changes when all recent answers consistently point in the same direction.

2. **Difficulty Adjustment** — After a correct answer, the target difficulty increases by 1; after an incorrect answer, it decreases by 1 (clamped to 1–10). The adjustment only applies if the buffer is filled with consistent results.

3. **Score Calculation:**
   ```
   scoreDelta = BASE_SCORE × (1 + difficulty × DIFFICULTY_WEIGHT / 10) × streakMultiplier
   streakMultiplier = min(1 + streak × STREAK_MULTIPLIER_RATE, MAX_STREAK_MULTIPLIER)
   ```

4. **Inactivity Decay** — After `INACTIVITY_DECAY_MINUTES` (30 min), difficulty resets toward baseline and streak resets to 0.

5. **Session Pool Building** — When starting an exam, questions are drawn from a spread of difficulty levels centered around the user's current difficulty, ensuring variety.

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CONFIDENCE_BUFFER_SIZE` | 2 | Answers needed before difficulty shift |
| `BASE_SCORE` | 10 | Base points per correct answer |
| `DIFFICULTY_WEIGHT` | 2 | Multiplier for difficulty bonus |
| `STREAK_MULTIPLIER_RATE` | 0.1 | Streak bonus per consecutive correct |
| `MAX_STREAK_MULTIPLIER` | 2.0 | Maximum streak bonus cap |
| `INACTIVITY_DECAY_MINUTES` | 30 | Minutes before inactivity decay |

---

## Database Schema

9 Prisma models across user management, quiz content, and session tracking:

```
┌──────────────────┐     ┌──────────────────┐
│      User        │────▶│    UserState      │
│  id, username,   │     │  difficulty,      │
│  email           │     │  score, streak,   │
│                  │     │  stateVersion     │
└──────┬───────────┘     └──────────────────┘
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│   AnswerLog      │   │  QuizSession     │
│  questionId,     │   │  totalQuestions,  │
│  isCorrect,      │   │  currentIndex,   │
│  idempotencyKey  │   │  completedAt     │
└──────────────────┘   └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │QuizSessionQuestion│
                       │  orderIndex,      │
                       │  status, isFlagged│
                       │  selectedAnswer   │
                       └──────────────────┘

┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│    Question      │   │LeaderboardScore  │   │LeaderboardStreak │
│  text, options,  │   │  userId, score,  │   │  userId, streak, │
│  correctAnswer,  │   │  username        │   │  username        │
│  difficulty      │   └──────────────────┘   └──────────────────┘
└──────────────────┘
```

Key design decisions:
- **Optimistic locking** via `UserState.stateVersion` (incremented on each answer)
- **Answer idempotency** via `AnswerLog.idempotencyKey` (unique constraint)
- **Cascade deletes** for session cleanup
- **Composite indexes** on `(userId, sessionId)` for efficient lookups

---

## Testing

### Concurrency & Atomicity Tests

```bash
# Run atomicity test (Prisma interactive transactions)
npx ts-node scripts/atomicity-test.ts

# Run concurrency test (parallel answer submissions)
npx ts-node scripts/concurrency-test.ts

# Run production verification
npx ts-node scripts/verify-production.ts
```

### Type Checking

```bash
# Full monorepo type check
npm run type-check

# Individual packages
cd apps/backend && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit
```

### Manual Testing

1. Start the application with Docker or dev servers
2. Open http://localhost:3000
3. Click "Start Exam" to begin a 30-question session
4. Test features: answer questions, navigate, flag, review, finish exam
5. Check Leaderboard and Metrics pages

---

## Production Hardening

| Feature | Implementation |
|---------|---------------|
| **Rate Limiting** | `@fastify/rate-limit` — 100 req/window default |
| **Security Headers** | `@fastify/helmet` — CSP, HSTS, XSS protection |
| **CORS** | `@fastify/cors` — Configurable origin whitelist |
| **Structured Logging** | Pino with JSON output, pino-pretty for dev |
| **Health Checks** | `/v1/health` (DB + Redis) and `/v1/health/ready` |
| **Graceful Shutdown** | SIGINT/SIGTERM handlers close DB + Redis + server |
| **Error Handling** | Zod validation errors → 400, version conflicts → 409 |
| **Optimistic Locking** | `stateVersion` prevents concurrent state corruption |
| **Idempotency** | `answerIdempotencyKey` prevents duplicate scoring |
| **Cache Fallback** | Redis failure gracefully falls back to PostgreSQL |
| **Docker Healthchecks** | All services include container health probes |
| **TypeScript Strict** | `strict: true` across all packages |

---

## Project Structure

```
BrainBolt/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/           # Centralized configuration
│   │   │   │   └── index.ts
│   │   │   ├── lib/              # Infrastructure clients
│   │   │   │   ├── prisma.ts     # Prisma singleton
│   │   │   │   ├── redis.ts      # Redis client wrapper
│   │   │   │   └── logger.ts     # Pino logger
│   │   │   ├── modules/          # Feature modules
│   │   │   │   ├── quiz/         # Quiz endpoints + service
│   │   │   │   ├── session/      # Exam session endpoints + service
│   │   │   │   ├── leaderboard/  # Leaderboard endpoints + service
│   │   │   │   └── health/       # Health check endpoints
│   │   │   ├── services/         # Shared cross-cutting services
│   │   │   │   ├── adaptive-difficulty.service.ts
│   │   │   │   └── cache.service.ts
│   │   │   ├── app.ts            # Fastify app builder
│   │   │   └── index.ts          # Server entry point
│   │   └── prisma/
│   │       ├── schema.prisma     # Database schema (9 models)
│   │       └── seed.ts           # 120 questions seeder
│   │
│   └── frontend/
│       └── src/
│           ├── app/              # Next.js App Router pages
│           │   ├── page.tsx      # Main exam page
│           │   ├── leaderboard/  # Leaderboard page
│           │   └── metrics/      # Performance metrics page
│           ├── components/
│           │   ├── layout/       # Layout components (Header)
│           │   ├── quiz/         # Exam components (QuestionCard, ExamSidebar)
│           │   ├── metrics/      # Stats components (StatCard, PerformanceBar)
│           │   └── ui/           # Shared UI (Button, Modal, Toast, etc.)
│           ├── hooks/            # TanStack Query hooks
│           ├── lib/              # API client
│           └── contexts/         # Theme context
│
├── packages/
│   └── shared/                   # @brainbolt/shared
│       └── src/
│           └── index.ts          # Zod schemas + TypeScript types
│
├── scripts/                      # Test & verification scripts
├── docker-compose.yml            # Full stack Docker setup
├── .env.example                  # Environment template
├── ARCHITECTURE.md               # System architecture docs
└── LLD.md                        # Low-level design docs
```

---

## License

MIT
