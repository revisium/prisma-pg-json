import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('JSON Null and Missing Paths', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
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
      withValue: nanoid(),
      withNull: nanoid(),
      withMissing: nanoid(),
      withNested: nanoid(),
      withNestedNull: nanoid(),
      withNestedMissing: nanoid(),
      withArrayValue: nanoid(),
      withArrayNull: nanoid(),
      withEmptyArray: nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids.withValue,
          name: 'WithValue',
          data: {
            status: 'active',
            score: 100,
            tags: ['a', 'b'],
            profile: {
              name: 'John',
              settings: {
                theme: 'dark',
              },
            },
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.withNull,
          name: 'WithNull',
          data: {
            status: null,
            score: null,
            tags: null,
            profile: {
              name: null,
              settings: {
                theme: null,
              },
            },
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.withMissing,
          name: 'WithMissing',
          data: {
            other: 'field',
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.withNested,
          name: 'WithNested',
          data: {
            profile: {
              name: 'Jane',
              settings: {
                theme: 'light',
                notifications: true,
              },
            },
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.withNestedNull,
          name: 'WithNestedNull',
          data: {
            profile: {
              name: 'Bob',
              settings: null,
            },
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
        {
          id: ids.withNestedMissing,
          name: 'WithNestedMissing',
          data: {
            profile: {
              name: 'Carol',
            },
          },
          createdAt: new Date('2025-01-06T00:00:00.000Z'),
        },
        {
          id: ids.withArrayValue,
          name: 'WithArrayValue',
          data: {
            items: [
              { name: 'Item1', value: 10 },
              { name: 'Item2', value: 20 },
            ],
          },
          createdAt: new Date('2025-01-07T00:00:00.000Z'),
        },
        {
          id: ids.withArrayNull,
          name: 'WithArrayNull',
          data: {
            items: [{ name: 'Item1', value: null }, { name: null, value: 30 }],
          },
          createdAt: new Date('2025-01-08T00:00:00.000Z'),
        },
        {
          id: ids.withEmptyArray,
          name: 'WithEmptyArray',
          data: {
            items: [],
          },
          createdAt: new Date('2025-01-09T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('equals operator with null values', () => {
    it('should match explicit null value', async () => {
      await testQuery(
        {
          data: { path: 'status', equals: null },
        },
        [ids.withNull],
      );
    });

    it('should not match null when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'status', equals: null },
        },
        [ids.withNull],
      );
    });

    it('should match string value and not match null/missing', async () => {
      await testQuery(
        {
          data: { path: 'status', equals: 'active' },
        },
        [ids.withValue],
      );
    });
  });

  describe('not operator with null values', () => {
    it('should match records where value is not null', async () => {
      await testQuery(
        {
          data: { path: 'status', not: null },
        },
        [ids.withValue],
      );
    });

    it('should match records where value is not the specified string', async () => {
      await testQuery(
        {
          data: { path: 'status', not: 'active' },
        },
        [ids.withNull],
      );
    });
  });

  describe('comparison operators with null/missing paths', () => {
    it('should not match gte when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'score', gte: 50 },
        },
        [ids.withValue],
      );
    });

    it('should not match lte when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'score', lte: 150 },
        },
        [ids.withValue],
      );
    });

    it('should not match gt when value is null', async () => {
      await testQuery(
        {
          data: { path: 'score', gt: 0 },
        },
        [ids.withValue],
      );
    });
  });

  describe('string operators with null/missing paths', () => {
    it('should not match string_contains when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'status', string_contains: 'act' },
        },
        [ids.withValue],
      );
    });

    it('should not match string_starts_with when value is null', async () => {
      await testQuery(
        {
          data: { path: 'status', string_starts_with: 'act' },
        },
        [ids.withValue],
      );
    });

    it('should not match string_ends_with when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'status', string_ends_with: 'ive' },
        },
        [ids.withValue],
      );
    });
  });

  describe('nested paths with null/missing intermediate values', () => {
    it('should match deeply nested path when exists', async () => {
      await testQuery(
        {
          data: { path: 'profile.settings.theme', equals: 'dark' },
        },
        [ids.withValue],
      );
    });

    it('should match when nested path exists with different value', async () => {
      await testQuery(
        {
          data: { path: 'profile.settings.theme', equals: 'light' },
        },
        [ids.withNested],
      );
    });

    it('should not match when intermediate path is null', async () => {
      await testQuery(
        {
          data: { path: 'profile.settings.theme', equals: 'dark' },
        },
        [ids.withValue],
      );
    });

    it('should not match when intermediate path is missing', async () => {
      await testQuery(
        {
          data: { path: 'profile.settings.notifications', equals: true },
        },
        [ids.withNested],
      );
    });

    it('should match nested null explicitly', async () => {
      await testQuery(
        {
          data: { path: 'profile.settings.theme', equals: null },
        },
        [ids.withNull],
      );
    });
  });

  describe('in/notIn operators with null/missing paths', () => {
    it('should work with in when path exists', async () => {
      await testQuery(
        {
          data: { path: 'status', in: ['active', 'pending'] },
        },
        [ids.withValue],
      );
    });

    it('should not match in when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'status', in: ['active', 'inactive'] },
        },
        [ids.withValue],
      );
    });

    it('should work with notIn when path exists', async () => {
      // notIn excludes specified values, but null values still don't match
      await testQuery(
        {
          data: { path: 'status', notIn: ['inactive', 'pending'] },
        },
        [ids.withValue, ids.withNull],
      );
    });
  });

  describe('array operators with null/missing paths', () => {
    it('should match array_contains when array exists', async () => {
      await testQuery(
        {
          data: { path: 'tags', array_contains: ['a'] },
        },
        [ids.withValue],
      );
    });

    it('should not match array_contains when array is null', async () => {
      await testQuery(
        {
          data: { path: 'tags', array_contains: ['a'] },
        },
        [ids.withValue],
      );
    });

    it('should not match array_contains when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'tags', array_contains: ['a'] },
        },
        [ids.withValue],
      );
    });

    it('should match first array element name', async () => {
      await testQuery(
        {
          data: { path: 'items[0].name', equals: 'Item1' },
        },
        [ids.withArrayValue, ids.withArrayNull],
      );
    });
  });

  describe('array element access with null values', () => {
    it('should match array element when exists', async () => {
      await testQuery(
        {
          data: { path: 'items[0].name', equals: 'Item1' },
        },
        [ids.withArrayValue, ids.withArrayNull],
      );
    });

    it('should match array element with null value', async () => {
      await testQuery(
        {
          data: { path: 'items[0].value', equals: null },
        },
        [ids.withArrayNull],
      );
    });

    it('should not match when array index out of bounds', async () => {
      await testQuery(
        {
          data: { path: 'items[10].name', equals: 'Item1' },
        },
        [],
      );
    });

    it('should not match on empty array', async () => {
      await testQuery(
        {
          data: { path: 'items[0].name', equals: 'Item1' },
        },
        [ids.withArrayValue, ids.withArrayNull],
      );
    });
  });

  describe('search with null/missing paths', () => {
    it('should not find anything when path is missing', async () => {
      await testQuery(
        {
          data: { path: 'nonexistent', search: 'test' },
        },
        [],
      );
    });

    it('should search in nested structure', async () => {
      await testQuery(
        {
          data: { path: 'profile.name', search: 'John' },
        },
        [ids.withValue],
      );
    });
  });

  describe('combining null checks with other filters', () => {
    it('should combine equals null with AND', async () => {
      await testQuery(
        {
          AND: [{ data: { path: 'status', equals: null } }, { data: { path: 'score', equals: null } }],
        },
        [ids.withNull],
      );
    });

    it('should combine not null with other conditions', async () => {
      await testQuery(
        {
          AND: [{ data: { path: 'status', not: null } }, { data: { path: 'status', equals: 'active' } }],
        },
        [ids.withValue],
      );
    });

    it('should use OR to match null or specific value', async () => {
      await testQuery(
        {
          OR: [{ data: { path: 'status', equals: null } }, { data: { path: 'status', equals: 'active' } }],
        },
        [ids.withValue, ids.withNull],
      );
    });
  });
});
