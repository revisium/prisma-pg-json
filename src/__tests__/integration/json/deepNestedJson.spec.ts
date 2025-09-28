import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('Deep Nested JSON Operations', () => {
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
          name: 'User1',
          data: {
            user: {
              profile: {
                name: 'Alice Profile',
                settings: { theme: 'dark' },
              },
              age: 35,
            },
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'User2',
          data: {
            user: {
              profile: {
                name: 'Bob Profile',
                settings: { theme: 'light' },
              },
              age: 30,
            },
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'User3',
          data: {
            user: {
              profile: {
                name: 'Charlie Profile',
                settings: { theme: 'dark' },
              },
              age: 25,
            },
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'User4',
          data: {
            user: {
              profile: {
                name: 'Diana Profile',
                settings: { theme: 'light' },
              },
              age: 40,
            },
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'User5',
          data: {
            user: {
              profile: {
                name: 'Eve Profile',
                settings: { theme: 'light' },
              },
              age: 28,
            },
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should handle deeply nested path operations', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'profile', 'name'],
          string_contains: 'Profile',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(5);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          equals: 'dark',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(2);
  });

  it('should handle nested path with comparisons', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'age'],
          gte: 30,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results = await prisma.$queryRaw<{ id: string }[]>(query);
    expect(results.length).toBe(3);
  });

  it('should handle nested path string operations', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'profile', 'name'],
          string_contains: 'Alice',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(1);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'profile', 'name'],
          string_ends_with: 'Profile',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(5);
  });

  it('should handle multiple levels of nesting with various operators', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          string_contains: 'dark',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(2);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          not: 'dark',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(3);
  });

  it('should handle nested numeric fields', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'age'],
          lt: 30,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(2);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'age'],
          gt: 30,
          lt: 40,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);
  });

  it('should handle nested case insensitive operations', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['user', 'profile', 'settings', 'theme'],
          equals: 'DARK',
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results = await prisma.$queryRaw<{ id: string }[]>(query);
    expect(results.length).toBe(2);
  });
});
