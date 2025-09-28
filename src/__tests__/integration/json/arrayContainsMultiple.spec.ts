import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('Array Contains Multiple Elements', () => {
  let ids: Record<string, string> = {};

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
        },
        {
          id: ids.test2,
          name: 'Test 2',
          data: {
            tags: ['admin', 'moderator'],
            scores: [90, 95],
          },
        },
        {
          id: ids.test3,
          name: 'Test 3',
          data: {
            tags: ['user', 'typescript'],
            scores: [85, 100],
          },
        },
        {
          id: ids.test4,
          name: 'Test 4',
          data: {
            tags: ['admin'],
            scores: [75, 80],
          },
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
        },
      ],
    });
  });

  describe('Single element', () => {
    it('should find records with array containing one string element', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['typescript'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name).sort()).toEqual(['Test 1', 'Test 3']);
    });

    it('should find records with array containing one number element', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['scores'],
            array_contains: [100],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 3');
    });
  });

  describe('Multiple elements (AND logic)', () => {
    it('should find records with array containing ALL specified string elements', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'user'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 1');
    });

    it('should find records with array containing ALL specified number elements', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['scores'],
            array_contains: [90, 95],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name).sort()).toEqual(['Test 1', 'Test 2']);
    });

    it('should find records with array containing ALL three elements', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'user', 'typescript'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 1');
    });

    it('should return empty when not all elements are present', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'nonexistent'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(0);
    });
  });

  describe('Nested arrays (array as element)', () => {
    it('should find records where array contains another array as element', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['nested', 'items'],
            array_contains: [[1, 2]],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 5');
    });

    it('should find records where array contains multiple arrays as elements', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['nested', 'items'],
            array_contains: [
              [1, 2],
              [3, 4],
            ],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 5');
    });

    it('should return empty when nested array element not found', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['nested', 'items'],
            array_contains: [[7, 8]],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(0);
    });
  });

  describe('Case insensitive mode', () => {
    it('should support case insensitive search for single element', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['TYPESCRIPT'],
            mode: 'insensitive',
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name).sort()).toEqual(['Test 1', 'Test 3']);
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
        },
      });

      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ["admin's tag"],
            mode: 'insensitive',
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
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
          },
          {
            id: ids.quest2,
            name: 'Quest 2',
            data: {
              rewards: {
                items: [{ item_id: 'staff', tags: ['weapon', 'magic'] }],
              },
            },
          },
          {
            id: ids.quest3,
            name: 'Quest 3',
            data: {
              rewards: {
                items: [{ item_id: 'potion', tags: ['consumable', 'healing'] }],
              },
            },
          },
        ],
      });
    });

    it('should find with wildcard and single element', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['rewards', 'items', '*', 'tags'],
            array_contains: ['weapon'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name).sort()).toEqual(['Quest 1', 'Quest 2']);
    });

    it('should find with wildcard and multiple elements', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['rewards', 'items', '*', 'tags'],
            array_contains: ['weapon', 'melee'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Quest 1');
    });
  });

  describe('Edge cases', () => {
    it('should find array containing elements plus additional items', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'user'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 1');
    });

    it('should find regardless of element order in search', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['user', 'admin'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 1');
    });

    it('should find array with exact elements', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'moderator'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test 2');
    });

    it('should return empty when one element is missing', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: ['admin', 'moderator', 'typescript'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(0);
    });

    it('should work with numbers regardless of order', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['scores'],
            array_contains: [95, 90],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name).sort()).toEqual(['Test 1', 'Test 2']);
    });

    it('should find superset arrays', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['scores'],
            array_contains: [85],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name).sort()).toEqual(['Test 1', 'Test 3']);
    });

    it('should not find subset arrays', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['scores'],
            array_contains: [75, 80, 85, 90],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(0);
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
      }).toThrow('processArrayContains: value must be an array');
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
      }).toThrow('processArrayContains: value array cannot be empty');
    });
  });
});
