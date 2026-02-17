import React from 'react';
import { clsx } from 'clsx';

export interface LoadingSkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
}) => {
  const baseStyles = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantStyles = {
    text: 'rounded h-4',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  return (
    <div
      className={clsx(baseStyles, variantStyles[variant], className)}
      style={{ width, height }}
    />
  );
};

export const QuizSkeleton: React.FC = () => (
  <div className="w-full max-w-2xl mx-auto space-y-6">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
      <LoadingSkeleton variant="rectangular" height="24px" width="60%" />
      <LoadingSkeleton variant="rectangular" height="60px" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} variant="rectangular" height="48px" />
        ))}
      </div>
    </div>
  </div>
);
