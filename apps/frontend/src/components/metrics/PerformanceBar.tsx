'use client';

import { useState, useEffect } from 'react';

function useCountUp(end: number, duration: number = 800): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    const increment = end / totalFrames;
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      if (frame === totalFrames) {
        clearInterval(counter);
        setCount(end);
      } else {
        setCount(Math.floor(increment * frame));
      }
    }, frameRate);

    return () => clearInterval(counter);
  }, [end, duration]);

  return count;
}

interface PerformanceBarProps {
  totalScore: number;
  currentStreak: number;
  currentDifficulty: number;
  accuracy: number;
  animate?: boolean;
}

export function PerformanceBar({
  totalScore,
  currentStreak,
  currentDifficulty,
  accuracy,
  animate = true,
}: PerformanceBarProps) {
  const animatedScore = useCountUp(totalScore, 800);
  const displayScore = animate ? animatedScore : totalScore;

  return (
    <div className="w-full max-w-4xl mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Total Score
          </p>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-300">
            {displayScore.toLocaleString()}
          </p>
        </div>

        {/* Current Streak */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Current Streak
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-3xl ${currentStreak > 0 && animate ? 'animate-pulse' : ''}`}>
              🔥
            </span>
            <span className="text-3xl font-bold text-warning-600 dark:text-warning-300">
              {currentStreak}
            </span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Difficulty
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success-500 via-warning-500 to-error-500 transition-all duration-500 rounded-full"
                style={{ width: `${(currentDifficulty / 10) * 100}%` }}
              />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-50 min-w-[3rem]">
              {currentDifficulty}/10
            </span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Accuracy
          </p>
          <p className="text-3xl font-bold text-success-600 dark:text-success-300">
            {(accuracy * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
