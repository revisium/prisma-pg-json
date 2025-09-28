import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped, OrderByConditions } from '../../../types';

describe('Deep Nested JSON Operations', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    createdAt: 'date',
  } as const;

  const testQuery = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedIds: string[],
    orderBy?: OrderByConditions<typeof fieldConfig>,
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy: orderBy || { createdAt: 'asc' },
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
          name: 'User1',
          data: {
            user: {
              profile: {
                name: 'Alice Profile',
                settings: { theme: 'dark' },
              },
              age: 35,
            },
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'User2',
          data: {
            user: {
              profile: {
                name: 'Bob Profile',
                settings: { theme: 'light' },
              },
              age: 30,
            },
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'User3',
          data: {
            user: {
              profile: {
                name: 'Charlie Profile',
                settings: { theme: 'dark' },
              },
              age: 25,
            },
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'User4',
          data: {
            user: {
              profile: {
                name: 'Diana Profile',
                settings: { theme: 'light' },
              },
              age: 40,
            },
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'User5',
          data: {
            user: {
              profile: {
                name: 'Eve Profile',
                settings: { theme: 'light' },
              },
              age: 28,
            },
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should handle deeply nested path operations', async () => {
    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'name'],
          string_contains: 'Profile',
        },
      },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          equals: 'dark',
        },
      },
      [ids.user1, ids.user3],
    );
  });

  it('should handle nested path with comparisons', async () => {
    await testQuery(
      {
        data: {
          path: ['user', 'age'],
          gte: 30,
        },
      },
      [ids.user1, ids.user2, ids.user4],
    );
  });

  it('should handle nested path string operations', async () => {
    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'name'],
          string_contains: 'Alice',
        },
      },
      [ids.user1],
    );

    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'name'],
          string_ends_with: 'Profile',
        },
      },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );
  });

  it('should handle multiple levels of nesting with various operators', async () => {
    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          string_contains: 'dark',
        },
      },
      [ids.user1, ids.user3],
    );

    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          not: 'dark',
        },
      },
      [ids.user2, ids.user4, ids.user5],
    );
  });

  it('should handle nested numeric fields', async () => {
    await testQuery(
      {
        data: {
          path: ['user', 'age'],
          lt: 30,
        },
      },
      [ids.user3, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['user', 'age'],
          gt: 30,
          lt: 40,
        },
      },
      [ids.user1],
    );
  });

  it('should handle nested case insensitive operations', async () => {
    await testQuery(
      {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          equals: 'DARK',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user3],
    );
  });
});
