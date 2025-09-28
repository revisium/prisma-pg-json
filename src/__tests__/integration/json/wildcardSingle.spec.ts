import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('Array Wildcard Operations (path with "*")', () => {
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
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'User2',
          data: {
            products: [
              {
                name: 'Product B',
                price: 149.99,
                tags: ['premium', 'featured'],
                relatedItems: [
                  {
                    id: 'rel-10',
                    name: 'Accessory B1',
                    price: 39.99,
                    tags: ['premium', 'featured'],
                  },
                ],
              },
            ],
            reviews: [
              {
                rating: 4.0,
                comment: 'Good product',
                keywords: ['good', 'quality'],
              },
            ],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'User3',
          data: {
            products: [
              {
                name: 'Product C',
                price: 199.99,
                tags: ['premium', 'exclusive'],
                relatedItems: [
                  {
                    id: 'rel-11',
                    name: 'Accessory C1',
                    price: 49.99,
                    tags: ['premium', 'bestseller'],
                  },
                ],
              },
            ],
            reviews: [
              {
                rating: 4.5,
                comment: 'Outstanding quality',
                keywords: ['outstanding', 'excellent'],
              },
            ],
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'User4',
          data: {
            products: [
              {
                name: 'Product D',
                price: 299.99,
                tags: ['budget', 'basic'],
                relatedItems: [
                  {
                    id: 'rel-12',
                    name: 'Accessory D1',
                    price: 9.99,
                    tags: ['budget', 'basic'],
                  },
                ],
              },
            ],
            reviews: [
              {
                rating: 3.5,
                comment: 'Average',
                keywords: ['average', 'ok'],
              },
            ],
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'User5',
          data: {
            products: [
              {
                name: 'Product E',
                price: 399.99,
                tags: ['budget', 'exclusive'],
                relatedItems: [
                  {
                    id: 'rel-13',
                    name: 'Accessory E1',
                    price: 59.99,
                    tags: ['budget', 'exclusive'],
                  },
                ],
              },
            ],
            reviews: [
              {
                rating: 5.0,
                comment: 'Perfect!',
                keywords: ['perfect', 'amazing'],
              },
            ],
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should filter by field in array of objects using wildcard', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['products', '*', 'name'],
          equals: 'Product A',
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
          path: ['products', '*', 'price'],
          gt: 100,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(4); // User2,3,4,5 (User1 has 99.99)

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json', createdAt: 'date' },
      where: {
        data: {
          path: ['products', '*', 'price'],
          lt: 100,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);
  });

  it('should handle string operations on wildcard paths', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'name'],
          string_contains: 'Product',
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(5);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'name'],
          string_starts_with: 'Product A',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['reviews', '*', 'comment'],
          string_contains: 'Great',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);
  });

  it('should handle complex wildcard with deep nesting', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['reviews', '*', 'rating'],
          gte: 4.5,
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(3);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['reviews', '*', 'rating'],
          equals: 5.0,
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(2);
  });

  it('should handle case insensitive wildcard operations', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'name'],
          string_contains: 'PRODUCT',
          mode: 'insensitive',
        },
      },
    });
    const results = await prisma.$queryRaw<{ id: string }[]>(query);
    expect(results.length).toBe(5);
  });

  it('should handle array_contains with wildcard paths', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_contains: ['featured'],
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(2);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_contains: ['premium'],
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(2);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['reviews', '*', 'keywords'],
          array_contains: ['excellent'],
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);
  });

  it('should handle array_starts_with with wildcard paths', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_starts_with: 'featured',
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(1);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['reviews', '*', 'keywords'],
          array_starts_with: 'outstanding',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_starts_with: 'budget',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);
  });

  it('should handle array_ends_with with wildcard paths', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_ends_with: 'bestseller',
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(1);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['reviews', '*', 'keywords'],
          array_ends_with: 'amazing',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(2);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_ends_with: 'exclusive',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);
  });

  it('should handle array operations with wildcard and case insensitive mode', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_contains: ['FEATURED'],
          mode: 'insensitive',
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(2);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['reviews', '*', 'keywords'],
          array_starts_with: 'EXCELLENT',
          mode: 'insensitive',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'tags'],
          array_ends_with: 'EXCLUSIVE',
          mode: 'insensitive',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);
  });
});
