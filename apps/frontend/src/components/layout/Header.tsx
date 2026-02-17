'use client';

import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              BrainBolt
            </span>
          </Link>

          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-300 transition-colors font-medium"
            >
              Quiz
            </Link>
            <Link
              href="/leaderboard"
              className="text-gray-700 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-300 transition-colors font-medium"
            >
              Leaderboard
            </Link>
            <Link
              href="/metrics"
              className="text-gray-700 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-300 transition-colors font-medium"
            >
              Metrics
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg
                  className="w-5 h-5 text-gray-900 dark:text-gray-100"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-900 dark:text-gray-100"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
