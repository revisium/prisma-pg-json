import { Prisma } from '@prisma/client';
import {
  encodeCursor,
  decodeCursor,
  computeSortHash,
  extractCursorValues,
} from '../../keyset/cursor';
import { regularPart, jsonPart } from './keyset-test-helpers';

describe('keyset-cursor', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('should roundtrip string values', () => {
      const cursor = encodeCursor(['hello', 'world'], 'tid-123', 'abcdef0123456789');
      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual({
        values: ['hello', 'world'],
        tiebreaker: 'tid-123',
        sortHash: 'abcdef0123456789',
      });
    });

    it('should roundtrip number values', () => {
      const cursor = encodeCursor([42, 3.14], 'tb', 'hash1234567890ab');
      expect(decodeCursor(cursor)?.values).toEqual([42, 3.14]);
    });

    it('should roundtrip null values', () => {
      const cursor = encodeCursor([null, 'a', null], 'tb', 'hash1234567890ab');
      expect(decodeCursor(cursor)?.values).toEqual([null, 'a', null]);
    });

    it('should roundtrip boolean values', () => {
      const cursor = encodeCursor([true, false], 'tb', 'hash1234567890ab');
      expect(decodeCursor(cursor)?.values).toEqual([true, false]);
    });

    it('should roundtrip empty values array', () => {
      const cursor = encodeCursor([], 'tb', 'hash1234567890ab');
      expect(decodeCursor(cursor)?.values).toEqual([]);
    });

    it('should return null for invalid base64', () => {
      expect(decodeCursor('not-valid-base64!!!')).toBeNull();
    });

    it('should return null for valid base64 but invalid JSON', () => {
      const cursor = Buffer.from('not json').toString('base64url');
      expect(decodeCursor(cursor)).toBeNull();
    });

    it('should return null for JSON missing required fields', () => {
      const cursor = Buffer.from(JSON.stringify({ v: [1] })).toString('base64url');
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
      const parts = [regularPart('createdAt', 'DESC')];
      const hash1 = computeSortHash(parts);
      const hash2 = computeSortHash(parts);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should produce different hash for different direction', () => {
      expect(computeSortHash([regularPart('createdAt', 'ASC')])).not.toBe(
        computeSortHash([regularPart('createdAt', 'DESC')]),
      );
    });

    it('should produce different hash for different fields', () => {
      expect(computeSortHash([regularPart('createdAt', 'DESC')])).not.toBe(
        computeSortHash([regularPart('updatedAt', 'DESC')]),
      );
    });

    it('should include json config in hash', () => {
      expect(computeSortHash([jsonPart('data', 'price', 'int', 'ASC')])).not.toBe(
        computeSortHash([jsonPart('data', 'name', 'text', 'ASC')]),
      );
    });
  });

  describe('extractCursorValues', () => {
    it('should extract regular field values', () => {
      const row = { createdAt: new Date('2025-01-01T00:00:00.000Z'), id: 'row-1' };
      expect(extractCursorValues(row, [regularPart('createdAt', 'DESC')])).toEqual([
        '2025-01-01T00:00:00.000Z',
      ]);
    });

    it('should extract string values', () => {
      const row = { id: 'row-1' };
      expect(extractCursorValues(row, [regularPart('id', 'ASC')])).toEqual(['row-1']);
    });

    it('should handle null values', () => {
      const row = { publishedAt: null };
      expect(extractCursorValues(row, [regularPart('publishedAt', 'DESC')])).toEqual([null]);
    });

    it('should extract JSON field values', () => {
      const row = { data: { priority: 10 } };
      expect(extractCursorValues(row, [jsonPart('data', 'priority', 'int', 'ASC')])).toEqual([10]);
    });

    it('should extract nested JSON field values', () => {
      const row = { data: { nested: { value: 'hello' } } };
      const parts = [
        {
          expression: Prisma.sql`(r."data"#>>'{nested,value}')::text`,
          direction: 'ASC' as const,
          fieldName: 'data',
          isJson: true,
          jsonConfig: { path: ['nested', 'value'], type: 'text' as const, direction: 'asc' as const },
        },
      ];
      expect(extractCursorValues(row, parts)).toEqual(['hello']);
    });

    it('should return null for missing JSON path', () => {
      const row = { data: { other: 1 } };
      expect(extractCursorValues(row, [jsonPart('data', 'missing', 'text', 'ASC')])).toEqual([
        null,
      ]);
    });

    it('should handle multiple parts', () => {
      const row = {
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        data: { priority: 5 },
      };
      const parts = [
        jsonPart('data', 'priority', 'int', 'DESC'),
        regularPart('createdAt', 'ASC'),
      ];
      expect(extractCursorValues(row, parts)).toEqual([5, '2025-01-01T00:00:00.000Z']);
    });
  });
});
