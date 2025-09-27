import './setup';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

describe('JSON Path ORDER BY Integration', () => {
  beforeEach(async () => {
    await prisma.testTable.createMany({
      data: [
        {
          name: 'complex-1',
          readonly: false,
          data: {
            name: 'Alice',
            priority: 1,
            active: true,
            user: { age: 35 },
          },
        },
        {
          name: 'complex-2',
          readonly: true,
          data: {
            name: 'Bob',
            priority: 3,
            active: true,
            user: { age: 25 },
          },
        },
        {
          name: 'complex-3',
          readonly: false,
          data: {
            name: 'Charlie',
            priority: 2,
            active: true,
            user: { age: 42 },
          },
        },
        {
          name: 'complex-4',
          readonly: false,
          data: {
            name: 'David',
            priority: 1,
            active: false,
            user: { age: 31 },
          },
        },
        {
          name: 'complex-5',
          readonly: true,
          data: {
            name: 'Eve',
            priority: 4,
            active: false,
            user: { age: 28 },
          },
        },
      ],
    });
  });

  describe('Simple JSON Path Ordering', () => {
    it('should handle ordering by JSON string field (data.name ASC)', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['name'],
            direction: 'asc',
            type: 'text',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      const expectedOrder = [
        'complex-1', // Alice
        'complex-2', // Bob
        'complex-3', // Charlie
        'complex-4', // David
        'complex-5', // Eve
      ];
      expect(results.map((r) => r.name)).toEqual(expectedOrder);
    });

    it('should handle ordering by JSON number field (data.priority DESC)', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['priority'],
            direction: 'desc',
            type: 'int',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      const expectedOrder = [
        'complex-5', // priority: 4
        'complex-2', // priority: 3
        'complex-3', // priority: 2
        'complex-1', // priority: 1
        'complex-4', // priority: 1
      ];
      expect(results.map((r) => r.name)).toEqual(expectedOrder);
    });

    it('should handle ordering by nested JSON field (data.user.age ASC)', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['user', 'age'],
            direction: 'asc',
            type: 'int',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      const expectedOrder = [
        'complex-2', // age: 25
        'complex-5', // age: 28
        'complex-4', // age: 31
        'complex-1', // age: 35
        'complex-3', // age: 42
      ];
      expect(results.map((r) => r.name)).toEqual(expectedOrder);
    });
  });

  describe('JSON Path Ordering with Filters', () => {
    it('should handle JSON ordering with WHERE conditions', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { readonly: 'boolean', data: 'json' },
        where: { readonly: false },
        orderBy: {
          data: {
            path: ['name'],
            direction: 'asc',
            type: 'text',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.name)).toEqual([
        'complex-1', // Alice
        'complex-3', // Charlie
        'complex-4', // David
      ]);
    });

    it('should handle JSON ordering with JSON filters', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['active'],
            equals: true,
          },
        },
        orderBy: {
          data: {
            path: ['priority'],
            direction: 'desc',
            type: 'int',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.name)).toEqual([
        'complex-2', // priority: 3
        'complex-3', // priority: 2
        'complex-1', // priority: 1
      ]);
    });
  });

  describe('JSON Path Ordering with Pagination', () => {
    it('should handle JSON ordering with LIMIT', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        take: 3,
        orderBy: {
          data: {
            path: ['name'],
            direction: 'asc',
            type: 'text',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.name)).toEqual([
        'complex-1', // Alice
        'complex-2', // Bob
        'complex-3', // Charlie
      ]);
    });

    it('should handle JSON ordering with LIMIT and OFFSET', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        take: 2,
        skip: 1,
        orderBy: {
          data: {
            path: ['priority'],
            direction: 'desc',
            type: 'int',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name)).toEqual([
        'complex-2', // priority: 3 (skip complex-5 which has priority: 4)
        'complex-3', // priority: 2
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ordering by non-existent JSON path', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['nonexistent'],
            direction: 'asc',
            type: 'text',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.length).toBe(5);
    });

    it('should handle ordering with no results', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['name'],
            equals: 'NonExistent',
          },
        },
        orderBy: {
          data: {
            path: ['priority'],
            direction: 'asc',
            type: 'int',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.length).toBe(0);
    });
  });

  describe('Complex JSON Path Aggregations', () => {
    beforeEach(async () => {
      // Add more complex data for aggregation tests
      await prisma.testTable.deleteMany({});
      await prisma.testTable.createMany({
        data: [
          {
            name: 'user1',
            data: {
              scores: [85, 90, 95],
              items: [
                { price: 100, category: 'electronics' },
                { price: 50, category: 'books' },
              ],
            },
          },
          {
            name: 'user2',
            data: {
              scores: [75, 80, 85],
              items: [
                { price: 200, category: 'electronics' },
                { price: 30, category: 'books' },
              ],
            },
          },
          {
            name: 'user3',
            data: {
              scores: [95, 100],
              items: [
                { price: 150, category: 'electronics' },
                { price: 25, category: 'books' },
              ],
            },
          },
        ],
      });
    });

    it('should order by first element in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'first',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual([
        'user2', // first score: 75
        'user1', // first score: 85
        'user3', // first score: 95
      ]);
    });

    it('should order by last element in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'last',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual([
        'user2', // last score: 85
        'user1', // last score: 95
        'user3', // last score: 100
      ]);
    });

    it('should order by minimum value in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'min',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual([
        'user2', // min score: 75
        'user1', // min score: 85
        'user3', // min score: 95
      ]);
    });

    it('should order by maximum value in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'max',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual([
        'user2', // max score: 85
        'user1', // max score: 95
        'user3', // max score: 100
      ]);
    });

    it('should order by average value in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'avg',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual([
        'user2', // avg score: 80
        'user1', // avg score: 90
        'user3', // avg score: 97.5
      ]);
    });

    it('should order by nested array field with wildcard', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['items', '*', 'price'],
            direction: 'desc',
            type: 'int',
            aggregation: 'max',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual([
        'user2', // max price: 200
        'user3', // max price: 150
        'user1', // max price: 100
      ]);
    });
  });
});
