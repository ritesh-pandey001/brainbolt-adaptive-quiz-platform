'use client';

import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/metrics/StatCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMetrics } from '@/hooks/useQuiz';
import { useTheme } from '@/contexts/ThemeContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// For demo purposes, using a seeded user (alice)
// In production, this would come from authentication
const DEMO_USER_ID = 'be5aa44a-6511-4214-9751-8f1004af5b0d';

const getDifficultyColor = (difficulty: number) => {
  if (difficulty <= 3) return '#10b981'; // success
  if (difficulty <= 6) return '#f59e0b'; // warning
  return '#ef4444'; // error
};

export default function MetricsPage() {
  const { data: metrics, isLoading } = useMetrics(DEMO_USER_ID);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware chart colors
  const axisColor = isDark ? '#d1d5db' : '#6b7280';       // gray-300 vs gray-500
  const gridColor = isDark ? '#4b5563' : '#e5e7eb';        // gray-600 vs gray-200
  const gridOpacity = isDark ? 0.5 : 0.8;
  const tooltipBg = isDark ? '#1f2937' : '#ffffff';         // gray-800 vs white
  const tooltipBorder = isDark ? '#4b5563' : '#e5e7eb';     // gray-600 vs gray-200
  const tooltipText = isDark ? '#f9fafb' : '#111827';       // gray-50 vs gray-900
  const labelColor = isDark ? '#e5e7eb' : '#374151';        // gray-200 vs gray-700

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-8 text-center">
              Your Metrics
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <LoadingSkeleton variant="rectangular" width="100%" height="80px" />
                </div>
              ))}
            </div>
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <LoadingSkeleton variant="rectangular" width="100%" height="300px" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <EmptyState
            icon="📊"
            title="No Metrics Available"
            description="Start playing to see your stats and track your progress!"
          />
        </main>
      </div>
    );
  }

  // Prepare chart data
  const difficultyProgressionData = metrics.recentPerformance
    .slice()
    .reverse()
    .map((answer, index) => ({
      index: index + 1,
      difficulty: answer.difficulty,
      label: `Q${index + 1}`,
    }));

  const accuracyData = metrics.recentPerformance
    .slice()
    .reverse()
    .map((answer, index) => ({
      index: index + 1,
      accuracy: answer.isCorrect ? 100 : 0,
      label: `Q${index + 1}`,
    }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-8 text-center">
            Your Metrics
          </h1>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Score"
              value={metrics.totalScore}
              trend={null}
              icon="🏆"
              color="primary"
            />
            <StatCard
              title="Current Streak"
              value={metrics.currentStreak}
              trend={null}
              icon="🔥"
              color="success"
            />
            <StatCard
              title="Max Streak"
              value={metrics.maxStreak}
              trend={null}
              icon="⭐"
              color="warning"
            />
            <StatCard
              title="Accuracy"
              value={`${(metrics.accuracy * 100).toFixed(1)}%`}
              trend={null}
              icon="🎯"
              color="info"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Difficulty Progression Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Difficulty Progression
              </h2>
              {difficultyProgressionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={difficultyProgressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={gridOpacity} />
                    <XAxis
                      dataKey="label"
                      stroke={axisColor}
                      tick={{ fill: axisColor, fontSize: 12 }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      stroke={axisColor}
                      tick={{ fill: axisColor, fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        color: tooltipText,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                      }}
                      labelStyle={{ color: tooltipText, fontWeight: 600 }}
                      itemStyle={{ color: tooltipText }}
                    />
                    <Line
                      type="monotone"
                      dataKey="difficulty"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon="📈"
                  title="No Data Yet"
                  description="Start answering questions to see your progression!"
                />
              )}
            </div>

            {/* Difficulty Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Difficulty Distribution
              </h2>
              {metrics.difficultyHistogram.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.difficultyHistogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={gridOpacity} />
                    <XAxis
                      dataKey="difficulty"
                      stroke={axisColor}
                      tick={{ fill: axisColor, fontSize: 12 }}
                    />
                    <YAxis
                      stroke={axisColor}
                      tick={{ fill: axisColor, fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        color: tooltipText,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                      }}
                      labelStyle={{ color: tooltipText, fontWeight: 600 }}
                      itemStyle={{ color: tooltipText }}
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {metrics.difficultyHistogram.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.difficulty)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon="📊"
                  title="No Data Yet"
                  description="Answer questions across different difficulty levels!"
                />
              )}
            </div>
          </div>

          {/* Overall Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Overall Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {metrics.totalAnswered}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Questions
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-success-50 dark:bg-success-900/20">
                <div className="text-3xl font-bold text-success-600 dark:text-success-400 mb-1">
                  {metrics.correctAnswers}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Correct Answers
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-error-50 dark:bg-error-900/20">
                <div className="text-3xl font-bold text-error-600 dark:text-error-400 mb-1">
                  {metrics.totalAnswered - metrics.correctAnswers}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Incorrect Answers
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <div
                  className={`text-3xl font-bold mb-1 ${
                    metrics.currentDifficulty <= 3
                      ? 'text-success-600 dark:text-success-400'
                      : metrics.currentDifficulty <= 6
                      ? 'text-warning-600 dark:text-warning-400'
                      : 'text-error-600 dark:text-error-400'
                  }`}
                >
                  {metrics.currentDifficulty}/10
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current Difficulty
                </div>
              </div>
            </div>
          </div>

          {/* Recent Performance Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Recent Performance (Last 10 Answers)
            </h2>
            {metrics.recentPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Result
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Difficulty
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Score Change
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentPerformance.map((answer, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {answer.isCorrect ? '✅' : '❌'}
                            </span>
                            <span
                              className={`font-semibold ${
                                answer.isCorrect
                                  ? 'text-success-600 dark:text-success-400'
                                  : 'text-error-600 dark:text-error-400'
                              }`}
                            >
                              {answer.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ring-1 border ${
                              answer.difficulty <= 3
                                ? 'bg-success-100 text-success-900 ring-success-600/30 dark:bg-success-800/80 dark:text-success-100 dark:ring-success-300/50 border-success-300 dark:border-success-400'
                                : answer.difficulty <= 6
                                ? 'bg-warning-100 text-warning-900 ring-warning-600/30 dark:bg-warning-700/90 dark:text-warning-50 dark:ring-warning-200/60 border-warning-400 dark:border-warning-200'
                                : 'bg-error-100 text-error-900 ring-error-600/30 dark:bg-error-800/80 dark:text-error-100 dark:ring-error-300/50 border-error-300 dark:border-error-400'
                            }`}
                          >
                            Level {answer.difficulty}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`font-bold ${
                              answer.scoreDelta > 0
                                ? 'text-success-600 dark:text-success-400'
                                : 'text-error-600 dark:text-error-400'
                            }`}
                          >
                            {answer.scoreDelta > 0 ? `+${answer.scoreDelta}` : answer.scoreDelta}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(answer.createdAt).toLocaleDateString()} at{' '}
                          {new Date(answer.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="📋"
                title="No Recent Activity"
                description="Answer some questions to see your recent performance!"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
