import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../query-builder';
import { WhereConditionsTyped, OrderByConditions } from '../../types';

describe('JSON Path ORDER BY Integration', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    id: 'string',
    name: 'string',
    readonly: 'boolean',
    data: 'json',
  } as const;

  beforeEach(async () => {
    ids = {
      complex1: nanoid(),
      complex2: nanoid(),
      complex3: nanoid(),
      complex4: nanoid(),
      complex5: nanoid(),
    };
    await prisma.testTable.createMany({
      data: [
        {
          id: ids.complex1,
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
          id: ids.complex2,
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
          id: ids.complex3,
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
          id: ids.complex4,
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
          id: ids.complex5,
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

  const testJsonPathOrder = async (
    orderBy: OrderByConditions<typeof fieldConfig>,
    expectedNames: string[],
    where?: WhereConditionsTyped<typeof fieldConfig>,
    take?: number,
    skip?: number,
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy,
      where,
      take,
      skip,
    });

    const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
    expect(results.map((r) => r.name)).toEqual(expectedNames);
  };

  const testJsonPathOrderWithLength = async (
    orderBy: OrderByConditions<typeof fieldConfig>,
    expectedLength: number,
    where?: WhereConditionsTyped<typeof fieldConfig>,
    take?: number,
    skip?: number,
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy,
      where,
      take,
      skip,
    });

    const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
    expect(results.length).toBe(expectedLength);
  };

  describe('Simple JSON Path Ordering', () => {
    it('should handle ordering by JSON string field (data.name ASC)', async () => {
      await testJsonPathOrder(
        {
          data: {
            path: ['name'],
            direction: 'asc',
            type: 'text',
          },
        },
        [
          'complex-1', // Alice
          'complex-2', // Bob
          'complex-3', // Charlie
          'complex-4', // David
          'complex-5', // Eve
        ],
      );
    });

    it('should handle ordering by JSON number field (data.priority DESC)', async () => {
      await testJsonPathOrder(
        {
          data: {
            path: ['priority'],
            direction: 'desc',
            type: 'int',
          },
        },
        [
          'complex-5', // priority: 4
          'complex-2', // priority: 3
          'complex-3', // priority: 2
          'complex-1', // priority: 1
          'complex-4', // priority: 1
        ],
      );
    });

    it('should handle ordering by nested JSON field (data.user.age ASC)', async () => {
      await testJsonPathOrder(
        {
          data: {
            path: ['user', 'age'],
            direction: 'asc',
            type: 'int',
          },
        },
        [
          'complex-2', // age: 25
          'complex-5', // age: 28
          'complex-4', // age: 31
          'complex-1', // age: 35
          'complex-3', // age: 42
        ],
      );
    });
  });

  describe('JSON Path Ordering with Filters', () => {
    it('should handle JSON ordering with WHERE conditions', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
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
        fieldConfig,
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
      await testJsonPathOrder(
        {
          data: {
            path: ['name'],
            direction: 'asc',
            type: 'text',
          },
        },
        [
          'complex-1', // Alice
          'complex-2', // Bob
          'complex-3', // Charlie
        ],
        undefined,
        3,
      );
    });

    it('should handle JSON ordering with LIMIT and OFFSET', async () => {
      await testJsonPathOrder(
        {
          data: {
            path: ['priority'],
            direction: 'desc',
            type: 'int',
          },
        },
        [
          'complex-2', // priority: 3 (skip complex-5 which has priority: 4)
          'complex-3', // priority: 2
        ],
        undefined,
        2,
        1,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle ordering by non-existent JSON path', async () => {
      await testJsonPathOrderWithLength(
        {
          data: {
            path: ['nonexistent'],
            direction: 'asc',
            type: 'text',
          },
        },
        5,
      );
    });

    it('should handle ordering with no results', async () => {
      await testJsonPathOrderWithLength(
        {
          data: {
            path: ['priority'],
            direction: 'asc',
            type: 'int',
          },
        },
        0,
        {
          data: {
            path: ['name'],
            equals: 'NonExistent',
          },
        },
      );
    });
  });

  describe('Complex JSON Path Aggregations', () => {
    let aggregationIds: Record<string, string> = {};

    const testAggregationOrder = async (
      orderBy: OrderByConditions<typeof fieldConfig>,
      expectedNames: string[],
    ) => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy,
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(expectedNames);
    };

    beforeEach(async () => {
      aggregationIds = {
        user1: nanoid(),
        user2: nanoid(),
        user3: nanoid(),
      };

      // Add more complex data for aggregation tests
      await prisma.testTable.deleteMany({});
      await prisma.testTable.createMany({
        data: [
          {
            id: aggregationIds.user1,
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
            id: aggregationIds.user2,
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
            id: aggregationIds.user3,
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
      await testAggregationOrder(
        {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'first',
          },
        },
        [
          'user2', // first score: 75
          'user1', // first score: 85
          'user3', // first score: 95
        ],
      );
    });

    it('should order by last element in array', async () => {
      await testAggregationOrder(
        {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'last',
          },
        },
        [
          'user2', // last score: 85
          'user1', // last score: 95
          'user3', // last score: 100
        ],
      );
    });

    it('should order by minimum value in array', async () => {
      await testAggregationOrder(
        {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'min',
          },
        },
        [
          'user2', // min score: 75
          'user1', // min score: 85
          'user3', // min score: 95
        ],
      );
    });

    it('should order by maximum value in array', async () => {
      await testAggregationOrder(
        {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'max',
          },
        },
        [
          'user2', // max score: 85
          'user1', // max score: 95
          'user3', // max score: 100
        ],
      );
    });

    it('should order by average value in array', async () => {
      await testAggregationOrder(
        {
          data: {
            path: ['scores', '*'],
            direction: 'asc',
            type: 'int',
            aggregation: 'avg',
          },
        },
        [
          'user2', // avg score: 80
          'user1', // avg score: 90
          'user3', // avg score: 97.5
        ],
      );
    });

    it('should order by nested array field with wildcard', async () => {
      await testAggregationOrder(
        {
          data: {
            path: ['items', '*', 'price'],
            direction: 'desc',
            type: 'int',
            aggregation: 'max',
          },
        },
        [
          'user2', // max price: 200
          'user3', // max price: 150
          'user1', // max price: 100
        ],
      );
    });
  });
});
