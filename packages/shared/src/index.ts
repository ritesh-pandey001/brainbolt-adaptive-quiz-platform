    import { z } from 'zod';

// User schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Question schemas
export const QuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().int().min(0),
  difficulty: z.number().int().min(1).max(10),
  category: z.string().optional(),
  createdAt: z.date(),
});

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionResponseSchema = QuestionSchema.omit({ correctAnswer: true });
export type QuestionResponse = z.infer<typeof QuestionResponseSchema>;

// User state schemas
export const UserStateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  currentDifficulty: z.number().int().min(1).max(10),
  streak: z.number().int().min(0),
  maxStreak: z.number().int().min(0),
  totalScore: z.number().int().min(0),
  totalAnswered: z.number().int().min(0),
  correctAnswers: z.number().int().min(0),
  confidenceBuffer: z.array(z.number().int()),
  lastActivityAt: z.date(),
  stateVersion: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserState = z.infer<typeof UserStateSchema>;

// Answer log schemas
export const AnswerLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedAnswer: z.number().int(),
  isCorrect: z.boolean(),
  difficultyAttempted: z.number().int(),
  scoreDelta: z.number().int(),
  streakAtAnswer: z.number().int(),
  idempotencyKey: z.string().uuid(),
  createdAt: z.date(),
});

export type AnswerLog = z.infer<typeof AnswerLogSchema>;

// API Request schemas
export const GetNextQuestionRequestSchema = z.object({
  userId: z.string().uuid(),
});

export type GetNextQuestionRequest = z.infer<typeof GetNextQuestionRequestSchema>;

export const SubmitAnswerRequestSchema = z.object({
  userId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedAnswer: z.number().int().min(0),
  answerIdempotencyKey: z.string().uuid(),
  stateVersion: z.number().int(),
});

export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;

export const GetMetricsRequestSchema = z.object({
  userId: z.string().uuid(),
});

export type GetMetricsRequest = z.infer<typeof GetMetricsRequestSchema>;

// API Response schemas
export const NextQuestionResponseSchema = z.object({
  question: QuestionResponseSchema,
  currentDifficulty: z.number().int(),
  streak: z.number().int(),
  totalScore: z.number().int(),
  stateVersion: z.number().int(),
});

export type NextQuestionResponse = z.infer<typeof NextQuestionResponseSchema>;

export const SubmitAnswerResponseSchema = z.object({
  isCorrect: z.boolean(),
  correctAnswer: z.number().int(),
  scoreDelta: z.number().int(),
  newScore: z.number().int(),
  newStreak: z.number().int(),
  newDifficulty: z.number().int(),
  userRank: z.number().int().optional(),
  stateVersion: z.number().int(),
});

export type SubmitAnswerResponse = z.infer<typeof SubmitAnswerResponseSchema>;

export const DifficultyHistogramSchema = z.object({
  difficulty: z.number().int(),
  count: z.number().int(),
});

export type DifficultyHistogram = z.infer<typeof DifficultyHistogramSchema>;

export const MetricsResponseSchema = z.object({
  userId: z.string().uuid(),
  totalScore: z.number().int(),
  currentStreak: z.number().int(),
  maxStreak: z.number().int(),
  totalAnswered: z.number().int(),
  correctAnswers: z.number().int(),
  accuracy: z.number(),
  currentDifficulty: z.number().int(),
  difficultyHistogram: z.array(DifficultyHistogramSchema),
  recentPerformance: z.array(
    z.object({
      questionId: z.string().uuid(),
      isCorrect: z.boolean(),
      difficulty: z.number().int(),
      scoreDelta: z.number().int(),
      createdAt: z.date(),
    })
  ),
});

export type MetricsResponse = z.infer<typeof MetricsResponseSchema>;

export const LeaderboardEntrySchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  score: z.number().int(),
  rank: z.number().int(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardResponseSchema = z.object({
  leaderboard: z.array(LeaderboardEntrySchema),
  userEntry: LeaderboardEntrySchema.optional(),
});

export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

// Error schemas
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number().int(),
  details: z.any().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// =====================================================
// SESSION TYPES
// =====================================================

export const SessionQuestionStatusSchema = z.enum(['pending', 'correct', 'wrong']);
export type SessionQuestionStatus = z.infer<typeof SessionQuestionStatusSchema>;

export const SessionQuestionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  orderIndex: z.number().int(),
  status: SessionQuestionStatusSchema,
  isFlagged: z.boolean(),
  scoreDelta: z.number().int(),
  selectedAnswer: z.number().int().nullable(),
  answeredAt: z.string().nullable(),
  question: z.object({
    id: z.string().uuid(),
    text: z.string(),
    options: z.array(z.string()),
    difficulty: z.number().int(),
    category: z.string().nullable().optional(),
  }),
});

export type SessionQuestion = z.infer<typeof SessionQuestionSchema>;

export const QuizSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  totalQuestions: z.number().int(),
  currentIndex: z.number().int(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export type QuizSession = z.infer<typeof QuizSessionSchema>;

// Session API requests
export const StartSessionRequestSchema = z.object({
  userId: z.string().uuid(),
  totalQuestions: z.number().int().min(5).max(120).optional().default(30),
});
export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;

export const SessionAnswerRequestSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedAnswer: z.number().int().min(0),
  answerIdempotencyKey: z.string().uuid(),
  stateVersion: z.number().int(),
});
export type SessionAnswerRequest = z.infer<typeof SessionAnswerRequestSchema>;

export const ToggleFlagRequestSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
});
export type ToggleFlagRequest = z.infer<typeof ToggleFlagRequestSchema>;

export const NavigateRequestSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  targetIndex: z.number().int().min(0),
});
export type NavigateRequest = z.infer<typeof NavigateRequestSchema>;

export const FinishSessionRequestSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
});
export type FinishSessionRequest = z.infer<typeof FinishSessionRequestSchema>;

// Session API responses
export const SessionStateResponseSchema = z.object({
  session: QuizSessionSchema,
  questions: z.array(SessionQuestionSchema),
  currentQuestion: SessionQuestionSchema,
  score: z.number().int(),
  streak: z.number().int(),
  difficulty: z.number().int(),
  stateVersion: z.number().int(),
  userRank: z.number().int().optional(),
  stats: z.object({
    total: z.number().int(),
    attempted: z.number().int(),
    unattempted: z.number().int(),
    correct: z.number().int(),
    wrong: z.number().int(),
    flagged: z.number().int(),
  }),
});
export type SessionStateResponse = z.infer<typeof SessionStateResponseSchema>;

export const SessionAnswerResponseSchema = z.object({
  isCorrect: z.boolean(),
  correctAnswer: z.number().int(),
  scoreDelta: z.number().int(),
  newScore: z.number().int(),
  newStreak: z.number().int(),
  newDifficulty: z.number().int(),
  userRank: z.number().int().optional(),
  stateVersion: z.number().int(),
  questionStatus: SessionQuestionStatusSchema,
});
export type SessionAnswerResponse = z.infer<typeof SessionAnswerResponseSchema>;

export const SessionSummaryResponseSchema = z.object({
  sessionId: z.string().uuid(),
  totalQuestions: z.number().int(),
  attempted: z.number().int(),
  correct: z.number().int(),
  wrong: z.number().int(),
  totalScore: z.number().int(),
  maxStreak: z.number().int(),
  accuracy: z.number(),
  completedAt: z.string(),
});
export type SessionSummaryResponse = z.infer<typeof SessionSummaryResponseSchema>;

// Constants
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 10;
export const CONFIDENCE_BUFFER_SIZE = 2;
export const INACTIVITY_DECAY_MINUTES = 30;
export const MAX_STREAK_MULTIPLIER = 2.0;
export const STREAK_MULTIPLIER_RATE = 0.1;
export const BASE_SCORE = 10;
export const DIFFICULTY_WEIGHT = 2;
export const DEFAULT_SESSION_SIZE = 30;
