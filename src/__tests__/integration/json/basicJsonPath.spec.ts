import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('Basic JSON Path Operations', () => {
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
          name: 'Alice',
          data: {
            name: 'Alice',
            age: 35,
            title: 'Senior Developer',
            category: 'admin',
            isActive: true,
            user: {
              profile: {
                settings: {
                  theme: 'dark',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'Bob',
          data: {
            name: 'Bob',
            age: 30,
            title: 'Developer',
            category: 'user',
            isActive: true,
            user: {
              profile: {
                settings: {
                  theme: 'light',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'Charlie',
          data: {
            name: 'Charlie',
            age: 25,
            title: 'Junior Developer',
            category: 'user',
            isActive: false,
            user: {
              profile: {
                settings: {
                  theme: 'dark',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'Diana',
          data: {
            name: 'Diana',
            age: 28,
            title: 'QA Engineer',
            category: 'admin',
            isActive: false,
            user: {
              profile: {
                settings: {
                  theme: 'light',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'Eve',
          data: {
            name: 'Eve',
            age: 32,
            title: 'DevOps Engineer',
            category: 'user',
            isActive: true,
            user: {
              profile: {
                settings: {
                  theme: 'light',
                },
              },
            },
          },
          meta: {},
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should handle JSON path equals operations', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['name'], equals: 'Alice' } },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(1);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], equals: 35 } },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], equals: 30 } },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['isActive'], equals: true } },
    });
    const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
    expect(results4.length).toBe(3);

    const query5 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['isActive'], equals: false } },
    });
    const results5 = await prisma.$queryRaw<{ id: string }[]>(query5);
    expect(results5.length).toBe(2);

    const query6 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['user', 'profile', 'settings'],
          equals: { theme: 'dark' },
        },
      },
    });
    const results6 = await prisma.$queryRaw<{ id: string }[]>(query6);
    expect(results6.length).toBe(2);
  });

  it('should handle JSON string operations', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['title'], string_contains: 'Developer' } },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(3);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['title'], string_starts_with: 'Senior' } },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['title'], string_ends_with: 'Developer' } },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(3);
  });

  it('should handle JSON numeric comparisons', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], gt: 30 } },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(2);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], gte: 30 } },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(3);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], lt: 30 } },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], lte: 30 } },
    });
    const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
    expect(results4.length).toBe(3);

    const query5 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], gt: 25, lt: 35 } },
    });
    const results5 = await prisma.$queryRaw<{ id: string }[]>(query5);
    expect(results5.length).toBe(3); // Bob(30), Diana(28), Eve(32)

    const query6 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['age'], gte: 25, lte: 35 } },
    });
    const results6 = await prisma.$queryRaw<{ id: string }[]>(query6);
    expect(results6.length).toBe(5);
  });

  it('should handle JSON not operation', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['name'], not: 'Alice' } },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(4);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: ['category'], not: 'admin' } },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(3);
  });

  it('should handle JSON case insensitive mode', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: { path: ['name'], equals: 'alice', mode: 'insensitive' },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(1);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['title'],
          string_contains: 'DEVELOPER',
          mode: 'insensitive',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(3);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['title'],
          string_starts_with: 'SENIOR',
          mode: 'insensitive',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['title'],
          string_ends_with: 'DEVELOPER',
          mode: 'insensitive',
        },
      },
    });
    const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
    expect(results4.length).toBe(3);
  });

  it('should handle meta field operations', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { meta: 'json' },
      where: { meta: { path: [], equals: {} } },
    });
    const results = await prisma.$queryRaw<{ id: string }[]>(query);
    expect(results.length).toBe(5);
  });
});
