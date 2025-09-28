import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('JSON Array Operations', () => {
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
            tags: ['admin', 'user', 'typescript'],
            scores: [85, 90, 95],
            products: [
              {
                name: 'Product A',
                price: 99.99,
                tags: ['featured', 'new', 'bestseller'],
                relatedItems: [
                  {
                    id: 'rel-1',
                    name: 'Accessory A1',
                    price: 19.99,
                    tags: ['new', 'popular'],
                  },
                  {
                    id: 'rel-2',
                    name: 'Accessory A2',
                    price: 29.99,
                    tags: ['featured', 'sale'],
                  },
                ],
              },
            ],
            reviews: [
              {
                rating: 4.5,
                comment: 'Great!',
                keywords: ['excellent', 'perfect'],
              },
              {
                rating: 5.0,
                comment: 'Excellent!',
                keywords: ['excellent', 'perfect', 'amazing'],
              },
            ],
            nestedArrays: [['nested1', 'nested2']],
            mixedArray: [1, 'string', { key: 'value' }],
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'User2',
          data: {
            tags: ['user', 'react'],
            scores: [80, 85, 90],
            products: [
              {
                name: 'Product B',
                price: 149.99,
                tags: ['premium', 'featured'],
              },
            ],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'User3',
          data: {
            tags: ['admin', 'moderator', 'express'],
            scores: [90, 95],
            products: [
              {
                name: 'Product C',
                price: 199.99,
                tags: ['premium', 'exclusive'],
              },
            ],
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'User4',
          data: {
            tags: ['user', 'node'],
            scores: [75, 80, 85],
            products: [
              {
                name: 'Product D',
                price: 299.99,
                tags: ['budget', 'basic'],
              },
            ],
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'User5',
          data: {
            tags: ['admin', 'supervisor'],
            scores: [95, 100],
            products: [
              {
                name: 'Product E',
                price: 399.99,
                tags: ['budget', 'exclusive'],
              },
            ],
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should handle array_contains operations', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['tags'], array_contains: ['typescript'] } },
      orderBy: { createdAt: 'asc' },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(1);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['tags'], array_contains: ['react'] } },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['scores'], array_contains: [95] } },
      orderBy: { createdAt: 'asc' },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(3);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['scores'], array_contains: [90] } },
      orderBy: { createdAt: 'asc' },
    });
    const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
    expect(results4.length).toBe(3);

    const query5 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['scores'], array_contains: [90, 85] } },
      orderBy: { createdAt: 'asc' },
    });
    const results5 = await prisma.$queryRaw<{ id: string }[]>(query5);
    expect(results5.length).toBe(2);
  });

  it('should handle array_contains with complex objects', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['products'],
          array_contains: [{ name: 'Product A', price: 99.99 }],
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
          path: ['reviews'],
          array_contains: [{ rating: 4.5, comment: 'Great!' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);
  });

  it('should handle array_starts_with and array_ends_with', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['tags'], array_starts_with: 'admin' } },
      orderBy: { createdAt: 'asc' },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(3);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['tags'], array_starts_with: 'user' } },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(2); // User2, User4

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['tags'], array_ends_with: 'express' } },
      orderBy: { createdAt: 'asc' },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['tags'], array_ends_with: 'react' } },
      orderBy: { createdAt: 'asc' },
    });
    const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
    expect(results4.length).toBe(1);

    const query5 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['scores'], array_starts_with: 85 } },
      orderBy: { createdAt: 'asc' },
    });
    const results5 = await prisma.$queryRaw<{ id: string }[]>(query5);
    expect(results5.length).toBe(1);

    const query6 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: { data: { path: ['scores'], array_ends_with: 95 } },
      orderBy: { createdAt: 'asc' },
    });
    const results6 = await prisma.$queryRaw<{ id: string }[]>(query6);
    expect(results6.length).toBe(2);
  });

  it('should handle array operations with case insensitive mode', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['tags'],
          array_contains: ['TYPESCRIPT'],
          mode: 'insensitive',
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
          path: ['tags'],
          array_starts_with: 'Admin',
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(3);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['tags'],
          array_ends_with: 'EXPRESS',
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);
  });
});
