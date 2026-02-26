import { Prisma } from '@prisma/client';
import { configurePrisma, PrismaSql } from '../../prisma-adapter';
import { buildKeysetCondition } from '../../keyset/condition';
import { CursorValue, OrderByPart } from '../../types';
import { regularPart, jsonPart } from './keyset-test-helpers';

beforeAll(() => {
  configurePrisma(Prisma);
});

function buildAndStringify(
  parts: OrderByPart[],
  cursorValues: CursorValue[],
  tiebreaker: string,
  tiebreakerExpr: PrismaSql,
): { text: string; values: unknown[] } {
  const sql = buildKeysetCondition(parts, cursorValues, tiebreaker, tiebreakerExpr);
  return { text: sql.strings.join('?'), values: sql.values };
}

describe('buildKeysetCondition', () => {
  const tiebreakerExpr = Prisma.sql`r."versionId"`;

  describe('single column', () => {
    it('should generate < for DESC direction', () => {
      const { text, values } = buildAndStringify(
        [regularPart('createdAt', 'DESC')], ['2025-01-01'], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('<');
      expect(values).toContain('2025-01-01');
      expect(values).toContain('tid-1');
    });

    it('should generate > for ASC direction', () => {
      const { text, values } = buildAndStringify(
        [regularPart('createdAt', 'ASC')], ['2025-01-01'], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('>');
      expect(values).toContain('2025-01-01');
    });
  });

  describe('multi column', () => {
    it('should generate OR clauses for multi-column sort', () => {
      const { text } = buildAndStringify(
        [regularPart('createdAt', 'DESC'), regularPart('id', 'ASC')],
        ['2025-01-01', 'row-5'], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('OR');
    });
  });

  describe('mixed directions', () => {
    it('should handle DESC first, ASC second', () => {
      const { text, values } = buildAndStringify(
        [regularPart('createdAt', 'DESC'), regularPart('id', 'ASC')],
        ['2025-01-01', 'row-5'], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('<');
      expect(text).toContain('>');
      expect(values).toContain('2025-01-01');
      expect(values).toContain('row-5');
      expect(values).toContain('tid-1');
    });
  });

  describe('NULL handling', () => {
    it('should use IS NULL for null cursor equality', () => {
      const { text } = buildAndStringify(
        [regularPart('publishedAt', 'DESC')], [null], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('IS NULL');
    });

    it('should use IS NOT NULL for null DESC comparison', () => {
      const { text } = buildAndStringify(
        [regularPart('publishedAt', 'DESC')], [null], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('IS NOT NULL');
    });

    it('should use FALSE for null ASC comparison', () => {
      const { text } = buildAndStringify(
        [regularPart('publishedAt', 'ASC')], [null], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('FALSE');
    });
  });

  describe('tiebreaker', () => {
    it('should always include tiebreaker comparison as last clause', () => {
      const { text, values } = buildAndStringify([], [], 'tid-1', tiebreakerExpr);
      expect(text).toContain('versionId');
      expect(values).toContain('tid-1');
    });

    it('should use custom tiebreaker expression', () => {
      const { text, values } = buildAndStringify([], [], 'tid-1', Prisma.sql`t."rowId"`);
      expect(text).toContain('rowId');
      expect(values).toContain('tid-1');
    });
  });

  describe('JSON expressions', () => {
    it('should work with JSON field expressions', () => {
      const { text, values } = buildAndStringify(
        [jsonPart('data', 'priority', 'int', 'ASC')], [10], 'tid-1', tiebreakerExpr,
      );
      expect(text).toContain('priority');
      expect(values).toContain(10);
    });
  });
});
