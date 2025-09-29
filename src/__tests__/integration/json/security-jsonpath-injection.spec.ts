import './setup';
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

  const testQuery = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    shouldNotThrow: boolean = true,
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
      orderBy: { createdAt: 'asc' },
    });

    if (shouldNotThrow) {
      const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
      return results;
    } else {
      await expect(prisma.$queryRaw(query)).rejects.toThrow();
    }
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
            products: [
              { name: 'Product C', price: 300 },
            ],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('String Contains Operator Injection', () => {
    it('should handle quotes in string_contains patterns safely', async () => {
      const maliciousPattern = 'test") || true'; // Attempt to break out of JSONPath

      await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      });
    });

    it('should handle backslashes in string_contains patterns safely', async () => {
      const maliciousPattern = 'test\\") || true';

      await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      });
    });

    it('should handle regex special characters in string_contains patterns safely', async () => {
      const maliciousPattern = 'test.*"; DROP TABLE test_tables; --';

      await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      });
    });
  });

  describe('String Starts With Operator Injection', () => {
    it('should handle quotes in string_starts_with patterns safely', async () => {
      const maliciousPattern = 'test") || true';

      await testQuery({
        data: {
          path: 'name',
          string_starts_with: maliciousPattern,
        },
      });
    });

    it('should handle complex injection attempts in string_starts_with', async () => {
      const maliciousPattern = 'test" ? (@ == @) : "fake';

      await testQuery({
        data: {
          path: 'name',
          string_starts_with: maliciousPattern,
        },
      });
    });
  });

  describe('String Ends With Operator Injection', () => {
    it('should handle quotes in string_ends_with patterns safely', async () => {
      const maliciousPattern = 'test") || true';

      await testQuery({
        data: {
          path: 'email',
          string_ends_with: maliciousPattern,
        },
      });
    });

    it('should handle JSONPath escape sequences in string_ends_with', async () => {
      const maliciousPattern = '.com") ? @ : "malicious';

      await testQuery({
        data: {
          path: 'email',
          string_ends_with: maliciousPattern,
        },
      });
    });
  });

  describe('Array Contains Operator Injection', () => {
    it('should handle quotes in array_contains patterns safely', async () => {
      const maliciousPattern = ['Product") || true'];

      await testQuery({
        data: {
          path: 'products[*].name',
          array_contains: maliciousPattern,
        },
      });
    });

    it('should handle complex injection in array_contains with case insensitive mode', async () => {
      const maliciousPattern = ['product") ? @ : "fake'];

      await testQuery({
        data: {
          path: 'products[*].name',
          array_contains: maliciousPattern,
          mode: 'insensitive',
        },
      });
    });
  });

  describe('SQL Injection via JSONPath Pattern', () => {
    it('should handle SQL injection attempts in regex patterns', async () => {
      const maliciousPattern = "'; DROP TABLE test_tables; --";

      await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      });
    });

    it('should handle nested JSONPath injection attempts', async () => {
      const maliciousPattern = 'test" ? ($.nonexistent == "trigger") : "safe';

      await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      });
    });
  });

  describe('Path Parsing Injection', () => {
    it('should handle malicious JSON paths with special characters', async () => {
      const maliciousPath = 'profile["user.name"] || $.nonexistent';

      // This might throw due to invalid path, but should not cause injection
      try {
        await testQuery({
          data: {
            path: maliciousPath,
            equals: 'test',
          },
        });
      } catch (error) {
        // Expected to throw due to invalid path syntax, not SQL injection
        expect(error).toBeDefined();
      }
    });

    it('should handle quoted keys with special characters safely', async () => {
      await testQuery({
        data: {
          path: 'profile["user.name"]',
          equals: 'Special Key with Dots',
        },
      });
    });

    it('should handle quoted keys with quotes safely', async () => {
      await testQuery({
        data: {
          path: 'profile["user\\"name"]',
          equals: 'Key with Quotes',
        },
      });
    });
  });

  describe('Comparison Operator Injection', () => {
    it('should handle quotes in comparison values safely', async () => {
      const maliciousValue = 'test") || true || ("fake" == "';

      await testQuery({
        data: {
          path: 'name',
          equals: maliciousValue,
        },
      });
    });

    it('should handle regex patterns in like operations safely', async () => {
      const maliciousPattern = '.*") || true || ("fake" like ".*';

      await testQuery({
        data: {
          path: 'name',
          string_contains: maliciousPattern,
        },
      });
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

      await testQuery({
        data: {
          path: 'name',
          string_contains: longMaliciousPattern,
        },
      });
    });

    it('should handle unicode characters in patterns', async () => {
      const unicodePattern = 'test🔥") || true || ("fake" == "';

      await testQuery({
        data: {
          path: 'name',
          string_contains: unicodePattern,
        },
      });
    });
  });
});