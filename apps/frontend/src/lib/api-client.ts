import {
  NextQuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  MetricsResponse,
  LeaderboardResponse,
  SessionStateResponse,
  SessionAnswerRequest,
  SessionAnswerResponse,
  SessionSummaryResponse,
  StartSessionRequest,
  NavigateRequest,
  ToggleFlagRequest,
  FinishSessionRequest,
} from '@brainbolt/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_URL}/${API_VERSION}`;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: response.statusText,
      }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async getNextQuestion(userId: string): Promise<NextQuestionResponse> {
    return this.request<NextQuestionResponse>(
      `/quiz/next?userId=${userId}`
    );
  }

  async submitAnswer(data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    return this.request<SubmitAnswerResponse>('/quiz/answer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMetrics(userId: string): Promise<MetricsResponse> {
    return this.request<MetricsResponse>(`/quiz/metrics?userId=${userId}`);
  }

  async getScoreLeaderboard(
    limit?: number,
    userId?: string
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (userId) params.append('userId', userId);

    return this.request<LeaderboardResponse>(
      `/leaderboard/score?${params.toString()}`
    );
  }

  async getStreakLeaderboard(
    limit?: number,
    userId?: string
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (userId) params.append('userId', userId);

    return this.request<LeaderboardResponse>(
      `/leaderboard/streak?${params.toString()}`
    );
  }

  async healthCheck(): Promise<{ status: string }> {
    const url = `${API_URL}/health`;
    const response = await fetch(url);
    return response.json();
  }

  // =====================================================
  // SESSION API
  // =====================================================

  async startSession(data: StartSessionRequest): Promise<SessionStateResponse> {
    return this.request<SessionStateResponse>('/session/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentSession(userId: string): Promise<SessionStateResponse> {
    return this.request<SessionStateResponse>(`/session/current?userId=${userId}`);
  }

  async submitSessionAnswer(data: SessionAnswerRequest): Promise<SessionAnswerResponse> {
    return this.request<SessionAnswerResponse>('/session/answer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async navigateSession(data: NavigateRequest): Promise<SessionStateResponse> {
    return this.request<SessionStateResponse>('/session/navigate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleFlag(data: ToggleFlagRequest): Promise<{ isFlagged: boolean }> {
    return this.request<{ isFlagged: boolean }>('/session/flag', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async finishSession(data: FinishSessionRequest): Promise<SessionSummaryResponse> {
    return this.request<SessionSummaryResponse>('/session/finish', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
