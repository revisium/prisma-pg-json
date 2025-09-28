import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('Basic JSON Path Operations', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    meta: 'json',
    createdAt: 'date',
  } as const;

  const testQuery = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedIds: string[],
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy: { createdAt: 'asc' },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id)).toEqual(expectedIds);
  };


  beforeEach(async () => {
    ids = {
      user1: nanoid(),
      user2: nanoid(),
      user3: nanoid(),
      user4: nanoid(),
      user5: nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids.user1,
          name: 'Alice',
          data: {
            name: 'Alice',
            age: 35,
            title: 'Senior Developer',
            category: 'admin',
            isActive: true,
            user: {
              profile: {
                settings: {
                  theme: 'dark',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'Bob',
          data: {
            name: 'Bob',
            age: 30,
            title: 'Developer',
            category: 'user',
            isActive: true,
            user: {
              profile: {
                settings: {
                  theme: 'light',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'Charlie',
          data: {
            name: 'Charlie',
            age: 25,
            title: 'Junior Developer',
            category: 'user',
            isActive: false,
            user: {
              profile: {
                settings: {
                  theme: 'dark',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'Diana',
          data: {
            name: 'Diana',
            age: 28,
            title: 'QA Engineer',
            category: 'admin',
            isActive: false,
            user: {
              profile: {
                settings: {
                  theme: 'light',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'Eve',
          data: {
            name: 'Eve',
            age: 32,
            title: 'DevOps Engineer',
            category: 'user',
            isActive: true,
            user: {
              profile: {
                settings: {
                  theme: 'light',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should handle JSON path equals operations', async () => {
    await testQuery({ data: { path: ['name'], equals: 'Alice' } }, [ids.user1]);
    await testQuery({ data: { path: ['age'], equals: 35 } }, [ids.user1]);
    await testQuery({ data: { path: ['age'], equals: 30 } }, [ids.user2]);
    await testQuery({ data: { path: ['isActive'], equals: true } }, [
      ids.user1,
      ids.user2,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['isActive'], equals: false } }, [
      ids.user3,
      ids.user4,
    ]);
    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'settings'],
          equals: { theme: 'dark' },
        },
      },
      [ids.user1, ids.user3],
    );
  });

  it('should handle JSON string operations', async () => {
    await testQuery({ data: { path: ['title'], string_contains: 'Developer' } }, [
      ids.user1,
      ids.user2,
      ids.user3,
    ]);
    await testQuery({ data: { path: ['title'], string_starts_with: 'Senior' } }, [ids.user1]);
    await testQuery({ data: { path: ['title'], string_ends_with: 'Developer' } }, [
      ids.user1,
      ids.user2,
      ids.user3,
    ]);
  });

  it('should handle JSON numeric comparisons', async () => {
    await testQuery({ data: { path: ['age'], gt: 30 } }, [ids.user1, ids.user5]);
    await testQuery({ data: { path: ['age'], gte: 30 } }, [
      ids.user1,
      ids.user2,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['age'], lt: 30 } }, [ids.user3, ids.user4]);
    await testQuery({ data: { path: ['age'], lte: 30 } }, [
      ids.user2,
      ids.user3,
      ids.user4,
    ]);
    await testQuery({ data: { path: ['age'], gt: 25, lt: 35 } }, [
      ids.user2,
      ids.user4,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['age'], gte: 25, lte: 35 } }, [
      ids.user1,
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
  });

  it('should handle JSON not operation', async () => {
    await testQuery({ data: { path: ['name'], not: 'Alice' } }, [
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['category'], not: 'admin' } }, [
      ids.user2,
      ids.user3,
      ids.user5,
    ]);
  });

  it('should handle JSON case insensitive mode', async () => {
    await testQuery(
      {
        data: { path: ['name'], equals: 'alice', mode: 'insensitive' },
      },
      [ids.user1],
    );
    await testQuery(
      {
        data: {
          path: ['title'],
          string_contains: 'DEVELOPER',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user2, ids.user3],
    );
    await testQuery(
      {
        data: {
          path: ['title'],
          string_starts_with: 'SENIOR',
          mode: 'insensitive',
        },
      },
      [ids.user1],
    );
    await testQuery(
      {
        data: {
          path: ['title'],
          string_ends_with: 'DEVELOPER',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user2, ids.user3],
    );
  });

  it('should handle meta field operations', async () => {
    await testQuery({ meta: { path: [], equals: {} } }, [
      ids.user1,
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
  });
});
