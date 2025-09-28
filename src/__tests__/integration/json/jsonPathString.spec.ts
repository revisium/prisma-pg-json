import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('JSON Path String Syntax', () => {
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
        },
      ],
    });
  });

  it('should handle string path syntax for simple operations', async () => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: { data: { path: 'category', equals: 'admin' } },
    });
    const results = await prisma.$queryRaw<{ id: string }[]>(query);
    expect(results.length).toBe(2);
  });

  it('should handle string path syntax for nested properties without wildcards', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'user.age',
          equals: 35,
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
          path: 'user.profile.name',
          equals: 'Alice Profile',
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
          path: 'user.age',
          gt: 30,
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'user.profile.settings.theme',
          equals: 'dark',
        },
      },
    });
    const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
    expect(results4.length).toBe(2);
  });

  it('should handle string path syntax for mixed nesting with wildcards', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'products[*].price',
          gt: 100,
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(4);

    const query2 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'products[*].name',
          string_contains: 'Product',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(5);

    const query3 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'products[*].relatedItems[*].name',
          string_starts_with: 'Accessory',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(5);

    const query4 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'products[*].relatedItems[*].price',
          lt: 20,
        },
      },
    });
    const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
    expect(results4.length).toBe(2);
  });

  it('should handle string path syntax with single wildcard', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'products[*].name',
          equals: 'Product A',
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
          path: 'products[*].name',
          string_contains: 'Product',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(5);
  });

  it('should handle string path syntax with double wildcard', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'products[*].relatedItems[*].name',
          equals: 'Accessory A1',
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
          path: 'products[*].relatedItems[*].price',
          gt: 50,
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);
  });

  it('should handle string path syntax with case insensitive mode', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: 'products[*].name',
          string_contains: 'PRODUCT',
          mode: 'insensitive',
        },
      },
    });
    const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
    expect(results1.length).toBe(5);
  });

  it('should produce same results for equivalent array and string paths', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'name'],
          equals: 'Product A',
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
          path: 'products[*].name',
          equals: 'Product A',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);
  });
});
