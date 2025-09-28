import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.testTable.deleteMany();
});
