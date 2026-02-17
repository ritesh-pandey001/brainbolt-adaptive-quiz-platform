'use client';

import { useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { ResultModal } from '@/components/ui/ResultModal';
import { ScoreDelta } from '@/components/ui/ScoreDelta';
import { ExamSidebar } from '@/components/quiz/ExamSidebar';
import { useToast } from '@/components/ui/Toast';
import { QuizSkeleton } from '@/components/ui/LoadingSkeleton';
import {
  useCurrentSession,
  useStartSession,
  useSubmitSessionAnswer,
  useNavigateSession,
  useToggleFlag,
  useFinishSession,
} from '@/hooks/useSession';
import { v4 as uuidv4 } from 'uuid';

const DEMO_USER_ID = 'be5aa44a-6511-4214-9751-8f1004af5b0d';

function StartExamView({ onStart, isStarting }: { onStart: (total?: number) => void; isStarting: boolean }) {
  const [questionCount, setQuestionCount] = useState(30);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 md:p-12 max-w-lg w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            BrainBolt Exam
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Adaptive difficulty quiz session. Questions adjust to your skill level.
          </p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Questions
          </label>
          <div className="flex items-center justify-center gap-3">
            {[15, 30, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  questionCount === n
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(questionCount)}
          disabled={isStarting}
          className="w-full py-4 px-6 rounded-xl font-semibold text-lg bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Preparing Exam...
            </span>
          ) : (
            `Start Exam (${questionCount} Questions)`
          )}
        </button>
      </div>
    </div>
  );
}

function ExamSummaryView({
  summary,
  onNewExam,
}: {
  summary: { totalQuestions: number; attempted: number; correct: number; wrong: number; totalScore: number; maxStreak: number; accuracy: number };
  onNewExam: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 md:p-12 max-w-lg w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Exam Complete!
          </h2>
        </div>

        <div className="grid gap-3 mb-8">
          <div className="flex justify-between items-center p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
            <span className="text-primary-700 dark:text-primary-200 font-bold">Total Score</span>
            <span className="text-xl font-bold text-primary-600 dark:text-primary-300">{summary.totalScore}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <span className="text-emerald-700 dark:text-emerald-200 font-bold">Correct</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-300">{summary.correct}/{summary.totalQuestions}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <span className="text-red-700 dark:text-red-200 font-bold">Wrong</span>
            <span className="text-xl font-bold text-red-600 dark:text-red-300">{summary.wrong}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="text-blue-700 dark:text-blue-200 font-bold">Accuracy</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-300">{(summary.accuracy * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <span className="text-orange-700 dark:text-orange-200 font-bold">Max Streak</span>
            <span className="text-xl font-bold text-orange-600 dark:text-orange-300">🔥 {summary.maxStreak}</span>
          </div>
        </div>

        <button
          onClick={onNewExam}
          className="w-full py-4 px-6 rounded-xl font-semibold text-lg bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-150 transform active:scale-95"
        >
          Start New Exam
        </button>
      </div>
    </div>
  );
}

function FinishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  stats,
  isFinishing,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stats: { unattempted: number; flagged: number; total: number };
  isFinishing: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-4 animate-scale-in">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Finish Exam?
        </h3>
        {stats.unattempted > 0 && (
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ You have <strong>{stats.unattempted}</strong> unanswered question{stats.unattempted > 1 ? 's' : ''}.
            </p>
          </div>
        )}
        {stats.flagged > 0 && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ⚑ You have <strong>{stats.flagged}</strong> flagged question{stats.flagged > 1 ? 's' : ''} to review.
            </p>
          </div>
        )}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Once you finish, you cannot modify your answers.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Continue Exam
          </button>
          <button
            onClick={onConfirm}
            disabled={isFinishing}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {isFinishing ? 'Finishing...' : 'Finish Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [showScoreDelta, setShowScoreDelta] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [examSummary, setExamSummary] = useState<any>(null);
  const { addToast } = useToast();

  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useCurrentSession(DEMO_USER_ID);

  const startSession = useStartSession();
  const submitAnswer = useSubmitSessionAnswer();
  const navigateSession = useNavigateSession();
  const toggleFlag = useToggleFlag();
  const finishSession = useFinishSession();

  const hasActiveSession = !!sessionData && !sessionError;
  const currentQuestion = sessionData?.currentQuestion;
  const currentIndex = sessionData?.session?.currentIndex ?? 0;

  // Build question object for QuestionCard (strip correctAnswer)
  const questionForCard = useMemo(() => {
    if (!currentQuestion?.question) return null;
    return {
      id: currentQuestion.question.id,
      text: currentQuestion.question.text,
      options: currentQuestion.question.options,
      difficulty: currentQuestion.question.difficulty,
      category: currentQuestion.question.category ?? undefined,
    };
  }, [currentQuestion]);

  const handleStartExam = useCallback(
    async (totalQuestions?: number) => {
      try {
        setExamSummary(null);
        await startSession.mutateAsync({
          userId: DEMO_USER_ID,
          totalQuestions: totalQuestions ?? 30,
        });
        addToast({
          type: 'success',
          title: 'Exam Started',
          description: `${totalQuestions ?? 30} questions loaded. Good luck!`,
          duration: 3000,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Please try again.';
        addToast({
          type: 'error',
          title: 'Failed to start exam',
          description: message,
          duration: 5000,
        });
      }
    },
    [startSession, addToast]
  );

  const handleSubmitAnswer = useCallback(
    async (selectedAnswer: number) => {
      if (!sessionData || !currentQuestion) return;

      try {
        const result = await submitAnswer.mutateAsync({
          userId: DEMO_USER_ID,
          sessionId: sessionData.session.id,
          questionId: currentQuestion.questionId,
          selectedAnswer,
          answerIdempotencyKey: uuidv4(),
          stateVersion: sessionData.stateVersion,
        });

        setLastResult({
          ...result,
          questionOptions: currentQuestion.question.options,
        });

        if (result.scoreDelta !== 0) {
          setShowScoreDelta(true);
          setTimeout(() => setShowScoreDelta(false), 2100);
        }

        addToast({
          type: result.isCorrect ? 'success' : 'error',
          title: result.isCorrect ? 'Correct!' : 'Incorrect',
          description: result.isCorrect
            ? `+${result.scoreDelta} points`
            : `The correct answer was: ${currentQuestion.question.options[result.correctAnswer]}`,
          duration: 3000,
        });

        setTimeout(() => setShowResult(true), 300);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Please try again.';
        addToast({
          type: 'error',
          title: 'Failed to submit answer',
          description: message,
          duration: 3000,
        });
      }
    },
    [sessionData, currentQuestion, submitAnswer, addToast]
  );

  const handleNavigate = useCallback(
    async (targetIndex: number) => {
      if (!sessionData) return;
      try {
        await navigateSession.mutateAsync({
          userId: DEMO_USER_ID,
          sessionId: sessionData.session.id,
          targetIndex,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Navigation failed.';
        addToast({
          type: 'error',
          title: 'Navigation failed',
          description: message,
          duration: 3000,
        });
      }
    },
    [sessionData, navigateSession, addToast]
  );

  const handleToggleFlag = useCallback(async () => {
    if (!sessionData || !currentQuestion) return;
    try {
      await toggleFlag.mutateAsync({
        userId: DEMO_USER_ID,
        sessionId: sessionData.session.id,
        questionId: currentQuestion.questionId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to flag question.';
      addToast({
        type: 'error',
        title: 'Failed to flag question',
        description: message,
        duration: 3000,
      });
    }
  }, [sessionData, currentQuestion, toggleFlag, addToast]);

  const handleFinishExam = useCallback(async () => {
    if (!sessionData) return;
    try {
      const summary = await finishSession.mutateAsync({
        userId: DEMO_USER_ID,
        sessionId: sessionData.session.id,
      });
      setExamSummary(summary);
      setShowFinishConfirm(false);
      addToast({
        type: 'success',
        title: 'Exam Finished',
        description: `Score: ${summary.totalScore} | Accuracy: ${(summary.accuracy * 100).toFixed(1)}%`,
        duration: 5000,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to finish exam.';
      addToast({
        type: 'error',
        title: 'Failed to finish exam',
        description: message,
        duration: 3000,
      });
    }
  }, [sessionData, finishSession, addToast]);

  const handleCloseResult = () => {
    setShowResult(false);
  };

  const handleNextQuestion = useCallback(() => {
    setShowResult(false);
    // Auto-advance is handled by the backend, just refetch
  }, []);

  // Loading state
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center space-y-6">
            <QuizSkeleton />
          </div>
        </main>
      </div>
    );
  }

  // Exam summary view
  if (examSummary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <ExamSummaryView summary={examSummary} onNewExam={() => setExamSummary(null)} />
        </main>
      </div>
    );
  }

  // No active session - show start screen
  if (!hasActiveSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <StartExamView onStart={handleStartExam} isStarting={startSession.isPending} />
        </main>
      </div>
    );
  }

  // Active session - exam view
  const isCurrentAnswered = currentQuestion?.status !== 'pending';
  const isCurrentFlagged = currentQuestion?.isFlagged ?? false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Top progress bar */}
        <div className="max-w-5xl mx-auto mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Question {currentIndex + 1} of {sessionData.stats.total}</span>
            <span>{sessionData.stats.attempted} answered</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / sessionData.stats.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex gap-6 justify-center items-start max-w-5xl mx-auto">
          {/* Left sidebar */}
          <ExamSidebar
            questions={sessionData.questions}
            currentIndex={currentIndex}
            stats={sessionData.stats}
            score={sessionData.score}
            streak={sessionData.streak}
            difficulty={sessionData.difficulty}
            onNavigate={handleNavigate}
            onFinish={() => setShowFinishConfirm(true)}
            isSessionComplete={!!sessionData.session.completedAt}
          />

          {/* Main content */}
          <div className="flex flex-col items-center space-y-4 flex-1 min-w-0 max-w-2xl">
            {/* Quick stats bar */}
            <div className="w-full grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 border border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Score</p>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{sessionData.score}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 border border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Streak</p>
                <p className="text-xl font-bold text-warning-600 dark:text-warning-400">🔥 {sessionData.streak}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 border border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Level</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{sessionData.difficulty}/10</p>
              </div>
            </div>

            {/* Question Card */}
            {questionForCard && (
              <QuestionCard
                question={questionForCard}
                onSubmit={handleSubmitAnswer}
                isSubmitting={submitAnswer.isPending}
                disabled={isCurrentAnswered}
                animate={true}
                showFlag={true}
                isFlagged={isCurrentFlagged}
                onToggleFlag={handleToggleFlag}
                questionNumber={currentIndex + 1}
                totalQuestions={sessionData.stats.total}
                answeredStatus={currentQuestion?.status === 'pending' ? undefined : currentQuestion?.status}
                selectedAnswer={currentQuestion?.selectedAnswer ?? undefined}
              />
            )}

            {/* Navigation buttons */}
            <div className="w-full max-w-2xl flex items-center justify-between">
              <button
                onClick={() => handleNavigate(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0 || navigateSession.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentIndex + 1} / {sessionData.stats.total}
              </span>

              <button
                onClick={() =>
                  handleNavigate(
                    Math.min(sessionData.stats.total - 1, currentIndex + 1)
                  )
                }
                disabled={
                  currentIndex >= sessionData.stats.total - 1 ||
                  navigateSession.isPending
                }
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>

            {/* Score Delta Animation */}
            {showScoreDelta && lastResult && (
              <ScoreDelta delta={lastResult.scoreDelta} />
            )}
          </div>
        </div>
      </main>

      {/* Result Modal */}
      {lastResult && (
        <ResultModal
          isOpen={showResult}
          onClose={handleCloseResult}
          isCorrect={lastResult.isCorrect}
          correctAnswer={lastResult.questionOptions?.[lastResult.correctAnswer] || ''}
          scoreDelta={lastResult.scoreDelta}
          newScore={lastResult.newScore}
          newStreak={lastResult.newStreak}
          newDifficulty={lastResult.newDifficulty}
          userRank={lastResult.userRank}
        />
      )}

      {/* Finish Confirm Modal */}
      <FinishConfirmModal
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        onConfirm={handleFinishExam}
        stats={sessionData.stats}
        isFinishing={finishSession.isPending}
      />
    </div>
  );
}
