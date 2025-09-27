import './setup';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

describe('String Filters Integration Tests', () => {
  beforeEach(async () => {
    await prisma.testTable.createMany({
      data: [
        { id: '1', name: 'Alice', data: { category: 'admin' }, meta: {} },
        { id: '2', name: 'Bob', data: { category: 'user' }, meta: {} },
        { id: '3', name: 'Charlie', data: { category: 'user' }, meta: {} },
      ],
    });
  });

  it('should filter by exact string match', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      where: {
        name: 'Alice',
      },
    });

    const results = await prisma.$queryRaw(query);
    expect(results).toHaveLength(1);
    expect((results as Array<{ name: string }>)[0].name).toBe('Alice');
  });

  it('should filter with contains', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      where: {
        name: {
          contains: 'li',
        },
      },
    });

    const results = await prisma.$queryRaw(query);
    expect(results).toHaveLength(2);
  });

  it('should filter with startsWith', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      where: {
        name: {
          startsWith: 'A',
        },
      },
    });

    const results = await prisma.$queryRaw(query);
    expect(results).toHaveLength(1);
    expect((results as Array<{ name: string }>)[0].name).toBe('Alice');
  });

  it('should filter with case insensitive mode', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      where: {
        name: {
          equals: 'alice',
          mode: 'insensitive',
        },
      },
    });

    const results = await prisma.$queryRaw(query);
    expect(results).toHaveLength(1);
    expect((results as Array<{ name: string }>)[0].name).toBe('Alice');
  });

  it('should filter with AND conditions', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      where: {
        AND: [{ name: { startsWith: 'B' } }, { name: { endsWith: 'b' } }],
      },
    });

    const results = await prisma.$queryRaw(query);
    expect(results).toHaveLength(1);
    expect((results as Array<{ name: string }>)[0].name).toBe('Bob');
  });

  it('should filter with OR conditions', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      where: {
        OR: [{ name: 'Alice' }, { name: 'Bob' }],
      },
    });

    const results = await prisma.$queryRaw(query);
    expect(results).toHaveLength(2);
  });

  it('should filter with NOT condition', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      where: {
        NOT: {
          name: 'Alice',
        },
      },
    });

    const results = await prisma.$queryRaw(query);
    expect(results).toHaveLength(2);
  });
});