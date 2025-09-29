import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped, OrderByConditions } from '../../../types';

describe('JSON Path in/notIn Operations', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    name: 'string',
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

    const results = await prisma.$queryRaw<Array<{ id: string; name: string }>>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id)).toEqual(expectedIds);
    return results;
  };


  const testQueryWithNames = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedNames: string[],
    orderBy?: OrderByConditions<typeof fieldConfig>,
  ) => {
    const expectedIds = expectedNames.map((name) => {
      const userKey = name.toLowerCase().replace('user', 'user');
      return ids[userKey];
    });
    const results = await testQuery(where, expectedIds, orderBy);
    expect(results.map((r) => r.name)).toEqual(expectedNames);
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
            status: 'active',
            role: 'admin',
            priority: 1,
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'User2',
          data: {
            status: 'pending',
            role: 'user',
            priority: 2,
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'User3',
          data: {
            status: 'active',
            role: 'moderator',
            priority: 3,
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'User4',
          data: {
            status: 'inactive',
            role: 'user',
            priority: 1,
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'User5',
          data: {
            status: 'banned',
            role: 'user',
            priority: 5,
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('in operator', () => {
    it('should find records with status in list', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['status'],
            in: ['active', 'pending'],
          },
        },
        ['User1', 'User2', 'User3'],
      );
    });

    it('should find records with priority in list', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['priority'],
            in: [1, 2, 3],
          },
        },
        ['User1', 'User2', 'User3', 'User4'],
      );
    });

    it('should return empty for empty in list', async () => {
      await testQuery({ data: { path: ['status'], in: [] } }, []);
    });

    it('should handle single value in list', async () => {
      await testQueryWithNames({ data: { path: ['role'], in: ['admin'] } }, ['User1']);
    });
  });

  describe('notIn operator', () => {
    it('should find records with status not in list', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['status'],
            notIn: ['active', 'pending'],
          },
        },
        ['User4', 'User5'],
      );
    });

    it('should find records with priority not in list', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['priority'],
            notIn: [1, 5],
          },
        },
        ['User2', 'User3'],
      );
    });

    it('should return all records for empty notIn list', async () => {
      await testQuery({ data: { path: ['status'], notIn: [] } }, [
        ids.user1,
        ids.user2,
        ids.user3,
        ids.user4,
        ids.user5,
      ]);
    });

    it('should handle single value not in list', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['role'],
            notIn: ['admin'],
          },
        },
        ['User2', 'User3', 'User4', 'User5'],
      );
    });
  });

  describe('Combined with other filters', () => {
    it('should combine in with other conditions', async () => {
      await testQuery(
        {
          data: {
            path: ['status'],
            in: ['active', 'pending', 'inactive'],
          },
          name: { contains: 'User' },
        },
        [ids.user1, ids.user2, ids.user3, ids.user4],
      );
    });
  });
});
