import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../query-builder';
import { WhereConditionsTyped, OrderByConditions } from '../../types';

describe('ORDER BY', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    name: 'string',
    age: 'number',
  } as const;

  beforeEach(async () => {
    ids = {
      charlie: nanoid(),
      alice: nanoid(),
      bob: nanoid(),
    };
    await prisma.testTable.createMany({
      data: [
        {
          id: ids.charlie,
          name: 'Charlie',
          age: 18,
          score: 85.5,
          data: {
            profile: { priority: 3, rating: 4.2 },
            items: [{ price: 100 }, { price: 200 }],
          },
        },
        {
          id: ids.alice,
          name: 'Alice',
          age: 25,
          score: 95.0,
          data: {
            profile: { priority: 1, rating: 4.8 },
            items: [{ price: 50 }, { price: 150 }],
          },
        },
        {
          id: ids.bob,
          name: 'Bob',
          age: 30,
          score: 75.3,
          data: {
            profile: { priority: 2, rating: 3.9 },
            items: [{ price: 300 }, { price: 400 }],
          },
        },
      ],
    });
  });

  // Utility functions for ORDER BY testing
  const testOrderBy = async (
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

  const testOrderByWithWhere = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    orderBy: OrderByConditions<typeof fieldConfig> | OrderByConditions<typeof fieldConfig>[],
    expectedResults: Array<{ name: string; age: number }>,
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy,
    });

    const results = await prisma.$queryRaw<Array<{ name: string; age: number }>>(query);
    expect(results.map((r) => ({ name: r.name, age: r.age }))).toEqual(expectedResults);
  };

  const testOrderByWithWhereSimple = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    orderBy: OrderByConditions<typeof fieldConfig>,
    expectedNames: string[],
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy,
    });

    const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
    expect(results.map((r) => r.name)).toEqual(expectedNames);
  };

  const testOrderByAges = async (
    orderBy: OrderByConditions<typeof fieldConfig>,
    expectedAges: number[],
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy,
    });

    const results = await prisma.$queryRaw<Array<{ age: number }>>(query);
    expect(results.map((r) => r.age)).toEqual(expectedAges);
  };

  describe('Basic Ordering', () => {
    it('should order by string field ascending', async () => {
      await testOrderBy({ name: 'asc' }, ['Alice', 'Bob', 'Charlie']);
    });

    it('should order by string field descending', async () => {
      await testOrderBy({ name: 'desc' }, ['Charlie', 'Bob', 'Alice']);
    });

    it('should order by number field', async () => {
      await testOrderByAges({ age: 'asc' }, [18, 25, 30]);
    });
  });

  describe('JSON Path Ordering', () => {
    it('should order by JSON number field', async () => {
      await testOrderBy(
        {
          data: {
            path: ['profile', 'priority'],
            direction: 'asc',
            type: 'int',
          },
        },
        ['Alice', 'Bob', 'Charlie'],
      );
    });

    it('should order by JSON string field', async () => {
      await testOrderBy(
        {
          data: {
            path: ['profile', 'rating'],
            direction: 'desc',
            type: 'float',
          },
        },
        ['Alice', 'Charlie', 'Bob'],
      );
    });

    it('should order by JSON array first element', async () => {
      await testOrderBy(
        {
          data: {
            path: ['items', '0', 'price'],
            direction: 'asc',
            type: 'int',
          },
        },
        ['Alice', 'Charlie', 'Bob'],
      );
    });
  });

  describe('Complex Ordering', () => {
    it('should order by multiple fields using array format', async () => {
      await testOrderByWithWhere(
        { age: { gte: 20 } },
        [{ age: 'asc' }, { name: 'desc' }],
        [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ],
      );
    });

    it('should order by multiple fields', async () => {
      await testOrderByWithWhere({ age: { gte: 20 } }, { age: 'asc' }, [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ]);
    });

    it('should combine ordering with filtering', async () => {
      await testOrderByWithWhereSimple(
        {
          data: {
            path: ['profile', 'priority'],
            lte: 2,
          },
        },
        { name: 'asc' },
        ['Alice', 'Bob'],
      );
    });
  });

  describe('Aggregation Ordering', () => {
    it('should order by first element in array', async () => {
      await testOrderBy(
        {
          data: {
            path: ['items', '*', 'price'],
            direction: 'asc',
            type: 'int',
            aggregation: 'first',
          },
        },
        ['Alice', 'Charlie', 'Bob'],
      );
    });

    it('should order by last element in array', async () => {
      await testOrderBy(
        {
          data: {
            path: ['items', '*', 'price'],
            direction: 'asc',
            type: 'int',
            aggregation: 'last',
          },
        },
        ['Alice', 'Charlie', 'Bob'],
      );
    });
  });
});
