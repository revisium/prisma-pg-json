import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../query-builder';

describe('JSON Filters Integration', () => {
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
          },
        ],
      });
    });

    it('should handle array_contains operations', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['tags'], array_contains: 'typescript' } },
      });
      const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
      expect(results1.length).toBe(1);

      const query2 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['tags'], array_contains: 'react' } },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(1);

      const query3 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['scores'], array_contains: 95 } },
      });
      const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
      expect(results3.length).toBe(3);

      const query4 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['scores'], array_contains: 90 } },
      });
      const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
      expect(results4.length).toBe(3);
    });

    it('should handle array_contains with complex objects', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['products'],
            array_contains: { name: 'Product A', price: 99.99 },
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
            path: ['reviews'],
            array_contains: { rating: 4.5, comment: 'Great!' },
          },
        },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(1);
    });

    it('should handle array_starts_with and array_ends_with', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['tags'], array_starts_with: 'admin' } },
      });
      const results1 = await prisma.$queryRaw<{ id: string }[]>(query1);
      expect(results1.length).toBe(3);

      const query2 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['tags'], array_starts_with: 'user' } },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(2); // User2, User4

      const query3 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['tags'], array_ends_with: 'express' } },
      });
      const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
      expect(results3.length).toBe(1);

      const query4 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['tags'], array_ends_with: 'react' } },
      });
      const results4 = await prisma.$queryRaw<{ id: string }[]>(query4);
      expect(results4.length).toBe(1);

      const query5 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['scores'], array_starts_with: 85 } },
      });
      const results5 = await prisma.$queryRaw<{ id: string }[]>(query5);
      expect(results5.length).toBe(1);

      const query6 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: { data: { path: ['scores'], array_ends_with: 95 } },
      });
      const results6 = await prisma.$queryRaw<{ id: string }[]>(query6);
      expect(results6.length).toBe(2);
    });

    it('should handle array operations with case insensitive mode', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['tags'],
            array_contains: 'TYPESCRIPT',
            mode: 'insensitive',
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
            path: ['tags'],
            array_starts_with: 'Admin',
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
            path: ['tags'],
            array_ends_with: 'EXPRESS',
            mode: 'insensitive',
          },
        },
      });
      const results3 = await prisma.$queryRaw<{ id: string }[]>(query3);
      expect(results3.length).toBe(1);
    });
  });

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
          },
        ],
      });
    });

    it('should handle deeply nested path operations', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['user', 'profile', 'name'],
            string_contains: 'Profile',
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
            path: ['user', 'profile', 'settings', 'theme'],
            equals: 'dark',
          },
        },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(2);
    });

    it('should handle nested path with comparisons', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['user', 'age'],
            gte: 30,
          },
        },
      });
      const results = await prisma.$queryRaw<{ id: string }[]>(query);
      expect(results.length).toBe(3);
    });

    it('should handle nested path string operations', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['user', 'profile', 'name'],
            string_contains: 'Alice',
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
            path: ['user', 'profile', 'name'],
            string_ends_with: 'Profile',
          },
        },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(5);
    });

    it('should handle multiple levels of nesting with various operators', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['user', 'profile', 'settings', 'theme'],
            string_contains: 'dark',
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
            path: ['user', 'profile', 'settings', 'theme'],
            not: 'dark',
          },
        },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(3);
    });

    it('should handle nested numeric fields', async () => {
      const query1 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['user', 'age'],
            lt: 30,
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
            path: ['user', 'age'],
            gt: 30,
            lt: 40,
          },
        },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(1);
    });

    it('should handle nested case insensitive operations', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['user', 'profile', 'settings', 'theme'],
            equals: 'DARK',
            mode: 'insensitive',
          },
        },
      });
      const results = await prisma.$queryRaw<{ id: string }[]>(query);
      expect(results.length).toBe(2);
    });
  });

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
          },
        ],
      });
    });

    it('should filter by field in array of objects using wildcard', async () => {
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
            path: ['products', '*', 'price'],
            gt: 100,
          },
        },
      });
      const results2 = await prisma.$queryRaw<{ id: string }[]>(query2);
      expect(results2.length).toBe(4); // User2,3,4,5 (User1 has 99.99)

      const query3 = buildQuery({
        tableName: 'test_tables',
        fieldConfig: { data: 'json' },
        where: {
          data: {
            path: ['products', '*', 'price'],
            lt: 100,
          },
        },
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
            array_contains: 'featured',
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
            array_contains: 'premium',
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
            array_contains: 'excellent',
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
            array_contains: 'FEATURED',
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
            array_contains: 'premium',
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
            array_contains: 'featured',
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
            array_contains: 'budget',
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
            array_contains: 'PREMIUM',
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
});
