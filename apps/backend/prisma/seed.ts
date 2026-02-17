import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice',
      password: hashedPassword,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob',
      password: hashedPassword,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      username: 'charlie',
      password: hashedPassword,
    },
  });

  console.log('Users created:', { user1, user2, user3 });

  // Create questions across all difficulty levels
  const questions = [
    // Difficulty 1
    {
      text: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      difficulty: 1,
      category: 'Math',
    },
    {
      text: 'What color is the sky on a clear day?',
      options: ['Green', 'Blue', 'Red', 'Yellow'],
      correctAnswer: 1,
      difficulty: 1,
      category: 'General',
    },
    // Difficulty 2
    {
      text: 'What is 7 × 8?',
      options: ['54', '56', '58', '60'],
      correctAnswer: 1,
      difficulty: 2,
      category: 'Math',
    },
    {
      text: 'Which planet is closest to the Sun?',
      options: ['Venus', 'Earth', 'Mercury', 'Mars'],
      correctAnswer: 2,
      difficulty: 2,
      category: 'Science',
    },
    // Difficulty 3
    {
      text: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2,
      difficulty: 3,
      category: 'Geography',
    },
    {
      text: 'Who wrote "Romeo and Juliet"?',
      options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
      correctAnswer: 1,
      difficulty: 3,
      category: 'Literature',
    },
    // Difficulty 4
    {
      text: 'What is the square root of 144?',
      options: ['10', '11', '12', '13'],
      correctAnswer: 2,
      difficulty: 4,
      category: 'Math',
    },
    {
      text: 'In which year did World War II end?',
      options: ['1943', '1944', '1945', '1946'],
      correctAnswer: 2,
      difficulty: 4,
      category: 'History',
    },
    // Difficulty 5
    {
      text: 'What is the chemical symbol for Gold?',
      options: ['Go', 'Gd', 'Au', 'Ag'],
      correctAnswer: 2,
      difficulty: 5,
      category: 'Science',
    },
    {
      text: 'Which programming language is known for its use in web browsers?',
      options: ['Python', 'Java', 'JavaScript', 'C++'],
      correctAnswer: 2,
      difficulty: 5,
      category: 'Technology',
    },
    // Difficulty 6
    {
      text: 'What is the derivative of x²?',
      options: ['x', '2x', 'x²', '2x²'],
      correctAnswer: 1,
      difficulty: 6,
      category: 'Math',
    },
    {
      text: 'Who painted the Mona Lisa?',
      options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'],
      correctAnswer: 1,
      difficulty: 6,
      category: 'Art',
    },
    // Difficulty 7
    {
      text: 'What is the speed of light in vacuum?',
      options: ['299,792,458 m/s', '300,000,000 m/s', '299,000,000 m/s', '298,792,458 m/s'],
      correctAnswer: 0,
      difficulty: 7,
      category: 'Physics',
    },
    {
      text: 'Which element has atomic number 79?',
      options: ['Silver', 'Platinum', 'Gold', 'Mercury'],
      correctAnswer: 2,
      difficulty: 7,
      category: 'Chemistry',
    },
    // Difficulty 8
    {
      text: 'What is the time complexity of QuickSort in average case?',
      options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
      correctAnswer: 1,
      difficulty: 8,
      category: 'Computer Science',
    },
    {
      text: 'In which year was the Treaty of Westphalia signed?',
      options: ['1618', '1638', '1648', '1658'],
      correctAnswer: 2,
      difficulty: 8,
      category: 'History',
    },
    // Difficulty 9
    {
      text: 'What is the integral of 1/x?',
      options: ['ln|x| + C', 'x² + C', '1/x² + C', 'e^x + C'],
      correctAnswer: 0,
      difficulty: 9,
      category: 'Math',
    },
    {
      text: 'Which philosopher wrote "Critique of Pure Reason"?',
      options: ['Hegel', 'Kant', 'Nietzsche', 'Descartes'],
      correctAnswer: 1,
      difficulty: 9,
      category: 'Philosophy',
    },
    // Difficulty 10
    {
      text: 'What is the Riemann Hypothesis concerned with?',
      options: [
        'Distribution of prime numbers',
        'Quantum mechanics',
        'General relativity',
        'Organic chemistry',
      ],
      correctAnswer: 0,
      difficulty: 10,
      category: 'Mathematics',
    },
    {
      text: 'Which quantum computing algorithm can factor large numbers efficiently?',
      options: ["Grover's algorithm", "Shor's algorithm", "Deutsch's algorithm", "Simon's algorithm"],
      correctAnswer: 1,
      difficulty: 10,
      category: 'Quantum Computing',
    },
  ];

  for (const question of questions) {
    await prisma.question.upsert({
      where: { id: question.text }, // Using text as temporary unique identifier
      update: {},
      create: question,
    }).catch(() => {
      // If upsert fails, try direct create
      return prisma.question.create({ data: question });
    });
  }

  console.log(`Seeded ${questions.length} questions`);

  // Initialize user states
  await prisma.userState.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      currentDifficulty: 1,
      streak: 0,
      maxStreak: 0,
      totalScore: 0,
      totalAnswered: 0,
      correctAnswers: 0,
      confidenceBuffer: [],
      lastActivityAt: new Date(),
      stateVersion: 0,
    },
  });

  await prisma.userState.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      currentDifficulty: 1,
      streak: 0,
      maxStreak: 0,
      totalScore: 0,
      totalAnswered: 0,
      correctAnswers: 0,
      confidenceBuffer: [],
      lastActivityAt: new Date(),
      stateVersion: 0,
    },
  });

  await prisma.userState.upsert({
    where: { userId: user3.id },
    update: {},
    create: {
      userId: user3.id,
      currentDifficulty: 1,
      streak: 0,
      maxStreak: 0,
      totalScore: 0,
      totalAnswered: 0,
      correctAnswers: 0,
      confidenceBuffer: [],
      lastActivityAt: new Date(),
      stateVersion: 0,
    },
  });

  console.log('User states initialized');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
