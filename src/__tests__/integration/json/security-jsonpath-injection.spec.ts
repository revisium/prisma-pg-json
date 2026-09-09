import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('Security: JSONPath Injection Vulnerabilities', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    createdAt: 'date',
  } as const;

  const testQuery = async (where: WhereConditionsTyped<typeof fieldConfig>) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy: { createdAt: 'asc' },
    });

    return prisma.$queryRaw<Array<{ id: string }>>(query);
  };

  beforeEach(async () => {
    ids = {
      user1: nanoid(),
      user2: nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids.user1,
          name: 'Test User 1',
          data: {
            name: 'John',
            email: 'john@example.com',
            profile: {
              'user.name': 'Special Key with Dots',
              'user"name': 'Key with Quotes',
              settings: { theme: 'dark' },
            },
            products: [
              { name: 'Product A', price: 100 },
              { name: 'Product B', price: 200 },
            ],
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.user2,
          name: 'Test User 2',
          data: {
            name: 'Jane',
            email: 'jane@example.com',
            profile: {
              'user.name': 'Another Special Key',
              'user"name': 'Another Key with Quotes',
              settings: { theme: 'light' },
            },
            products: [{ name: 'Product C', price: 300 }],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('String Contains Operator Injection', () => {
    it('should handle quotes in string_contains patterns safely', async () => {
      const maliciousPattern = 'test") || true'; // Attempt to break out of JSONPath

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      })).toEqual([]);
    });

    it('should handle backslashes in string_contains patterns safely', async () => {
      const maliciousPattern = String.raw`test\") || true`;

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      })).toEqual([]);
    });

    it('should handle regex special characters in string_contains patterns safely', async () => {
      const maliciousPattern = 'test.*"; DROP TABLE test_tables; --';

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      })).toEqual([]);
    });
  });

  describe('String Starts With Operator Injection', () => {
    it('should handle quotes in string_starts_with patterns safely', async () => {
      const maliciousPattern = 'test") || true';

      expect(await testQuery({
        data: {
          path: 'name',
          string_starts_with: maliciousPattern,
        },
      })).toEqual([]);
    });

    it('should handle complex injection attempts in string_starts_with', async () => {
      const maliciousPattern = 'test" ? (@ == @) : "fake';

      expect(await testQuery({
        data: {
          path: 'name',
          string_starts_with: maliciousPattern,
        },
      })).toEqual([]);
    });
  });

  describe('String Ends With Operator Injection', () => {
    it('should handle quotes in string_ends_with patterns safely', async () => {
      const maliciousPattern = 'test") || true';

      expect(await testQuery({
        data: {
          path: 'email',
          string_ends_with: maliciousPattern,
        },
      })).toEqual([]);
    });

    it('should handle JSONPath escape sequences in string_ends_with', async () => {
      const maliciousPattern = '.com") ? @ : "malicious';

      expect(await testQuery({
        data: {
          path: 'email',
          string_ends_with: maliciousPattern,
        },
      })).toEqual([]);
    });
  });

  describe('Array Contains Operator Injection', () => {
    it('should handle quotes in array_contains patterns safely', async () => {
      const maliciousPattern = ['Product") || true'];

      expect(await testQuery({
        data: {
          path: 'products[*].name',
          array_contains: maliciousPattern,
        },
      })).toEqual([]);
    });

    it('should handle complex injection in array_contains with case insensitive mode', async () => {
      const maliciousPattern = ['product") ? @ : "fake'];

      expect(await testQuery({
        data: {
          path: 'products[*].name',
          array_contains: maliciousPattern,
          mode: 'insensitive',
        },
      })).toEqual([]);
    });
  });

  describe('SQL Injection via JSONPath Pattern', () => {
    it('should handle SQL injection attempts in regex patterns', async () => {
      const maliciousPattern = "'; DROP TABLE test_tables; --";

      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        where: { data: { path: 'name', string_contains: maliciousPattern } },
        orderBy: { createdAt: 'asc' },
      });
      expect(query.text).not.toContain(maliciousPattern);
      expect(JSON.stringify(query.values)).toContain(maliciousPattern);
      expect(await prisma.$queryRaw<Array<{ id: string }>>(query)).toEqual([]);

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      })).toEqual([]);
    });

    it('should handle nested JSONPath injection attempts', async () => {
      const maliciousPattern = 'test" ? ($.nonexistent == "trigger") : "safe';

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      })).toEqual([]);
    });
  });

  describe('Path Parsing Injection', () => {
    it('should handle malicious JSON paths with special characters', async () => {
      const maliciousPath = 'profile["user.name"] || $.nonexistent';

      expect(await testQuery({
        data: {
          path: maliciousPath,
          equals: 'test',
        },
      })).toEqual([]);

      expect((await testQuery({
        data: {
          path: 'name',
          equals: 'John',
        },
      })).map(({ id }) => id)).toEqual([ids.user1]);
    });

    it('should handle quoted keys with special characters safely', async () => {
      expect(await testQuery({
        data: {
          path: 'profile["user.name"]',
          equals: 'Special Key with Dots',
        },
      })).toEqual([]);
    });

    it('should handle quoted keys with quotes safely', async () => {
      expect(await testQuery({
        data: {
          path: String.raw`profile["user\"name"]`,
          equals: 'Key with Quotes',
        },
      })).toEqual([]);
    });
  });

  describe('Comparison Operator Injection', () => {
    it('should handle quotes in comparison values safely', async () => {
      const maliciousValue = 'test") || true || ("fake" == "';

      expect(await testQuery({
        data: {
          path: 'name',
          equals: maliciousValue,
        },
      })).toEqual([]);
    });

    it('should handle regex patterns in like operations safely', async () => {
      const maliciousPattern = '.*") || true || ("fake" like ".*';

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      })).toEqual([]);
    });
  });

  describe('Edge Cases for Security', () => {
    it('should handle empty strings safely by rejecting them', async () => {
      // Empty strings should be rejected by validation
      await expect(
        testQuery({
          data: {
            path: 'name',
            string_contains: '',
          },
        }),
      ).rejects.toThrow('string_contains requires a non-empty string value');
    });

    it('should handle very long malicious patterns', async () => {
      const longMaliciousPattern = 'x'.repeat(1000) + '" || true || "' + 'y'.repeat(1000);

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: longMaliciousPattern,
        },
      })).toEqual([]);
    });

    it('should handle unicode characters in patterns', async () => {
      const unicodePattern = 'test🔥") || true || ("fake" == "';

      expect(await testQuery({
        data: {
          path: 'name',
          string_contains: unicodePattern,
        },
      })).toEqual([]);
    });
  });

  describe('Search Operator Injection', () => {
    it('should handle SQL injection attempts in tsquery search type', async () => {
      const maliciousQuery = "'; DROP TABLE test_tables; --";

      await expect(testQuery({
        data: {
          path: '',
          search: maliciousQuery,
          searchType: 'tsquery',
        },
      })).rejects.toThrow(/syntax error in tsquery/);
    });

    it('should handle quotes in tsquery search safely', async () => {
      const maliciousQuery = 'test") || true || ("fake';

      await expect(testQuery({
        data: {
          path: '',
          search: maliciousQuery,
          searchType: 'tsquery',
        },
      })).rejects.toThrow(/syntax error in tsquery/);
    });

    it('should handle prefix search type injection attempts safely', async () => {
      const maliciousInput = "test'; DROP TABLE test_tables; --";

      expect(await testQuery({
        data: {
          path: '',
          search: maliciousInput,
          searchType: 'prefix',
        },
      })).toEqual([]);
    });

    it('should handle phrase search type injection attempts safely', async () => {
      const maliciousPhrase = "test'; DROP TABLE test_tables; --";

      expect(await testQuery({
        data: {
          path: '',
          search: maliciousPhrase,
          searchType: 'phrase',
        },
      })).toEqual([]);
    });

    it('should handle plain search type injection attempts safely', async () => {
      const maliciousSearch = "'; SELECT * FROM pg_tables; --";

      expect(await testQuery({
        data: {
          path: '',
          search: maliciousSearch,
          searchType: 'plain',
        },
      })).toEqual([]);
    });

    it('should handle complex tsquery injection with operators', async () => {
      const maliciousQuery = 'test:* & (SELECT 1)';

      await expect(testQuery({
        data: {
          path: '',
          search: maliciousQuery,
          searchType: 'tsquery',
        },
      })).rejects.toThrow(/syntax error in tsquery/);
    });
  });

  describe('JSON path (data.path) injection', () => {
    // A malicious path segment that, if spliced raw into `#>'{...}'`, breaks
    // out of the array literal and injects SQL. After the fix the segment is
    // bound as a text[] parameter, so it is treated as a (non-existent) key:
    // the query runs safely and simply matches nothing.
    const BREAKOUT = "x'}') OR '1'='1";

    it('WHERE equals: malicious path does not inject, returns no rows, does not throw', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        where: { data: { path: [BREAKOUT], equals: 'anything' } },
        orderBy: { createdAt: 'asc' },
      });
      expect(query.text).not.toContain(BREAKOUT);
      expect(query.values).toContainEqual([BREAKOUT]);
      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      // If injection happened, `OR '1'='1'` would return ALL rows (2).
      expect(results).toEqual([]);
    });

    it('WHERE not: malicious path does not inject, matches nothing, does not throw', async () => {
      const results = await testQuery({
        data: { path: [BREAKOUT], not: 'anything' },
      });
      // The non-existent (parameterized) key yields NULL, so `!= value` is
      // never true and no row matches. If injection regressed via `OR '1'='1'`,
      // this would return all fixture rows — so an exact 0 is the real guard.
      expect(results).toEqual([]);
    });

    it('ORDER BY json path: malicious path does not inject and does not throw', async () => {
      const query = buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        orderBy: {
          data: { path: [BREAKOUT], direction: 'asc', type: 'text' },
        },
      });
      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      // Sorting by a non-existent (parameterized) key just yields all rows.
      expect(results.map(({ id }) => id)).toEqual([ids.user1, ids.user2]);
    });
  });
});
