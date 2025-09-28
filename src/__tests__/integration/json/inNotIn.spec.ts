import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('JSON Path in/notIn Operations', () => {
  let ids: Record<string, string> = {};

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
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', createdAt: 'date' },
        where: {
          data: {
            path: ['status'],
            in: ['active', 'pending'],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.name)).toEqual(['User1', 'User2', 'User3']);
    });

    it('should find records with priority in list', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', createdAt: 'date' },
        where: {
          data: {
            path: ['priority'],
            in: [1, 2, 3],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(4);
      expect(results.map((r) => r.name)).toEqual(['User1', 'User2', 'User3', 'User4']);
    });

    it('should return empty for empty in list', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['status'],
            in: [],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(0);
    });

    it('should handle single value in list', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['role'],
            in: ['admin'],
          },
        },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('User1');
    });
  });

  describe('notIn operator', () => {
    it('should find records with status not in list', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', createdAt: 'date' },
        where: {
          data: {
            path: ['status'],
            notIn: ['active', 'pending'],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name)).toEqual(['User4', 'User5']);
    });

    it('should find records with priority not in list', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', createdAt: 'date' },
        where: {
          data: {
            path: ['priority'],
            notIn: [1, 5],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name)).toEqual(['User2', 'User3']);
    });

    it('should return all records for empty notIn list', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', createdAt: 'date' },
        where: {
          data: {
            path: ['status'],
            notIn: [],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(5);
    });

    it('should handle single value not in list', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', createdAt: 'date' },
        where: {
          data: {
            path: ['role'],
            notIn: ['admin'],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(4);
      expect(results.map((r) => r.name)).toEqual(['User2', 'User3', 'User4', 'User5']);
    });
  });

  describe('Combined with other filters', () => {
    it('should combine in with other conditions', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json', name: 'string', createdAt: 'date' },
        where: {
          data: {
            path: ['status'],
            in: ['active', 'pending', 'inactive'],
          },
          name: { contains: 'User' },
        },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<{ id: string; name: string }[]>(query);
      expect(results.length).toBe(4);
    });
  });
});
