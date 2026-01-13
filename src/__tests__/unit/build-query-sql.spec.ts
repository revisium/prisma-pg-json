import { format } from 'sql-formatter';
import { buildQuery } from '../../query-builder';
import { configurePrisma } from '../../prisma-adapter';
import { Prisma } from '@prisma/client';
import { QueryBuilderOptions } from '../../types';

configurePrisma(Prisma);

const fieldConfig = {
  id: 'string',
  name: 'string',
  email: 'string',
  age: 'number',
  salary: 'number',
  isActive: 'boolean',
  isVerified: 'boolean',
  createdAt: 'date',
  updatedAt: 'date',
  data: 'json',
  metadata: 'json',
} as const;

type TestFieldConfig = typeof fieldConfig;

function sqlToString(sql: ReturnType<typeof buildQuery>): string {
  const { strings, values } = sql as unknown as { strings: string[]; values: unknown[] };
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const value = values[i];
      if (typeof value === 'string') {
        result += `'${value}'`;
      } else if (typeof value === 'number') {
        result += value.toString();
      } else if (value instanceof Date) {
        result += `'${value.toISOString()}'`;
      } else if (Array.isArray(value)) {
        result += `ARRAY[${value.map((v) => (typeof v === 'string' ? `'${v}'` : v)).join(', ')}]`;
      } else {
        result += JSON.stringify(value);
      }
    }
  }

  return format(result, { language: 'postgresql' });
}

function buildAndFormat(options: QueryBuilderOptions<TestFieldConfig>): string {
  return sqlToString(buildQuery(options));
}

describe('buildQuery SQL Generation', () => {
  describe('basic queries', () => {
    it('should generate minimal query with defaults', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with specific fields', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        tableAlias: 'u',
        fields: ['id', 'name', 'email'],
        fieldConfig,
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with custom take and skip', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        take: 100,
        skip: 50,
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('string filters', () => {
    it('should generate query with string equals', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          name: 'John',
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with all string operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { name: { equals: 'John' } },
            { name: { not: 'Jane' } },
            { name: { contains: 'oh' } },
            { name: { startsWith: 'Jo' } },
            { name: { endsWith: 'hn' } },
            { email: { in: ['john@example.com', 'john@test.com'] } },
            { email: { notIn: ['spam@example.com'] } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with case-insensitive string filter', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          name: { contains: 'john', mode: 'insensitive' },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with string comparison operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { name: { gt: 'A' } },
            { name: { gte: 'B' } },
            { name: { lt: 'Z' } },
            { name: { lte: 'Y' } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with string full-text search', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          name: { search: 'software engineer' },
        },
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('number filters', () => {
    it('should generate query with number equals', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          age: 25,
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with all number operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { age: { equals: 30 } },
            { age: { not: 0 } },
            { age: { gt: 18 } },
            { age: { gte: 21 } },
            { age: { lt: 65 } },
            { age: { lte: 60 } },
            { salary: { in: [50000, 75000, 100000] } },
            { salary: { notIn: [0] } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('boolean filters', () => {
    it('should generate query with boolean equals true', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          isActive: true,
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with boolean equals false', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          isActive: false,
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with boolean filter object', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [{ isActive: { equals: true } }, { isVerified: { not: false } }],
        },
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('date filters', () => {
    it('should generate query with date equals', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with all date operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { createdAt: { equals: '2024-01-01T00:00:00.000Z' } },
            { createdAt: { not: '2020-01-01T00:00:00.000Z' } },
            { createdAt: { gt: '2023-01-01T00:00:00.000Z' } },
            { createdAt: { gte: '2023-06-01T00:00:00.000Z' } },
            { createdAt: { lt: '2025-01-01T00:00:00.000Z' } },
            { createdAt: { lte: '2024-12-31T23:59:59.999Z' } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with date in/notIn arrays', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { createdAt: { in: ['2024-01-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z'] } },
            { updatedAt: { notIn: ['2020-01-01T00:00:00.000Z'] } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('json filters', () => {
    it('should generate query with json path equals', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          data: { path: 'status', equals: 'active' },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with nested json path', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          data: { path: ['profile', 'settings', 'theme'], equals: 'dark' },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with all json string operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { data: { path: 'name', string_contains: 'john' } },
            { data: { path: 'name', string_starts_with: 'Jo' } },
            { data: { path: 'name', string_ends_with: 'hn' } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with json comparison operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { data: { path: 'score', gt: 80 } },
            { data: { path: 'score', gte: 85 } },
            { data: { path: 'score', lt: 100 } },
            { data: { path: 'score', lte: 95 } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with json in/notIn operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { data: { path: 'role', in: ['admin', 'moderator', 'editor'] } },
            { data: { path: 'status', notIn: ['banned', 'suspended'] } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with json array operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { data: { path: 'tags', array_contains: ['typescript', 'react'] } },
            { data: { path: 'skills', array_starts_with: 'javascript' } },
            { data: { path: 'languages', array_ends_with: 'english' } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with json full-text search', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          data: {
            path: 'bio',
            search: 'experienced developer',
            searchLanguage: 'english',
            searchType: 'phrase',
          },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with case-insensitive json filter', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          data: { path: 'title', string_contains: 'manager', mode: 'insensitive' },
        },
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('logical operators', () => {
    it('should generate query with AND conditions', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [{ age: { gte: 18 } }, { age: { lte: 65 } }, { isActive: true }],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with OR conditions', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          OR: [
            { email: { endsWith: '@gmail.com' } },
            { email: { endsWith: '@yahoo.com' } },
            { email: { endsWith: '@outlook.com' } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with NOT condition', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          NOT: { isActive: false },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with NOT array condition', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          NOT: [{ email: { contains: 'spam' } }, { email: { contains: 'test' } }],
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with nested logical operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { isActive: true },
            {
              OR: [{ age: { gte: 21 } }, { isVerified: true }],
            },
          ],
          NOT: { email: { contains: 'spam' } },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with deeply nested logical operators', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          OR: [
            {
              AND: [
                { isActive: true },
                { age: { gte: 18 } },
                {
                  OR: [
                    { data: { path: 'role', equals: 'admin' } },
                    { data: { path: 'role', equals: 'moderator' } },
                  ],
                },
              ],
            },
            {
              AND: [{ isVerified: true }, { email: { endsWith: '@company.com' } }],
            },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('orderBy', () => {
    it('should generate query with simple orderBy asc', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        orderBy: { name: 'asc' },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with simple orderBy desc', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        orderBy: { createdAt: 'desc' },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with multiple orderBy', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { createdAt: 'desc' }],
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with json orderBy', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        orderBy: {
          data: { path: 'score', direction: 'desc', type: 'int' },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with json orderBy aggregation', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        orderBy: {
          data: { path: 'prices', direction: 'asc', type: 'float', aggregation: 'avg' },
        },
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with mixed orderBy types', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        orderBy: [
          { createdAt: 'desc' },
          { data: { path: 'priority', direction: 'asc', type: 'int' } },
          { name: 'asc' },
        ],
      });

      expect(sql).toMatchSnapshot();
    });
  });

  describe('complex queries', () => {
    it('should generate comprehensive query with all features', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        tableAlias: 'u',
        fields: ['id', 'name', 'email', 'age', 'data'],
        fieldConfig,
        where: {
          AND: [
            { isActive: true },
            { age: { gte: 18, lte: 65 } },
            { name: { contains: 'john', mode: 'insensitive' } },
            { data: { path: 'status', equals: 'active' } },
          ],
          OR: [
            { email: { endsWith: '@gmail.com' } },
            { email: { endsWith: '@company.com' } },
          ],
          NOT: {
            AND: [{ email: { contains: 'spam' } }, { isVerified: false }],
          },
        },
        orderBy: [
          { data: { path: 'score', direction: 'desc', type: 'int' } },
          { createdAt: 'desc' },
          { name: 'asc' },
        ],
        take: 25,
        skip: 50,
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query simulating real-world user search', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { name: { contains: 'developer', mode: 'insensitive' } },
                { data: { path: 'bio', string_contains: 'developer' } },
                { data: { path: 'skills', array_contains: ['javascript', 'typescript'] } },
              ],
            },
            { data: { path: 'experience', gte: 3 } },
          ],
          NOT: { data: { path: 'status', in: ['banned', 'suspended', 'inactive'] } },
        },
        orderBy: [
          { data: { path: 'experience', direction: 'desc', type: 'int' } },
          { createdAt: 'desc' },
        ],
        take: 20,
        skip: 0,
      });

      expect(sql).toMatchSnapshot();
    });

    it('should generate query with multiple json filters on different fields', () => {
      const sql = buildAndFormat({
        tableName: 'users',
        fieldConfig,
        where: {
          AND: [
            { data: { path: 'profile.verified', equals: true } },
            { data: { path: ['settings', 'notifications', 'email'], equals: true } },
            { metadata: { path: 'source', equals: 'organic' } },
            { metadata: { path: 'referrer', string_starts_with: 'https://' } },
          ],
        },
      });

      expect(sql).toMatchSnapshot();
    });
  });
});
