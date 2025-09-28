import './setup';
import { nanoid } from 'nanoid';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';
import { WhereConditionsTyped } from '../../types';

describe('Boolean Filters', () => {
  let ids = {
    'bool-1': '',
    'bool-2': '',
    'bool-3': '',
    'bool-4': '',
    'bool-5': '',
  };

  const fieldConfig = {
    isActive: 'boolean',
    id: 'string',
    createdAt: 'date',
    name: 'string',
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

    const results = await prisma.$queryRaw<{ id: string }[]>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id)).toEqual(expectedIds);
  };


  beforeEach(async () => {
    ids = {
      'bool-1': nanoid(),
      'bool-2': nanoid(),
      'bool-3': nanoid(),
      'bool-4': nanoid(),
      'bool-5': nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids['bool-1'],
          name: 'Active User 1',
          isActive: true,
          data: {},
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids['bool-2'],
          name: 'Active User 2',
          isActive: true,
          data: {},
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids['bool-3'],
          name: 'Inactive User 1',
          isActive: false,
          data: {},
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids['bool-4'],
          name: 'Inactive User 2',
          isActive: false,
          data: {},
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids['bool-5'],
          name: 'Inactive User 3',
          isActive: false,
          data: {},
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should filter by true value', async () => {
    await testQuery({ isActive: true }, [ids['bool-1'], ids['bool-2']]);
  });

  it('should filter by false value', async () => {
    await testQuery({ isActive: false }, [ids['bool-3'], ids['bool-4'], ids['bool-5']]);
  });

  it('should filter by equals true', async () => {
    await testQuery({ isActive: { equals: true } }, [ids['bool-1'], ids['bool-2']]);
  });

  it('should filter by equals false', async () => {
    await testQuery({ isActive: { equals: false } }, [ids['bool-3'], ids['bool-4'], ids['bool-5']]);
  });

  it('should filter by not true', async () => {
    await testQuery({ isActive: { not: true } }, [ids['bool-3'], ids['bool-4'], ids['bool-5']]);
  });

  it('should filter by not false', async () => {
    await testQuery({ isActive: { not: false } }, [ids['bool-1'], ids['bool-2']]);
  });

  it('should filter by not equals filter', async () => {
    await testQuery({ isActive: { not: { equals: true } } }, [
      ids['bool-3'],
      ids['bool-4'],
      ids['bool-5'],
    ]);
  });

  it('should combine with AND operator', async () => {
    await testQuery(
      {
        AND: [{ isActive: true }, { name: { contains: 'User 1' } }],
      },
      [ids['bool-1']],
    );
  });

  it('should combine with OR operator', async () => {
    await testQuery(
      {
        isActive: false,
        OR: [{ name: { contains: 'User 1' } }, { name: { contains: 'User 2' } }],
      },
      [ids['bool-3'], ids['bool-4']],
    );
  });
});
