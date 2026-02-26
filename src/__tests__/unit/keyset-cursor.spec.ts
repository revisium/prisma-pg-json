import { Prisma } from '@prisma/client';
import {
  encodeCursor,
  decodeCursor,
  computeSortHash,
  extractCursorValues,
} from '../../keyset/cursor';
import { OrderByPart } from '../../types';

describe('keyset-cursor', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('should roundtrip string values', () => {
      const values = ['hello', 'world'];
      const tiebreaker = 'tid-123';
      const sortHash = 'abcdef0123456789';

      const cursor = encodeCursor(values, tiebreaker, sortHash);
      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual({
        values: ['hello', 'world'],
        tiebreaker: 'tid-123',
        sortHash: 'abcdef0123456789',
      });
    });

    it('should roundtrip number values', () => {
      const cursor = encodeCursor([42, 3.14], 'tb', 'hash1234567890ab');
      const decoded = decodeCursor(cursor);

      expect(decoded?.values).toEqual([42, 3.14]);
    });

    it('should roundtrip null values', () => {
      const cursor = encodeCursor([null, 'a', null], 'tb', 'hash1234567890ab');
      const decoded = decodeCursor(cursor);

      expect(decoded?.values).toEqual([null, 'a', null]);
    });

    it('should roundtrip boolean values', () => {
      const cursor = encodeCursor([true, false], 'tb', 'hash1234567890ab');
      const decoded = decodeCursor(cursor);

      expect(decoded?.values).toEqual([true, false]);
    });

    it('should roundtrip empty values array', () => {
      const cursor = encodeCursor([], 'tb', 'hash1234567890ab');
      const decoded = decodeCursor(cursor);

      expect(decoded?.values).toEqual([]);
    });

    it('should return null for invalid base64', () => {
      expect(decodeCursor('not-valid-base64!!!')).toBeNull();
    });

    it('should return null for valid base64 but invalid JSON', () => {
      const cursor = Buffer.from('not json').toString('base64url');
      expect(decodeCursor(cursor)).toBeNull();
    });

    it('should return null for JSON missing required fields', () => {
      const cursor = Buffer.from(JSON.stringify({ v: [1] })).toString(
        'base64url',
      );
      expect(decodeCursor(cursor)).toBeNull();
    });

    it('should return null for JSON with wrong types', () => {
      const cursor = Buffer.from(
        JSON.stringify({ v: 'not-array', t: 'tb', h: 'hash' }),
      ).toString('base64url');
      expect(decodeCursor(cursor)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(decodeCursor('')).toBeNull();
    });

    it('should gracefully handle old numeric cursor format', () => {
      expect(decodeCursor('50')).toBeNull();
    });
  });

  describe('computeSortHash', () => {
    it('should produce consistent hash for same parts', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'DESC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];

      const hash1 = computeSortHash(parts);
      const hash2 = computeSortHash(parts);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should produce different hash for different direction', () => {
      const partsAsc: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'ASC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];
      const partsDesc: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'DESC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];

      expect(computeSortHash(partsAsc)).not.toBe(computeSortHash(partsDesc));
    });

    it('should produce different hash for different fields', () => {
      const parts1: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'DESC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];
      const parts2: OrderByPart[] = [
        {
          expression: Prisma.sql`r."updatedAt"`,
          direction: 'DESC',
          fieldName: 'updatedAt',
          isJson: false,
        },
      ];

      expect(computeSortHash(parts1)).not.toBe(computeSortHash(parts2));
    });

    it('should include json config in hash', () => {
      const parts1: OrderByPart[] = [
        {
          expression: Prisma.sql`(r."data"#>>'{price}')::int`,
          direction: 'ASC',
          fieldName: 'data',
          isJson: true,
          jsonConfig: { path: 'price', type: 'int', direction: 'asc' },
        },
      ];
      const parts2: OrderByPart[] = [
        {
          expression: Prisma.sql`(r."data"#>>'{name}')::text`,
          direction: 'ASC',
          fieldName: 'data',
          isJson: true,
          jsonConfig: { path: 'name', type: 'text', direction: 'asc' },
        },
      ];

      expect(computeSortHash(parts1)).not.toBe(computeSortHash(parts2));
    });
  });

  describe('extractCursorValues', () => {
    it('should extract regular field values', () => {
      const row = {
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        id: 'row-1',
      };
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'DESC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];

      const values = extractCursorValues(row, parts);

      expect(values).toEqual(['2025-01-01T00:00:00.000Z']);
    });

    it('should extract string values', () => {
      const row = { id: 'row-1' };
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."id"`,
          direction: 'ASC',
          fieldName: 'id',
          isJson: false,
        },
      ];

      expect(extractCursorValues(row, parts)).toEqual(['row-1']);
    });

    it('should handle null values', () => {
      const row = { publishedAt: null };
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."publishedAt"`,
          direction: 'DESC',
          fieldName: 'publishedAt',
          isJson: false,
        },
      ];

      expect(extractCursorValues(row, parts)).toEqual([null]);
    });

    it('should extract JSON field values', () => {
      const row = { data: { priority: 10 } };
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`(r."data"#>>'{priority}')::int`,
          direction: 'ASC',
          fieldName: 'data',
          isJson: true,
          jsonConfig: { path: 'priority', type: 'int', direction: 'asc' },
        },
      ];

      expect(extractCursorValues(row, parts)).toEqual([10]);
    });

    it('should extract nested JSON field values', () => {
      const row = { data: { nested: { value: 'hello' } } };
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`(r."data"#>>'{nested,value}')::text`,
          direction: 'ASC',
          fieldName: 'data',
          isJson: true,
          jsonConfig: {
            path: ['nested', 'value'],
            type: 'text',
            direction: 'asc',
          },
        },
      ];

      expect(extractCursorValues(row, parts)).toEqual(['hello']);
    });

    it('should return null for missing JSON path', () => {
      const row = { data: { other: 1 } };
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`(r."data"#>>'{missing}')::text`,
          direction: 'ASC',
          fieldName: 'data',
          isJson: true,
          jsonConfig: { path: 'missing', type: 'text', direction: 'asc' },
        },
      ];

      expect(extractCursorValues(row, parts)).toEqual([null]);
    });

    it('should handle multiple parts', () => {
      const row = {
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        data: { priority: 5 },
      };
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`(r."data"#>>'{priority}')::int`,
          direction: 'DESC',
          fieldName: 'data',
          isJson: true,
          jsonConfig: { path: 'priority', type: 'int', direction: 'desc' },
        },
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'ASC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];

      expect(extractCursorValues(row, parts)).toEqual([
        5,
        '2025-01-01T00:00:00.000Z',
      ]);
    });
  });
});
