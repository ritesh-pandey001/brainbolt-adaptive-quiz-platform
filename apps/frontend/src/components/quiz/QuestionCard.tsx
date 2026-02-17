'use client';

import { useState, memo, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';

interface QuestionData {
  id: string;
  text: string;
  options: string[];
  difficulty: number;
  category?: string | null;
}

interface QuestionCardProps {
  question: QuestionData;
  onSubmit: (selectedAnswer: number) => void;
  isSubmitting: boolean;
  disabled?: boolean;
  animate?: boolean;
  showFlag?: boolean;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  questionNumber?: number;
  totalQuestions?: number;
  answeredStatus?: 'correct' | 'wrong';
  selectedAnswer?: number;
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const getDifficultyColor = () => {
    if (difficulty <= 3) return 'bg-success-100 text-success-900 ring-success-600/30 dark:bg-success-800/80 dark:text-success-100 dark:ring-success-300/50 border border-success-300 dark:border-success-400';
    if (difficulty <= 6) return 'bg-warning-100 text-warning-900 ring-warning-600/30 dark:bg-warning-700/90 dark:text-warning-50 dark:ring-warning-200/60 border border-warning-400 dark:border-warning-200';
    return 'bg-error-100 text-error-900 ring-error-600/30 dark:bg-error-800/80 dark:text-error-100 dark:ring-error-300/50 border border-error-300 dark:border-error-400';
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ring-1',
      getDifficultyColor()
    )}>
      Level {difficulty}
    </span>
  );
}

export const QuestionCard = memo(function QuestionCard({
  question,
  onSubmit,
  isSubmitting,
  disabled = false,
  animate = true,
  showFlag = false,
  isFlagged = false,
  onToggleFlag,
  questionNumber,
  totalQuestions,
  answeredStatus,
  selectedAnswer: previousAnswer,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Reset selection when question changes
  useEffect(() => {
    setSelectedOption(null);
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    if (selectedOption !== null) {
      onSubmit(selectedOption);
    }
  }, [selectedOption, onSubmit]);

  const difficulty = question.difficulty;
  const isAnswered = !!answeredStatus;

  return (
    <div className={clsx('w-full max-w-2xl', animate && 'animate-fade-in')}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-all duration-200 hover:shadow-2xl">
        {/* Header: Category + Difficulty + Flag + Question Number */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {questionNumber && totalQuestions && (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Q{questionNumber}/{totalQuestions}
              </span>
            )}
            {question.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                {question.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showFlag && onToggleFlag && (
              <button
                onClick={onToggleFlag}
                className={clsx(
                  'p-2 rounded-lg transition-all duration-150 text-sm',
                  isFlagged
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
                title={isFlagged ? 'Unflag question' : 'Flag for review'}
              >
                {isFlagged ? '⚑ Flagged' : '⚐ Flag'}
              </button>
            )}
            <DifficultyBadge difficulty={difficulty} />
          </div>
        </div>

        {/* Answered status banner */}
        {isAnswered && (
          <div
            className={clsx(
              'mb-4 px-4 py-2 rounded-lg text-sm font-medium',
              answeredStatus === 'correct'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            )}
          >
            {answeredStatus === 'correct' ? '✓ Answered correctly' : '✗ Answered incorrectly'}
            {previousAnswer !== undefined && (
              <span className="ml-2 text-xs opacity-75">
                (Selected: {question.options[previousAnswer]})
              </span>
            )}
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          {question.text}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const wasPreviouslySelected = isAnswered && previousAnswer === index;
            return (
              <button
                key={index}
                onClick={() => !disabled && !isAnswered && setSelectedOption(index)}
                disabled={disabled || isSubmitting || isAnswered}
                className={clsx(
                  'w-full text-left p-4 rounded-xl border-2 transition-all duration-150 transform',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  !isAnswered && 'hover:scale-[1.02] active:scale-[0.98]',
                  isAnswered && wasPreviouslySelected && answeredStatus === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : isAnswered && wasPreviouslySelected && answeredStatus === 'wrong'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                  (disabled || isSubmitting || isAnswered) && !wasPreviouslySelected && 'opacity-60 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={clsx(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150',
                      isAnswered && wasPreviouslySelected && answeredStatus === 'correct'
                        ? 'border-emerald-500 bg-emerald-500'
                        : isAnswered && wasPreviouslySelected && answeredStatus === 'wrong'
                        ? 'border-red-500 bg-red-500'
                        : isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {(isSelected || wasPreviouslySelected) && (
                      <div className="w-3 h-3 rounded-full bg-white dark:bg-gray-200" />
                    )}
                  </div>
                  <span className="text-base md:text-lg font-medium text-gray-900 dark:text-gray-50">
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Button (only when not answered) */}
        {!isAnswered && (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null || disabled || isSubmitting}
            className={clsx(
              'w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'transform active:scale-95',
              selectedOption !== null && !disabled && !isSubmitting
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Save & Next'
            )}
          </button>
        )}
      </div>
    </div>
  );
});

