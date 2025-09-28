import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('JSON Path String Syntax', () => {
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
            category: 'admin',
            user: {
              age: 35,
              profile: {
                name: 'Alice Profile',
                settings: { theme: 'dark' },
              },
            },
            products: [
              {
                name: 'Product A',
                price: 99.99,
                relatedItems: [
                  { name: 'Accessory A1', price: 19.99 },
                  { name: 'Accessory A2', price: 29.99 },
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
            category: 'admin',
            user: {
              age: 30,
              profile: {
                name: 'Bob Profile',
                settings: { theme: 'light' },
              },
            },
            products: [
              {
                name: 'Product B',
                price: 149.99,
                relatedItems: [{ name: 'Accessory B1', price: 39.99 }],
              },
            ],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.user3,
          name: 'User3',
          data: {
            category: 'user',
            user: {
              age: 25,
              profile: {
                name: 'Charlie Profile',
                settings: { theme: 'dark' },
              },
            },
            products: [
              {
                name: 'Product C',
                price: 199.99,
                relatedItems: [{ name: 'Accessory C1', price: 49.99 }],
              },
            ],
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.user4,
          name: 'User4',
          data: {
            category: 'user',
            user: {
              age: 40,
              profile: {
                name: 'Diana Profile',
                settings: { theme: 'light' },
              },
            },
            products: [
              {
                name: 'Product D',
                price: 299.99,
                relatedItems: [{ name: 'Accessory D1', price: 9.99 }],
              },
            ],
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.user5,
          name: 'User5',
          data: {
            category: 'user',
            user: {
              age: 28,
              profile: {
                name: 'Eve Profile',
                settings: { theme: 'light' },
              },
            },
            products: [
              {
                name: 'Product E',
                price: 399.99,
                relatedItems: [{ name: 'Accessory E1', price: 59.99 }],
              },
            ],
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  it('should handle string path syntax for simple operations', async () => {
    await testQuery({ data: { path: 'category', equals: 'admin' } }, [ids.user1, ids.user2]);
  });

  it('should handle string path syntax for nested properties without wildcards', async () => {
    await testQuery({ data: { path: 'user.age', equals: 35 } }, [ids.user1]);
    await testQuery({ data: { path: 'user.profile.name', equals: 'Alice Profile' } }, [ids.user1]);
    await testQuery({ data: { path: 'user.age', gt: 30 } }, [ids.user1, ids.user4]);
    await testQuery({ data: { path: 'user.profile.settings.theme', equals: 'dark' } }, [
      ids.user1,
      ids.user3,
    ]);
  });

  it('should handle string path syntax for mixed nesting with wildcards', async () => {
    await testQuery({ data: { path: 'products[*].price', gt: 100 } }, [
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
    await testQuery({ data: { path: 'products[*].name', string_contains: 'Product' } }, [
      ids.user1,
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
    await testQuery(
      { data: { path: 'products[*].relatedItems[*].name', string_starts_with: 'Accessory' } },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );
    await testQuery({ data: { path: 'products[*].relatedItems[*].price', lt: 20 } }, [
      ids.user1,
      ids.user4,
    ]);
  });

  it('should handle string path syntax with single wildcard', async () => {
    await testQuery({ data: { path: 'products[*].name', equals: 'Product A' } }, [ids.user1]);
    await testQuery({ data: { path: 'products[*].name', string_contains: 'Product' } }, [
      ids.user1,
      ids.user2,
      ids.user3,
      ids.user4,
      ids.user5,
    ]);
  });

  it('should handle string path syntax with double wildcard', async () => {
    await testQuery(
      { data: { path: 'products[*].relatedItems[*].name', equals: 'Accessory A1' } },
      [ids.user1],
    );
    await testQuery({ data: { path: 'products[*].relatedItems[*].price', gt: 50 } }, [ids.user5]);
  });

  it('should handle string path syntax with case insensitive mode', async () => {
    await testQuery(
      {
        data: {
          path: 'products[*].name',
          string_contains: 'PRODUCT',
          mode: 'insensitive',
        },
      },
      [ids.user1, ids.user2, ids.user3, ids.user4, ids.user5],
    );
  });

  it('should produce same results for equivalent array and string paths', async () => {
    await testQuery({ data: { path: ['products', '*', 'name'], equals: 'Product A' } }, [
      ids.user1,
    ]);
    await testQuery({ data: { path: 'products[*].name', equals: 'Product A' } }, [ids.user1]);
  });
});
