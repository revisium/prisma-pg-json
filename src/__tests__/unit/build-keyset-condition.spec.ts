import { Prisma } from '@prisma/client';
import { configurePrisma } from '../../prisma-adapter';
import { buildKeysetCondition } from '../../keyset/condition';
import { OrderByPart } from '../../types';

beforeAll(() => {
  configurePrisma(Prisma);
});

function sqlToString(sql: typeof Prisma.Sql.prototype): { text: string; values: unknown[] } {
  return {
    text: sql.strings.join('?'),
    values: sql.values,
  };
}

describe('buildKeysetCondition', () => {
  const defaultTiebreakerExpr = Prisma.sql`r."versionId"`;

  describe('single column', () => {
    it('should generate < for DESC direction', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'DESC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];

      const condition = buildKeysetCondition(parts, ['2025-01-01'], 'tid-1', defaultTiebreakerExpr);
      const { text, values } = sqlToString(condition);

      expect(text).toContain('<');
      expect(values).toContain('2025-01-01');
      expect(values).toContain('tid-1');
    });

    it('should generate > for ASC direction', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'ASC',
          fieldName: 'createdAt',
          isJson: false,
        },
      ];

      const condition = buildKeysetCondition(parts, ['2025-01-01'], 'tid-1', defaultTiebreakerExpr);
      const { text, values } = sqlToString(condition);

      expect(text).toContain('>');
      expect(values).toContain('2025-01-01');
    });
  });

  describe('multi column', () => {
    it('should generate OR clauses for multi-column sort', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'DESC',
          fieldName: 'createdAt',
          isJson: false,
        },
        {
          expression: Prisma.sql`r."id"`,
          direction: 'ASC',
          fieldName: 'id',
          isJson: false,
        },
      ];

      const condition = buildKeysetCondition(
        parts,
        ['2025-01-01', 'row-5'],
        'tid-1',
        defaultTiebreakerExpr,
      );
      const { text } = sqlToString(condition);

      expect(text).toContain('OR');
    });
  });

  describe('mixed directions', () => {
    it('should handle DESC first, ASC second', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."createdAt"`,
          direction: 'DESC',
          fieldName: 'createdAt',
          isJson: false,
        },
        {
          expression: Prisma.sql`r."id"`,
          direction: 'ASC',
          fieldName: 'id',
          isJson: false,
        },
      ];

      const condition = buildKeysetCondition(
        parts,
        ['2025-01-01', 'row-5'],
        'tid-1',
        defaultTiebreakerExpr,
      );
      const { text, values } = sqlToString(condition);

      expect(text).toContain('<');
      expect(text).toContain('>');
      expect(values).toContain('2025-01-01');
      expect(values).toContain('row-5');
      expect(values).toContain('tid-1');
    });
  });

  describe('NULL handling', () => {
    it('should use IS NULL for null cursor equality', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."publishedAt"`,
          direction: 'DESC',
          fieldName: 'publishedAt',
          isJson: false,
        },
      ];

      const condition = buildKeysetCondition(parts, [null], 'tid-1', defaultTiebreakerExpr);
      const { text } = sqlToString(condition);

      expect(text).toContain('IS NULL');
    });

    it('should use FALSE for null DESC comparison', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."publishedAt"`,
          direction: 'DESC',
          fieldName: 'publishedAt',
          isJson: false,
        },
      ];

      const condition = buildKeysetCondition(parts, [null], 'tid-1', defaultTiebreakerExpr);
      const { text } = sqlToString(condition);

      expect(text).toContain('FALSE');
    });

    it('should use IS NOT NULL for null ASC comparison', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`r."publishedAt"`,
          direction: 'ASC',
          fieldName: 'publishedAt',
          isJson: false,
        },
      ];

      const condition = buildKeysetCondition(parts, [null], 'tid-1', defaultTiebreakerExpr);
      const { text } = sqlToString(condition);

      expect(text).toContain('IS NOT NULL');
    });
  });

  describe('tiebreaker', () => {
    it('should always include tiebreaker comparison as last clause', () => {
      const parts: OrderByPart[] = [];

      const condition = buildKeysetCondition(parts, [], 'tid-1', defaultTiebreakerExpr);
      const { text, values } = sqlToString(condition);

      expect(text).toContain('versionId');
      expect(values).toContain('tid-1');
    });

    it('should use custom tiebreaker expression', () => {
      const parts: OrderByPart[] = [];
      const customTiebreaker = Prisma.sql`t."rowId"`;

      const condition = buildKeysetCondition(parts, [], 'tid-1', customTiebreaker);
      const { text, values } = sqlToString(condition);

      expect(text).toContain('rowId');
      expect(values).toContain('tid-1');
    });
  });

  describe('JSON expressions', () => {
    it('should work with JSON field expressions', () => {
      const parts: OrderByPart[] = [
        {
          expression: Prisma.sql`(r."data"#>>'{priority}')::int`,
          direction: 'ASC',
          fieldName: 'data',
          isJson: true,
          jsonConfig: { path: 'priority', type: 'int', direction: 'asc' },
        },
      ];

      const condition = buildKeysetCondition(parts, [10], 'tid-1', defaultTiebreakerExpr);
      const { text, values } = sqlToString(condition);

      expect(text).toContain('priority');
      expect(values).toContain(10);
    });
  });
});
