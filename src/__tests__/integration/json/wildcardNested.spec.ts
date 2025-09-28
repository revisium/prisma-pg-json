import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';

describe('Nested Wildcard Operations (path with multiple "*")', () => {
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
        },
      ],
    });
  });

  it('should filter by field in nested arrays using double wildcard', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_contains: 'Accessory A',
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
          path: ['products', '*', 'relatedItems', '*', 'name'],
          equals: 'Accessory G1',
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
          path: ['products', '*', 'relatedItems', '*', 'id'],
          string_starts_with: 'rel-1',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(5);
  });

  it('should handle numeric comparisons on nested arrays', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'price'],
          gt: 50,
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
          path: ['products', '*', 'relatedItems', '*', 'price'],
          lt: 15,
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
          path: ['products', '*', 'relatedItems', '*', 'price'],
          gte: 20,
          lte: 50,
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);
  });

  it('should handle case insensitive operations on nested arrays', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_contains: 'ACCESSORY',
          mode: 'insensitive',
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
          path: ['products', '*', 'relatedItems', '*', 'name'],
          equals: 'accessory f1',
          mode: 'insensitive',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(1);
  });

  it('should handle complex conditions with multiple wildcards', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_ends_with: '1',
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
          path: ['products', '*', 'relatedItems', '*', 'name'],
          string_ends_with: '2',
        },
      },
    });
    const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
    expect(results2.length).toBe(3);
  });

  it('should handle array_contains with nested wildcards', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['premium'],
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['featured'],
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['budget'],
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);
  });

  it('should handle array_starts_with with nested wildcards', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'premium',
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'featured',
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'budget',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(1);
  });

  it('should handle array_ends_with with nested wildcards', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'premium',
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'sale',
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'bestseller',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);
  });

  it('should handle array operations with nested wildcards and case insensitive', async () => {
    const query1 = buildQuery({
      tableName: 'test_tables',
      fieldConfig: { data: 'json' },
      where: {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_contains: ['PREMIUM'],
          mode: 'insensitive',
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_starts_with: 'FEATURED',
          mode: 'insensitive',
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
          path: ['products', '*', 'relatedItems', '*', 'tags'],
          array_ends_with: 'BESTSELLER',
          mode: 'insensitive',
        },
      },
    });
    const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
    expect(results3.length).toBe(2);
  });
});
