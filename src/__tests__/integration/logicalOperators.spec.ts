import './setup';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

describe('Logical Operators', () => {
  beforeEach(async () => {
    await prisma.testTable.createMany({
      data: [
        {
          id: 'logic-1',
          name: 'Alice',
          age: 25,
          isActive: true,
          data: {
            department: 'Engineering',
            salary: 75000,
            skills: ['JavaScript', 'TypeScript'],
            manager: { name: 'John', level: 'Senior' },
          },
        },
        {
          id: 'logic-2',
          name: 'Bob',
          age: 30,
          isActive: false,
          data: {
            department: 'Marketing',
            salary: 65000,
            skills: ['Marketing', 'Sales'],
            manager: { name: 'Jane', level: 'Senior' },
          },
        },
        {
          id: 'logic-3',
          name: 'Charlie',
          age: 35,
          isActive: true,
          data: {
            department: 'Engineering',
            salary: 85000,
            skills: ['Python', 'TypeScript'],
            manager: { name: 'John', level: 'Senior' },
          },
        },
        {
          id: 'logic-4',
          name: 'Diana',
          age: 28,
          isActive: true,
          data: {
            department: 'Design',
            salary: 70000,
            skills: ['Design', 'UX'],
            manager: { name: 'Sarah', level: 'Lead' },
          },
        },
      ],
    });
  });

  describe('AND Logic', () => {
    it('should handle multiple conditions with implicit AND', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number', isActive: 'boolean', id: 'string' },
        orderBy: { id: 'asc' },
        where: {
          age: { gte: 25 },
          isActive: true,
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-3', 'logic-4']);
    });

    it('should handle explicit AND array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number', data: 'json', id: 'string' },
        orderBy: { id: 'asc' },
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
      expect(results.map((r) => r.id)).toEqual(['logic-3']);
    });

    it('should handle nested AND conditions', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', isActive: 'boolean', id: 'string' },
        orderBy: { id: 'asc' },
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
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-3']);
    });
  });

  describe('OR Logic', () => {
    it('should handle OR with different data types', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number', name: 'string', id: 'string' },
        orderBy: { id: 'asc' },
        where: {
          OR: [{ age: { lt: 27 } }, { name: 'Bob' }],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-2']);
    });

    it('should handle OR with string operations', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { name: 'string', data: 'json', id: 'string' },
        orderBy: { id: 'asc' },
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
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-4']);
    });

    it('should handle empty OR array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { name: 'string', id: 'string' },
        orderBy: { id: 'asc' },
        where: {
          name: { contains: 'a' },
          OR: [],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['logic-3', 'logic-4']);
    });
  });

  describe('NOT Logic', () => {
    it('should handle NOT with string operations', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { name: 'string', id: 'string' },
        orderBy: { id: 'asc' },
        where: {
          NOT: {
            name: { contains: 'a' },
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-2']);
    });

    it('should handle NOT with numeric comparisons', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number', id: 'string' },
        orderBy: { id: 'asc' },
        where: {
          NOT: {
            age: { gte: 30 },
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-4']);
    });

    it('should handle NOT with JSON filters', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', id: 'string' },
        orderBy: { id: 'asc' },
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
      expect(results.map((r) => r.id)).toEqual(['logic-2', 'logic-4']);
    });
  });

  describe('Complex Logical Combinations', () => {
    it('should handle deeply nested logical combinations', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number', isActive: 'boolean', data: 'json', id: 'string' },
        orderBy: { id: 'asc' },
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
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-2']);
    });

    it('should handle multiple OR conditions with AND', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { name: 'string', data: 'json', isActive: 'boolean', id: 'string' },
        orderBy: { id: 'asc' },
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
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-4']);
    });

    it('should handle array of NOT conditions', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { age: 'number', name: 'string', id: 'string' },
        orderBy: { id: 'asc' },
        where: {
          NOT: [{ age: { lt: 27 } }, { name: 'Charlie' }],
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(4);
      expect(results.map((r) => r.id)).toEqual(['logic-1', 'logic-2', 'logic-3', 'logic-4']);
    });
  });
});
