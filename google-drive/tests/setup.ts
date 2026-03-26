import { beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import prisma from '../src/server/db';
import { resetRateLimiters } from '../src/server/middleware/rateLimit';

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    stdio: 'pipe',
  });
});

beforeEach(async () => {
  // Clean all tables before each test
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
  // Reset rate limiters so tests don't interfere with each other
  resetRateLimiters();
});

afterAll(async () => {
  await prisma.$disconnect();
});
