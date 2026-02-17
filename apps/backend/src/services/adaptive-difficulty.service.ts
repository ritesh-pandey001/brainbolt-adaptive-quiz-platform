import { config } from '../config';
import { UserState } from '@prisma/client';

export interface AdaptiveDifficultyResult {
  newDifficulty: number;
  newConfidenceBuffer: number[];
  shouldIncrease: boolean;
  shouldDecrease: boolean;
}

export class AdaptiveDifficultyService {
  private readonly minDifficulty: number;
  private readonly maxDifficulty: number;
  private readonly bufferSize: number;
  private readonly inactivityDecayMinutes: number;

  constructor() {
    this.minDifficulty = config.MIN_DIFFICULTY;
    this.maxDifficulty = config.MAX_DIFFICULTY;
    this.bufferSize = config.CONFIDENCE_BUFFER_SIZE;
    this.inactivityDecayMinutes = config.INACTIVITY_DECAY_MINUTES;
  }

  /**
   * Calculate new difficulty based on answer correctness
   * Uses confidence buffer to prevent ping-pong oscillation
   *
   * Difficulty increases only after BUFFER_SIZE consecutive positive signals
   * Difficulty decreases only after BUFFER_SIZE consecutive negative signals
   */
  calculateNewDifficulty(
    currentDifficulty: number,
    isCorrect: boolean,
    confidenceBuffer: number[]
  ): AdaptiveDifficultyResult {
    // Add confidence signal: +1 for correct, -1 for incorrect
    const signal = isCorrect ? 1 : -1;
    const newBuffer = [...confidenceBuffer, signal];

    // Keep buffer size limited
    if (newBuffer.length > this.bufferSize) {
      newBuffer.shift();
    }

    let newDifficulty = currentDifficulty;
    let shouldIncrease = false;
    let shouldDecrease = false;

    // Check if we should increase difficulty
    if (newBuffer.length === this.bufferSize) {
      const allPositive = newBuffer.every((s) => s > 0);
      const allNegative = newBuffer.every((s) => s < 0);

      if (allPositive && currentDifficulty < this.maxDifficulty) {
        newDifficulty = Math.min(currentDifficulty + 1, this.maxDifficulty);
        shouldIncrease = true;
        // Clear buffer after adjustment
        newBuffer.length = 0;
      } else if (allNegative && currentDifficulty > this.minDifficulty) {
        newDifficulty = Math.max(currentDifficulty - 1, this.minDifficulty);
        shouldDecrease = true;
        // Clear buffer after adjustment
        newBuffer.length = 0;
      }
    }

    return {
      newDifficulty,
      newConfidenceBuffer: newBuffer,
      shouldIncrease,
      shouldDecrease,
    };
  }

  /**
   * Calculate streak based on answer correctness and inactivity
   */
  calculateNewStreak(
    currentStreak: number,
    isCorrect: boolean,
    lastActivityAt: Date
  ): number {
    const now = new Date();
    const minutesSinceLastActivity =
      (now.getTime() - lastActivityAt.getTime()) / (1000 * 60);

    // Reset streak if inactive for too long
    if (minutesSinceLastActivity > this.inactivityDecayMinutes) {
      return isCorrect ? 1 : 0;
    }

    // Update streak
    if (isCorrect) {
      return currentStreak + 1;
    } else {
      return 0;
    }
  }

  /**
   * Calculate score delta based on difficulty and streak
   *
   * Formula: base * difficultyWeight * multiplier
   * - base = 10
   * - difficultyWeight = difficulty * 2
   * - multiplier = 1 + (streak * 0.1), capped at 2.0
   */
  calculateScoreDelta(difficulty: number, streak: number, isCorrect: boolean): number {
    if (!isCorrect) {
      return 0;
    }

    const base = 10;
    const difficultyWeight = difficulty * 2;
    const multiplier = Math.min(
      1 + streak * config.STREAK_MULTIPLIER_RATE,
      config.MAX_STREAK_MULTIPLIER
    );

    const scoreDelta = Math.floor(base * difficultyWeight * multiplier);
    return scoreDelta;
  }

  /**
   * Check if user state should be considered stale due to inactivity
   */
  isStateStale(lastActivityAt: Date): boolean {
    const now = new Date();
    const minutesSinceLastActivity =
      (now.getTime() - lastActivityAt.getTime()) / (1000 * 60);

    return minutesSinceLastActivity > this.inactivityDecayMinutes;
  }

  /**
   * Get fresh state for returning user after inactivity
   */
  getFreshStateAfterInactivity(userState: UserState): Partial<UserState> {
    return {
      streak: 0,
      confidenceBuffer: [],
      lastActivityAt: new Date(),
    };
  }
}

export default new AdaptiveDifficultyService();
