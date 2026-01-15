import './setup';
import { nanoid } from 'nanoid';
import { prisma, createTestData, createFile } from './setup';
import {
  buildSubSchemaQuery,
  buildSubSchemaCountQuery,
  buildSubSchemaCte,
  buildSubSchemaOrderBy,
} from '../../../sub-schema/sub-schema-builder';
import { Prisma } from '../../../generated/client';
import {
  SubSchemaTableConfig,
  SubSchemaItem,
  SubSchemaWhereInput,
  SubSchemaOrderByItem,
} from '../../../sub-schema/types';

describe('SubSchemaBuilder Integration', () => {

  describe('single path extraction', () => {
    it('should extract single object path', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'characters',
          tableVersionId,
          rows: [
            {
              rowId: 'hero',
              rowVersionId: nanoid(),
              data: { name: 'Hero', avatar: createFile('file-1', 'hero.png', { size: 1024 }) },
            },
            {
              rowId: 'villain',
              rowVersionId: nanoid(),
              data: { name: 'Villain', avatar: createFile('file-2', 'villain.png', { size: 2048 }) },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'characters',
          tableVersionId,
          paths: [{ path: 'avatar' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.rowId).sort()).toEqual(['hero', 'villain']);
      expect(results[0].tableId).toBe('characters');
      expect(results[0].fieldPath).toBe('avatar');
      expect((results[0].data as Record<string, unknown>).fileId).toBeDefined();
    });

    it('should handle nested object path', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'profiles',
          tableVersionId,
          rows: [
            {
              rowId: 'user-1',
              rowVersionId: nanoid(),
              data: {
                name: 'User 1',
                settings: { theme: 'dark', banner: createFile('file-banner-1', 'banner.jpg', { size: 5000 }) },
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'profiles',
          tableVersionId,
          paths: [{ path: 'settings.banner' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(1);
      expect(results[0].fieldPath).toBe('settings.banner');
      expect((results[0].data as Record<string, unknown>).fileName).toBe('banner.jpg');
    });

    it('should skip non-object values at path', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'items',
          tableVersionId,
          rows: [
            {
              rowId: 'item-1',
              rowVersionId: nanoid(),
              data: { name: 'Item 1', image: createFile('file-1', 'item.png', { size: 1024 }) },
            },
            {
              rowId: 'item-2',
              rowVersionId: nanoid(),
              data: { name: 'Item 2', image: null },
            },
            {
              rowId: 'item-3',
              rowVersionId: nanoid(),
              data: { name: 'Item 3', image: 'not-an-object' },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'items',
          tableVersionId,
          paths: [{ path: 'image' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(1);
      expect(results[0].rowId).toBe('item-1');
    });
  });

  describe('array path extraction', () => {
    it('should extract items from array and create separate entities', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'posts',
          tableVersionId,
          rows: [
            {
              rowId: 'post-1',
              rowVersionId: nanoid(),
              data: {
                title: 'Post 1',
                gallery: [
                  createFile('g1', 'img1.png', { size: 100 }),
                  createFile('g2', 'img2.png', { size: 200 }),
                  createFile('g3', 'img3.png', { size: 300 }),
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'posts',
          tableVersionId,
          paths: [{ path: 'gallery[*]' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'gallery[0]',
        'gallery[1]',
        'gallery[2]',
      ]);
      expect(results.every((r) => r.rowId === 'post-1')).toBe(true);
    });

    it('should handle multiple rows with arrays', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'albums',
          tableVersionId,
          rows: [
            {
              rowId: 'album-1',
              rowVersionId: nanoid(),
              data: {
                name: 'Album 1',
                photos: [
                  createFile('a1-p1', 'photo1.jpg', { size: 1000 }),
                  createFile('a1-p2', 'photo2.jpg', { size: 2000 }),
                ],
              },
            },
            {
              rowId: 'album-2',
              rowVersionId: nanoid(),
              data: {
                name: 'Album 2',
                photos: [createFile('a2-p1', 'photo3.jpg', { size: 3000 })],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'albums',
          tableVersionId,
          paths: [{ path: 'photos[*]' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      const album1Results = results.filter((r) => r.rowId === 'album-1');
      const album2Results = results.filter((r) => r.rowId === 'album-2');
      expect(album1Results).toHaveLength(2);
      expect(album2Results).toHaveLength(1);
    });

    it('should skip empty arrays', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'galleries',
          tableVersionId,
          rows: [
            {
              rowId: 'gallery-1',
              rowVersionId: nanoid(),
              data: { name: 'Gallery 1', images: [createFile('img1', 'a.png', { size: 100 })] },
            },
            {
              rowId: 'gallery-2',
              rowVersionId: nanoid(),
              data: { name: 'Gallery 2', images: [] },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'galleries',
          tableVersionId,
          paths: [{ path: 'images[*]' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(1);
      expect(results[0].rowId).toBe('gallery-1');
    });
  });

  describe('nested object inside array', () => {
    it('should extract nested object from array elements', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'documents',
          tableVersionId,
          rows: [
            {
              rowId: 'doc-1',
              rowVersionId: nanoid(),
              data: {
                title: 'Document 1',
                attachments: [
                  { name: 'Attachment 1', file: createFile('f1', 'doc1.pdf', { size: 1000 }) },
                  { name: 'Attachment 2', file: createFile('f2', 'doc2.pdf', { size: 2000 }) },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'documents',
          tableVersionId,
          paths: [{ path: 'attachments[*].file' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'attachments[0].file',
        'attachments[1].file',
      ]);
      expect((results[0].data as Record<string, unknown>).fileId).toBeDefined();
      expect((results[0].data as Record<string, unknown>).fileName).toBeDefined();
    });

    it('should handle deeply nested object inside array', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'projects',
          tableVersionId,
          rows: [
            {
              rowId: 'project-1',
              rowVersionId: nanoid(),
              data: {
                name: 'Project 1',
                tasks: [
                  { name: 'Task 1', metadata: { attachment: createFile('f1', 'task1.png', { size: 500 }) } },
                  { name: 'Task 2', metadata: { attachment: createFile('f2', 'task2.png', { size: 600 }) } },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'projects',
          tableVersionId,
          paths: [{ path: 'tasks[*].metadata.attachment' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'tasks[0].metadata.attachment',
        'tasks[1].metadata.attachment',
      ]);
    });

    it('should skip array elements where nested object is missing or null', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'posts',
          tableVersionId,
          rows: [
            {
              rowId: 'post-1',
              rowVersionId: nanoid(),
              data: {
                title: 'Post 1',
                items: [
                  { label: 'Item 1', image: createFile('f1', 'img1.png', { size: 100 }) },
                  { label: 'Item 2', image: null },
                  { label: 'Item 3' },
                  { label: 'Item 4', image: createFile('f4', 'img4.png', { size: 400 }) },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'posts',
          tableVersionId,
          paths: [{ path: 'items[*].image' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'items[0].image',
        'items[3].image',
      ]);
    });

    it('should handle multiple rows with nested array objects', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'articles',
          tableVersionId,
          rows: [
            {
              rowId: 'article-1',
              rowVersionId: nanoid(),
              data: {
                title: 'Article 1',
                sections: [{ heading: 'Section 1', cover: createFile('a1s1', 'cover1.png', { size: 100 }) }],
              },
            },
            {
              rowId: 'article-2',
              rowVersionId: nanoid(),
              data: {
                title: 'Article 2',
                sections: [
                  { heading: 'Section A', cover: createFile('a2s1', 'coverA.png', { size: 200 }) },
                  { heading: 'Section B', cover: createFile('a2s2', 'coverB.png', { size: 300 }) },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'articles',
          tableVersionId,
          paths: [{ path: 'sections[*].cover' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      const article1Results = results.filter((r) => r.rowId === 'article-1');
      const article2Results = results.filter((r) => r.rowId === 'article-2');
      expect(article1Results).toHaveLength(1);
      expect(article2Results).toHaveLength(2);
    });

    it('should handle array path inside nested object (value.files[*])', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'containers',
          tableVersionId,
          rows: [
            {
              rowId: 'container-1',
              rowVersionId: nanoid(),
              data: {
                name: 'Container 1',
                value: {
                  files: [createFile('f1', 'file1.png', { size: 100 }), createFile('f2', 'file2.png', { size: 200 })],
                },
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'containers',
          tableVersionId,
          paths: [{ path: 'value.files[*]' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'value.files[0]',
        'value.files[1]',
      ]);
    });

    it('should handle array of objects with file field (value.files[*].file)', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'multi-asset',
          tableVersionId,
          rows: [
            {
              rowId: 'row-1',
              rowVersionId: nanoid(),
              data: {
                value: {
                  files: [
                    { file: createFile('f1', 'photo1.png', { size: 1000 }) },
                    { file: createFile('f2', 'photo2.png', { size: 2000 }) },
                    { file: createFile('f3', 'photo3.png', { size: 3000, status: 'ready' }) },
                  ],
                },
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'multi-asset',
          tableVersionId,
          paths: [{ path: 'value.files[*].file' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'value.files[0].file',
        'value.files[1].file',
        'value.files[2].file',
      ]);
      expect((results[0].data as Record<string, unknown>).fileId).toBeDefined();
    });

    it('should extract nested arrays (2 levels deep)', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'products',
          tableVersionId,
          rows: [
            {
              rowId: 'product-1',
              rowVersionId: nanoid(),
              data: {
                name: 'Product 1',
                items: [
                  {
                    name: 'Item A',
                    variants: [
                      { color: 'red', image: createFile('v1', 'red.png', { size: 100 }) },
                      { color: 'blue', image: createFile('v2', 'blue.png', { size: 200 }) },
                    ],
                  },
                  {
                    name: 'Item B',
                    variants: [
                      { color: 'green', image: createFile('v3', 'green.png', { size: 300 }) },
                    ],
                  },
                ],
              },
            },
            {
              rowId: 'product-2',
              rowVersionId: nanoid(),
              data: {
                name: 'Product 2',
                items: [
                  {
                    name: 'Item C',
                    variants: [
                      { color: 'yellow', image: createFile('v4', 'yellow.png', { size: 400 }) },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'products',
          tableVersionId,
          paths: [{ path: 'items[*].variants[*].image' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'items[0].variants[0].image',
        'items[0].variants[1].image',
        'items[1].variants[0].image',
        'items[0].variants[0].image',
      ].sort());

      const product1Results = results.filter((r) => r.rowId === 'product-1');
      const product2Results = results.filter((r) => r.rowId === 'product-2');
      expect(product1Results).toHaveLength(3);
      expect(product2Results).toHaveLength(1);

      expect((results[0].data as Record<string, unknown>).fileId).toBeDefined();
    });

    it('should handle nested arrays without trailing path (items[*].variants[*])', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'galleries',
          tableVersionId,
          rows: [
            {
              rowId: 'gallery-1',
              rowVersionId: nanoid(),
              data: {
                name: 'Gallery 1',
                sections: [
                  {
                    name: 'Section A',
                    photos: [
                      createFile('p1', 'photo1.jpg', { size: 100 }),
                      createFile('p2', 'photo2.jpg', { size: 200 }),
                    ],
                  },
                  {
                    name: 'Section B',
                    photos: [
                      createFile('p3', 'photo3.jpg', { size: 300 }),
                    ],
                  },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'galleries',
          tableVersionId,
          paths: [{ path: 'sections[*].photos[*]' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.fieldPath).sort()).toEqual([
        'sections[0].photos[0]',
        'sections[0].photos[1]',
        'sections[1].photos[0]',
      ]);
    });

    it('should filter nested array objects by data fields', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'media',
          tableVersionId,
          rows: [
            {
              rowId: 'media-1',
              rowVersionId: nanoid(),
              data: {
                name: 'Media Collection',
                files: [
                  { type: 'image', asset: createFile('f1', 'photo.png', { size: 1000 }) },
                  { type: 'video', asset: createFile('f2', 'clip.mp4', { size: 50000 }) },
                  { type: 'image', asset: createFile('f3', 'banner.jpg', { size: 2000, status: 'ready' }) },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'media',
          tableVersionId,
          paths: [{ path: 'files[*].asset' }],
        },
      ];

      const where: SubSchemaWhereInput = {
        data: { path: 'mimeType', string_starts_with: 'image/' },
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.every((r) => (r.data as Record<string, unknown>).mimeType?.toString().startsWith('image/'))).toBe(true);
    });
  });

  describe('multiple tables and paths', () => {
    it('should combine results from multiple tables with UNION ALL', async () => {
      const tableVersionId1 = nanoid();
      const tableVersionId2 = nanoid();

      await createTestData([
        {
          tableId: 'characters',
          tableVersionId: tableVersionId1,
          rows: [
            {
              rowId: 'char-1',
              rowVersionId: nanoid(),
              data: { name: 'Character 1', avatar: createFile('c1', 'char1.png', { size: 100 }) },
            },
          ],
        },
        {
          tableId: 'items',
          tableVersionId: tableVersionId2,
          rows: [
            {
              rowId: 'item-1',
              rowVersionId: nanoid(),
              data: { name: 'Item 1', icon: createFile('i1', 'item1.png', { size: 50 }) },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'characters',
          tableVersionId: tableVersionId1,
          paths: [{ path: 'avatar' }],
        },
        {
          tableId: 'items',
          tableVersionId: tableVersionId2,
          paths: [{ path: 'icon' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.tableId).sort()).toEqual(['characters', 'items']);
    });

    it('should handle table with multiple paths (single and array)', async () => {
      const tableVersionId = nanoid();

      await createTestData([
        {
          tableId: 'products',
          tableVersionId,
          rows: [
            {
              rowId: 'product-1',
              rowVersionId: nanoid(),
              data: {
                name: 'Product 1',
                mainImage: createFile('main', 'main.png', { size: 500 }),
                gallery: [createFile('g1', 'gal1.png', { size: 100 }), createFile('g2', 'gal2.png', { size: 200 })],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'products',
          tableVersionId,
          paths: [
            { path: 'mainImage' },
            { path: 'gallery[*]' },
          ],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.fieldPath === 'mainImage')).toHaveLength(1);
      expect(results.filter((r) => r.fieldPath.startsWith('gallery'))).toHaveLength(2);
    });
  });

  describe('filtering by meta fields', () => {
    let tableVersionId1: string;
    let tableVersionId2: string;

    beforeEach(async () => {
      tableVersionId1 = nanoid();
      tableVersionId2 = nanoid();

      await createTestData([
        {
          tableId: 'characters',
          tableVersionId: tableVersionId1,
          rows: [
            { rowId: 'hero', rowVersionId: nanoid(), data: { avatar: createFile('f1', 'hero.png', { size: 100 }) } },
            { rowId: 'villain', rowVersionId: nanoid(), data: { avatar: createFile('f2', 'villain.png', { size: 200 }) } },
          ],
        },
        {
          tableId: 'items',
          tableVersionId: tableVersionId2,
          rows: [{ rowId: 'sword', rowVersionId: nanoid(), data: { icon: createFile('f3', 'sword.png', { size: 50 }) } }],
        },
      ]);
    });

    it('should filter by tableId equals', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'characters', tableVersionId: tableVersionId1, paths: [{ path: 'avatar' }] },
        { tableId: 'items', tableVersionId: tableVersionId2, paths: [{ path: 'icon' }] },
      ];

      const where: SubSchemaWhereInput = { tableId: 'characters' };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.tableId === 'characters')).toBe(true);
    });

    it('should filter by rowId equals', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'characters', tableVersionId: tableVersionId1, paths: [{ path: 'avatar' }] },
      ];

      const where: SubSchemaWhereInput = { rowId: 'hero' };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(1);
      expect(results[0].rowId).toBe('hero');
    });

    it('should filter by fieldPath with startsWith', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'posts',
          tableVersionId,
          rows: [
            {
              rowId: 'post-1',
              rowVersionId: nanoid(),
              data: {
                mainImage: createFile('m1', 'main.png', { size: 100 }),
                gallery: [createFile('g1', 'gal1.png', { size: 50 }), createFile('g2', 'gal2.png', { size: 60 })],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'posts',
          tableVersionId,
          paths: [
            { path: 'mainImage' },
            { path: 'gallery[*]' },
          ],
        },
      ];

      const where: SubSchemaWhereInput = { fieldPath: { startsWith: 'gallery' } };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.fieldPath.startsWith('gallery'))).toBe(true);
    });
  });

  describe('filtering by data fields', () => {
    let tableVersionId: string;

    beforeEach(async () => {
      tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'files',
          tableVersionId,
          rows: [
            { rowId: 'row-1', rowVersionId: nanoid(), data: { attachment: createFile('f1', 'document.pdf', { size: 100000 }) } },
            { rowId: 'row-2', rowVersionId: nanoid(), data: { attachment: createFile('f2', 'image.png', { size: 50000 }) } },
            { rowId: 'row-3', rowVersionId: nanoid(), data: { attachment: createFile('f3', 'video.mp4', { size: 500000, status: 'ready' }) } },
            { rowId: 'row-4', rowVersionId: nanoid(), data: { attachment: createFile('f4', 'small-image.jpg', { size: 1000 }) } },
          ],
        },
      ]);
    });

    it('should filter by data field equals', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment' }] },
      ];

      const where: SubSchemaWhereInput = {
        data: { path: 'status', equals: 'uploaded' },
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.every((r) => (r.data as Record<string, unknown>).status === 'uploaded')).toBe(true);
    });

    it('should filter by data field contains', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment' }] },
      ];

      const where: SubSchemaWhereInput = {
        data: { path: 'fileName', string_contains: 'image' },
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.every((r) => (r.data as Record<string, unknown>).fileName?.toString().includes('image'))).toBe(true);
    });

    it('should filter by data field startsWith (mimeType prefix)', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment' }] },
      ];

      const where: SubSchemaWhereInput = {
        data: { path: 'mimeType', string_starts_with: 'image/' },
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.every((r) => (r.data as Record<string, unknown>).mimeType?.toString().startsWith('image/'))).toBe(true);
    });

    it('should filter by data field numeric comparison (size)', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment' }] },
      ];

      const where: SubSchemaWhereInput = {
        data: { path: 'size', gte: 50000 },
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.every((r) => ((r.data as Record<string, unknown>).size as number) >= 50000)).toBe(true);
    });

    it('should filter with size range', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment' }] },
      ];

      const where: SubSchemaWhereInput = {
        AND: [
          { data: { path: 'size', gte: 10000 } },
          { data: { path: 'size', lt: 200000 } },
        ],
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(
        results.every((r) => {
          const size = (r.data as Record<string, unknown>).size as number;
          return size >= 10000 && size < 200000;
        }),
      ).toBe(true);
    });
  });

  describe('logical operators', () => {
    let tableVersionId: string;

    beforeEach(async () => {
      tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'media',
          tableVersionId,
          rows: [
            { rowId: 'media-1', rowVersionId: nanoid(), data: { file: createFile('f1', 'photo.png', { size: 1000 }) } },
            { rowId: 'media-2', rowVersionId: nanoid(), data: { file: createFile('f2', 'video.mp4', { size: 100000 }) } },
            { rowId: 'media-3', rowVersionId: nanoid(), data: { file: createFile('f3', 'doc.pdf', { size: 5000, status: 'ready' }) } },
            { rowId: 'media-4', rowVersionId: nanoid(), data: { file: createFile('f4', 'audio.mp3', { size: 3000 }) } },
          ],
        },
      ]);
    });

    it('should handle AND condition', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'media', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const where: SubSchemaWhereInput = {
        AND: [
          { data: { path: 'status', equals: 'uploaded' } },
          { data: { path: 'size', lt: 10000 } },
        ],
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.rowId).sort()).toEqual(['media-1', 'media-4']);
    });

    it('should handle OR condition', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'media', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const where: SubSchemaWhereInput = {
        OR: [
          { data: { path: 'mimeType', string_starts_with: 'image/' } },
          { data: { path: 'mimeType', string_starts_with: 'video/' } },
        ],
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.rowId).sort()).toEqual(['media-1', 'media-2']);
    });

    it('should handle NOT condition', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'media', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const where: SubSchemaWhereInput = {
        NOT: { data: { path: 'status', equals: 'ready' } },
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.every((r) => (r.data as Record<string, unknown>).status !== 'ready')).toBe(true);
    });

    it('should handle complex nested conditions', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'media', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const where: SubSchemaWhereInput = {
        AND: [
          { data: { path: 'status', equals: 'uploaded' } },
          {
            OR: [
              { data: { path: 'mimeType', string_starts_with: 'image/' } },
              { data: { path: 'mimeType', string_starts_with: 'audio/' } },
            ],
          },
        ],
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.rowId).sort()).toEqual(['media-1', 'media-4']);
    });
  });

  describe('ordering', () => {
    let tableVersionId: string;

    beforeEach(async () => {
      tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'assets',
          tableVersionId,
          rows: [
            { rowId: 'asset-b', rowVersionId: nanoid(), data: { file: createFile('f1', 'beta.png', { size: 2000 }) } },
            { rowId: 'asset-a', rowVersionId: nanoid(), data: { file: createFile('f2', 'alpha.png', { size: 3000 }) } },
            { rowId: 'asset-c', rowVersionId: nanoid(), data: { file: createFile('f3', 'gamma.png', { size: 1000 }) } },
          ],
        },
      ]);
    });

    it('should order by rowId ascending', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const orderBy: SubSchemaOrderByItem[] = [{ rowId: 'asc' }];

      const query = buildSubSchemaQuery({
        tables,
        orderBy,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results.map((r) => r.rowId)).toEqual(['asset-a', 'asset-b', 'asset-c']);
    });

    it('should order by rowId descending', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const orderBy: SubSchemaOrderByItem[] = [{ rowId: 'desc' }];

      const query = buildSubSchemaQuery({
        tables,
        orderBy,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results.map((r) => r.rowId)).toEqual(['asset-c', 'asset-b', 'asset-a']);
    });

    it('should order by data field (fileName)', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const orderBy: SubSchemaOrderByItem[] = [
        { data: { path: 'fileName', order: 'asc', nulls: 'last' } },
      ];

      const query = buildSubSchemaQuery({
        tables,
        orderBy,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results.map((r) => (r.data as Record<string, unknown>).fileName)).toEqual([
        'alpha.png',
        'beta.png',
        'gamma.png',
      ]);
    });

    it('should order by data field (size) descending', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const orderBy: SubSchemaOrderByItem[] = [
        { data: { path: 'size', order: 'desc', nulls: 'last' } },
      ];

      const query = buildSubSchemaQuery({
        tables,
        orderBy,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results.map((r) => (r.data as Record<string, unknown>).size)).toEqual([3000, 2000, 1000]);
    });
  });

  describe('pagination', () => {
    let tableVersionId: string;

    beforeEach(async () => {
      tableVersionId = nanoid();
      const rows = [];
      for (let i = 0; i < 10; i++) {
        rows.push({
          rowId: `row-${String(i).padStart(2, '0')}`,
          rowVersionId: nanoid(),
          data: {
            file: { fileId: `f${i}`, fileName: `file${i}.png`, mimeType: 'image/png', size: i * 100, status: 'uploaded' },
          },
        });
      }
      await createTestData([{ tableId: 'paginated', tableVersionId, rows }]);
    });

    it('should apply take limit', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'paginated', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const query = buildSubSchemaQuery({
        tables,
        orderBy: [{ rowId: 'asc' }],
        take: 3,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.rowId)).toEqual(['row-00', 'row-01', 'row-02']);
    });

    it('should apply skip offset', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'paginated', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const query = buildSubSchemaQuery({
        tables,
        orderBy: [{ rowId: 'asc' }],
        take: 3,
        skip: 5,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.rowId)).toEqual(['row-05', 'row-06', 'row-07']);
    });

    it('should handle last page', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'paginated', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const query = buildSubSchemaQuery({
        tables,
        orderBy: [{ rowId: 'asc' }],
        take: 5,
        skip: 8,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.rowId)).toEqual(['row-08', 'row-09']);
    });
  });

  describe('count query', () => {
    let tableVersionId: string;

    beforeEach(async () => {
      tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'countable',
          tableVersionId,
          rows: [
            { rowId: 'r1', rowVersionId: nanoid(), data: { file: createFile('f1', 'a.png', { size: 100 }) } },
            { rowId: 'r2', rowVersionId: nanoid(), data: { file: createFile('f2', 'b.pdf', { size: 200 }) } },
            { rowId: 'r3', rowVersionId: nanoid(), data: { file: createFile('f3', 'c.png', { size: 300, status: 'ready' }) } },
          ],
        },
      ]);
    });

    it('should count all items', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'countable', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const query = buildSubSchemaCountQuery({
        tables,
      });

      const results = await prisma.$queryRaw<Array<{ count: bigint }>>(query);

      expect(Number(results[0].count)).toBe(3);
    });

    it('should count with filter', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'countable', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const where: SubSchemaWhereInput = {
        data: { path: 'mimeType', string_starts_with: 'image/' },
      };

      const query = buildSubSchemaCountQuery({
        tables,
        where,
      });

      const results = await prisma.$queryRaw<Array<{ count: bigint }>>(query);

      expect(Number(results[0].count)).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should return empty result for empty tables array', async () => {
      const query = buildSubSchemaQuery({
        tables: [],
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(0);
    });

    it('should return zero count for empty tables array', async () => {
      const query = buildSubSchemaCountQuery({
        tables: [],
      });

      const results = await prisma.$queryRaw<Array<{ count: bigint }>>(query);

      expect(Number(results[0].count)).toBe(0);
    });

    it('should handle table with no matching rows', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'empty-table',
          tableVersionId,
          rows: [],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        { tableId: 'empty-table', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(0);
    });

    it('should handle non-array value at array path without error', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'items',
          tableVersionId,
          rows: [
            { rowId: 'item-with-array', rowVersionId: nanoid(), data: { name: 'Item 1', images: [createFile('f1', 'a.png', { size: 100 })] } },
            { rowId: 'item-with-null', rowVersionId: nanoid(), data: { name: 'Item 2', images: null } },
            { rowId: 'item-with-string', rowVersionId: nanoid(), data: { name: 'Item 3', images: 'not-an-array' } },
            { rowId: 'item-with-object', rowVersionId: nanoid(), data: { name: 'Item 4', images: { fileId: 'f2' } } },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'items',
          tableVersionId,
          paths: [{ path: 'images[*]' }],
        },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(1);
      expect(results[0].rowId).toBe('item-with-array');
      expect(results[0].fieldPath).toBe('images[0]');
    });

    it('should skip empty OR conditions without matching all rows', async () => {
      const tableVersionId = nanoid();
      await createTestData([
        {
          tableId: 'files',
          tableVersionId,
          rows: [
            { rowId: 'file-1', rowVersionId: nanoid(), data: { name: 'File 1', file: createFile('f1', 'a.png', { size: 100 }) } },
            { rowId: 'file-2', rowVersionId: nanoid(), data: { name: 'File 2', file: createFile('f2', 'b.jpg', { size: 200, status: 'ready' }) } },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'files',
          tableVersionId,
          paths: [{ path: 'file' }],
        },
      ];

      const where: SubSchemaWhereInput = {
        OR: [{}],
      };

      const query = buildSubSchemaQuery({
        tables,
        where,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(2);
    });
  });

  describe('rowCreatedAt ordering with JOIN', () => {
    interface SubSchemaItemWithRowCreatedAt extends SubSchemaItem {
      row_createdAt: Date;
    }

    it('should order by rowCreatedAt descending (newest first)', async () => {
      const tableVersionId = nanoid();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await createTestData([
        {
          tableId: 'assets',
          tableVersionId,
          rows: [
            {
              rowId: 'asset-old',
              rowVersionId: nanoid(),
              data: { file: createFile('f1', 'old.png', { size: 1000 }) },
              createdAt: twoHoursAgo,
            },
            {
              rowId: 'asset-new',
              rowVersionId: nanoid(),
              data: { file: createFile('f2', 'new.png', { size: 2000 }) },
              createdAt: now,
            },
            {
              rowId: 'asset-middle',
              rowVersionId: nanoid(),
              data: { file: createFile('f3', 'middle.png', { size: 1500 }) },
              createdAt: oneHourAgo,
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const cte = buildSubSchemaCte({ tables });
      const orderByClause = buildSubSchemaOrderBy({
        orderBy: [{ rowCreatedAt: 'desc' }],
        tableAlias: 'ssi',
        rowTableAlias: 'r',
      });

      const query = Prisma.sql`
        ${cte}
        SELECT
          ssi."tableId",
          ssi."rowId",
          ssi."rowVersionId",
          ssi."fieldPath",
          ssi."data",
          r."createdAt" as "row_createdAt"
        FROM sub_schema_items ssi
        INNER JOIN "Row" r ON ssi."rowVersionId" = r."versionId"
        ${orderByClause}
        LIMIT 100 OFFSET 0
      `;

      const results = await prisma.$queryRaw<SubSchemaItemWithRowCreatedAt[]>(query);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.rowId)).toEqual(['asset-new', 'asset-middle', 'asset-old']);
    });

    it('should order by rowCreatedAt ascending (oldest first)', async () => {
      const tableVersionId = nanoid();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await createTestData([
        {
          tableId: 'media',
          tableVersionId,
          rows: [
            {
              rowId: 'media-new',
              rowVersionId: nanoid(),
              data: { file: createFile('f1', 'new.png', { size: 1000 }) },
              createdAt: now,
            },
            {
              rowId: 'media-old',
              rowVersionId: nanoid(),
              data: { file: createFile('f2', 'old.png', { size: 2000 }) },
              createdAt: twoHoursAgo,
            },
            {
              rowId: 'media-middle',
              rowVersionId: nanoid(),
              data: { file: createFile('f3', 'middle.png', { size: 1500 }) },
              createdAt: oneHourAgo,
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        { tableId: 'media', tableVersionId, paths: [{ path: 'file' }] },
      ];

      const cte = buildSubSchemaCte({ tables });
      const orderByClause = buildSubSchemaOrderBy({
        orderBy: [{ rowCreatedAt: 'asc' }],
        tableAlias: 'ssi',
        rowTableAlias: 'r',
      });

      const query = Prisma.sql`
        ${cte}
        SELECT
          ssi."tableId",
          ssi."rowId",
          ssi."rowVersionId",
          ssi."fieldPath",
          ssi."data"
        FROM sub_schema_items ssi
        INNER JOIN "Row" r ON ssi."rowVersionId" = r."versionId"
        ${orderByClause}
        LIMIT 100 OFFSET 0
      `;

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.rowId)).toEqual(['media-old', 'media-middle', 'media-new']);
    });

    it('should combine rowCreatedAt with fieldPath ordering (stable sort)', async () => {
      const tableVersionId = nanoid();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      await createTestData([
        {
          tableId: 'posts',
          tableVersionId,
          rows: [
            {
              rowId: 'post-old',
              rowVersionId: nanoid(),
              data: {
                gallery: [
                  createFile('f1', 'old-a.png', { size: 100 }),
                  createFile('f2', 'old-b.png', { size: 200 }),
                ],
              },
              createdAt: oneHourAgo,
            },
            {
              rowId: 'post-new',
              rowVersionId: nanoid(),
              data: {
                gallery: [
                  createFile('f3', 'new-a.png', { size: 300 }),
                  createFile('f4', 'new-b.png', { size: 400 }),
                ],
              },
              createdAt: now,
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        { tableId: 'posts', tableVersionId, paths: [{ path: 'gallery[*]' }] },
      ];

      const cte = buildSubSchemaCte({ tables });
      const orderByClause = buildSubSchemaOrderBy({
        orderBy: [
          { rowCreatedAt: 'desc' },
          { fieldPath: 'asc' },
        ],
        tableAlias: 'ssi',
        rowTableAlias: 'r',
      });

      const query = Prisma.sql`
        ${cte}
        SELECT
          ssi."tableId",
          ssi."rowId",
          ssi."rowVersionId",
          ssi."fieldPath",
          ssi."data"
        FROM sub_schema_items ssi
        INNER JOIN "Row" r ON ssi."rowVersionId" = r."versionId"
        ${orderByClause}
        LIMIT 100 OFFSET 0
      `;

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.rowId)).toEqual(['post-new', 'post-new', 'post-old', 'post-old']);
      expect(results.map((r) => r.fieldPath)).toEqual(['gallery[0]', 'gallery[1]', 'gallery[0]', 'gallery[1]']);
    });
  });
});
