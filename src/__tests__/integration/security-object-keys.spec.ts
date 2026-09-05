import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { configurePrisma } from '../../prisma-adapter';
import { generateArrayCondition } from '../../where/json/jsonpath/array-operations';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

beforeAll(async () => {
  configurePrisma(Prisma);
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('array_contains literal object keys on PostgreSQL', () => {
  it.each([
    'role',
    'role.name',
    'role"name',
    'role\\name',
    'role\n\r\t\b\f',
    '',
    'role == "user" || @.role',
  ])('matches only the literal member %j', async (key) => {
    const condition = generateArrayCondition(Prisma.sql`data`, '$.items', 'array_contains', [
      { [key]: 'admin' },
    ]);
    const matching = JSON.stringify({ items: [{ [key]: 'admin' }] });
    const different = JSON.stringify({ items: [{ role: 'user', other: 'admin' }] });
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT id FROM (VALUES
        (1, ${matching}::jsonb),
        (2, ${different}::jsonb)
      ) AS records(id, data)
      WHERE ${condition}
      ORDER BY id
    `);

    expect(rows).toEqual([{ id: 1 }]);
  });
});
