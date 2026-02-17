import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { SubmitAnswerRequest } from '@brainbolt/shared';

export function useNextQuestion(userId: string) {
  return useQuery({
    queryKey: ['nextQuestion', userId],
    queryFn: () => apiClient.getNextQuestion(userId),
    enabled: !!userId,
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitAnswerRequest) => apiClient.submitAnswer(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['nextQuestion', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['metrics', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['scoreLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['streakLeaderboard'] });
    },
  });
}

export function useMetrics(userId: string) {
  return useQuery({
    queryKey: ['metrics', userId],
    queryFn: () => apiClient.getMetrics(userId),
    enabled: !!userId,
  });
}

export function useScoreLeaderboard(limit: number = 100, userId?: string) {
  return useQuery({
    queryKey: ['scoreLeaderboard', limit, userId],
    queryFn: () => apiClient.getScoreLeaderboard(limit, userId),
  });
}

export function useStreakLeaderboard(limit: number = 100, userId?: string) {
  return useQuery({
    queryKey: ['streakLeaderboard', limit, userId],
    queryFn: () => apiClient.getStreakLeaderboard(limit, userId),
  });
}
