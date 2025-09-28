import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../query-builder';
import { WhereConditionsTyped } from '../../types';

describe('Logical Operators', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    isActive: 'boolean',
    id: 'string',
    createdAt: 'date',
    age: 'number',
    name: 'string',
    data: 'json',
  } as const;

  const testQuery = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedIds: string[],
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where,
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id)).toEqual(expectedIds);
  };

  beforeEach(async () => {
    ids = {
      logic1: nanoid(),
      logic2: nanoid(),
      logic3: nanoid(),
      logic4: nanoid(),
    };
    await prisma.testTable.createMany({
      data: [
        {
          id: ids.logic1,
          name: 'Alice',
          age: 25,
          isActive: true,
          data: {
            department: 'Engineering',
            salary: 75000,
            skills: ['JavaScript', 'TypeScript'],
            manager: { name: 'John', level: 'Senior' },
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.logic2,
          name: 'Bob',
          age: 30,
          isActive: false,
          data: {
            department: 'Marketing',
            salary: 65000,
            skills: ['Marketing', 'Sales'],
            manager: { name: 'Jane', level: 'Senior' },
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.logic3,
          name: 'Charlie',
          age: 35,
          isActive: true,
          data: {
            department: 'Engineering',
            salary: 85000,
            skills: ['Python', 'TypeScript'],
            manager: { name: 'John', level: 'Senior' },
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.logic4,
          name: 'Diana',
          age: 28,
          isActive: true,
          data: {
            department: 'Design',
            salary: 70000,
            skills: ['Design', 'UX'],
            manager: { name: 'Sarah', level: 'Lead' },
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('AND Logic', () => {
    it('should handle multiple conditions with implicit AND', async () => {
      await testQuery(
        {
          age: { gte: 25 },
          isActive: true,
        },
        [ids.logic1, ids.logic3, ids.logic4],
      );
    });

    it('should handle explicit AND array', async () => {
      await testQuery(
        {
          AND: [
            { age: { gte: 30 } },
            {
              data: {
                path: ['department'],
                equals: 'Engineering',
              },
            },
          ],
        },
        [ids.logic3],
      );
    });

    it('should handle nested AND conditions', async () => {
      await testQuery(
        {
          AND: [
            { isActive: true },
            {
              AND: [
                {
                  data: {
                    path: ['salary'],
                    gte: 70000,
                  },
                },
                {
                  data: {
                    path: ['department'],
                    equals: 'Engineering',
                  },
                },
              ],
            },
          ],
        },
        [ids.logic1, ids.logic3],
      );
    });
  });

  describe('OR Logic', () => {
    it('should handle OR with different data types', async () => {
      await testQuery(
        {
          OR: [{ age: { lt: 27 } }, { name: 'Bob' }],
        },
        [ids.logic1, ids.logic2],
      );
    });

    it('should handle OR with string operations', async () => {
      await testQuery(
        {
          OR: [
            { name: { contains: 'ice' } },
            {
              data: {
                path: ['department'],
                equals: 'Design',
              },
            },
          ],
        },
        [ids.logic1, ids.logic4],
      );
    });

    it('should handle empty OR array', async () => {
      await testQuery(
        {
          name: { contains: 'a' },
          OR: [],
        },
        [ids.logic3, ids.logic4],
      );
    });
  });

  describe('NOT Logic', () => {
    it('should handle NOT with string operations', async () => {
      await testQuery(
        {
          NOT: {
            name: { contains: 'a' },
          },
        },
        [ids.logic1, ids.logic2],
      );
    });

    it('should handle NOT with numeric comparisons', async () => {
      await testQuery(
        {
          NOT: {
            age: { gte: 30 },
          },
        },
        [ids.logic1, ids.logic4],
      );
    });

    it('should handle NOT with JSON filters', async () => {
      await testQuery(
        {
          NOT: {
            data: {
              path: ['department'],
              equals: 'Engineering',
            },
          },
        },
        [ids.logic2, ids.logic4],
      );
    });
  });

  describe('Complex Logical Combinations', () => {
    it('should handle deeply nested logical combinations', async () => {
      await testQuery(
        {
          AND: [
            {
              OR: [{ age: { lt: 30 } }, { isActive: false }],
            },
            {
              NOT: {
                data: {
                  path: ['department'],
                  equals: 'Design',
                },
              },
            },
          ],
        },
        [ids.logic1, ids.logic2],
      );
    });

    it('should handle multiple OR conditions with AND', async () => {
      await testQuery(
        {
          isActive: true,
          OR: [
            {
              AND: [
                { name: { startsWith: 'A' } },
                {
                  data: {
                    path: ['salary'],
                    gte: 70000,
                  },
                },
              ],
            },
            {
              data: {
                path: ['department'],
                equals: 'Design',
              },
            },
          ],
        },
        [ids.logic1, ids.logic4],
      );
    });

    it('should handle array of NOT conditions', async () => {
      await testQuery(
        {
          NOT: [{ age: { lt: 27 } }, { name: 'Charlie' }],
        },
        [ids.logic1, ids.logic2, ids.logic3, ids.logic4],
      );
    });
  });
});
