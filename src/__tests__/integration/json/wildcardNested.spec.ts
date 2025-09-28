import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('Nested Wildcard Operations (path with multiple "*")', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    createdAt: 'date',
  } as const;

  const testQuery = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedIds: string[],
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy: { createdAt: 'asc' },
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id)).toEqual(expectedIds);
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
                relatedItems: [
                  {
                    id: 'rel-10',
                    name: 'Accessory B1',
                    price: 39.99,
                    tags: ['premium', 'featured'],
                  },
                  {
                    id: 'rel-11',
                    name: 'Accessory B2',
                    price: 49.99,
                    tags: ['premium', 'bestseller'],
                  },
                ],
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
                relatedItems: [
                  {
                    id: 'rel-12',
                    name: 'Accessory C1',
                    price: 9.99,
                    tags: ['budget', 'basic'],
                  },
                  {
                    id: 'rel-13',
                    name: 'Accessory C2',
                    price: 14.99,
                    tags: ['budget', 'exclusive'],
                  },
                ],
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
                relatedItems: [
                  {
                    id: 'rel-14',
                    name: 'Accessory F1',
                    price: 59.99,
                    tags: ['featured', 'premium'],
                  },
                ],
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
                relatedItems: [
                  {
                    id: 'rel-15',
                    name: 'Accessory G1',
                    price: 69.99,
                    tags: ['premium', 'bestseller'],
                  },
                ],
              },
            ],
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should filter by field in nested arrays using double wildcard', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_contains: 'Accessory A',
        },
      },
      [ids.user1],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          equals: 'Accessory G1',
        },
      },
      [ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'id'],
          string_starts_with: 'rel-1',
        },
      },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );
  });

  it('should handle numeric comparisons on nested arrays', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'price'],
          gt: 50,
        },
      },
      [ids.user4, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'price'],
          lt: 15,
        },
      },
      [ids.user3],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'price'],
          gte: 20,
          lte: 50,
        },
      },
      [ids.user1, ids.user2],
    );
  });

  it('should handle case insensitive operations on nested arrays', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_contains: 'ACCESSORY',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          equals: 'accessory f1',
          mode: 'insensitive',
        },
      },
      [ids.user4],
    );
  });

  it('should handle complex conditions with multiple wildcards', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_ends_with: '1',
        },
      },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_ends_with: '2',
        },
      },
      [ids.user1, ids.user2, ids.user3],
    );
  });

  it('should handle array_contains with nested wildcards', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['premium'],
        },
      },
      [ids.user2, ids.user4, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['featured'],
        },
      },
      [ids.user1, ids.user2, ids.user4],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['budget'],
        },
      },
      [ids.user3],
    );
  });

  it('should handle array_starts_with with nested wildcards', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'premium',
        },
      },
      [ids.user2, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'featured',
        },
      },
      [ids.user1, ids.user4],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'budget',
        },
      },
      [ids.user3],
    );
  });

  it('should handle array_ends_with with nested wildcards', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'premium',
        },
      },
      [ids.user4],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'sale',
        },
      },
      [ids.user1],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'bestseller',
        },
      },
      [ids.user2, ids.user5],
    );
  });

  it('should handle array operations with nested wildcards and case insensitive', async () => {
    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['PREMIUM'],
          mode: 'insensitive',
        },
      },
      [ids.user2, ids.user4, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'FEATURED',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user4],
    );

    await testQuery(
      {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'BESTSELLER',
          mode: 'insensitive',
        },
      },
      [ids.user2, ids.user5],
    );
  });
});
