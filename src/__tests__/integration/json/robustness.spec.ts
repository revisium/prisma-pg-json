import { prisma } from './setup';
import { nanoid } from 'nanoid';
import { buildQuery } from '../../../query-builder';
import { WhereConditionsTyped } from '../../../types';
describe('Robustness tests', () => {
  const fieldConfig = {
    data: 'json',
  } as const;

  const testQuery = async (
    where: WhereConditionsTyped<typeof fieldConfig>,
  ) => {
    const query = buildQuery({
      tableName: 'test_tables',
      fieldConfig,
      where,
    });

    return prisma.$queryRaw<Array<{ id: string }>>(query);
  };

  describe('ReDoS protection', () => {
    it('should handle regex-heavy string_contains without hanging', async () => {
      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'redos-test',
          data: { text: 'a'.repeat(1000) },
        },
      });

      const results = await testQuery({
        data: {
          path: 'text',
          string_contains: 'a'.repeat(50),
        },
      });

      expect(results).toHaveLength(1);
    });

    it('should handle special regex characters in string_starts_with safely', async () => {
      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'regex-escape',
          data: { text: '(test)+[value]{data}' },
        },
      });

      const results = await testQuery({
        data: {
          path: 'text',
          string_starts_with: '(test)+[value]',
        },
      });

      expect(results).toHaveLength(1);
    });

    it('should handle backslash-heavy patterns in string_ends_with', async () => {
      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'backslash',
          data: { path: String.raw`C:\Users\test\file.txt` },
        },
      });

      const results = await testQuery({
        data: {
          path: 'path',
          string_ends_with: String.raw`\file.txt`,
        },
      });

      expect(results).toHaveLength(1);
    });

    it('should handle search with special tsquery characters without error', async () => {
      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'search-special',
          data: { content: 'normal text for searching' },
        },
      });

      const results = await testQuery({
        data: {
          path: 'content',
          search: '<script>alert("xss")</script>',
        },
      });

      expect(results).toHaveLength(0);
    });

    it('should handle search with operators & | ! without injection', async () => {
      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'search-operators',
          data: { content: 'cats and dogs' },
        },
      });

      const results = await testQuery({
        data: {
          path: 'content',
          search: 'cats & dogs | birds ! fish',
          searchType: 'plain',
        },
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('large JSON documents', () => {
    it('should handle JSON with many fields (200 keys)', async () => {
      const largeObj: Record<string, string> = {};
      for (let i = 0; i < 200; i++) {
        largeObj[`field_${i}`] = `value_${i}`;
      }

      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'large-keys',
          data: largeObj,
        },
      });

      const results = await testQuery({
        data: {
          path: 'field_150',
          equals: 'value_150',
        },
      });

      expect(results).toHaveLength(1);
    });

    it('should handle deeply nested JSON (10 levels)', async () => {
      const nested = JSON.parse(
        '{"level0":{"level1":{"level2":{"level3":{"level4":{"level5":{"level6":{"level7":{"level8":{"level9":{"value":"found"}}}}}}}}}}}',
      );

      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'deep-nesting',
          data: nested,
        },
      });

      const results = await testQuery({
        data: {
          path: 'level0.level1.level2.level3.level4.level5.level6.level7.level8.level9.value',
          equals: 'found',
        },
      });

      expect(results).toHaveLength(1);
    });

    it('should handle large arrays (1000 elements)', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `item_${i}`,
      }));

      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'large-array',
          data: { items: largeArray },
        },
      });

      const results = await testQuery({
        data: {
          path: 'items[999].name',
          equals: 'item_999',
        },
      });

      expect(results).toHaveLength(1);
    });

    it('should search across large JSON document', async () => {
      const doc: Record<string, { title: string; content: string }> = {};
      for (let i = 0; i < 50; i++) {
        doc[`section_${i}`] = {
          title: `Section ${i}`,
          content: i === 42 ? 'This contains the needle we are looking for' : 'Ordinary content here',
        };
      }

      await prisma.testTable.create({
        data: {
          id: nanoid(),
          name: 'large-search',
          data: doc,
        },
      });

      const results = await testQuery({
        data: {
          path: '',
          search: 'needle',
        },
      });

      expect(results).toHaveLength(1);
    });
  });

  describe('concurrent queries', () => {
    it('should handle multiple concurrent queries safely', async () => {
      for (let i = 0; i < 10; i++) {
        await prisma.testTable.create({
          data: {
            id: nanoid(),
            name: `concurrent-${i}`,
            data: { index: i, label: `item-${i}` },
          },
        });
      }

      const queries = Array.from({ length: 20 }, (_, i) =>
        testQuery({
          data: {
            path: 'index',
            equals: i % 10,
          },
        }),
      );

      const results = await Promise.all(queries);

      for (const result of results) {
        expect(result).toHaveLength(1);
      }
    });
  });
});
