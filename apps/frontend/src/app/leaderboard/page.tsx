'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useScoreLeaderboard, useStreakLeaderboard } from '@/hooks/useQuiz';

// For demo purposes, using a seeded user (alice)
// In production, this would come from authentication
const DEMO_USER_ID = 'be5aa44a-6511-4214-9751-8f1004af5b0d';

const getMedalIcon = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

const getRankBadgeColor = (rank: number) => {
  if (rank === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 ring-1 ring-yellow-600/20';
  if (rank === 2) return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 ring-1 ring-gray-600/20';
  if (rank === 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-amber-600/20';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'score' | 'streak'>('score');

  const { data: scoreData, isLoading: isLoadingScore } = useScoreLeaderboard(
    100,
    DEMO_USER_ID
  );
  const { data: streakData, isLoading: isLoadingStreak } = useStreakLeaderboard(
    100,
    DEMO_USER_ID
  );

  const isLoading = activeTab === 'score' ? isLoadingScore : isLoadingStreak;
  const data = activeTab === 'score' ? scoreData : streakData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-8 text-center">
            Leaderboard
          </h1>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex space-x-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
              <button
                onClick={() => setActiveTab('score')}
                className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === 'score'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                🏆 Top Scores
              </button>
              <button
                onClick={() => setActiveTab('streak')}
                className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === 'streak'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                🔥 Top Streaks
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <LoadingSkeleton variant="circular" width="48px" height="48px" />
                      <LoadingSkeleton variant="rectangular" width="60%" height="24px" />
                    </div>
                    <LoadingSkeleton variant="rectangular" width="80px" height="32px" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* User's Rank Card */}
              {data?.userEntry && (
                <div className="mb-6 animate-scale-in">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm font-bold text-2xl">
                          #{data.userEntry.rank}
                        </div>
                        <div>
                          <div className="text-sm font-medium opacity-90">Your Rank</div>
                          <div className="text-2xl font-bold">{data.userEntry.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium opacity-90">
                          {activeTab === 'score' ? 'Score' : 'Streak'}
                        </div>
                        <div className="text-4xl font-black">{data.userEntry.score.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard List */}
              <div className="space-y-2">
                {data?.leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === DEMO_USER_ID;
                  const medal = getMedalIcon(entry.rank);
                  const isTopThree = entry.rank <= 3;

                  return (
                    <div
                      key={entry.userId}
                      className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 p-6 border-2 ${
                        isCurrentUser
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : isTopThree
                          ? 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                          : 'border-transparent hover:border-gray-100 dark:hover:border-gray-800'
                      } ${index < 3 ? 'animate-fade-in' : ''}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Rank Badge */}
                          <div
                            className={`flex items-center justify-center w-12 h-12 rounded-xl font-bold text-lg transition-transform group-hover:scale-110 ${getRankBadgeColor(
                              entry.rank
                            )}`}
                          >
                            {medal || `#${entry.rank}`}
                          </div>

                          {/* Username */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {entry.username}
                              </span>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {entry.score.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {data?.leaderboard.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Entries Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Be the first to play and claim the top spot!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
