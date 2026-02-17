/**
 * Atomicity Test - Verify Transaction Rollback
 * 
 * This test verifies that if any part of the answer submission fails,
 * the entire transaction is rolled back and no partial data is written.
 */

import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function getNextQuestion(userId: string): Promise<any> {
  const response = await fetch(`${API_URL}/v1/quiz/next?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to get next question: ${response.statusText}`);
  }
  return response.json();
}

async function submitAnswer(request: any): Promise<Response> {
  return fetch(`${API_URL}/v1/quiz/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

async function getMetrics(userId: string): Promise<any> {
  const response = await fetch(`${API_URL}/v1/quiz/metrics?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to get metrics: ${response.statusText}`);
  }
  return response.json();
}

async function runAtomicityTest() {
  console.log('🧪 Starting Atomicity Test...\n');

  // Use bob from seeded data
  const testUserId = 'd693ac68-7c7d-445b-bc70-2bc3dfda695e';
  
  try {
    // Test 1: Submit a valid answer
    console.log('1️⃣ Submitting valid answer...');
    const questionData1 = await getNextQuestion(testUserId);
    const initialScore = questionData1.totalScore;
    const initialVersion = questionData1.stateVersion;
    
    const validRequest = {
      userId: testUserId,
      questionId: questionData1.question.id,
      selectedAnswer: 1, // Select option 1 (arbitrary choice for test)
      answerIdempotencyKey: randomUUID(),
      stateVersion: initialVersion,
    };

    const validResponse = await submitAnswer(validRequest);
    const validResult = (await validResponse.json()) as any;
    
    if (validResponse.status !== 200) {
      throw new Error(`Valid submission failed: ${JSON.stringify(validResult)}`);
    }
    
    console.log(`   ✅ Valid answer accepted`);
    console.log(`   Score before: ${initialScore}, after: ${validResult.newScore}`);
    console.log(`   Version before: ${initialVersion}, after: ${validResult.stateVersion}`);

    // Test 2: Attempt submission with OLD version (should fail with rollback)
    console.log('\n2️⃣ Attempting submission with stale version (should fail)...');
    
    const staleRequest = {
      userId: testUserId,
      questionId: questionData1.question.id,
      selectedAnswer: 0,
      answerIdempotencyKey: randomUUID(), // Different key
      stateVersion: initialVersion, // OLD VERSION
    };

    const staleResponse = await submitAnswer(staleRequest);
    const staleResult = (await staleResponse.json()) as any;
    
    console.log(`   Response status: ${staleResponse.status}`);
    
    if (staleResponse.status !== 409) {
      console.log('   ❌ Expected 409 Conflict, got:', staleResponse.status);
      console.log('   Response:', JSON.stringify(staleResult, null, 2));
      return false;
    }
    
    console.log('   ✅ Stale version correctly rejected with 409 Conflict');
    console.log(`   Error message: ${staleResult.message}`);

    // Test 3: Verify no partial data was written
    console.log('\n3️⃣ Verifying no partial data from failed request...');
    
    const metricsAfterFail = await getMetrics(testUserId);
    
    console.log(`   Current score: ${metricsAfterFail.totalScore}`);
    console.log(`   Expected score: ${validResult.newScore}`);
    console.log(`   Total answered: ${metricsAfterFail.totalAnswered}`);
    
    // Score should NOT have changed from the failed request
    if (metricsAfterFail.totalScore !== validResult.newScore) {
      console.log('   ❌ Score changed after failed request! Partial write detected!');
      return false;
    }
    
    // Total answered should remain at the count after the first valid submission
    const expectedTotalAnswered = validResult.stateVersion; // stateVersion increments with each successful answer
    if (metricsAfterFail.totalAnswered !== expectedTotalAnswered) {
      console.log(`   ❌ totalAnswered is ${metricsAfterFail.totalAnswered}, expected ${expectedTotalAnswered}`);
      console.log('   Failed request may have partially written data!');
      return false;
    }
    
    console.log('   ✅ No partial data written - transaction rolled back correctly');

    // Test 4: Submit another valid answer to confirm system still works
    console.log('\n4️⃣ Submitting another valid answer to confirm system recovery...');
    
    const questionData2 = await getNextQuestion(testUserId);
    const currentScore = questionData2.totalScore;
    const currentVersion = questionData2.stateVersion;
    
    const secondValidRequest = {
      userId: testUserId,
      questionId: questionData2.question.id,
      selectedAnswer: 1, // Select option 1
      answerIdempotencyKey: randomUUID(),
      stateVersion: currentVersion,
    };

    const secondValidResponse = await submitAnswer(secondValidRequest);
    const secondValidResult = (await secondValidResponse.json()) as any;
    
    if (secondValidResponse.status !== 200) {
      throw new Error(`Second valid submission failed: ${JSON.stringify(secondValidResult)}`);
    }
    
    console.log('   ✅ Second answer accepted - system functioning normally');
    console.log(`   Score: ${currentScore} → ${secondValidResult.newScore}`);
    console.log(`   Version: ${currentVersion} → ${secondValidResult.stateVersion}`);

    console.log('\n✅ ATOMICITY TEST PASSED!');
    console.log('   Transaction rollback works correctly');
    console.log('   No partial data written on failure');
    console.log('   System recovers properly after failed request');
    return true;

  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
runAtomicityTest()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
