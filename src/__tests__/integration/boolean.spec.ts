import './setup';
import { prisma } from './setup';
import { buildQuery } from '../../query-builder';

describe('Boolean Filters', () => {
  beforeEach(async () => {
    await prisma.testTable.createMany({
      data: [
        { id: 'bool-1', name: 'Active User 1', isActive: true, data: {} },
        { id: 'bool-2', name: 'Active User 2', isActive: true, data: {} },
        { id: 'bool-3', name: 'Inactive User 1', isActive: false, data: {} },
        { id: 'bool-4', name: 'Inactive User 2', isActive: false, data: {} },
        { id: 'bool-5', name: 'Inactive User 3', isActive: false, data: {} },
      ],
    });
  });

  it('should filter by true value', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', id: 'string' },
      orderBy: { id: 'asc' },
      where: { isActive: true },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(2);
  });

  it('should filter by false value', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', id: 'string' },
      orderBy: { id: 'asc' },
      where: { isActive: false },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(3);
  });

  it('should filter by equals true', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', id: 'string' },
      orderBy: { id: 'asc' },
      where: { isActive: { equals: true } },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(2);
  });

  it('should filter by equals false', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', id: 'string' },
      orderBy: { id: 'asc' },
      where: { isActive: { equals: false } },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(3);
  });

  it('should filter by not true', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', id: 'string' },
      orderBy: { id: 'asc' },
      where: { isActive: { not: true } },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(3);
  });

  it('should filter by not false', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', id: 'string' },
      orderBy: { id: 'asc' },
      where: { isActive: { not: false } },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(2);
  });

  it('should filter by not equals filter', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', id: 'string' },
      orderBy: { id: 'asc' },
      where: { isActive: { not: { equals: true } } },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(3);
  });

  it('should combine with AND operator', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', name: 'string' },
      where: {
        AND: [{ isActive: true }, { name: { contains: 'User 1' } }],
      },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(1);
  });

  it('should combine with OR operator', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { isActive: 'boolean', name: 'string' },
      where: {
        isActive: false,
        OR: [{ name: { contains: 'User 1' } }, { name: { contains: 'User 2' } }],
      },
    });

    const results = await prisma.$queryRaw<unknown[]>(query);
    expect(results.length).toBe(2);
  });
});
