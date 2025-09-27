import './setup';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

describe('Number Filters', () => {
  beforeEach(async () => {
    await prisma.testTable.createMany({
      data: [
        { id: 'num-1', name: 'Alice', age: 25, score: 85.5, data: {} },
        { id: 'num-2', name: 'Bob', age: 30, score: 90.0, data: {} },
        { id: 'num-3', name: 'Charlie', age: 18, score: 75.3, data: {} },
        { id: 'num-4', name: 'David', age: 45, score: 95.7, data: {} },
        { id: 'num-5', name: 'Eve', age: null, score: null, data: {} },
      ],
    });
  });

  it('should filter by exact number', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: 30 },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(1);
    expect(results.map((r) => r.id)).toEqual(['num-2']);
  });

  it('should filter by equals operator', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { equals: 25 } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(1);
    expect(results.map((r) => r.id)).toEqual(['num-1']);
  });

  it('should filter by greater than', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { gt: 30 } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(1);
    expect(results.map((r) => r.id)).toEqual(['num-4']);
  });

  it('should filter by greater than or equal', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { gte: 30 } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual(['num-2', 'num-4']);
  });

  it('should filter by less than', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { lt: 30 } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual(['num-1', 'num-3']);
  });

  it('should filter by less than or equal', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { lte: 30 } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(3);
    expect(results.map((r) => r.id)).toEqual(['num-1', 'num-2', 'num-3']);
  });

  it('should filter by range (gte and lte)', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: {
        age: {
          gte: 20,
          lte: 35,
        },
      },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual(['num-1', 'num-2']);
  });

  it('should filter by in operator', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { in: [18, 30, 45] } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(3);
    expect(results.map((r) => r.id)).toEqual(['num-2', 'num-3', 'num-4']);
  });

  it('should filter by notIn operator', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { notIn: [18, 45] } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual(['num-1', 'num-2']);
  });

  it('should filter by not equals', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { not: 30 } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(3);
    expect(results.map((r) => r.id)).toEqual(['num-1', 'num-3', 'num-4']);
  });

  it('should filter by not filter object', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { age: { not: { gte: 30 } } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual(['num-1', 'num-3']);
  });

  it('should filter float numbers', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { score: 'number', id: 'string' },
      orderBy: { id: 'asc' },
      where: { score: { gte: 90.0 } },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(2);
  });

  it('should combine number filters with other filters', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { age: 'number', name: 'string' },
      where: {
        name: { contains: 'e' },
        age: { gte: 20 },
      },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(1);
    expect(results.map((r) => r.id)).toEqual(['num-1']);
  });
});
