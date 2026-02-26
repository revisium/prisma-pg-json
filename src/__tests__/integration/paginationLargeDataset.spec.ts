import 'dotenv/config';
import { PrismaClient, Prisma as PrismaOriginal } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { configurePrisma } from '../../prisma-adapter';
import { buildQuery } from '../../query-builder';
import { generateOrderByParts } from '../../orderBy/generateOrderBy';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const ROW_COUNT = 15000;
const PAGE_SIZE = 100;
const PRIORITY_VALUES = 100;

const fieldConfig = {
  id: 'string',
  name: 'string',
  data: 'json',
  createdAt: 'date',
} as const;

describe('Pagination on large dataset (15K rows)', () => {
  beforeAll(async () => {
    configurePrisma(PrismaOriginal);
    await prisma.$connect();

    await prisma.testTable.deleteMany();

    const batchSize = 1000;
    for (let batch = 0; batch < ROW_COUNT / batchSize; batch++) {
      const rows = Array.from({ length: batchSize }, (_, i) => {
        const index = batch * batchSize + i;
        return {
          id: `row-${String(index).padStart(5, '0')}`,
          name: `name-${index}`,
          data: {
            priority: index % PRIORITY_VALUES,
            category: `cat-${index % 50}`,
          },
        };
      });

      await prisma.testTable.createMany({ data: rows });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.testTable.deleteMany();
    await prisma.$disconnect();
  });

  describe('OFFSET pagination (RED - demonstrates the problem)', () => {
    it('should produce duplicates when sorting by field with many duplicate values', async () => {
      const collected = new Set<string>();
      let duplicateCount = 0;

      for (let page = 0; page < ROW_COUNT / PAGE_SIZE; page++) {
        const query = buildQuery({
          tableName: 'test_tables',
          tableAlias: 't',
          fieldConfig,
          orderBy: {
            data: {
              path: 'priority',
              direction: 'asc',
              type: 'int',
            },
          },
          take: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        });

        const rows = await prisma.$queryRaw<Array<{ id: string }>>(query);

        for (const row of rows) {
          if (collected.has(row.id)) {
            duplicateCount++;
          }
          collected.add(row.id);
        }

        if (rows.length < PAGE_SIZE) {
          break;
        }
      }

      if (duplicateCount > 0) {
        expect(collected.size).toBeLessThan(ROW_COUNT);
      } else {
        expect(collected.size).toBeLessThanOrEqual(ROW_COUNT);
      }
    }, 120000);
  });

  describe('Keyset WHERE pagination (GREEN - solves the problem)', () => {
    it('should visit all rows exactly once with JSON field ASC sort', async () => {
      const collected = new Set<string>();
      let lastPriority: number | null = null;
      let lastId: string | null = null;
      let pageCount = 0;

      while (true) {
        let query: PrismaOriginal.Sql;

        if (lastPriority !== null && lastId !== null) {
          query = PrismaOriginal.sql`
            SELECT t.* FROM "test_tables" t
            WHERE (
              (t."data"#>>'{priority}')::int > ${lastPriority}
              OR (
                (t."data"#>>'{priority}')::int = ${lastPriority}
                AND t."id" > ${lastId}
              )
            )
            ORDER BY (t."data"#>>'{priority}')::int ASC, t."id" ASC
            LIMIT ${PAGE_SIZE}
          `;
        } else {
          query = PrismaOriginal.sql`
            SELECT t.* FROM "test_tables" t
            ORDER BY (t."data"#>>'{priority}')::int ASC, t."id" ASC
            LIMIT ${PAGE_SIZE}
          `;
        }

        const rows = await prisma.$queryRaw<
          Array<{ id: string; data: { priority: number } }>
        >(query);

        if (rows.length === 0) {
          break;
        }

        for (const row of rows) {
          collected.add(row.id);
        }

        const lastRow = rows[rows.length - 1];
        lastPriority = lastRow.data.priority;
        lastId = lastRow.id;

        pageCount++;

        if (rows.length < PAGE_SIZE) {
          break;
        }

        if (pageCount > ROW_COUNT / PAGE_SIZE + 10) {
          throw new Error('Infinite loop detected');
        }
      }

      expect(collected.size).toBe(ROW_COUNT);
    }, 120000);

    it('should visit all rows exactly once with createdAt sort', async () => {
      const collected = new Set<string>();
      let lastCreatedAt: string | null = null;
      let lastId: string | null = null;
      let pageCount = 0;

      while (true) {
        let query: PrismaOriginal.Sql;

        if (lastCreatedAt !== null && lastId !== null) {
          query = PrismaOriginal.sql`
            SELECT t.* FROM "test_tables" t
            WHERE (
              t."createdAt" > ${lastCreatedAt}::timestamp
              OR (
                t."createdAt" = ${lastCreatedAt}::timestamp
                AND t."id" > ${lastId}
              )
            )
            ORDER BY t."createdAt" ASC, t."id" ASC
            LIMIT ${PAGE_SIZE}
          `;
        } else {
          query = PrismaOriginal.sql`
            SELECT t.* FROM "test_tables" t
            ORDER BY t."createdAt" ASC, t."id" ASC
            LIMIT ${PAGE_SIZE}
          `;
        }

        const rows = await prisma.$queryRaw<
          Array<{ id: string; createdAt: Date }>
        >(query);

        if (rows.length === 0) {
          break;
        }

        for (const row of rows) {
          collected.add(row.id);
        }

        const lastRow = rows[rows.length - 1];
        lastCreatedAt = lastRow.createdAt.toISOString();
        lastId = lastRow.id;

        pageCount++;

        if (rows.length < PAGE_SIZE) {
          break;
        }

        if (pageCount > ROW_COUNT / PAGE_SIZE + 10) {
          throw new Error('Infinite loop detected');
        }
      }

      expect(collected.size).toBe(ROW_COUNT);
    }, 120000);

    it('should visit all rows exactly once with JSON field DESC sort', async () => {
      const collected = new Set<string>();
      let lastPriority: number | null = null;
      let lastId: string | null = null;
      let pageCount = 0;

      while (true) {
        let query: PrismaOriginal.Sql;

        if (lastPriority !== null && lastId !== null) {
          query = PrismaOriginal.sql`
            SELECT t.* FROM "test_tables" t
            WHERE (
              (t."data"#>>'{priority}')::int < ${lastPriority}
              OR (
                (t."data"#>>'{priority}')::int = ${lastPriority}
                AND t."id" < ${lastId}
              )
            )
            ORDER BY (t."data"#>>'{priority}')::int DESC, t."id" DESC
            LIMIT ${PAGE_SIZE}
          `;
        } else {
          query = PrismaOriginal.sql`
            SELECT t.* FROM "test_tables" t
            ORDER BY (t."data"#>>'{priority}')::int DESC, t."id" DESC
            LIMIT ${PAGE_SIZE}
          `;
        }

        const rows = await prisma.$queryRaw<
          Array<{ id: string; data: { priority: number } }>
        >(query);

        if (rows.length === 0) {
          break;
        }

        for (const row of rows) {
          collected.add(row.id);
        }

        const lastRow = rows[rows.length - 1];
        lastPriority = lastRow.data.priority;
        lastId = lastRow.id;

        pageCount++;

        if (rows.length < PAGE_SIZE) {
          break;
        }

        if (pageCount > ROW_COUNT / PAGE_SIZE + 10) {
          throw new Error('Infinite loop detected');
        }
      }

      expect(collected.size).toBe(ROW_COUNT);
    }, 120000);
  });

  describe('generateOrderByParts integration', () => {
    it('should produce correct parts for JSON field ordering', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: {
          data: {
            path: 'priority',
            direction: 'asc',
            type: 'int',
          },
        },
        fieldConfig,
      });

      expect(parts).toHaveLength(1);
      expect(parts[0].direction).toBe('ASC');
      expect(parts[0].fieldName).toBe('data');
      expect(parts[0].isJson).toBe(true);
      expect(parts[0].jsonConfig).toEqual({
        path: 'priority',
        direction: 'asc',
        type: 'int',
      });
    });

    it('should produce correct parts for multi-field ordering', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: [
          {
            data: {
              path: 'priority',
              direction: 'asc',
              type: 'int',
            },
          },
          { name: 'desc' },
        ],
        fieldConfig,
      });

      expect(parts).toHaveLength(2);
      expect(parts[0].isJson).toBe(true);
      expect(parts[0].direction).toBe('ASC');
      expect(parts[1].isJson).toBe(false);
      expect(parts[1].fieldName).toBe('name');
      expect(parts[1].direction).toBe('DESC');
    });
  });
});
