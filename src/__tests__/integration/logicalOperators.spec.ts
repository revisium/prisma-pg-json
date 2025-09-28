import './setup';
import { FieldConfig } from '../../types';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../query-builder';

describe('Logical Operators', () => {
  let ids: Record<string, string> = {};

  const fieldConfig: FieldConfig = {
    isActive: 'boolean',
    id: 'string',
    createdAt: 'date',
    age: 'number',
    name: 'string',
    data: 'json',
  };

  beforeEach(async () => {
    ids = {
      logic1: nanoid(),
      logic2: nanoid(),
      logic3: nanoid(),
      logic4: nanoid(),
    };
    await prisma.testTable.createMany({
      data: [
        {
          id: ids.logic1,
          name: 'Alice',
          age: 25,
          isActive: true,
          data: {
            department: 'Engineering',
            salary: 75000,
            skills: ['JavaScript', 'TypeScript'],
            manager: { name: 'John', level: 'Senior' },
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.logic2,
          name: 'Bob',
          age: 30,
          isActive: false,
          data: {
            department: 'Marketing',
            salary: 65000,
            skills: ['Marketing', 'Sales'],
            manager: { name: 'Jane', level: 'Senior' },
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.logic3,
          name: 'Charlie',
          age: 35,
          isActive: true,
          data: {
            department: 'Engineering',
            salary: 85000,
            skills: ['Python', 'TypeScript'],
            manager: { name: 'John', level: 'Senior' },
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.logic4,
          name: 'Diana',
          age: 28,
          isActive: true,
          data: {
            department: 'Design',
            salary: 70000,
            skills: ['Design', 'UX'],
            manager: { name: 'Sarah', level: 'Lead' },
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('AND Logic', () => {
    it('should handle multiple conditions with implicit AND', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          age: { gte: 25 },
          isActive: true,
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic3, ids.logic4].sort());
    });

    it('should handle explicit AND array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          AND: [
            { age: { gte: 30 } },
            {
              data: {
                path: ['department'],
                equals: 'Engineering',
              },
            },
          ],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(1);
      expect(results.map((r) => r.id)).toEqual([ids.logic3]);
    });

    it('should handle nested AND conditions', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          AND: [
            { isActive: true },
            {
              AND: [
                {
                  data: {
                    path: ['salary'],
                    gte: 70000,
                  },
                },
                {
                  data: {
                    path: ['department'],
                    equals: 'Engineering',
                  },
                },
              ],
            },
          ],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic3].sort());
    });
  });

  describe('OR Logic', () => {
    it('should handle OR with different data types', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          OR: [{ age: { lt: 27 } }, { name: 'Bob' }],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic2].sort());
    });

    it('should handle OR with string operations', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          OR: [
            { name: { contains: 'ice' } },
            {
              data: {
                path: ['department'],
                equals: 'Design',
              },
            },
          ],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic4].sort());
    });

    it('should handle empty OR array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          name: { contains: 'a' },
          OR: [],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic3, ids.logic4].sort());
    });
  });

  describe('NOT Logic', () => {
    it('should handle NOT with string operations', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          NOT: {
            name: { contains: 'a' },
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic2].sort());
    });

    it('should handle NOT with numeric comparisons', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          NOT: {
            age: { gte: 30 },
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic4].sort());
    });

    it('should handle NOT with JSON filters', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          NOT: {
            data: {
              path: ['department'],
              equals: 'Engineering',
            },
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic2, ids.logic4].sort());
    });
  });

  describe('Complex Logical Combinations', () => {
    it('should handle deeply nested logical combinations', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          AND: [
            {
              OR: [{ age: { lt: 30 } }, { isActive: false }],
            },
            {
              NOT: {
                data: {
                  path: ['department'],
                  equals: 'Design',
                },
              },
            },
          ],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic2].sort());
    });

    it('should handle multiple OR conditions with AND', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          isActive: true,
          OR: [
            {
              AND: [
                { name: { startsWith: 'A' } },
                {
                  data: {
                    path: ['salary'],
                    gte: 70000,
                  },
                },
              ],
            },
            {
              data: {
                path: ['department'],
                equals: 'Design',
              },
            },
          ],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id).sort()).toEqual([ids.logic1, ids.logic4].sort());
    });

    it('should handle array of NOT conditions', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where: {
          NOT: [{ age: { lt: 27 } }, { name: 'Charlie' }],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(4);
      expect(results.map((r) => r.id).sort()).toEqual(
        [ids.logic1, ids.logic2, ids.logic3, ids.logic4].sort(),
      );
    });
  });
});
