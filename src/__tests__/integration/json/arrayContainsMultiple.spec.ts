import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('Array Contains Multiple Elements', () => {
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

    const results = await prisma.$queryRaw<Array<{ id: string; name: string }>>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id)).toEqual(expectedIds);
    return results;
  };


  const testQueryWithNames = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedNames: string[],
  ) => {
    const expectedIds = expectedNames.map((name) => {
      const testKey = name.toLowerCase().replace(' ', '');
      return ids[testKey];
    });
    const results = await testQuery(where, expectedIds);
    expect(results.map((r) => r.name)).toEqual(expectedNames);
  };

  const testQueryWithSingleName = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedName: string,
  ) => {
    const testKey = expectedName.toLowerCase().replace(' ', '');
    const expectedId = ids[testKey];
    const results = await testQuery(where, [expectedId]);
    expect(results[0].name).toBe(expectedName);
  };

  beforeEach(async () => {
    ids = {
      test1: nanoid(),
      test2: nanoid(),
      test3: nanoid(),
      test4: nanoid(),
      test5: nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids.test1,
          name: 'Test 1',
          data: {
            tags: ['admin', 'user', 'typescript'],
            scores: [85, 90, 95],
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.test2,
          name: 'Test 2',
          data: {
            tags: ['admin', 'moderator'],
            scores: [90, 95],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.test3,
          name: 'Test 3',
          data: {
            tags: ['user', 'typescript'],
            scores: [85, 100],
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.test4,
          name: 'Test 4',
          data: {
            tags: ['admin'],
            scores: [75, 80],
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.test5,
          name: 'Test 5',
          data: {
            nested: {
              items: [
                [1, 2],
                [3, 4],
                [5, 6],
              ],
            },
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('Single element', () => {
    it('should find records with array containing one string element', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['tags'],
            array_contains: ['typescript'],
          },
        },
        ['Test 1', 'Test 3'],
      );
    });

    it('should find records with array containing one number element', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['scores'],
            array_contains: [100],
          },
        },
        'Test 3',
      );
    });
  });

  describe('Multiple elements (AND logic)', () => {
    it('should find records with array containing ALL specified string elements', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'user'],
          },
        },
        'Test 1',
      );
    });

    it('should find records with array containing ALL specified number elements', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['scores'],
            array_contains: [90, 95],
          },
        },
        ['Test 1', 'Test 2'],
      );
    });

    it('should find records with array containing ALL three elements', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'user', 'typescript'],
          },
        },
        'Test 1',
      );
    });

    it('should return empty when not all elements are present', async () => {
      await testQuery(
        {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'nonexistent'],
          },
        },
        [],
      );
    });
  });

  describe('Nested arrays (array as element)', () => {
    it('should find records where array contains another array as element', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['nested', 'items'],
            array_contains: [[1, 2]],
          },
        },
        'Test 5',
      );
    });

    it('should find records where array contains multiple arrays as elements', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['nested', 'items'],
            array_contains: [
              [1, 2],
              [3, 4],
            ],
          },
        },
        'Test 5',
      );
    });

    it('should return empty when nested array element not found', async () => {
      await testQuery(
        {
          data: {
            path: ['nested', 'items'],
            array_contains: [[7, 8]],
          },
        },
        [],
      );
    });
  });

  describe('Case insensitive mode', () => {
    it('should support case insensitive search for single element', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['tags'],
            array_contains: ['TYPESCRIPT'],
            mode: 'insensitive',
          },
        },
        ['Test 1', 'Test 3'],
      );
    });

    it('should handle values with single quotes (SQL injection protection)', async () => {
      await prisma.testTable.deleteMany();
      const testId = nanoid();
      await prisma.testTable.create({
        data: {
          id: testId,
          name: 'Test with quote',
          data: {
            tags: ["admin's tag", 'user'],
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      });

      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        where: {
          data: {
            path: ['tags'],
            array_contains: ["admin's tag"],
            mode: 'insensitive',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string; name: string }>>(query);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(testId);
      expect(results[0].name).toBe('Test with quote');
    });

    it('should throw error for case insensitive with multiple elements', async () => {
      expect(() => {
        buildQuery({
          tableName: 'test_tables',
          fieldConfig: { data: 'json' },
          where: {
            data: {
              path: ['tags'],
              array_contains: ['admin', 'user'],
              mode: 'insensitive',
            },
          },
        });
      }).toThrow();
    });
  });

  describe('With wildcards', () => {
    beforeEach(async () => {
      await prisma.testTable.deleteMany();
      ids = {
        quest1: nanoid(),
        quest2: nanoid(),
        quest3: nanoid(),
      };

      await prisma.testTable.createMany({
        data: [
          {
            id: ids.quest1,
            name: 'Quest 1',
            data: {
              rewards: {
                items: [
                  { item_id: 'sword', tags: ['weapon', 'melee'] },
                  { item_id: 'shield', tags: ['armor', 'defense'] },
                ],
              },
            },
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
          {
            id: ids.quest2,
            name: 'Quest 2',
            data: {
              rewards: {
                items: [{ item_id: 'staff', tags: ['weapon', 'magic'] }],
              },
            },
            createdAt: new Date('2025-01-02T00:00:00.000Z'),
          },
          {
            id: ids.quest3,
            name: 'Quest 3',
            data: {
              rewards: {
                items: [{ item_id: 'potion', tags: ['consumable', 'healing'] }],
              },
            },
            createdAt: new Date('2025-01-03T00:00:00.000Z'),
          },
        ],
      });
    });

    it('should find with wildcard and single element', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['rewards', 'items', '*', 'tags'],
            array_contains: ['weapon'],
          },
        },
        ['Quest 1', 'Quest 2'],
      );
    });

    it('should find with wildcard and multiple elements', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['rewards', 'items', '*', 'tags'],
            array_contains: ['weapon', 'melee'],
          },
        },
        'Quest 1',
      );
    });
  });

  describe('Edge cases', () => {
    it('should find array containing elements plus additional items', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'user'],
          },
        },
        'Test 1',
      );
    });

    it('should find regardless of element order in search', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['tags'],
            array_contains: ['user', 'admin'],
          },
        },
        'Test 1',
      );
    });

    it('should find array with exact elements', async () => {
      await testQueryWithSingleName(
        {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'moderator'],
          },
        },
        'Test 2',
      );
    });

    it('should return empty when one element is missing', async () => {
      await testQuery(
        {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'moderator', 'typescript'],
          },
        },
        [],
      );
    });

    it('should work with numbers regardless of order', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['scores'],
            array_contains: [95, 90],
          },
        },
        ['Test 1', 'Test 2'],
      );
    });

    it('should find superset arrays', async () => {
      await testQueryWithNames(
        {
          data: {
            path: ['scores'],
            array_contains: [85],
          },
        },
        ['Test 1', 'Test 3'],
      );
    });

    it('should not find subset arrays', async () => {
      await testQuery(
        {
          data: {
            path: ['scores'],
            array_contains: [75, 80, 85, 90],
          },
        },
        [],
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when array_contains receives non-array', async () => {
      expect(() => {
        buildQuery({
          tableName: 'test_tables',
          fieldConfig: { data: 'json' },
          where: {
            data: {
              path: ['tags'],
              // @ts-expect-error - testing runtime error
              array_contains: 'typescript',
            },
          },
        });
      }).toThrow('array_contains value must be an array');
    });

    it('should throw error when array_contains receives empty array', async () => {
      expect(() => {
        buildQuery({
          tableName: 'test_tables',
          fieldConfig: { data: 'json' },
          where: {
            data: {
              path: ['tags'],
              array_contains: [],
            },
          },
        });
      }).toThrow('array_contains requires a non-empty array value');
    });
  });
});
