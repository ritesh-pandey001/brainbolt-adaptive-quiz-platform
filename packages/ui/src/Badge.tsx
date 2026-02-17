import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-full';

    const variantStyles = {
      default:
        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      success:
        'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
      error:
        'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200',
      warning:
        'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
      info: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
