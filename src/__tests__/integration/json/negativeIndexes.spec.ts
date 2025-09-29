import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('Negative Array Indexes', () => {
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

  beforeEach(async () => {
    ids = {
      item1: nanoid(),
      item2: nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids.item1,
          name: 'Item1',
          data: {
            tags: ['first', 'second', 'third', 'fourth'],
            nested: {
              values: ['a', 'b', 'c'],
            },
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.item2,
          name: 'Item2',
          data: {
            tags: ['x', 'y', 'z'],
            nested: {
              values: ['p', 'q'],
            },
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('PostgreSQL negative index support', () => {
    it('should support negative array indexing with -1 (last element)', async () => {
      // Test with array path using negative index -1
      await testQuery({ data: { path: ['tags', '-1'], equals: 'fourth' } }, [ids.item1]);

      // Test with string path using negative index -1
      await testQuery({ data: { path: 'tags[-1]', equals: 'fourth' } }, [ids.item1]);
    });

    it('should support [last] keyword directly', async () => {
      // Test with array path using 'last' directly
      await testQuery({ data: { path: ['tags', 'last'], equals: 'fourth' } }, [ids.item1]);

      // Test with string path using [last] directly
      await testQuery({ data: { path: 'tags[last]', equals: 'fourth' } }, [ids.item1]);
    });

    it('should throw error for -2 (not supported yet)', async () => {
      const errorMessage =
        "Negative index -2 is not supported yet. Only -1 (converted to 'last') is supported.";

      // Test with array path using negative index -2 should throw error
      testQueryExpectError({ data: { path: ['tags', '-2'], equals: 'third' } }, errorMessage);

      // Test with string path using negative index -2 should throw error
      testQueryExpectError({ data: { path: 'tags[-2]', equals: 'third' } }, errorMessage);
    });

    it('should access last element using length-based approach if negative indexing is not supported', async () => {
      // Alternative approach: test for known last element without using negative indexing
      await testQuery({ data: { path: ['tags', '3'], equals: 'fourth' } }, [ids.item1]);
      await testQuery({ data: { path: 'tags[3]', equals: 'fourth' } }, [ids.item1]);
    });

    it('should handle various positive indexes correctly', async () => {
      // Test index 0 (first element)
      await testQuery({ data: { path: ['tags', '0'], equals: 'first' } }, [ids.item1]);

      // Test index 1 (second element)
      await testQuery({ data: { path: ['tags', '1'], equals: 'second' } }, [ids.item1]);

      // Test index 2 (third element)
      await testQuery({ data: { path: ['tags', '2'], equals: 'third' } }, [ids.item1]);
    });
  });

  describe('Nested array indexing', () => {
    it('should access nested array elements by index', async () => {
      // Test nested.values[0]
      await testQuery({ data: { path: ['nested', 'values', '0'], equals: 'a' } }, [ids.item1]);

      // Test nested.values[1] with string notation
      await testQuery({ data: { path: 'nested.values[1]', equals: 'b' } }, [ids.item1]);
    });
  });
});
