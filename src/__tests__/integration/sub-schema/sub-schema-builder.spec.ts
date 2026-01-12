import './setup';
import { nanoid } from 'nanoid';
import { prisma, createTestData } from './setup';
import {
  buildSubSchemaQuery,
  buildSubSchemaCountQuery,
} from '../../../sub-schema/sub-schema-builder';
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
              data: {
                name: 'Hero',
                avatar: {
                  fileId: 'file-1',
                  fileName: 'hero.png',
                  mimeType: 'image/png',
                  size: 1024,
                  status: 'uploaded',
                },
              },
            },
            {
              rowId: 'villain',
              rowVersionId: nanoid(),
              data: {
                name: 'Villain',
                avatar: {
                  fileId: 'file-2',
                  fileName: 'villain.png',
                  mimeType: 'image/png',
                  size: 2048,
                  status: 'uploaded',
                },
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'characters',
          tableVersionId,
          paths: [{ path: 'avatar', isArray: false }],
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
                settings: {
                  theme: 'dark',
                  banner: {
                    fileId: 'file-banner-1',
                    fileName: 'banner.jpg',
                    mimeType: 'image/jpeg',
                    size: 5000,
                    status: 'uploaded',
                  },
                },
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'profiles',
          tableVersionId,
          paths: [{ path: 'settings.banner', isArray: false }],
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
              data: {
                name: 'Item 1',
                image: {
                  fileId: 'file-1',
                  fileName: 'item.png',
                  mimeType: 'image/png',
                  size: 1024,
                  status: 'uploaded',
                },
              },
            },
            {
              rowId: 'item-2',
              rowVersionId: nanoid(),
              data: {
                name: 'Item 2',
                image: null,
              },
            },
            {
              rowId: 'item-3',
              rowVersionId: nanoid(),
              data: {
                name: 'Item 3',
                image: 'not-an-object',
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'items',
          tableVersionId,
          paths: [{ path: 'image', isArray: false }],
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
                  { fileId: 'g1', fileName: 'img1.png', mimeType: 'image/png', size: 100, status: 'uploaded' },
                  { fileId: 'g2', fileName: 'img2.png', mimeType: 'image/png', size: 200, status: 'uploaded' },
                  { fileId: 'g3', fileName: 'img3.png', mimeType: 'image/png', size: 300, status: 'uploaded' },
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
          paths: [{ path: 'gallery', isArray: true }],
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
                  { fileId: 'a1-p1', fileName: 'photo1.jpg', mimeType: 'image/jpeg', size: 1000, status: 'uploaded' },
                  { fileId: 'a1-p2', fileName: 'photo2.jpg', mimeType: 'image/jpeg', size: 2000, status: 'uploaded' },
                ],
              },
            },
            {
              rowId: 'album-2',
              rowVersionId: nanoid(),
              data: {
                name: 'Album 2',
                photos: [
                  { fileId: 'a2-p1', fileName: 'photo3.jpg', mimeType: 'image/jpeg', size: 3000, status: 'uploaded' },
                ],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'albums',
          tableVersionId,
          paths: [{ path: 'photos', isArray: true }],
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
              data: {
                name: 'Gallery 1',
                images: [
                  { fileId: 'img1', fileName: 'a.png', mimeType: 'image/png', size: 100, status: 'uploaded' },
                ],
              },
            },
            {
              rowId: 'gallery-2',
              rowVersionId: nanoid(),
              data: {
                name: 'Gallery 2',
                images: [],
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'galleries',
          tableVersionId,
          paths: [{ path: 'images', isArray: true }],
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
              data: {
                name: 'Character 1',
                avatar: { fileId: 'c1', fileName: 'char1.png', mimeType: 'image/png', size: 100, status: 'uploaded' },
              },
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
              data: {
                name: 'Item 1',
                icon: { fileId: 'i1', fileName: 'item1.png', mimeType: 'image/png', size: 50, status: 'uploaded' },
              },
            },
          ],
        },
      ]);

      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'characters',
          tableVersionId: tableVersionId1,
          paths: [{ path: 'avatar', isArray: false }],
        },
        {
          tableId: 'items',
          tableVersionId: tableVersionId2,
          paths: [{ path: 'icon', isArray: false }],
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
                mainImage: { fileId: 'main', fileName: 'main.png', mimeType: 'image/png', size: 500, status: 'uploaded' },
                gallery: [
                  { fileId: 'g1', fileName: 'gal1.png', mimeType: 'image/png', size: 100, status: 'uploaded' },
                  { fileId: 'g2', fileName: 'gal2.png', mimeType: 'image/png', size: 200, status: 'uploaded' },
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
          paths: [
            { path: 'mainImage', isArray: false },
            { path: 'gallery', isArray: true },
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
            {
              rowId: 'hero',
              rowVersionId: nanoid(),
              data: {
                avatar: { fileId: 'f1', fileName: 'hero.png', mimeType: 'image/png', size: 100, status: 'uploaded' },
              },
            },
            {
              rowId: 'villain',
              rowVersionId: nanoid(),
              data: {
                avatar: { fileId: 'f2', fileName: 'villain.png', mimeType: 'image/png', size: 200, status: 'uploaded' },
              },
            },
          ],
        },
        {
          tableId: 'items',
          tableVersionId: tableVersionId2,
          rows: [
            {
              rowId: 'sword',
              rowVersionId: nanoid(),
              data: {
                icon: { fileId: 'f3', fileName: 'sword.png', mimeType: 'image/png', size: 50, status: 'uploaded' },
              },
            },
          ],
        },
      ]);
    });

    it('should filter by tableId equals', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'characters', tableVersionId: tableVersionId1, paths: [{ path: 'avatar', isArray: false }] },
        { tableId: 'items', tableVersionId: tableVersionId2, paths: [{ path: 'icon', isArray: false }] },
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
        { tableId: 'characters', tableVersionId: tableVersionId1, paths: [{ path: 'avatar', isArray: false }] },
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
                mainImage: { fileId: 'm1', fileName: 'main.png', mimeType: 'image/png', size: 100, status: 'uploaded' },
                gallery: [
                  { fileId: 'g1', fileName: 'gal1.png', mimeType: 'image/png', size: 50, status: 'uploaded' },
                  { fileId: 'g2', fileName: 'gal2.png', mimeType: 'image/png', size: 60, status: 'uploaded' },
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
          paths: [
            { path: 'mainImage', isArray: false },
            { path: 'gallery', isArray: true },
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
            {
              rowId: 'row-1',
              rowVersionId: nanoid(),
              data: {
                attachment: { fileId: 'f1', fileName: 'document.pdf', mimeType: 'application/pdf', size: 100000, status: 'uploaded' },
              },
            },
            {
              rowId: 'row-2',
              rowVersionId: nanoid(),
              data: {
                attachment: { fileId: 'f2', fileName: 'image.png', mimeType: 'image/png', size: 50000, status: 'uploaded' },
              },
            },
            {
              rowId: 'row-3',
              rowVersionId: nanoid(),
              data: {
                attachment: { fileId: 'f3', fileName: 'video.mp4', mimeType: 'video/mp4', size: 500000, status: 'ready' },
              },
            },
            {
              rowId: 'row-4',
              rowVersionId: nanoid(),
              data: {
                attachment: { fileId: 'f4', fileName: 'small-image.jpg', mimeType: 'image/jpeg', size: 1000, status: 'uploaded' },
              },
            },
          ],
        },
      ]);
    });

    it('should filter by data field equals', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment', isArray: false }] },
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
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment', isArray: false }] },
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
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment', isArray: false }] },
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
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment', isArray: false }] },
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
        { tableId: 'files', tableVersionId, paths: [{ path: 'attachment', isArray: false }] },
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
            {
              rowId: 'media-1',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f1', fileName: 'photo.png', mimeType: 'image/png', size: 1000, status: 'uploaded' },
              },
            },
            {
              rowId: 'media-2',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f2', fileName: 'video.mp4', mimeType: 'video/mp4', size: 100000, status: 'uploaded' },
              },
            },
            {
              rowId: 'media-3',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f3', fileName: 'doc.pdf', mimeType: 'application/pdf', size: 5000, status: 'ready' },
              },
            },
            {
              rowId: 'media-4',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f4', fileName: 'audio.mp3', mimeType: 'audio/mp3', size: 3000, status: 'uploaded' },
              },
            },
          ],
        },
      ]);
    });

    it('should handle AND condition', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'media', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'media', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'media', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'media', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
            {
              rowId: 'asset-b',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f1', fileName: 'beta.png', mimeType: 'image/png', size: 2000, status: 'uploaded' },
              },
            },
            {
              rowId: 'asset-a',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f2', fileName: 'alpha.png', mimeType: 'image/png', size: 3000, status: 'uploaded' },
              },
            },
            {
              rowId: 'asset-c',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f3', fileName: 'gamma.png', mimeType: 'image/png', size: 1000, status: 'uploaded' },
              },
            },
          ],
        },
      ]);
    });

    it('should order by rowId ascending', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'assets', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'paginated', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'paginated', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'paginated', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
            {
              rowId: 'r1',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f1', fileName: 'a.png', mimeType: 'image/png', size: 100, status: 'uploaded' },
              },
            },
            {
              rowId: 'r2',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f2', fileName: 'b.pdf', mimeType: 'application/pdf', size: 200, status: 'uploaded' },
              },
            },
            {
              rowId: 'r3',
              rowVersionId: nanoid(),
              data: {
                file: { fileId: 'f3', fileName: 'c.png', mimeType: 'image/png', size: 300, status: 'ready' },
              },
            },
          ],
        },
      ]);
    });

    it('should count all items', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'countable', tableVersionId, paths: [{ path: 'file', isArray: false }] },
      ];

      const query = buildSubSchemaCountQuery({
        tables,
      });

      const results = await prisma.$queryRaw<Array<{ count: bigint }>>(query);

      expect(Number(results[0].count)).toBe(3);
    });

    it('should count with filter', async () => {
      const tables: SubSchemaTableConfig[] = [
        { tableId: 'countable', tableVersionId, paths: [{ path: 'file', isArray: false }] },
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
        { tableId: 'empty-table', tableVersionId, paths: [{ path: 'file', isArray: false }] },
      ];

      const query = buildSubSchemaQuery({
        tables,
        take: 100,
        skip: 0,
      });

      const results = await prisma.$queryRaw<SubSchemaItem[]>(query);

      expect(results).toHaveLength(0);
    });
  });
});
