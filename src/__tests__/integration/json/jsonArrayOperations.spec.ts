import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped, OrderByConditions } from '../../../types';

describe('JSON Array Operations', () => {
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
    await testQuery({ data: { path: ['tags'], array_contains: ['typescript'] } }, [ids.user1]);
    await testQuery({ data: { path: ['tags'], array_contains: ['react'] } }, [ids.user2]);
    await testQuery({ data: { path: ['scores'], array_contains: [95] } }, [
      ids.user1,
      ids.user3,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['scores'], array_contains: [90] } }, [
      ids.user1,
      ids.user2,
      ids.user3,
    ]);
    await testQuery({ data: { path: ['scores'], array_contains: [90, 85] } }, [
      ids.user1,
      ids.user2,
    ]);
  });

  it('should handle array_contains with complex objects', async () => {
    await testQuery(
      {
        data: {
          path: ['products'],
          array_contains: [{ name: 'Product A', price: 99.99 }],
        },
      },
      [ids.user1],
    );

    await testQuery(
      {
        data: {
          path: ['reviews'],
          array_contains: [{ rating: 4.5, comment: 'Great!' }],
        },
      },
      [ids.user1],
    );
  });

  it('should handle array_starts_with and array_ends_with', async () => {
    await testQuery({ data: { path: ['tags'], array_starts_with: 'admin' } }, [
      ids.user1,
      ids.user3,
      ids.user5,
    ]);
    await testQuery({ data: { path: ['tags'], array_starts_with: 'user' } }, [
      ids.user2,
      ids.user4,
    ]);
    await testQuery({ data: { path: ['tags'], array_ends_with: 'express' } }, [ids.user3]);
    await testQuery({ data: { path: ['tags'], array_ends_with: 'react' } }, [ids.user2]);
    await testQuery({ data: { path: ['scores'], array_starts_with: 85 } }, [ids.user1]);
    await testQuery({ data: { path: ['scores'], array_ends_with: 95 } }, [ids.user1, ids.user3]);
  });

  it('should handle array operations with case insensitive mode', async () => {
    await testQuery(
      {
        data: {
          path: ['tags'],
          array_contains: ['TYPESCRIPT'],
          mode: 'insensitive',
        },
      },
      [ids.user1],
    );

    await testQuery(
      {
        data: {
          path: ['tags'],
          array_starts_with: 'Admin',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user3, ids.user5],
    );

    await testQuery(
      {
        data: {
          path: ['tags'],
          array_ends_with: 'EXPRESS',
          mode: 'insensitive',
        },
      },
      [ids.user3],
    );
  });
});
