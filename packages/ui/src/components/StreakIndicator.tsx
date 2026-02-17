import React from 'react';
import { clsx } from 'clsx';

export interface StreakIndicatorProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({
  streak,
  size = 'md',
  animate = true,
}) => {
  const isActive = streak > 0;

  const sizeStyles = {
    sm: 'text-base',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          'transition-all duration-300',
          sizeStyles[size],
          isActive
            ? 'text-warning-500 dark:text-warning-400'
            : 'text-gray-400 dark:text-gray-600',
          animate && isActive && 'animate-pulse'
        )}
        role="img"
        aria-label="fire"
      >
        🔥
      </span>
      <span
        className={clsx(
          'font-bold',
          isActive
            ? 'text-warning-600 dark:text-warning-400'
            : 'text-gray-600 dark:text-gray-400',
          animate && 'transition-all duration-300'
        )}
      >
        {streak}
      </span>
    </div>
  );
};

StreakIndicator.displayName = 'StreakIndicator';
