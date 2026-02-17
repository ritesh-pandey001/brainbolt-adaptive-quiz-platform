import React from 'react';
import { clsx } from 'clsx';

export interface DifficultyBadgeProps {
  difficulty: number; // 1-10
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  difficulty,
  showLabel = true,
  size = 'md',
}) => {
  const getVariant = (diff: number): 'success' | 'warning' | 'error' => {
    if (diff <= 3) return 'success';
    if (diff <= 6) return 'warning';
    return 'error';
  };

  const variant = getVariant(difficulty);

  const variantStyles = {
    success:
      'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300 ring-1 ring-success-600/20',
    warning:
      'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300 ring-1 ring-warning-600/20',
    error:
      'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300 ring-1 ring-error-600/20',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold rounded-full transition-all duration-150',
        variantStyles[variant],
        sizeStyles[size]
      )}
    >
      {showLabel ? (
        <>
          <span className="mr-1">Level</span>
          <span>{difficulty}</span>
        </>
      ) : (
        <span>{difficulty}/10</span>
      )}
    </span>
  );
};

DifficultyBadge.displayName = 'DifficultyBadge';
