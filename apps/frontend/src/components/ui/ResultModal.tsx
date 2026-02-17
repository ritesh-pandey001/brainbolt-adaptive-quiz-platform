'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCorrect: boolean;
  correctAnswer: string;
  scoreDelta: number;
  newScore: number;
  newStreak: number;
  newDifficulty: number;
  userRank?: number;
}

export function ResultModal({
  isOpen,
  onClose,
  isCorrect,
  correctAnswer,
  scoreDelta,
  newScore,
  newStreak,
  newDifficulty,
  userRank,
}: ResultModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center">
        <div className="mb-6">
          {isCorrect ? (
            <div className="mx-auto w-16 h-16 rounded-full bg-success-100 dark:bg-success-900 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-success-600 dark:text-success-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-full bg-error-100 dark:bg-error-900 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-error-600 dark:text-error-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        <h3
          className={`text-2xl font-bold mb-4 ${
            isCorrect
              ? 'text-success-600 dark:text-success-400'
              : 'text-error-600 dark:text-error-400'
          }`}
        >
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </h3>

        {!isCorrect && (
          <p className="text-gray-700 dark:text-gray-200 mb-4">
            The correct answer was: <strong>{correctAnswer}</strong>
          </p>
        )}

        <div className="grid gap-3 mb-6">
          {scoreDelta > 0 && (
            <div className="flex justify-between items-center p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl">
              <span className="text-success-700 dark:text-success-200 font-bold">Score Gained:</span>
              <span className="text-xl font-bold text-success-600 dark:text-success-300">
                +{scoreDelta}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
            <span className="text-primary-700 dark:text-primary-200 font-bold">Total Score:</span>
            <span className="text-xl font-bold text-primary-600 dark:text-primary-300">
              {newScore.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <span className="text-orange-700 dark:text-orange-200 font-bold">Current Streak:</span>
            <span className="text-xl font-bold text-orange-600 dark:text-orange-300">
              🔥 {newStreak}
            </span>
          </div>

          <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="text-blue-700 dark:text-blue-200 font-bold">Difficulty:</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-300">
              {newDifficulty}/10
            </span>
          </div>

          {userRank && (
            <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <span className="text-yellow-700 dark:text-yellow-200 font-bold">Your Rank:</span>
              <span className="text-xl font-bold text-yellow-600 dark:text-yellow-300">
                #{userRank}
              </span>
            </div>
          )}
        </div>

        <Button onClick={onClose} variant="primary" size="lg" fullWidth>
          Next Question
        </Button>
      </div>
    </Modal>
  );
}
