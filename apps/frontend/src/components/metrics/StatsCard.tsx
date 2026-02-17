'use client';

interface StatsCardProps {
  totalScore: number;
  currentStreak: number;
  currentDifficulty: number;
  accuracy: number;
}

export function StatsCard({
  totalScore,
  currentStreak,
  currentDifficulty,
  accuracy,
}: StatsCardProps) {
  return (
    <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Your Stats
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {totalScore}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Score
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-success-600 dark:text-success-400">
            {currentStreak}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Current Streak
          </div>
        </div>

        <div className="text-center">
          <div
            className={`text-3xl font-bold ${
              currentDifficulty <= 3
                ? 'text-success-600 dark:text-success-400'
                : currentDifficulty <= 6
                ? 'text-warning-600 dark:text-warning-400'
                : 'text-error-600 dark:text-error-400'
            }`}
          >
            {currentDifficulty}/10
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Difficulty
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-warning-600 dark:text-warning-400">
            {(accuracy * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Accuracy
          </div>
        </div>
      </div>
    </div>
  );
}
