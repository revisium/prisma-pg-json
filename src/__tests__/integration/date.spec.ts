import './setup';
import { nanoid } from 'nanoid';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';
import { WhereConditionsTyped } from '../../types';

describe('Date Filters Integration', () => {
  describe('Basic Date Operations', () => {
    let ids = { 'date-1': '', 'date-2': '', 'date-3': '', 'date-4': '', 'date-5': '' };

    const date1 = new Date('2025-01-01T00:00:00.000Z');
    const date2 = new Date('2025-01-02T00:00:00.000Z');
    const date3 = new Date('2025-01-03T00:00:00.000Z');
    const date4 = new Date('2025-01-04T00:00:00.000Z');
    const date5 = new Date('2025-01-05T00:00:00.000Z');

    const fieldConfig = { createdAt: 'date', id: 'string' } as const;

    const testQuery = async (
      where: WhereConditionsTyped<typeof fieldConfig>,
      expectedIds: string[],
    ) => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where,
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(expectedIds.length);
      expect(results.map((r) => r.id)).toEqual(expectedIds);
    };

    beforeEach(async () => {
      ids = {
        'date-1': `date-1-${nanoid()}`,
        'date-2': `date-2-${nanoid()}`,
        'date-3': `date-3-${nanoid()}`,
        'date-4': `date-4-${nanoid()}`,
        'date-5': `date-5-${nanoid()}`,
      };
      await prisma.testTable.createMany({
        data: [
          { id: ids['date-1'], name: 'record1', createdAt: date1, data: {} },
          { id: ids['date-2'], name: 'record2', createdAt: date2, data: {} },
          { id: ids['date-3'], name: 'record3', createdAt: date3, data: {} },
          { id: ids['date-4'], name: 'record4', createdAt: date4, data: {} },
          { id: ids['date-5'], name: 'record5', createdAt: date5, data: {} },
        ],
      });
    });

    it('should filter by exact date', async () => {
      await testQuery({ createdAt: date3 }, [ids['date-3']]);
    });

    it('should filter by equals operator', async () => {
      await testQuery({ createdAt: { equals: date2 } }, [ids['date-2']]);
    });

    it('should filter by greater than', async () => {
      await testQuery({ createdAt: { gt: date3 } }, [ids['date-4'], ids['date-5']]);
    });

    it('should filter by greater than or equal', async () => {
      await testQuery({ createdAt: { gte: date3 } }, [ids['date-3'], ids['date-4'], ids['date-5']]);
    });

    it('should filter by less than', async () => {
      await testQuery({ createdAt: { lt: date3 } }, [ids['date-1'], ids['date-2']]);
    });

    it('should filter by less than or equal', async () => {
      await testQuery({ createdAt: { lte: date3 } }, [ids['date-1'], ids['date-2'], ids['date-3']]);
    });

    it('should filter by date range (gt + lt)', async () => {
      await testQuery(
        {
          createdAt: {
            gt: date2,
            lt: date4,
          },
        },
        [ids['date-3']],
      );
    });

    it('should filter by date range (gte + lte)', async () => {
      await testQuery(
        {
          createdAt: {
            gte: date2,
            lte: date4,
          },
        },
        [ids['date-2'], ids['date-3'], ids['date-4']],
      );
    });

    it('should filter by date range (gt + lte)', async () => {
      await testQuery(
        {
          createdAt: {
            gt: date2,
            lte: date4,
          },
        },
        [ids['date-3'], ids['date-4']],
      );
    });

    it('should filter by date range (gte + lt)', async () => {
      await testQuery(
        {
          createdAt: {
            gte: date2,
            lt: date4,
          },
        },
        [ids['date-2'], ids['date-3']],
      );
    });

    it('should filter by in operator', async () => {
      await testQuery({ createdAt: { in: [date1, date3, date5] } }, [
        ids['date-1'],
        ids['date-3'],
        ids['date-5'],
      ]);
    });

    it('should filter by notIn operator', async () => {
      await testQuery({ createdAt: { notIn: [date1, date5] } }, [
        ids['date-2'],
        ids['date-3'],
        ids['date-4'],
      ]);
    });

    it('should filter by not equals', async () => {
      await testQuery({ createdAt: { not: date3 } }, [
        ids['date-1'],
        ids['date-2'],
        ids['date-4'],
        ids['date-5'],
      ]);
    });

    it('should filter by not filter object', async () => {
      await testQuery({ createdAt: { not: { gte: date4 } } }, [
        ids['date-1'],
        ids['date-2'],
        ids['date-3'],
      ]);
    });
  });

  describe('Date String Handling', () => {
    let ids = { 'str-1': '', 'str-2': '', 'str-3': '' };
    const date1 = new Date('2025-01-01T00:00:00.000Z');
    const date2 = new Date('2025-01-02T00:00:00.000Z');
    const date3 = new Date('2025-01-03T00:00:00.000Z');

    const fieldConfig = { createdAt: 'date', id: 'string' } as const;

    const testQuery = async (
      where: WhereConditionsTyped<typeof fieldConfig>,
      expectedIds: string[],
    ) => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where,
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(expectedIds.length);
      expect(results.map((r) => r.id)).toEqual(expectedIds);
    };

    beforeEach(async () => {
      ids = { 'str-1': nanoid(), 'str-2': nanoid(), 'str-3': nanoid() };
      await prisma.testTable.createMany({
        data: [
          { id: ids['str-1'], name: 'test1', createdAt: date1, data: {} },
          { id: ids['str-2'], name: 'test2', createdAt: date2, data: {} },
          { id: ids['str-3'], name: 'test3', createdAt: date3, data: {} },
        ],
      });
    });

    it('should accept date as string', async () => {
      await testQuery({ createdAt: date2.toISOString() }, [ids['str-2']]);
    });

    it('should handle date equals with string', async () => {
      const targetDate = '2025-01-02T00:00:00.000Z';

      await testQuery({ createdAt: targetDate }, [ids['str-2']]);
      await testQuery({ createdAt: { equals: targetDate } }, [ids['str-2']]);
    });

    it('should handle string operators', async () => {
      await testQuery({ createdAt: { gt: '2025-01-02T00:00:00.000Z' } }, [ids['str-3']]);
      await testQuery({ createdAt: { lte: '2025-01-02T00:00:00.000Z' } }, [
        ids['str-1'],
        ids['str-2'],
      ]);
    });

    it('should handle date string in array', async () => {
      await testQuery(
        {
          createdAt: {
            in: [
              '2025-01-01T00:00:00.000Z',
              '2025-01-03T00:00:00.000Z',
              '2025-01-10T00:00:00.000Z',
            ],
          },
        },
        [ids['str-1'], ids['str-3']],
      );
    });
  });

  describe('Date Ordering', () => {
    let ids = { 'order-newest': '', 'order-oldest': '', 'order-middle': '' };
    const oldDate = new Date('2025-01-01T00:00:00.000Z');
    const midDate = new Date('2025-01-03T00:00:00.000Z');
    const newDate = new Date('2025-01-05T00:00:00.000Z');

    const fieldConfig = { createdAt: 'date' } as const;

    const testQuery = async (
      where: WhereConditionsTyped<typeof fieldConfig> | undefined,
      orderBy: 'asc' | 'desc',
      expectedIds: string[],
    ) => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        where,
        orderBy: { createdAt: orderBy },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(expectedIds.length);
      expect(results.map((r) => r.id)).toEqual(expectedIds);
    };

    beforeEach(async () => {
      ids = { 'order-newest': nanoid(), 'order-oldest': nanoid(), 'order-middle': nanoid() };
      await prisma.testTable.createMany({
        data: [
          { id: ids['order-newest'], name: 'newest', createdAt: newDate, data: {} },
          { id: ids['order-oldest'], name: 'oldest', createdAt: oldDate, data: {} },
          { id: ids['order-middle'], name: 'middle', createdAt: midDate, data: {} },
        ],
      });
    });

    it('should order by date ascending', async () => {
      await testQuery(undefined, 'asc', [
        ids['order-oldest'],
        ids['order-middle'],
        ids['order-newest'],
      ]);
    });

    it('should order by date descending', async () => {
      await testQuery(undefined, 'desc', [
        ids['order-newest'],
        ids['order-middle'],
        ids['order-oldest'],
      ]);
    });

    it('should combine date filters with ordering', async () => {
      await testQuery({ createdAt: { gte: midDate } }, 'asc', [
        ids['order-middle'],
        ids['order-newest'],
      ]);
    });
  });

  describe('Combined Operations', () => {
    let ids = { 'combo-apple': '', 'combo-banana': '', 'combo-cherry': '' };
    const date1 = new Date('2025-01-01T00:00:00.000Z');
    const date2 = new Date('2025-01-02T00:00:00.000Z');
    const date3 = new Date('2025-01-03T00:00:00.000Z');

    const fieldConfig = { createdAt: 'date', name: 'string' } as const;

    const testQuery = async (
      where: WhereConditionsTyped<typeof fieldConfig>,
      expectedIds: string[],
    ) => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: { createdAt: 'asc' },
        where,
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(expectedIds.length);
      expect(results.map((r) => r.id)).toEqual(expectedIds);
    };

    const testQueryOrdered = async (
      where: WhereConditionsTyped<typeof fieldConfig>,
      orderBy: 'asc' | 'desc',
      expectedIds: string[],
    ) => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        where,
        orderBy: { createdAt: orderBy },
      });

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      expect(results.length).toBe(expectedIds.length);
      expect(results.map((r) => r.id)).toEqual(expectedIds);
    };

    beforeEach(async () => {
      ids = { 'combo-apple': nanoid(), 'combo-banana': nanoid(), 'combo-cherry': nanoid() };
      await prisma.testTable.createMany({
        data: [
          { id: ids['combo-apple'], name: 'Apple', createdAt: date1, data: {} },
          { id: ids['combo-banana'], name: 'Banana', createdAt: date2, data: {} },
          { id: ids['combo-cherry'], name: 'Cherry', createdAt: date3, data: {} },
        ],
      });
    });

    it('should combine date and string filters', async () => {
      await testQuery(
        {
          name: { contains: 'a' },
          createdAt: { gte: date2 },
        },
        [ids['combo-banana']],
      );
    });

    it('should work with ordering and filtering', async () => {
      await testQueryOrdered({ name: { contains: 'a' } }, 'desc', [ids['combo-banana']]);
    });
  });
});
