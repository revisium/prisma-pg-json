import './setup';
import { nanoid } from 'nanoid';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';
import { WhereConditionsTyped } from '../../types';

describe('String Filters Integration', () => {
  let ids = {
    'str-1': '',
    'str-2': '',
    'str-3': '',
    'str-4': '',
    'str-5': '',
  };

  const fieldConfig = {
    id: 'string',
    name: 'string',
    hash: 'string',
    schemaHash: 'string',
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
      'str-1': nanoid(),
      'str-2': nanoid(),
      'str-3': nanoid(),
      'str-4': nanoid(),
      'str-5': nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids['str-1'],
          name: 'json-test-aa1',
          hash: '1',
          schemaHash: 'cat dog',
          data: {},
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids['str-2'],
          name: 'json-test-aA2',
          hash: '2',
          schemaHash: 'cat bird',
          data: {},
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids['str-3'],
          name: 'json-test-bb1',
          hash: '3',
          schemaHash: 'dog fish',
          data: {},
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids['str-4'],
          name: 'json-test-bb2',
          hash: '4',
          schemaHash: 'cat dog elephant',
          data: {},
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids['str-5'],
          name: 'json-test-cc1',
          hash: '5',
          schemaHash: 'bird fish',
          data: {},
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should handle string equals', async () => {
    await testQuery({ name: 'json-test-aa1' }, [ids['str-1']]);
    await testQuery({ name: { equals: 'json-test-cc1' } }, [ids['str-5']]);
  });

  it('should handle string contains', async () => {
    await testQuery({ name: { contains: 'json-test-a' } }, [ids['str-1'], ids['str-2']]);
    await testQuery({ name: { contains: 'test-b' } }, [ids['str-3'], ids['str-4']]);
  });

  it('should handle string startsWith', async () => {
    await testQuery({ name: { startsWith: 'json-test-a' } }, [ids['str-1'], ids['str-2']]);
    await testQuery({ name: { startsWith: 'json-test-b' } }, [ids['str-3'], ids['str-4']]);
    await testQuery({ name: { startsWith: 'json-test-c' } }, [ids['str-5']]);
  });

  it('should handle string endsWith', async () => {
    await testQuery({ name: { endsWith: 'aa1' } }, [ids['str-1']]);
    await testQuery({ name: { endsWith: 'aA2' } }, [ids['str-2']]);
  });

  it('should handle string in array', async () => {
    await testQuery(
      {
        name: {
          in: ['json-test-aa1', 'json-test-aA2', 'nonexistent'],
        },
      },
      [ids['str-1'], ids['str-2']],
    );
  });

  it('should handle string notIn array', async () => {
    await testQuery(
      {
        name: {
          notIn: ['json-test-aa1', 'json-test-cc1'],
        },
      },
      [ids['str-2'], ids['str-3'], ids['str-4']],
    );
  });

  it('should handle string gt operation', async () => {
    await testQuery({ hash: { gt: '3' } }, [ids['str-4'], ids['str-5']]);
  });

  it('should handle string gte operation', async () => {
    await testQuery({ hash: { gte: '3' } }, [ids['str-3'], ids['str-4'], ids['str-5']]);
  });

  it('should handle string lt operation', async () => {
    await testQuery({ hash: { lt: '4' } }, [ids['str-1'], ids['str-2'], ids['str-3']]);
  });

  it('should handle string lte operation', async () => {
    await testQuery({ hash: { lte: '4' } }, [
      ids['str-1'],
      ids['str-2'],
      ids['str-3'],
      ids['str-4'],
    ]);
  });

  it('should handle string range (gt + lt)', async () => {
    await testQuery(
      {
        hash: {
          gt: '2',
          lt: '4',
        },
      },
      [ids['str-3']],
    );
  });

  it('should handle string range (gte + lt)', async () => {
    await testQuery(
      {
        hash: {
          gte: '2',
          lt: '4',
        },
      },
      [ids['str-2'], ids['str-3']],
    );
  });

  it('should handle string range (gt + lte)', async () => {
    await testQuery(
      {
        hash: {
          gt: '2',
          lte: '5',
        },
      },
      [ids['str-3'], ids['str-4'], ids['str-5']],
    );
  });

  it('should handle string range (gte + lte)', async () => {
    await testQuery(
      {
        hash: {
          gte: '1',
          lte: '4',
        },
      },
      [ids['str-1'], ids['str-2'], ids['str-3'], ids['str-4']],
    );
  });

  it('should handle string case insensitive mode', async () => {
    await testQuery({ name: { contains: 'aa', mode: 'insensitive' } }, [
      ids['str-1'],
      ids['str-2'],
    ]);
    await testQuery({ name: { startsWith: 'JSON-TEST-A', mode: 'insensitive' } }, [
      ids['str-1'],
      ids['str-2'],
    ]);
    await testQuery({ name: { endsWith: 'AA1', mode: 'insensitive' } }, [ids['str-1']]);
    await testQuery({ name: { equals: 'JSON-TEST-AA1', mode: 'insensitive' } }, [ids['str-1']]);
    await testQuery({ name: { not: 'JSON-TEST-AA1', mode: 'insensitive' } }, [
      ids['str-2'],
      ids['str-3'],
      ids['str-4'],
      ids['str-5'],
    ]);
    await testQuery({ name: { notIn: ['JSON-TEST-AA1', 'JSON-TEST-AA2'], mode: 'insensitive' } }, [
      ids['str-3'],
      ids['str-4'],
      ids['str-5'],
    ]);
    await testQuery({ name: { in: ['JSON-TEST-AA1', 'JSON-TEST-AA2'], mode: 'insensitive' } }, [
      ids['str-1'],
      ids['str-2'],
    ]);
  });

  it('should handle string not operation', async () => {
    await testQuery({ name: { not: 'json-test-aa1' } }, [
      ids['str-2'],
      ids['str-3'],
      ids['str-4'],
      ids['str-5'],
    ]);
  });

  it('should handle string search operation', async () => {
    await testQuery({ schemaHash: { search: 'cat' } }, [
      ids['str-1'],
      ids['str-2'],
      ids['str-4'],
    ]);
    await testQuery({ schemaHash: { search: 'dog' } }, [
      ids['str-1'],
      ids['str-3'],
      ids['str-4'],
    ]);
    await testQuery({ schemaHash: { search: 'cat | dog' } }, [ids['str-1'], ids['str-4']]);
    await testQuery({ schemaHash: { search: 'CAT | DOG' } }, [ids['str-1'], ids['str-4']]);
    await testQuery({ schemaHash: { search: 'cat & dog' } }, [ids['str-1'], ids['str-4']]);
    await testQuery({ schemaHash: { search: 'CAT & DOG' } }, [ids['str-1'], ids['str-4']]);
  });
});
