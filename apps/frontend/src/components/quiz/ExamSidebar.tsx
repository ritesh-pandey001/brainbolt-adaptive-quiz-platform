'use client';

import { useState, memo, useCallback } from 'react';
import { clsx } from 'clsx';
import { SessionQuestion } from '@brainbolt/shared';

interface ExamSidebarProps {
  questions: SessionQuestion[];
  currentIndex: number;
  stats: {
    total: number;
    attempted: number;
    unattempted: number;
    correct: number;
    wrong: number;
    flagged: number;
  };
  score: number;
  streak: number;
  difficulty: number;
  onNavigate: (index: number) => void;
  onFinish: () => void;
  isSessionComplete: boolean;
}

export const ExamSidebar = memo(function ExamSidebar({
  questions,
  currentIndex,
  stats,
  score,
  streak,
  difficulty,
  onNavigate,
  onFinish,
  isSessionComplete,
}: ExamSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getStatusColor = useCallback(
    (q: SessionQuestion, index: number) => {
      if (index === currentIndex) {
        // Current question with status overlay
        if (q.status === 'correct')
          return 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 bg-emerald-500 text-white border-emerald-600';
        if (q.status === 'wrong')
          return 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 bg-red-500 text-white border-red-600';
        return 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 bg-blue-500 text-white border-blue-600 animate-pulse-subtle';
      }
      if (q.isFlagged && q.status === 'pending')
        return 'bg-amber-400 text-amber-900 border-amber-500 dark:bg-amber-500 dark:text-amber-950';
      if (q.isFlagged && q.status === 'correct')
        return 'bg-emerald-500 text-white border-amber-500 ring-1 ring-amber-400';
      if (q.isFlagged && q.status === 'wrong')
        return 'bg-red-500 text-white border-amber-500 ring-1 ring-amber-400';
      if (q.status === 'correct')
        return 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
      if (q.status === 'wrong')
        return 'bg-red-500 text-white border-red-600 shadow-sm';
      return 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-650';
    },
    [currentIndex]
  );

  const progressPct = stats.total > 0 ? (stats.attempted / stats.total) * 100 : 0;
  const correctPct = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  const wrongPct = stats.total > 0 ? (stats.wrong / stats.total) * 100 : 0;

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Header stats */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Exam Overview
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-primary-600 dark:text-primary-400">{score}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Score</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-warning-600 dark:text-warning-400">
              🔥 {streak}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {difficulty}/10
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Level</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>
            {stats.attempted}/{stats.total}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full flex transition-all duration-500">
            <div
              className="bg-emerald-500"
              style={{ width: `${correctPct}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${wrongPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ {stats.correct}
          </span>
          <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">
            ✗ {stats.wrong}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            ○ {stats.unattempted}
          </span>
          {stats.flagged > 0 && (
            <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">
              ⚑ {stats.flagged}
            </span>
          )}
        </div>
      </div>

      {/* Question grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-5 gap-1.5">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => {
                onNavigate(idx);
                setIsMobileOpen(false);
              }}
              className={clsx(
                'w-full aspect-square rounded-lg border flex items-center justify-center text-xs font-bold transition-all duration-150 cursor-pointer',
                getStatusColor(q, idx)
              )}
              title={`Q${idx + 1}: ${q.status}${q.isFlagged ? ' (flagged)' : ''}`}
            >
              {q.isFlagged && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px]">⚑</span>
              )}
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Correct</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Wrong</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Flagged</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Pending</span>
          </div>
        </div>

        {/* Finish button */}
        {!isSessionComplete && (
          <button
            onClick={onFinish}
            className="w-full py-2 px-4 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors duration-150 shadow-sm"
          >
            Finish Exam
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-20 left-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        aria-label="Toggle exam sidebar"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>{stats.attempted}/{stats.total}</span>
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={clsx(
          'lg:hidden fixed top-0 left-0 z-40 w-72 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl transform transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Exam Navigator</span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {sidebar}
      </div>

      {/* Desktop sticky sidebar */}
      <div className="hidden lg:block lg:sticky lg:top-20 lg:w-64 lg:max-h-[calc(100vh-6rem)] lg:self-start bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
        {sidebar}
      </div>
    </>
  );
});
