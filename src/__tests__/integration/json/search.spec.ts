import './setup';
import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';

describe('JSON Full-Text Search', () => {
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
      doc1: nanoid(),
      doc2: nanoid(),
      doc3: nanoid(),
      doc4: nanoid(),
      doc5: nanoid(),
    };

    await prisma.testTable.createMany({
      data: [
        {
          id: ids.doc1,
          name: 'Doc1',
          data: {
            title: 'Introduction to PostgreSQL',
            content: 'PostgreSQL is a powerful open source database',
            tags: ['database', 'postgresql', 'sql'],
            metadata: {
              author: 'John Doe',
              published: true,
            },
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.doc2,
          name: 'Doc2',
          data: {
            title: 'Full-Text Search Guide',
            content: 'Learn how to implement full-text search in your application',
            tags: ['search', 'text', 'indexing'],
            metadata: {
              author: 'Jane Smith',
              published: false,
            },
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.doc3,
          name: 'Doc3',
          data: {
            title: 'Advanced SQL Queries',
            content: 'Master complex SQL queries and optimization techniques',
            tags: ['sql', 'queries', 'optimization'],
            metadata: {
              author: 'Bob Johnson',
              published: true,
            },
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.doc4,
          name: 'Doc4',
          data: {
            title: 'JSON in PostgreSQL',
            content: 'Working with JSON and JSONB data types in PostgreSQL database',
            tags: ['json', 'postgresql', 'data-types'],
            metadata: {
              author: 'Alice Brown',
              published: true,
            },
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.doc5,
          name: 'Doc5',
          data: {
            title: 'Database Performance',
            content: 'Tips and tricks for optimizing database performance and queries',
            tags: ['performance', 'optimization', 'database'],
            metadata: {
              author: 'Charlie Wilson',
              published: false,
            },
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
      ],
    });
  });

  describe('Root level search', () => {
    it('should search across entire document with empty path', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'PostgreSQL',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should search across entire document with array path', async () => {
      await testQuery(
        {
          data: {
            path: [],
            search: 'optimization',
          },
        },
        [ids.doc3, ids.doc5],
      );
    });

    it('should find documents with multiple matching terms (AND)', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'database performance',
          },
        },
        [ids.doc5],
      );
    });
  });

  describe('Specific path search', () => {
    it('should search in specific field', async () => {
      await testQuery(
        {
          data: {
            path: 'title',
            search: 'PostgreSQL',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should search in content field', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'search',
          },
        },
        [ids.doc2],
      );
    });

    it('should search in nested object', async () => {
      await testQuery(
        {
          data: {
            path: 'metadata',
            search: 'Smith',
          },
        },
        [ids.doc2],
      );
    });

    it('should search in nested field', async () => {
      await testQuery(
        {
          data: {
            path: 'metadata.author',
            search: 'John',
          },
        },
        [ids.doc1],
      );
    });
  });

  describe('Array search', () => {
    it('should search in array field', async () => {
      await testQuery(
        {
          data: {
            path: 'tags',
            search: 'postgresql',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should search with wildcard in array', async () => {
      await testQuery(
        {
          data: {
            path: 'tags',
            search: 'optimization',
          },
        },
        [ids.doc3, ids.doc5],
      );
    });

    it('should search in specific array element', async () => {
      await testQuery(
        {
          data: {
            path: 'tags',
            search: 'database',
          },
        },
        [ids.doc1, ids.doc5],
      );
    });
  });

  describe('Search type: plain (default)', () => {
    it('should match documents with both words (AND)', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'SQL queries',
            searchType: 'plain',
          },
        },
        [ids.doc3],
      );
    });
  });

  describe('Search type: phrase', () => {
    it('should match exact phrase in order', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'full-text search',
            searchType: 'phrase',
          },
        },
        [ids.doc2],
      );
    });

    it('should not match words out of order', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'search full-text',
            searchType: 'phrase',
          },
        },
        [],
      );
    });
  });

  describe('Search type: prefix', () => {
    it('should match word prefix', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'Post',
            searchType: 'prefix',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should match multiple word prefixes with AND', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'JSON types',
            searchType: 'prefix',
          },
        },
        [ids.doc4],
      );
    });

    it('should match partial words at beginning', async () => {
      await testQuery(
        {
          data: {
            path: 'title',
            search: 'Intro',
            searchType: 'prefix',
          },
        },
        [ids.doc1],
      );
    });

    it('should match case-insensitively', async () => {
      await testQuery(
        {
          data: {
            path: 'title',
            search: 'post',
            searchType: 'prefix',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should work with nested path', async () => {
      await testQuery(
        {
          data: {
            path: 'metadata.author',
            search: 'Jo',
            searchType: 'prefix',
          },
        },
        [ids.doc1, ids.doc3],
      );
    });

    it('should work with root level search', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'optim',
            searchType: 'prefix',
          },
        },
        [ids.doc3, ids.doc5],
      );
    });

    it('should work with simple language', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'power',
            searchType: 'prefix',
            searchLanguage: 'simple',
          },
        },
        [ids.doc1],
      );
    });

    it('should work with english language', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'optim',
            searchType: 'prefix',
            searchLanguage: 'english',
          },
        },
        [ids.doc3, ids.doc5],
      );
    });

    it('should work with searchIn: values', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'Post',
            searchType: 'prefix',
            searchIn: 'values',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should work with searchIn: keys', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'meta',
            searchType: 'prefix',
            searchIn: 'keys',
          },
        },
        [ids.doc1, ids.doc2, ids.doc3, ids.doc4, ids.doc5],
      );
    });

    it('should combine language and searchIn', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'JSON JSONB',
            searchType: 'prefix',
            searchLanguage: 'english',
            searchIn: 'strings',
          },
        },
        [ids.doc4],
      );
    });
  });

  describe('Search type: tsquery', () => {
    it('should support prefix operator directly', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'Post:*',
            searchType: 'tsquery',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should support AND operator', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'database & performance',
            searchType: 'tsquery',
          },
        },
        [ids.doc5],
      );
    });

    it('should support OR operator', async () => {
      await testQuery(
        {
          data: {
            path: 'title',
            search: 'Introduction | Advanced',
            searchType: 'tsquery',
          },
        },
        [ids.doc1, ids.doc3],
      );
    });

    it('should support NOT operator', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'postgresql & !JSON',
            searchType: 'tsquery',
          },
        },
        [ids.doc1],
      );
    });

    it('should support phrase operator', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'full-text <-> search',
            searchType: 'tsquery',
          },
        },
        [ids.doc2],
      );
    });

    it('should support complex expressions', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'postgresql & database & !JSON',
            searchType: 'tsquery',
          },
        },
        [ids.doc1],
      );
    });

    it('should support prefix with AND', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'JSON:* & JSONB:*',
            searchType: 'tsquery',
          },
        },
        [ids.doc4],
      );
    });

    it('should work with simple language', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'database & powerful',
            searchType: 'tsquery',
            searchLanguage: 'simple',
          },
        },
        [ids.doc1],
      );
    });

    it('should work with english language', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'optimize:*',
            searchType: 'tsquery',
            searchLanguage: 'english',
          },
        },
        [ids.doc3, ids.doc5],
      );
    });

    it('should work with searchIn: values', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'postgresql & database',
            searchType: 'tsquery',
            searchIn: 'values',
          },
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should work with searchIn: keys', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'content | title',
            searchType: 'tsquery',
            searchIn: 'keys',
          },
        },
        [ids.doc1, ids.doc2, ids.doc3, ids.doc4, ids.doc5],
      );
    });

    it('should combine language and searchIn', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'database:* & !JSON',
            searchType: 'tsquery',
            searchLanguage: 'english',
            searchIn: 'strings',
          },
        },
        [ids.doc1, ids.doc5],
      );
    });
  });

  describe('Search language', () => {
    it('should use simple language by default', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'database',
          },
        },
        [ids.doc1, ids.doc4, ids.doc5],
      );
    });

    it('should use specified language', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'database',
            searchLanguage: 'english',
          },
        },
        [ids.doc1, ids.doc4, ids.doc5],
      );
    });
  });

  describe('Combined with other filters', () => {
    it('should combine search with equals filter', async () => {
      await testQuery(
        {
          AND: [
            {
              data: {
                path: '',
                search: 'postgresql',
              },
            },
            {
              data: {
                path: 'metadata.published',
                equals: true,
              },
            },
          ],
        },
        [ids.doc1, ids.doc4],
      );
    });

    it('should combine search with string contains', async () => {
      await testQuery(
        {
          AND: [
            {
              data: {
                path: 'content',
                search: 'PostgreSQL',
              },
            },
            {
              data: {
                path: 'title',
                string_contains: 'JSON',
              },
            },
          ],
        },
        [ids.doc4],
      );
    });
  });

  describe('Recursive search across nesting levels', () => {
    let nestedIds: Record<string, string> = {};

    beforeEach(async () => {
      nestedIds = {
        level0: nanoid(),
        level1: nanoid(),
        level2: nanoid(),
        level3: nanoid(),
      };

      await prisma.testTable.createMany({
        data: [
          {
            id: nestedIds.level0,
            name: 'Level0',
            data: {
              content: 'recursive search test',
              other: 'unrelated data',
            },
            createdAt: new Date('2025-01-10T00:00:00.000Z'),
          },
          {
            id: nestedIds.level1,
            name: 'Level1',
            data: {
              content: {
                nested: 'recursive search test',
                other: 'unrelated data',
              },
            },
            createdAt: new Date('2025-01-11T00:00:00.000Z'),
          },
          {
            id: nestedIds.level2,
            name: 'Level2',
            data: {
              content: {
                level1: {
                  level2: 'recursive search test',
                  other: 'unrelated data',
                },
              },
            },
            createdAt: new Date('2025-01-12T00:00:00.000Z'),
          },
          {
            id: nestedIds.level3,
            name: 'Level3',
            data: {
              content: {
                items: [
                  { text: 'unrelated' },
                  { text: 'recursive search test' },
                  { nested: { deep: 'other data' } },
                ],
              },
            },
            createdAt: new Date('2025-01-13T00:00:00.000Z'),
          },
        ],
      });
    });

    it('should find word at different nesting levels under same path', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'recursive',
          },
        },
        [nestedIds.level0, nestedIds.level1, nestedIds.level2, nestedIds.level3],
      );
    });

    it('should find phrase at different nesting levels', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'search test',
            searchType: 'plain',
          },
        },
        [nestedIds.level0, nestedIds.level1, nestedIds.level2, nestedIds.level3],
      );
    });

    it('should search recursively in arrays at different depths', async () => {
      const arrayIds = {
        arr0: nanoid(),
        arr1: nanoid(),
        arr2: nanoid(),
      };

      await prisma.testTable.createMany({
        data: [
          {
            id: arrayIds.arr0,
            name: 'Array0',
            data: {
              items: ['unique-marker-xyz', 'other'],
            },
            createdAt: new Date('2025-01-14T00:00:00.000Z'),
          },
          {
            id: arrayIds.arr1,
            name: 'Array1',
            data: {
              items: [
                { text: 'unique-marker-xyz' },
                { text: 'other' },
              ],
            },
            createdAt: new Date('2025-01-15T00:00:00.000Z'),
          },
          {
            id: arrayIds.arr2,
            name: 'Array2',
            data: {
              items: [
                {
                  nested: [
                    { deep: 'unique-marker-xyz' },
                    { deep: 'other' },
                  ],
                },
              ],
            },
            createdAt: new Date('2025-01-16T00:00:00.000Z'),
          },
        ],
      });

      await testQuery(
        {
          data: {
            path: 'items',
            search: 'unique-marker-xyz',
          },
        },
        [arrayIds.arr0, arrayIds.arr1, arrayIds.arr2],
      );
    });

    it('should search in mixed structures (strings, objects, arrays)', async () => {
      const mixedIds = {
        string: nanoid(),
        object: nanoid(),
        array: nanoid(),
        mixed: nanoid(),
      };

      await prisma.testTable.createMany({
        data: [
          {
            id: mixedIds.string,
            name: 'MixedString',
            data: {
              field: 'special-keyword-123',
            },
            createdAt: new Date('2025-01-17T00:00:00.000Z'),
          },
          {
            id: mixedIds.object,
            name: 'MixedObject',
            data: {
              field: {
                prop: 'special-keyword-123',
              },
            },
            createdAt: new Date('2025-01-18T00:00:00.000Z'),
          },
          {
            id: mixedIds.array,
            name: 'MixedArray',
            data: {
              field: ['unrelated', 'special-keyword-123'],
            },
            createdAt: new Date('2025-01-19T00:00:00.000Z'),
          },
          {
            id: mixedIds.mixed,
            name: 'MixedComplex',
            data: {
              field: {
                list: [
                  { name: 'item1' },
                  { name: 'special-keyword-123' },
                ],
              },
            },
            createdAt: new Date('2025-01-20T00:00:00.000Z'),
          },
        ],
      });

      await testQuery(
        {
          data: {
            path: 'field',
            search: 'special-keyword-123',
          },
        },
        [mixedIds.string, mixedIds.object, mixedIds.array, mixedIds.mixed],
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty search query gracefully', async () => {
      await expect(
        testQuery(
          {
            data: {
              path: '',
              search: '',
            },
          },
          [],
        ),
      ).rejects.toThrow();
    });

    it('should handle non-existent path', async () => {
      await testQuery(
        {
          data: {
            path: 'nonexistent',
            search: 'test',
          },
        },
        [],
      );
    });

    it('should handle special characters in search', async () => {
      await testQuery(
        {
          data: {
            path: 'title',
            search: 'Full-Text',
          },
        },
        [ids.doc2],
      );
    });
  });

  describe('searchIn parameter', () => {
    let searchInIds: Record<string, string> = {};

    beforeEach(async () => {
      searchInIds = {
        withTitle: nanoid(),
        withContent: nanoid(),
        withNumber: nanoid(),
        withBoolean: nanoid(),
      };

      await prisma.testTable.createMany({
        data: [
          {
            id: searchInIds.withTitle,
            name: 'SearchIn1',
            data: {
              categoryName: 'Document about xyzunique testing',
              content: 'This is content',
              priorityLevel: 5,
            },
            createdAt: new Date('2025-01-21T00:00:00.000Z'),
          },
          {
            id: searchInIds.withContent,
            name: 'SearchIn2',
            data: {
              heading: 'Some heading',
              content: 'xyzunique the search functionality',
              priorityLevel: 10,
            },
            createdAt: new Date('2025-01-22T00:00:00.000Z'),
          },
          {
            id: searchInIds.withNumber,
            name: 'SearchIn3',
            data: {
              categoryName: 'Numbers document',
              score: 999888,
              count: 777666,
            },
            createdAt: new Date('2025-01-23T00:00:00.000Z'),
          },
          {
            id: searchInIds.withBoolean,
            name: 'SearchIn4',
            data: {
              categoryName: 'Boolean document',
              isSpecialFlag: true,
              isVerifiedFlag: false,
            },
            createdAt: new Date('2025-01-24T00:00:00.000Z'),
          },
        ],
      });
    });

    it('should search in all (keys + values) by default', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'categoryName',
          },
        },
        [searchInIds.withTitle, searchInIds.withNumber, searchInIds.withBoolean],
      );
    });

    it('should search only in values with searchIn: values', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'xyzunique',
            searchIn: 'values',
          },
        },
        [searchInIds.withTitle, searchInIds.withContent],
      );
    });

    it('should search only in keys with searchIn: keys', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'priorityLevel',
            searchIn: 'keys',
          },
        },
        [searchInIds.withTitle, searchInIds.withContent],
      );
    });

    it('should not find key names when using searchIn: values', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'categoryName',
            searchIn: 'values',
          },
        },
        [],
      );
    });

    it('should not find values when using searchIn: keys', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'xyzunique',
            searchIn: 'keys',
          },
        },
        [],
      );
    });

    it('should search only in strings with searchIn: strings', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'document',
            searchIn: 'strings',
          },
        },
        [searchInIds.withTitle, searchInIds.withNumber, searchInIds.withBoolean],
      );
    });

    it('should search only in numbers with searchIn: numbers', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: '999888',
            searchIn: 'numbers',
          },
        },
        [searchInIds.withNumber],
      );
    });

    it('should search only in booleans with searchIn: booleans', async () => {
      // Combine with path to make search unique to our test data
      await testQuery(
        {
          data: {
            path: 'isSpecialFlag',
            search: 'true',
            searchIn: 'booleans',
          },
        },
        [searchInIds.withBoolean],
      );
    });

    it('should combine searchIn with specific path', async () => {
      await testQuery(
        {
          data: {
            path: 'content',
            search: 'xyzunique',
            searchIn: 'strings',
          },
        },
        [searchInIds.withContent],
      );
    });

    it('should combine searchIn with searchType', async () => {
      await testQuery(
        {
          data: {
            path: '',
            search: 'search functionality',
            searchIn: 'values',
            searchType: 'plain',
          },
        },
        [searchInIds.withContent],
      );
    });
  });
});
