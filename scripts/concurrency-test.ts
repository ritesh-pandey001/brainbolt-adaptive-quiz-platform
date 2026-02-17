/**
 * Concurrency Test - Verify Optimistic Locking
 * 
 * This test simulates two concurrent answer submissions with the same stateVersion
 * to verify that optimistic locking prevents race conditions.
 */

import { randomUUID } from 'crypto';

interface SubmitAnswerRequest {
  userId: string;
  questionId: string;
  selectedAnswer: number;
  answerIdempotencyKey: string;
  stateVersion: number;
}

interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctAnswer: number;
  scoreDelta: number;
  newScore: number;
  newStreak: number;
  newDifficulty: number;
  userRank?: number;
  stateVersion: number;
}

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function submitAnswer(request: SubmitAnswerRequest): Promise<Response> {
  return fetch(`${API_URL}/v1/quiz/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

async function getNextQuestion(userId: string): Promise<any> {
  const response = await fetch(`${API_URL}/v1/quiz/next?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to get next question: ${response.statusText}`);
  }
  return response.json();
}

async function runConcurrencyTest() {
  console.log('🧪 Starting Concurrency Test...\n');

  // Use alice from seeded data
  const testUserId = 'be5aa44a-6511-4214-9751-8f1004af5b0d';
  
  try {
    // Get a question to establish baseline state
    console.log('1️⃣ Getting initial question...');
    const questionData = await getNextQuestion(testUserId);
    console.log(`   ✅ Got question, stateVersion: ${questionData.stateVersion}`);
    
    const stateVersion = questionData.stateVersion;
    const questionId = questionData.question.id;

    // Create two requests with SAME stateVersion but DIFFERENT idempotency keys
    const request1: SubmitAnswerRequest = {
      userId: testUserId,
      questionId,
      selectedAnswer: 0,
      answerIdempotencyKey: randomUUID(),
      stateVersion,
    };

    const request2: SubmitAnswerRequest = {
      userId: testUserId,
      questionId,
      selectedAnswer: 0,
      answerIdempotencyKey: randomUUID(),
      stateVersion, // SAME VERSION
    };

    console.log('\n2️⃣ Firing two concurrent requests with same stateVersion...');
    console.log(`   Request 1: idempotencyKey=${request1.answerIdempotencyKey}`);
    console.log(`   Request 2: idempotencyKey=${request2.answerIdempotencyKey}`);
    
    // Fire both requests in parallel
    const [response1, response2] = await Promise.all([
      submitAnswer(request1),
      submitAnswer(request2),
    ]);

    const status1 = response1.status;
    const status2 = response2.status;

    console.log(`\n3️⃣ Results:`);
    console.log(`   Response 1: ${status1} ${response1.statusText}`);
    console.log(`   Response 2: ${status2} ${response2.statusText}`);

    // One should succeed (200), one should fail with conflict (409) or bad request (400)
    const successCount = [status1, status2].filter(s => s === 200).length;
    const conflictCount = [status1, status2].filter(s => s === 409).length;
    const badRequestCount = [status1, status2].filter(s => s === 400).length;
    const rejectedCount = conflictCount + badRequestCount;

    console.log(`\n4️⃣ Analysis:`);
    console.log(`   Success (200): ${successCount}`);
    console.log(`   Rejected (409/400): ${rejectedCount}`);

    // Validation
    if (successCount === 1 && rejectedCount === 1) {
      console.log('\n✅ CONCURRENCY TEST PASSED!');
      console.log('   Optimistic locking correctly prevented race condition.');
      console.log('   One request succeeded, one was rejected.');
      return true;
    } else {
      console.log('\n❌ CONCURRENCY TEST FAILED!');
      console.log('   Expected: 1 success + 1 rejected');
      console.log(`   Got: ${successCount} success + ${rejectedCount} rejected`);
      
      // Show response bodies for debugging
      const body1 = await response1.json();
      const body2 = await response2.json();
      console.log('\n   Response 1 body:', JSON.stringify(body1, null, 2));
      console.log('   Response 2 body:', JSON.stringify(body2, null, 2));
      
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
runConcurrencyTest()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
