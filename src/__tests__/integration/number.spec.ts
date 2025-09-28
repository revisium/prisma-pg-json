import './setup';
import { nanoid } from 'nanoid';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';
import { WhereConditionsTyped } from '../../types';

describe('Number Filters', () => {
  let ids = { 'num-1': '', 'num-2': '', 'num-3': '', 'num-4': '', 'num-5': '' };
  const fieldConfig = {
    age: 'number',
    score: 'number',
    name: 'string',
    id: 'string',
    createdAt: 'date',
  } as const;

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
      'num-1': nanoid(),
      'num-2': nanoid(),
      'num-3': nanoid(),
      'num-4': nanoid(),
      'num-5': nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids['num-1'],
          name: 'Alice',
          age: 25,
          score: 85.5,
          data: {},
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids['num-2'],
          name: 'Bob',
          age: 30,
          score: 90.0,
          data: {},
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids['num-3'],
          name: 'Charlie',
          age: 18,
          score: 75.3,
          data: {},
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids['num-4'],
          name: 'David',
          age: 45,
          score: 95.7,
          data: {},
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids['num-5'],
          name: 'Eve',
          age: null,
          score: null,
          data: {},
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should filter by exact number', async () => {
    await testQuery({ age: 30 }, [ids['num-2']]);
  });

  it('should filter by equals operator', async () => {
    await testQuery({ age: { equals: 25 } }, [ids['num-1']]);
  });

  it('should filter by greater than', async () => {
    await testQuery({ age: { gt: 30 } }, [ids['num-4']]);
  });

  it('should filter by greater than or equal', async () => {
    await testQuery({ age: { gte: 30 } }, [ids['num-2'], ids['num-4']]);
  });

  it('should filter by less than', async () => {
    await testQuery({ age: { lt: 30 } }, [ids['num-1'], ids['num-3']]);
  });

  it('should filter by less than or equal', async () => {
    await testQuery({ age: { lte: 30 } }, [ids['num-1'], ids['num-2'], ids['num-3']]);
  });

  it('should filter by range (gte and lte)', async () => {
    await testQuery(
      {
        age: {
          gte: 20,
          lte: 35,
        },
      },
      [ids['num-1'], ids['num-2']],
    );
  });

  it('should filter by in operator', async () => {
    await testQuery({ age: { in: [18, 30, 45] } }, [ids['num-2'], ids['num-3'], ids['num-4']]);
  });

  it('should filter by notIn operator', async () => {
    await testQuery({ age: { notIn: [18, 45] } }, [ids['num-1'], ids['num-2']]);
  });

  it('should filter by not equals', async () => {
    await testQuery({ age: { not: 30 } }, [ids['num-1'], ids['num-3'], ids['num-4']]);
  });

  it('should filter by not filter object', async () => {
    await testQuery({ age: { not: { gte: 30 } } }, [ids['num-1'], ids['num-3']]);
  });

  it('should filter float numbers', async () => {
    await testQuery({ score: { gte: 90.0 } }, [ids['num-2'], ids['num-4']]);
  });

  it('should combine number filters with other filters', async () => {
    await testQuery(
      {
        name: { contains: 'e' },
        age: { gte: 20 },
      },
      [ids['num-1']],
    );
  });
});
