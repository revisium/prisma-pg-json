import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('Path Notation Comparison', () => {
  let ids: Record<string, string> = {};

  const fieldConfig = {
    data: 'json',
    createdAt: 'date',
  } as const;

  const testBothPaths = async (
    stringWhere: WhereConditionsTyped<typeof fieldConfig>,
    arrayWhere: WhereConditionsTyped<typeof fieldConfig>,
    expectedIds: string[],
  ) => {
    const stringQuery = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where: stringWhere,
      orderBy: { createdAt: 'asc' },
    });

    const arrayQuery = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where: arrayWhere,
      orderBy: { createdAt: 'asc' },
    });

    const stringResults = await prisma.$queryRaw<Array<{ id: string }>>(stringQuery);
    const arrayResults = await prisma.$queryRaw<Array<{ id: string }>>(arrayQuery);

    expect(stringResults.length).toBe(expectedIds.length);
    expect(arrayResults.length).toBe(expectedIds.length);
    expect(stringResults.map((r) => r.id)).toEqual(expectedIds);
    expect(arrayResults.map((r) => r.id)).toEqual(expectedIds);
    expect(stringResults.map((r) => r.id)).toEqual(arrayResults.map((r) => r.id));
  };

  const testQueryExpectError = (
    where: WhereConditionsTyped<typeof fieldConfig>,
    errorMessage: string,
  ) => {
    expect(() => {
      buildQuery({
        tableName: 'test_tables',
        fieldConfig,
        where,
      });
    }).toThrow(errorMessage);
  };

  const testQueryWithMultipleResults = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
    expectedIds: string[],
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
    });

    const results = await prisma.$queryRaw<Array<{ id: string }>>(query);
    expect(results.length).toBe(expectedIds.length);
    expect(results.map((r) => r.id).sort()).toEqual(expectedIds.sort());
    return results;
  };

  beforeEach(async () => {
    ids = {
      item1: nanoid(),
      item2: nanoid(),
      item3: nanoid(),
      item4: nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids.item1,
          name: 'Item1',
          data: {
            tags: ['frontend', 'react', 'typescript'],
            categories: [
              { name: 'web', priority: 1 },
              { name: 'mobile', priority: 2 },
            ],
            nested: {
              items: [
                { field: 'value1', score: 10 },
                { field: 'value2', score: 20 },
                { field: 'value3', score: 30 },
              ],
            },
            matrix: [
              [
                { x: 1, y: 1, value: 'a' },
                { x: 1, y: 2, value: 'b' },
              ],
              [
                { x: 2, y: 1, value: 'c' },
                { x: 2, y: 2, value: 'd' },
              ],
            ],
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.item2,
          name: 'Item2',
          data: {
            tags: ['backend', 'node', 'express'],
            categories: [
              { name: 'api', priority: 1 },
              { name: 'database', priority: 3 },
            ],
            nested: {
              items: [
                { field: 'value4', score: 40 },
                { field: 'value5', score: 50 },
              ],
            },
            matrix: [
              [
                { x: 1, y: 1, value: 'e' },
                { x: 1, y: 2, value: 'f' },
              ],
            ],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.item3,
          name: 'Item3',
          data: {
            tags: ['fullstack', 'vue', 'node'],
            categories: [{ name: 'frontend', priority: 2 }],
            nested: {
              items: [{ field: 'value6', score: 60 }],
            },
            matrix: [],
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.item4,
          name: 'Item4',
          data: {
            tags: [],
            categories: [],
            nested: {
              items: [],
            },
            matrix: [[{ x: 3, y: 3, value: 'g' }]],
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('String path vs Array path equivalence', () => {
    it('should give same results for simple property access', async () => {
      await testBothPaths(
        { data: { path: 'tags', equals: ['frontend', 'react', 'typescript'] } },
        { data: { path: ['tags'], equals: ['frontend', 'react', 'typescript'] } },
        [ids.item1],
      );
    });

    it('should give same results for nested property access', async () => {
      await testBothPaths(
        { data: { path: 'nested.items', array_contains: [{ field: 'value1', score: 10 }] } },
        { data: { path: ['nested', 'items'], array_contains: [{ field: 'value1', score: 10 }] } },
        [ids.item1],
      );
    });
  });

  describe('Array index access patterns', () => {
    it('should access first array element with index 0', async () => {
      await testBothPaths(
        { data: { path: 'tags[0]', equals: 'frontend' } },
        { data: { path: ['tags', '0'], equals: 'frontend' } },
        [ids.item1],
      );
    });

    it('should access second array element with index 1', async () => {
      await testBothPaths(
        { data: { path: 'tags[1]', equals: 'react' } },
        { data: { path: ['tags', '1'], equals: 'react' } },
        [ids.item1],
      );
    });

    it('should access third array element with index 2', async () => {
      await testBothPaths(
        { data: { path: 'tags[2]', equals: 'typescript' } },
        { data: { path: ['tags', '2'], equals: 'typescript' } },
        [ids.item1],
      );
    });

    it('should access nested array element properties', async () => {
      await testBothPaths(
        { data: { path: 'categories[0].name', equals: 'web' } },
        { data: { path: ['categories', '0', 'name'], equals: 'web' } },
        [ids.item1],
      );
    });

    it('should access deeply nested array element properties', async () => {
      await testBothPaths(
        { data: { path: 'nested.items[1].field', equals: 'value2' } },
        { data: { path: ['nested', 'items', '1', 'field'], equals: 'value2' } },
        [ids.item1],
      );
    });
  });

  describe('Two-dimensional array access', () => {
    it('should access matrix[0][0] element', async () => {
      await testBothPaths(
        { data: { path: 'matrix[0][0].value', equals: 'a' } },
        { data: { path: ['matrix', '0', '0', 'value'], equals: 'a' } },
        [ids.item1],
      );
    });

    it('should access matrix[0][1] element', async () => {
      await testBothPaths(
        { data: { path: 'matrix[0][1].value', equals: 'b' } },
        { data: { path: ['matrix', '0', '1', 'value'], equals: 'b' } },
        [ids.item1],
      );
    });

    it('should access matrix[1][0] element', async () => {
      await testBothPaths(
        { data: { path: 'matrix[1][0].value', equals: 'c' } },
        { data: { path: ['matrix', '1', '0', 'value'], equals: 'c' } },
        [ids.item1],
      );
    });

    it('should access matrix[1][1] element', async () => {
      await testBothPaths(
        { data: { path: 'matrix[1][1].value', equals: 'd' } },
        { data: { path: ['matrix', '1', '1', 'value'], equals: 'd' } },
        [ids.item1],
      );
    });
  });

  describe('Negative array indexes', () => {
    it('should access last element with -1 index', async () => {
      await testBothPaths(
        { data: { path: 'tags[-1]', equals: 'typescript' } },
        { data: { path: ['tags', '-1'], equals: 'typescript' } },
        [ids.item1],
      );
    });

    it('should throw error for -2 index (not supported)', async () => {
      const errorMessage =
        "Negative index -2 is not supported yet. Only -1 (converted to 'last') is supported.";

      // Array path: ['tags', '-2'] should throw error
      testQueryExpectError({ data: { path: ['tags', '-2'], equals: 'react' } }, errorMessage);

      // String path: tags[-2] should throw error
      testQueryExpectError({ data: { path: 'tags[-2]', equals: 'react' } }, errorMessage);
    });

    it('should access nested array element with negative index', async () => {
      await testBothPaths(
        { data: { path: 'nested.items[-1].field', equals: 'value3' } },
        { data: { path: ['nested', 'items', '-1', 'field'], equals: 'value3' } },
        [ids.item1],
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle out-of-bounds array access', async () => {
      await testBothPaths(
        { data: { path: 'tags[10]', equals: 'nonexistent' } },
        { data: { path: ['tags', '10'], equals: 'nonexistent' } },
        [],
      );
    });

    it('should handle access to empty arrays', async () => {
      // Should find no records with 'anything' in tags[0] because item4 has empty tags
      await testBothPaths(
        { data: { path: 'tags[0]', equals: 'anything' } },
        { data: { path: ['tags', '0'], equals: 'anything' } },
        [],
      );
    });
  });

  describe('Numeric operations on array indices', () => {
    it('should perform numeric comparisons on array element properties', async () => {
      await testBothPaths(
        { data: { path: 'categories[0].priority', gt: 1 } },
        { data: { path: ['categories', '0', 'priority'], gt: 1 } },
        [ids.item3],
      );
    });

    it('should perform string operations on array elements', async () => {
      const expectedIds = [ids.item1, ids.item2, ids.item3]; // value1, value4, value6
      const stringResults = await testQueryWithMultipleResults(
        { data: { path: 'nested.items[0].field', string_contains: 'value' } },
        expectedIds,
      );
      const arrayResults = await testQueryWithMultipleResults(
        { data: { path: ['nested', 'items', '0', 'field'], string_contains: 'value' } },
        expectedIds,
      );

      expect(new Set(stringResults.map((r) => r.id))).toEqual(
        new Set(arrayResults.map((r) => r.id)),
      );
    });
  });
});
