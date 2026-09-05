import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { configurePrisma } from '../../prisma-adapter';
import { buildQuery } from '../../query-builder';

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

describe('SQL identifier isolation on PostgreSQL', () => {
  const key = 'name" = $1 OR true OR t."name';
  const fixture = Prisma.sql`WITH users (id, name, "name"" = $1 OR true OR t.""name") AS (
    VALUES (1, 'Alice', 'match'), (2, 'Bob', 'other')
  )`;

  it('matches the literal configured column instead of injecting OR true', async () => {
    const query = buildQuery({
      tableName: 'users', tableAlias: 't', fields: ['id'],
      fieldConfig: { [key]: 'string' }, where: { [key]: 'match' },
    });
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`${fixture} ${query}`);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('preserves identifier isolation when fieldConfig is omitted', async () => {
    const query = buildQuery({
      tableName: 'users', tableAlias: 't', fields: ['id'], where: { [key]: 'match' },
    });
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`${fixture} ${query}`);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('sorts a literal column containing SQL syntax', async () => {
    const query = buildQuery({
      tableName: 'users', tableAlias: 't', fields: ['id'],
      fieldConfig: { [key]: 'string' }, orderBy: { [key]: 'desc' },
    });
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`${fixture} ${query}`);
    expect(rows).toEqual([{ id: 2 }, { id: 1 }]);
  });
});
