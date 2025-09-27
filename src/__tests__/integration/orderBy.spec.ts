import './setup';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

describe('ORDER BY', () => {
  beforeEach(async () => {
    await prisma.testTable.createMany({
      data: [
        {
          name: 'Charlie',
          age: 18,
          score: 85.5,
          data: {
            profile: { priority: 3, rating: 4.2 },
            items: [{ price: 100 }, { price: 200 }],
          },
        },
        {
          name: 'Alice',
          age: 25,
          score: 95.0,
          data: {
            profile: { priority: 1, rating: 4.8 },
            items: [{ price: 50 }, { price: 150 }],
          },
        },
        {
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

  describe('Basic Ordering', () => {
    it('should order by string field ascending', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { name: 'string' },
        orderBy: { name: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should order by string field descending', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { name: 'string' },
        orderBy: { name: 'desc' },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('should order by number field', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number' },
        orderBy: { age: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ age: number }>>(query);
      expect(results.map((r) => r.age)).toEqual([18, 25, 30]);
    });
  });

  describe('JSON Path Ordering', () => {
    it('should order by JSON number field', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['profile', 'priority'],
            direction: 'asc',
            type: 'int',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should order by JSON string field', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['profile', 'rating'],
            direction: 'desc',
            type: 'float',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Alice', 'Charlie', 'Bob']);
    });

    it('should order by JSON array first element', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['items', '0', 'price'],
            direction: 'asc',
            type: 'int',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Alice', 'Charlie', 'Bob']);
    });
  });

  describe('Complex Ordering', () => {
    it('should order by multiple fields', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number', name: 'string' },
        orderBy: { age: 'asc' },
        where: { age: { gte: 20 } },
      });

      const results = await prisma.$queryRaw<Array<{ name: string; age: number }>>(query);
      expect(results.map((r) => ({ name: r.name, age: r.age }))).toEqual([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ]);
    });

    it('should combine ordering with filtering', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { name: 'string', data: 'json' },
        where: {
          data: {
            path: ['profile', 'priority'],
            lte: 2,
          },
        },
        orderBy: { name: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Alice', 'Bob']);
    });
  });

  describe('Aggregation Ordering', () => {
    it('should order by first element in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['items', '*', 'price'],
            direction: 'asc',
            type: 'int',
            aggregation: 'first',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Alice', 'Charlie', 'Bob']);
    });

    it('should order by last element in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        orderBy: {
          data: {
            path: ['items', '*', 'price'],
            direction: 'asc',
            type: 'int',
            aggregation: 'last',
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ name: string }>>(query);
      expect(results.map((r) => r.name)).toEqual(['Alice', 'Charlie', 'Bob']);
    });
  });
});
