import React, { memo } from 'react';
import { clsx } from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  } | null;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  animate?: boolean;
}

export const StatCard = memo<StatCardProps>(function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'default',
  animate = true,
}) {
  const colorStyles = {
    default: 'text-gray-900 dark:text-gray-100',
    primary: 'text-primary-600 dark:text-primary-400',
    success: 'text-success-600 dark:text-success-400',
    warning: 'text-warning-600 dark:text-warning-400',
    error: 'text-error-600 dark:text-error-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>
          <p
            className={clsx(
              'text-3xl md:text-4xl font-bold',
              colorStyles[color],
              animate && 'transition-all duration-300'
            )}
          >
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-2 gap-1">
              <span
                className={clsx(
                  'text-sm font-medium',
                  trend.isPositive
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-error-600 dark:text-error-400'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-4xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
});
