import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped, OrderByConditions } from '../../../types';

describe('Array Wildcard Operations (path with "*")', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    createdAt: 'date',
  } as const;

  const testQuery = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedIds: string[],
    orderBy?: OrderByConditions<typeof fieldConfig>,
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy: orderBy || { createdAt: 'asc' },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id)).toEqual(expectedIds);
  };

  const testQueryWithNames = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedNames: string[],
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
    });

    const results = await prisma.$queryRaw<Array<{ id: string; name: string }>>(query);
    expect(results.length).toBe(expectedNames.length);
    expect(new Set(results.map((r) => r.name))).toEqual(new Set(expectedNames));
  };

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
    await testQuery({ data: { path: ['products', '*', 'name'], equals: 'Product A' } }, [
      ids.user1,
    ]);
    await testQuery({ data: { path: ['products', '*', 'price'], gt: 100 } }, [
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['products', '*', 'price'], lt: 100 } }, [ids.user1]);
  });

  it('should handle string operations on wildcard paths', async () => {
    await testQuery({ data: { path: ['products', '*', 'name'], string_contains: 'Product' } }, [
      ids.user1,
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
    await testQuery(
      { data: { path: ['products', '*', 'name'], string_starts_with: 'Product A' } },
      [ids.user1],
    );
    await testQuery({ data: { path: ['reviews', '*', 'comment'], string_contains: 'Great' } }, [
      ids.user1,
    ]);
  });

  it('should handle complex wildcard with deep nesting', async () => {
    await testQuery({ data: { path: ['reviews', '*', 'rating'], gte: 4.5 } }, [
      ids.user1,
      ids.user3,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['reviews', '*', 'rating'], equals: 5.0 } }, [
      ids.user1,
      ids.user5,
    ]);
  });

  it('should handle case insensitive wildcard operations', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'name'],
          string_contains: 'PRODUCT',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );
  });

  it('should handle array_contains with wildcard paths', async () => {
    await testQuery({ data: { path: ['products', '*', 'tags'], array_contains: ['featured'] } }, [
      ids.user1,
      ids.user2,
    ]);
    await testQuery({ data: { path: ['products', '*', 'tags'], array_contains: ['premium'] } }, [
      ids.user2,
      ids.user3,
    ]);
    await testQuery(
      { data: { path: ['reviews', '*', 'keywords'], array_contains: ['excellent'] } },
      [ids.user1, ids.user3],
    );
  });

  it('should handle array_starts_with with wildcard paths', async () => {
    await testQuery({ data: { path: ['products', '*', 'tags'], array_starts_with: 'featured' } }, [
      ids.user1,
    ]);
    await testQuery(
      { data: { path: ['reviews', '*', 'keywords'], array_starts_with: 'outstanding' } },
      [ids.user3],
    );
    await testQuery({ data: { path: ['products', '*', 'tags'], array_starts_with: 'budget' } }, [
      ids.user4,
      ids.user5,
    ]);
  });

  it('should handle array_ends_with with wildcard paths', async () => {
    await testQuery({ data: { path: ['products', '*', 'tags'], array_ends_with: 'bestseller' } }, [
      ids.user1,
    ]);
    await testQuery({ data: { path: ['reviews', '*', 'keywords'], array_ends_with: 'amazing' } }, [
      ids.user1,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['products', '*', 'tags'], array_ends_with: 'exclusive' } }, [
      ids.user3,
      ids.user5,
    ]);
  });

  it('should handle array operations with wildcard and case insensitive mode', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'tags'],
          array_contains: ['FEATURED'],
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user2],
    );

    await testQuery(
      {
        data: {
          path: ['reviews', '*', 'keywords'],
          array_starts_with: 'EXCELLENT',
          mode: 'insensitive',
        },
      },
      [ids.user1],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'tags'],
          array_ends_with: 'EXCLUSIVE',
          mode: 'insensitive',
        },
      },
      [ids.user3, ids.user5],
    );
  });

  it('should handle wildcard array operations with single quotes (SQL injection protection)', async () => {
    await prisma.testTable.deleteMany();
    const testId = nanoid();
    await prisma.testTable.create({
      data: {
        id: testId,
        name: 'Test with quotes',
        data: {
          products: [
            {
              name: 'Product A',
              tags: ["user's choice", 'featured'],
            },
          ],
        },
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    });

    await testQueryWithNames(
      {
        data: {
          path: ['products', '*', 'tags'],
          array_contains: ["user's choice"],
          mode: 'insensitive',
        },
      },
      ['Test with quotes'],
    );

    await testQueryWithNames(
      {
        data: {
          path: ['products', '*', 'tags'],
          array_starts_with: "USER'S CHOICE",
          mode: 'insensitive',
        },
      },
      ['Test with quotes'],
    );
  });
});
