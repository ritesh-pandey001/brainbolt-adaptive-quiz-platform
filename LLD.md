# BrainBolt — Low-Level Design Document

## Module Responsibilities

### 1. Session Module (`modules/session/`)

The session module implements the exam lifecycle with 6 endpoints maintaining full state consistency.

#### SessionService

```typescript
class SessionService {
  // Start a new exam session
  async startSession(userId: string, totalQuestions: number): Promise<SessionStateResponse>

  // Get current session state (questions, score, position)
  async getSessionState(userId: string): Promise<SessionStateResponse>

  // Submit an answer with idempotency + optimistic locking
  async submitAnswer(params: SessionAnswerParams): Promise<SessionAnswerResponse>

  // Navigate to any question by index
  async navigate(userId: string, sessionId: string, targetIndex: number): Promise<SessionStateResponse>

  // Toggle flag on a question
  async toggleFlag(userId: string, sessionId: string, questionId: string): Promise<ToggleFlagResponse>

  // Complete the exam and return summary
  async finishSession(userId: string, sessionId: string): Promise<SessionSummaryResponse>

  // Internal: build difficulty-spread question pool
  private buildDifficultySpread(targetDifficulty: number, totalQuestions: number): number[]
}
```

#### Session Start Algorithm

```
startSession(userId, totalQuestions):
  1. Fetch or create UserState from DB
  2. Check for existing incomplete session → error if active
  3. Handle inactivity decay (if lastActivityAt > 30min ago)
  4. Build difficulty spread:
     - 40% questions at current difficulty
     - 25% at difficulty - 1
     - 20% at difficulty + 1
     - 10% at difficulty - 2
     - 5% at difficulty + 2
  5. Query questions from DB matching the spread
  6. Shuffle selected questions (Fisher-Yates)
  7. Create QuizSession + QuizSessionQuestion records (Prisma transaction)
  8. Return full session state
```

#### Answer Submission (Detailed)

```
submitAnswer(userId, sessionId, questionId, selectedAnswer, idempotencyKey, stateVersion):
  1. IDEMPOTENCY CHECK:
     - Query AnswerLog WHERE idempotencyKey = $key
     - If found → return cached result (no state change)

  2. LOAD SESSION DATA:
     - Fetch QuizSession + QuizSessionQuestion (include Question)
     - Validate session exists, not completed, question belongs to session

  3. PRISMA INTERACTIVE TRANSACTION:
     a. Read UserState WHERE userId = $userId
     b. VERSION CHECK:
        - If userState.stateVersion !== expectedVersion → throw 409
     c. Evaluate answer:
        - isCorrect = (selectedAnswer === question.correctAnswer)
     d. Calculate adaptive difficulty:
        - newDifficulty = adaptiveDifficultyService.calculateNewDifficulty(
            currentDifficulty, currentConfidenceBuffer, isCorrect
          )
     e. Calculate score:
        - scoreDelta = adaptiveDifficultyService.calculateScoreDelta(
            difficulty, streak, isCorrect
          )
     f. Calculate streak:
        - newStreak = isCorrect ? currentStreak + 1 : 0
     g. UPDATE UserState:
        - SET difficulty = newDifficulty
        - SET totalScore += scoreDelta
        - SET currentStreak = newStreak
        - SET maxStreak = MAX(maxStreak, newStreak)
        - SET stateVersion = stateVersion + 1
        - SET lastActivityAt = NOW()
     h. CREATE AnswerLog:
        - idempotencyKey, userId, questionId, isCorrect, scoreDelta, etc.
     i. UPDATE QuizSessionQuestion:
        - SET status = 'correct' | 'wrong'
        - SET selectedAnswer = $selectedAnswer
        - SET scoreDelta = $scoreDelta
        - SET answeredAt = NOW()

  4. POST-TRANSACTION:
     - Update leaderboard (Redis ZADD) — non-blocking
     - Invalidate user state cache
     - Return SessionAnswerResponse
```

---

### 2. Quiz Module (`modules/quiz/`)

Legacy infinite quiz mode. Shares the adaptive difficulty engine with the session module.

#### QuizService

```typescript
class QuizService {
  // Get next question based on adaptive difficulty
  async getNextQuestion(userId: string): Promise<NextQuestionResponse>

  // Submit answer with optimistic locking
  async submitAnswer(params: SubmitAnswerParams): Promise<SubmitAnswerResponse>

  // Get user performance metrics
  async getMetrics(userId: string): Promise<MetricsResponse>

  // Internal: atomic answer processing in DB transaction
  private executeAnswerTransaction(params: TransactionParams): Promise<TransactionResult>
}
```

---

### 3. Leaderboard Module (`modules/leaderboard/`)

Redis Sorted Set-backed leaderboard with database fallback.

#### LeaderboardService

```typescript
class LeaderboardService {
  // Update user score in Redis Sorted Set
  async updateScore(userId: string, username: string, score: number): Promise<void>

  // Update user streak in Redis Sorted Set
  async updateStreak(userId: string, username: string, streak: number): Promise<void>

  // Get top N scores with optional user entry
  async getScoreLeaderboard(limit: number, userId?: string): Promise<LeaderboardResponse>

  // Get top N streaks with optional user entry
  async getStreakLeaderboard(limit: number, userId?: string): Promise<LeaderboardResponse>

  // Initialize Redis from database on server start
  async initializeFromDB(): Promise<void>

  // Internal: get leaderboard from Redis or fallback to DB
  private async getLeaderboard(key: string, limit: number, userId?: string): Promise<LeaderboardResponse>
}
```

#### Redis Operations

```
Score Leaderboard:
  Key:    "leaderboard:score"
  Type:   Sorted Set
  Member: "userId:username" (composite string)
  Score:  totalScore (numeric)

  ZADD leaderboard:score {score} "{userId}:{username}"
  ZREVRANGE leaderboard:score 0 {limit-1} WITHSCORES
  ZREVRANK leaderboard:score "{userId}:*"
  ZSCORE leaderboard:score "{userId}:*"

Streak Leaderboard:
  Key:    "leaderboard:streak"
  Type:   Sorted Set
  Member: "userId:username"
  Score:  maxStreak

  Same operations as score but with maxStreak values

Initialization (server start):
  Pipeline:
    FOR each LeaderboardScore row:
      ZADD leaderboard:score {score} "{userId}:{username}"
    FOR each LeaderboardStreak row:
      ZADD leaderboard:streak {streak} "{userId}:{username}"
    EXEC (atomic pipeline)
```

---

### 4. Health Module (`modules/health/`)

```
GET /v1/health:
  1. Test PostgreSQL: prisma.$queryRaw`SELECT 1`
  2. Test Redis: redis.ping()
  3. Return { status: 'ok'|'degraded', postgres: bool, redis: bool }

GET /v1/health/ready:
  Return { status: 'ok' } (simple readiness probe)
```

---

### 5. Adaptive Difficulty Service (`services/adaptive-difficulty.service.ts`)

Shared service used by both Session and Quiz modules.

#### Algorithm: `calculateNewDifficulty`

```
calculateNewDifficulty(currentDifficulty, confidenceBuffer, isCorrect):

  INPUT:
    currentDifficulty: 1-10
    confidenceBuffer: boolean[] (last N results, true=correct)
    isCorrect: boolean (current answer)

  PROCESS:
    1. Append isCorrect to confidenceBuffer
    2. Trim buffer to CONFIDENCE_BUFFER_SIZE (2)
    3. IF buffer.length < CONFIDENCE_BUFFER_SIZE:
         RETURN currentDifficulty (not enough data)
    4. IF all buffer entries are TRUE (all correct):
         targetDifficulty = currentDifficulty + 1
    5. ELSE IF all buffer entries are FALSE (all wrong):
         targetDifficulty = currentDifficulty - 1
    6. ELSE:
         targetDifficulty = currentDifficulty (mixed → no change = hysteresis)
    7. CLAMP targetDifficulty to [DIFFICULTY_MIN, DIFFICULTY_MAX]
    8. RETURN targetDifficulty

  OUTPUT: newDifficulty: 1-10
```

#### Algorithm: `calculateScoreDelta`

```
calculateScoreDelta(difficulty, currentStreak, isCorrect):

  IF !isCorrect:
    RETURN 0

  difficultyWeight = 1 + (difficulty * DIFFICULTY_WEIGHT / 10)
  streakMultiplier = MIN(1 + currentStreak * STREAK_MULTIPLIER_RATE, MAX_STREAK_MULTIPLIER)
  scoreDelta = ROUND(BASE_SCORE * difficultyWeight * streakMultiplier)

  RETURN scoreDelta
```

**Example calculations:**

| Difficulty | Streak | diffWeight | streakMult | scoreDelta |
|-----------|--------|------------|------------|------------|
| 1 | 0 | 1.2 | 1.0 | 12 |
| 5 | 3 | 2.0 | 1.3 | 26 |
| 8 | 7 | 2.6 | 1.7 | 44 |
| 10 | 10+ | 3.0 | 2.0 | 60 |

#### Inactivity Decay

```
isStateStale(lastActivityAt):
  RETURN (NOW - lastActivityAt) > INACTIVITY_DECAY_MINUTES * 60 * 1000

getFreshStateAfterInactivity(userState):
  RETURN {
    difficulty: ROUND((currentDifficulty + DIFFICULTY_MIN) / 2),  // Decay toward baseline
    currentStreak: 0,                                              // Reset streak
    confidenceBuffer: [],                                          // Clear buffer
    lastActivityAt: NOW
  }
```

---

### 6. Cache Service (`services/cache.service.ts`)

```typescript
class CacheService {
  // User state caching
  getUserState(userId): Promise<UserStateCache | null>
  setUserState(userId, state): Promise<void>
  invalidateUserState(userId): Promise<void>

  // Question pool caching
  getQuestionPool(difficulty): Promise<Question[] | null>
  setQuestionPool(difficulty, questions): Promise<void>

  // Global operations
  clearAll(): Promise<void>
}
```

**Graceful Degradation:**
```
Every cache operation:
  1. Check redis.isReady()
  2. If not ready → skip (return null / no-op)
  3. If operation throws → log warning, return null
  4. Never let cache failure break the request
```

---

## API Schemas (Zod)

All request/response schemas are defined in `@brainbolt/shared` for end-to-end type safety.

### Session API Schemas

#### StartSessionRequest
```typescript
{
  userId: z.string().uuid(),
  totalQuestions: z.number().int().min(5).max(120).optional().default(30)
}
```

#### SessionAnswerRequest
```typescript
{
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedAnswer: z.number().int().min(0),
  answerIdempotencyKey: z.string().uuid(),
  stateVersion: z.number().int()
}
```

#### NavigateRequest
```typescript
{
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  targetIndex: z.number().int().min(0)
}
```

#### ToggleFlagRequest
```typescript
{
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionId: z.string().uuid()
}
```

#### FinishSessionRequest
```typescript
{
  userId: z.string().uuid(),
  sessionId: z.string().uuid()
}
```

#### SessionStateResponse
```typescript
{
  session: {
    id: uuid, userId: uuid, totalQuestions: int,
    currentIndex: int, createdAt: string, completedAt: string | null
  },
  questions: SessionQuestion[],
  currentQuestion: SessionQuestion,
  score: int,
  streak: int,
  difficulty: int,
  stateVersion: int,
  userRank?: int,
  stats: {
    total: int, attempted: int, unattempted: int,
    correct: int, wrong: int, flagged: int
  }
}
```

#### SessionQuestion
```typescript
{
  id: uuid, sessionId: uuid, questionId: uuid,
  orderIndex: int,
  status: 'pending' | 'correct' | 'wrong',
  isFlagged: boolean,
  scoreDelta: int,
  selectedAnswer: int | null,
  answeredAt: string | null,
  question: {
    id: uuid, text: string, options: string[],
    difficulty: int, category?: string
  }
}
```

#### SessionAnswerResponse
```typescript
{
  isCorrect: boolean,
  correctAnswer: int,
  scoreDelta: int,
  newScore: int,
  newStreak: int,
  newDifficulty: int,
  userRank?: int,
  stateVersion: int,
  questionStatus: 'correct' | 'wrong'
}
```

#### SessionSummaryResponse
```typescript
{
  sessionId: uuid,
  totalQuestions: int,
  attempted: int,
  correct: int,
  wrong: int,
  totalScore: int,
  maxStreak: int,
  accuracy: number (0-1),
  completedAt: string
}
```

---

## Database Schema (Prisma)

### Entity-Relationship Diagram

```
User (1) ─────────── (1) UserState
  │
  ├── (1) ──── (N) AnswerLog
  ├── (1) ──── (N) QuizSession ──── (1:N) QuizSessionQuestion
  ├── (1) ──── (1) LeaderboardScore
  └── (1) ──── (1) LeaderboardStreak

Question (1) ──── (N) AnswerLog
Question (1) ──── (N) QuizSessionQuestion
```

### Model Details

#### User
```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  createdAt DateTime @default(now())
}
```

#### UserState
```prisma
model UserState {
  id               String   @id @default(uuid())
  userId           String   @unique
  currentDifficulty Int     @default(1)
  totalScore       Int      @default(0)
  currentStreak    Int      @default(0)
  maxStreak        Int      @default(0)
  confidenceBuffer Boolean[]
  totalAnswered    Int      @default(0)
  correctAnswers   Int      @default(0)
  stateVersion     Int      @default(0)    // Optimistic locking
  lastActivityAt   DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

#### Question
```prisma
model Question {
  id            String  @id @default(uuid())
  text          String
  options       String[]
  correctAnswer Int
  difficulty    Int
  category      String?
}
// Index: @@index([difficulty])
// 120 seeded questions (12 per difficulty level 1-10)
```

#### AnswerLog
```prisma
model AnswerLog {
  id             String   @id @default(uuid())
  userId         String
  questionId     String
  selectedAnswer Int
  isCorrect      Boolean
  difficulty     Int
  scoreDelta     Int
  idempotencyKey String   @unique   // Prevents duplicate processing
  createdAt      DateTime @default(now())
}
// Index: @@index([userId, createdAt])
```

#### QuizSession
```prisma
model QuizSession {
  id             String    @id @default(uuid())
  userId         String
  totalQuestions  Int
  currentIndex   Int       @default(0)
  createdAt      DateTime  @default(now())
  completedAt    DateTime?
}
// Index: @@index([userId])
// Cascade: delete session → delete all QuizSessionQuestion
```

#### QuizSessionQuestion
```prisma
model QuizSessionQuestion {
  id             String    @id @default(uuid())
  sessionId      String
  questionId     String
  orderIndex     Int
  status         String    @default("pending")  // pending | correct | wrong
  isFlagged      Boolean   @default(false)
  scoreDelta     Int       @default(0)
  selectedAnswer Int?
  answeredAt     DateTime?
}
// Index: @@index([sessionId, orderIndex])
// Unique: @@unique([sessionId, questionId])
```

#### LeaderboardScore / LeaderboardStreak
```prisma
model LeaderboardScore {
  id       String @id @default(uuid())
  userId   String @unique
  username String
  score    Int    @default(0)
}

model LeaderboardStreak {
  id       String @id @default(uuid())
  userId   String @unique
  username String
  streak   Int    @default(0)
}
```

---

## Edge Cases & Error Handling

### Session Edge Cases

| Scenario | Handling |
|----------|---------|
| Start session with active session | Return error: "Complete current session first" |
| Answer already-answered question | Return error: "Question already answered" |
| Navigate beyond session bounds | Return error: "Invalid target index" |
| Answer after session completed | Return error: "Session already completed" |
| Submit with wrong stateVersion | 409 Conflict response |
| Duplicate idempotencyKey | Return cached original result |
| No questions found for difficulty | Broaden search range, use any available |

### Concurrency Edge Cases

| Scenario | Handling |
|----------|---------|
| Two answers simultaneously | First succeeds, second gets 409 (stateVersion) |
| Network retry with same key | Idempotency returns cached result |
| Redis failure during answer | Score updates in DB, leaderboard catches up on next update |
| DB transaction timeout | Prisma auto-rollback, client retries |
| Server crash mid-transaction | Prisma interactive transaction rollback |

### Cache Edge Cases

| Scenario | Handling |
|----------|---------|
| Redis not connected | All cache ops gracefully skip |
| Redis returns stale data | Cache invalidated on writes |
| Cache and DB diverge | DB is source of truth; cache rebuilt on miss |
| Redis memory full | Eviction policy handles; fallback to DB |

---

## Constants Reference

Defined in `@brainbolt/shared`:

```typescript
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 10;
export const CONFIDENCE_BUFFER_SIZE = 2;
export const INACTIVITY_DECAY_MINUTES = 30;
export const MAX_STREAK_MULTIPLIER = 2.0;
export const STREAK_MULTIPLIER_RATE = 0.1;
export const BASE_SCORE = 10;
export const DIFFICULTY_WEIGHT = 2;
export const DEFAULT_SESSION_SIZE = 30;
```

---

## Frontend Component Details

### Page Components

| Component | File | Purpose |
|-----------|------|---------|
| `HomePage` | `app/page.tsx` | Main exam page with start/exam/summary views |
| `LeaderboardPage` | `app/leaderboard/page.tsx` | Score and streak leaderboard tabs |
| `MetricsPage` | `app/metrics/page.tsx` | Charts and stats dashboard |

### Quiz Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `QuestionCard` | Displays question with options, flag, difficulty badge | question, onAnswer, onFlag, showResult |
| `ExamSidebar` | 5-column question grid navigation with status colors | questions, currentIndex, stats, onNavigate |

### UI Components

| Component | Purpose |
|-----------|---------|
| `Button` | Reusable button with primary/secondary/danger variants |
| `Modal` | Overlay modal with backdrop close |
| `Toast` | Context-based toast notification system |
| `ResultModal` | Answer result feedback with animation |
| `ScoreDelta` | Floating score change animation |
| `LoadingSkeleton` | Skeleton loading placeholders |
| `ErrorBoundary` | React error boundary with retry/refresh |
| `EmptyState` | Empty data state with icon and message |

### Hooks

| Hook | Purpose |
|------|---------|
| `useCurrentSession(userId)` | Fetch current session state |
| `useStartSession()` | Start new exam mutation |
| `useSubmitSessionAnswer()` | Submit answer with optimistic cache update |
| `useNavigateSession()` | Navigate to question |
| `useToggleFlag()` | Toggle question flag with optimistic update |
| `useFinishSession()` | Complete exam and invalidate caches |
| `useMetrics(userId)` | Fetch performance metrics |
| `useScoreLeaderboard(limit, userId)` | Fetch score rankings |
| `useStreakLeaderboard(limit, userId)` | Fetch streak rankings |
