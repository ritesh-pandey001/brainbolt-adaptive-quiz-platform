import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  StartSessionRequest,
  SessionAnswerRequest,
  NavigateRequest,
  ToggleFlagRequest,
  FinishSessionRequest,
  SessionStateResponse,
  SessionQuestion,
} from '@brainbolt/shared';

const SESSION_KEY = 'session';

export function useCurrentSession(userId: string) {
  return useQuery({
    queryKey: [SESSION_KEY, userId],
    queryFn: () => apiClient.getCurrentSession(userId),
    enabled: !!userId,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartSessionRequest) => apiClient.startSession(data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData([SESSION_KEY, variables.userId], data);
    },
  });
}

export function useSubmitSessionAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SessionAnswerRequest) => apiClient.submitSessionAnswer(data),
    onSuccess: (result, variables) => {
      // Update the session cache optimistically
      queryClient.setQueryData(
        [SESSION_KEY, variables.userId],
        (old: SessionStateResponse | undefined) => {
          if (!old) return old;
          const updatedQuestions = old.questions.map((q: SessionQuestion) => {
            if (q.questionId === variables.questionId) {
              return {
                ...q,
                status: result.questionStatus,
                selectedAnswer: variables.selectedAnswer,
                scoreDelta: result.scoreDelta,
                answeredAt: new Date().toISOString(),
              };
            }
            return q;
          });

          const stats = {
            total: updatedQuestions.length,
            attempted: updatedQuestions.filter((q: SessionQuestion) => q.status !== 'pending').length,
            unattempted: updatedQuestions.filter((q: SessionQuestion) => q.status === 'pending').length,
            correct: updatedQuestions.filter((q: SessionQuestion) => q.status === 'correct').length,
            wrong: updatedQuestions.filter((q: SessionQuestion) => q.status === 'wrong').length,
            flagged: updatedQuestions.filter((q: SessionQuestion) => q.isFlagged).length,
          };

          return {
            ...old,
            questions: updatedQuestions,
            score: result.newScore,
            streak: result.newStreak,
            difficulty: result.newDifficulty,
            stateVersion: result.stateVersion,
            userRank: result.userRank,
            stats,
          };
        }
      );
      // Also invalidate metrics and leaderboards
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['scoreLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['streakLeaderboard'] });
    },
  });
}

export function useNavigateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NavigateRequest) => apiClient.navigateSession(data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData([SESSION_KEY, variables.userId], data);
    },
  });
}

export function useToggleFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ToggleFlagRequest) => apiClient.toggleFlag(data),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(
        [SESSION_KEY, variables.userId],
        (old: SessionStateResponse | undefined) => {
          if (!old) return old;
          const updatedQuestions = old.questions.map((q: SessionQuestion) => {
            if (q.questionId === variables.questionId) {
              return { ...q, isFlagged: result.isFlagged };
            }
            return q;
          });
          const stats = {
            ...old.stats,
            flagged: updatedQuestions.filter((q: SessionQuestion) => q.isFlagged).length,
          };
          return { ...old, questions: updatedQuestions, stats };
        }
      );
    },
  });
}

export function useFinishSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FinishSessionRequest) => apiClient.finishSession(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['scoreLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['streakLeaderboard'] });
    },
  });
}
