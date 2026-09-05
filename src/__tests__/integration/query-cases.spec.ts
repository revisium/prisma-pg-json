import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { buildQuery, configurePrisma } from '../../index';
import type { QueryCase } from '../dsl/query-case';
import { allQueryCases, unsupportedQueryCases } from '../dsl/all-cases';

describe('query cases: PostgreSQL results', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
    }),
  });

  beforeAll(async () => {
    configurePrisma(Prisma);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function executeCase({ rows, query }: QueryCase): Promise<unknown> {
    // The CTE shadows any physical users table; fixtures and queries are SELECT-only.
    const sql = Prisma.sql`
      WITH "users" AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          AS fixture(
            id text, name text, age integer, "isActive" boolean,
            "createdAt" timestamptz, data jsonb
          )
      )
      ${buildQuery(query)}
    `;

    return prisma.$queryRaw(sql);
  }

  it.each(allQueryCases)('$name', async (scenario) => {
    expect(await executeCase(scenario)).toEqual(scenario.expected.rows);
  });

  it.each(unsupportedQueryCases)('unsupported combination: $name', (scenario) => {
    expect(() => buildQuery(scenario.query)).toThrow(
      'No operators in filter support empty path operations',
    );
  });
});
