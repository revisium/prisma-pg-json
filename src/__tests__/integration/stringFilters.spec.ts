import './setup';
import { nanoid } from 'nanoid';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

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
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: 'json-test-aa1' },
    });
    const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
    expect(results1.length).toBe(1);
    expect(results1.map((r) => r.id)).toEqual([ids['str-1']]);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { equals: 'json-test-cc1' } },
    });
    const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
    expect(results2.length).toBe(1);
    expect(results2.map((r) => r.id)).toEqual([ids['str-5']]);
  });

  it('should handle string contains', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { contains: 'json-test-a' } },
    });
    const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
    expect(results1.length).toBe(2);
    expect(results1.map((r) => r.id).sort()).toEqual([ids['str-1'], ids['str-2']].sort());

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { contains: 'test-b' } },
    });
    const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
    expect(results2.length).toBe(2);
    expect(results2.map((r) => r.id).sort()).toEqual([ids['str-3'], ids['str-4']].sort());
  });

  it('should handle string startsWith', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { startsWith: 'json-test-a' } },
    });
    const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
    expect(results1.length).toBe(2);
    expect(results1.map((r) => r.id).sort()).toEqual([ids['str-1'], ids['str-2']].sort());

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { startsWith: 'json-test-b' } },
    });
    const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
    expect(results2.length).toBe(2);
    expect(results2.map((r) => r.id).sort()).toEqual([ids['str-3'], ids['str-4']].sort());

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { startsWith: 'json-test-c' } },
    });
    const results3 = await prisma.$queryRaw<Array<{ id: string }>>(query3);
    expect(results3.length).toBe(1);
    expect(results3.map((r) => r.id)).toEqual([ids['str-5']]);
  });

  it('should handle string endsWith', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { endsWith: 'aa1' } },
    });
    const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
    expect(results1.length).toBe(1);
    expect(results1.map((r) => r.id)).toEqual([ids['str-1']]);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { endsWith: 'aA2' } },
    });
    const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
    expect(results2.length).toBe(1);
    expect(results2.map((r) => r.id)).toEqual([ids['str-2']]);
  });

  it('should handle string in array', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        name: {
          in: ['json-test-aa1', 'json-test-aA2', 'nonexistent'],
        },
      },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual([ids['str-1'], ids['str-2']]);
  });

  it('should handle string notIn array', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        name: {
          notIn: ['json-test-aa1', 'json-test-cc1'],
        },
      },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(3);
    expect(results.map((r) => r.id).sort()).toEqual(
      [ids['str-2'], ids['str-3'], ids['str-4']].sort(),
    );
  });

  it('should handle string gt operation', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { hash: { gt: '3' } },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id).sort()).toEqual([ids['str-4'], ids['str-5']].sort());
  });

  it('should handle string gte operation', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { hash: { gte: '3' } },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(3);
    expect(results.map((r) => r.id).sort()).toEqual(
      [ids['str-3'], ids['str-4'], ids['str-5']].sort(),
    );
  });

  it('should handle string lt operation', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { hash: { lt: '4' } },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(3);
    expect(results.map((r) => r.id).sort()).toEqual(
      [ids['str-1'], ids['str-2'], ids['str-3']].sort(),
    );
  });

  it('should handle string lte operation', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { hash: { lte: '4' } },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(4);
    expect(results.map((r) => r.id).sort()).toEqual(
      [ids['str-1'], ids['str-2'], ids['str-3'], ids['str-4']].sort(),
    );
  });

  it('should handle string range (gt + lt)', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        hash: {
          gt: '2',
          lt: '4',
        },
      },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(1);
    expect(results.map((r) => r.id)).toEqual([ids['str-3']]);
  });

  it('should handle string range (gte + lt)', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        hash: {
          gte: '2',
          lt: '4',
        },
      },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual([ids['str-2'], ids['str-3']]);
  });

  it('should handle string range (gt + lte)', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        hash: {
          gt: '2',
          lte: '5',
        },
      },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(3);
    expect(results.map((r) => r.id).sort()).toEqual(
      [ids['str-3'], ids['str-4'], ids['str-5']].sort(),
    );
  });

  it('should handle string range (gte + lte)', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        hash: {
          gte: '1',
          lte: '4',
        },
      },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(4);
    expect(results.map((r) => r.id).sort()).toEqual(
      [ids['str-1'], ids['str-2'], ids['str-3'], ids['str-4']].sort(),
    );
  });

  it('should handle string case insensitive mode', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { contains: 'aa', mode: 'insensitive' } },
    });
    const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
    expect(results1.length).toBe(2);
    expect(results1.map((r) => r.id).sort()).toEqual([ids['str-1'], ids['str-2']].sort());

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { startsWith: 'JSON-TEST-A', mode: 'insensitive' } },
    });
    const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
    expect(results2.length).toBe(2);
    expect(results2.map((r) => r.id)).toEqual([ids['str-1'], ids['str-2']]);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { endsWith: 'AA1', mode: 'insensitive' } },
    });
    const results3 = await prisma.$queryRaw<Array<{ id: string }>>(query3);
    expect(results3.length).toBe(1);
    expect(results3.map((r) => r.id)).toEqual([ids['str-1']]);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { equals: 'JSON-TEST-AA1', mode: 'insensitive' } },
    });
    const results4 = await prisma.$queryRaw<Array<{ id: string }>>(query4);
    expect(results4.length).toBe(1);
    expect(results4.map((r) => r.id)).toEqual([ids['str-1']]);

    const query5 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { not: 'JSON-TEST-AA1', mode: 'insensitive' } },
    });
    const results5 = await prisma.$queryRaw<Array<{ id: string }>>(query5);
    expect(results5.length).toBe(4);
    expect(results5.map((r) => r.id).sort()).toEqual(
      [ids['str-2'], ids['str-3'], ids['str-4'], ids['str-5']].sort(),
    );

    const query6 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        name: { notIn: ['JSON-TEST-AA1', 'JSON-TEST-AA2'], mode: 'insensitive' },
      },
    });
    const results6 = await prisma.$queryRaw<Array<{ id: string }>>(query6);
    expect(results6.length).toBe(3);
    expect(results6.map((r) => r.id)).toEqual([ids['str-3'], ids['str-4'], ids['str-5']]);

    const query7 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: {
        name: { in: ['JSON-TEST-AA1', 'JSON-TEST-AA2'], mode: 'insensitive' },
      },
    });
    const results7 = await prisma.$queryRaw<Array<{ id: string }>>(query7);
    expect(results7.length).toBe(2);
    expect(results7.map((r) => r.id)).toEqual([ids['str-1'], ids['str-2']]);
  });

  it('should handle string not operation', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { name: { not: 'json-test-aa1' } },
    });
    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(4);
    expect(results.map((r) => r.id)).toEqual([
      ids['str-2'],
      ids['str-3'],
      ids['str-4'],
      ids['str-5'],
    ]);
  });

  it('should handle string search operation', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { schemaHash: { search: 'cat' } },
    });
    const results1 = await prisma.$queryRaw<Array<{ id: string }>>(query1);
    expect(results1.length).toBe(3);
    expect(results1.map((r) => r.id).sort()).toEqual(
      [ids['str-1'], ids['str-2'], ids['str-4']].sort(),
    );

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { schemaHash: { search: 'dog' } },
    });
    const results2 = await prisma.$queryRaw<Array<{ id: string }>>(query2);
    expect(results2.length).toBe(3);
    expect(results2.map((r) => r.id).sort()).toEqual(
      [ids['str-1'], ids['str-3'], ids['str-4']].sort(),
    );

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { schemaHash: { search: 'cat | dog' } },
    });
    const results3 = await prisma.$queryRaw<Array<{ id: string }>>(query3);
    expect(results3.length).toBe(2);
    expect(results3.map((r) => r.id).sort()).toEqual([ids['str-1'], ids['str-4']].sort());

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { schemaHash: { search: 'CAT | DOG' } },
    });
    const results4 = await prisma.$queryRaw<Array<{ id: string }>>(query4);
    expect(results4.length).toBe(2);
    expect(results4.map((r) => r.id)).toEqual([ids['str-1'], ids['str-4']]);

    const query5 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { schemaHash: { search: 'cat & dog' } },
    });
    const results5 = await prisma.$queryRaw<Array<{ id: string }>>(query5);
    expect(results5.length).toBe(2);
    expect(results5.map((r) => r.id)).toEqual([ids['str-1'], ids['str-4']]);

    const query6 = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      orderBy: { createdAt: 'asc' },
      where: { schemaHash: { search: 'CAT & DOG' } },
    });
    const results6 = await prisma.$queryRaw<Array<{ id: string }>>(query6);
    expect(results6.length).toBe(2);
    expect(results6.map((r) => r.id)).toEqual([ids['str-1'], ids['str-4']]);
  });
});
