import './setup';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

describe('Date Filters Integration', () => {
  describe('Basic Date Operations', () => {
    const date1 = new Date('2025-01-01T00:00:00.000Z');
    const date2 = new Date('2025-01-02T00:00:00.000Z');
    const date3 = new Date('2025-01-03T00:00:00.000Z');
    const date4 = new Date('2025-01-04T00:00:00.000Z');
    const date5 = new Date('2025-01-05T00:00:00.000Z');

    beforeEach(async () => {
      await prisma.testTable.createMany({
        data: [
          { id: 'date-1', name: 'record1', createdAt: date1, data: {} },
          { id: 'date-2', name: 'record2', createdAt: date2, data: {} },
          { id: 'date-3', name: 'record3', createdAt: date3, data: {} },
          { id: 'date-4', name: 'record4', createdAt: date4, data: {} },
          { id: 'date-5', name: 'record5', createdAt: date5, data: {} },
        ],
      });
    });

    it('should filter by exact date', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        where: { createdAt: date3 },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(1);
      expect(results.map((r) => r.id)).toEqual(['date-3']);
    });

    it('should filter by equals operator', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        where: { createdAt: { equals: date2 } },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(1);
      expect(results.map((r) => r.id)).toEqual(['date-2']);
    });

    it('should filter by greater than', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { gt: date3 } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['date-4', 'date-5']);
    });

    it('should filter by greater than or equal', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { gte: date3 } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['date-3', 'date-4', 'date-5']);
    });

    it('should filter by less than', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { lt: date3 } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['date-1', 'date-2']);
    });

    it('should filter by less than or equal', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { lte: date3 } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['date-1', 'date-2', 'date-3']);
    });

    it('should filter by date range (gt + lt)', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        where: {
          createdAt: {
            gt: date2,
            lt: date4,
          },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(1);
      expect(results.map((r) => r.id)).toEqual(['date-3']);
    });

    it('should filter by date range (gte + lte)', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: {
          createdAt: {
            gte: date2,
            lte: date4,
          },
        },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['date-2', 'date-3', 'date-4']);
    });

    it('should filter by date range (gt + lte)', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: {
          createdAt: {
            gt: date2,
            lte: date4,
          },
        },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['date-3', 'date-4']);
    });

    it('should filter by date range (gte + lt)', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: {
          createdAt: {
            gte: date2,
            lt: date4,
          },
        },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['date-2', 'date-3']);
    });

    it('should filter by in operator', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { in: [date1, date3, date5] } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['date-1', 'date-3', 'date-5']);
    });

    it('should filter by notIn operator', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { notIn: [date1, date5] } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['date-2', 'date-3', 'date-4']);
    });

    it('should filter by not equals', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { not: date3 } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(4);
      expect(results.map((r) => r.id)).toEqual(['date-1', 'date-2', 'date-4', 'date-5']);
    });

    it('should filter by not filter object', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { not: { gte: date4 } } },
        orderBy: { id: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['date-1', 'date-2', 'date-3']);
    });
  });

  describe('Date String Handling', () => {
    const date1 = new Date('2025-01-01T00:00:00.000Z');
    const date2 = new Date('2025-01-02T00:00:00.000Z');
    const date3 = new Date('2025-01-03T00:00:00.000Z');

    beforeEach(async () => {
      await prisma.testTable.createMany({
        data: [
          { id: 'str-1', name: 'test1', createdAt: date1, data: {} },
          { id: 'str-2', name: 'test2', createdAt: date2, data: {} },
          { id: 'str-3', name: 'test3', createdAt: date3, data: {} },
        ],
      });
    });

    it('should accept date as string', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        where: { createdAt: date2.toISOString() },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(1);
      expect(results.map((r) => r.id)).toEqual(['str-2']);
    });

    it('should handle date equals with string', async () => {
      const targetDate = '2025-01-02T00:00:00.000Z';

      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        where: { createdAt: targetDate },
      });
      const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
      expect(results1.length).toBe(1);
      expect(results1.map((r) => r.id)).toEqual(['str-2']);

      const query2 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        where: { createdAt: { equals: targetDate } },
      });
      const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
      expect(results2.length).toBe(1);
      expect(results2.map((r) => r.id)).toEqual(['str-2']);
    });

    it('should handle string operators', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { gt: '2025-01-02T00:00:00.000Z' } },
        orderBy: { id: 'asc' },
      });
      const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
      expect(results1.length).toBe(1);
      expect(results1.map((r) => r.id)).toEqual(['str-3']);

      const query2 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: { createdAt: { lte: '2025-01-02T00:00:00.000Z' } },
        orderBy: { id: 'asc' },
      });
      const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
      expect(results2.length).toBe(2);
      expect(results2.map((r) => r.id)).toEqual(['str-1', 'str-2']);
    });

    it('should handle date string in array', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', id: 'string' },
        where: {
          createdAt: {
            in: [
              '2025-01-01T00:00:00.000Z',
              '2025-01-03T00:00:00.000Z',
              '2025-01-10T00:00:00.000Z',
            ],
          },
        },
        orderBy: { id: 'asc' },
      });
      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['str-1', 'str-3']);
    });
  });

  describe('Date Ordering', () => {
    const oldDate = new Date('2025-01-01T00:00:00.000Z');
    const midDate = new Date('2025-01-03T00:00:00.000Z');
    const newDate = new Date('2025-01-05T00:00:00.000Z');

    beforeEach(async () => {
      // Insert in random order to test ordering
      await prisma.testTable.createMany({
        data: [
          { id: 'order-newest', name: 'newest', createdAt: newDate, data: {} },
          { id: 'order-oldest', name: 'oldest', createdAt: oldDate, data: {} },
          { id: 'order-middle', name: 'middle', createdAt: midDate, data: {} },
        ],
      });
    });

    it('should order by date ascending', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['order-oldest', 'order-middle', 'order-newest']);
    });

    it('should order by date descending', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        orderBy: { createdAt: 'desc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toEqual(['order-newest', 'order-middle', 'order-oldest']);
    });

    it('should combine date filters with ordering', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date' },
        where: { createdAt: { gte: midDate } },
        orderBy: { createdAt: 'asc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['order-middle', 'order-newest']);
    });
  });

  describe('Combined Operations', () => {
    const date1 = new Date('2025-01-01T00:00:00.000Z');
    const date2 = new Date('2025-01-02T00:00:00.000Z');
    const date3 = new Date('2025-01-03T00:00:00.000Z');

    beforeEach(async () => {
      await prisma.testTable.createMany({
        data: [
          { id: 'combo-apple', name: 'Apple', createdAt: date1, data: {} },
          { id: 'combo-banana', name: 'Banana', createdAt: date2, data: {} },
          { id: 'combo-cherry', name: 'Cherry', createdAt: date3, data: {} },
        ],
      });
    });

    it('should combine date and string filters', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', name: 'string' },
        where: {
          name: { contains: 'a' },
          createdAt: { gte: date2 },
        },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(1);
      expect(results.map((r) => r.id)).toEqual(['combo-banana']);
    });

    it('should work with ordering and filtering', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { createdAt: 'date', name: 'string' },
        where: { name: { contains: 'a' } },
        orderBy: { createdAt: 'desc' },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(1);
      expect(results.map((r) => r.id)).toEqual(['combo-banana']);
    });
  });
});
