import { Prisma } from '@prisma/client';
import { configurePrisma, PrismaSql } from '../../prisma-adapter';
import { generateWhere } from '../../query-builder';
import { generateOrderByClauses } from '../../orderBy';

configurePrisma(Prisma);

const fieldConfig = { data: 'json', createdAt: 'date' } as const;

// A path segment carrying SQL-injection breakout characters. If any builder
// splices it into the static SQL text (via Prisma.raw), it becomes SQL
// injection. The security invariant: it must appear ONLY in bound values.
const EVIL = "ev'il}') OR true --";

function inspect(sql: PrismaSql): { text: string; boundValues: string } {
  const { strings, values } = sql as unknown as {
    strings: string[];
    values: unknown[];
  };
  return { text: strings.join('?'), boundValues: JSON.stringify(values) };
}

describe('Security: JSON path must be parameterized, never spliced into SQL text', () => {
  it('WHERE data.equals — malicious path segment is bound, not in SQL text', () => {
    const where = generateWhere({
      where: { data: { path: [EVIL], equals: 'x' } },
      fieldConfig,
      tableAlias: 'r',
    });
    const { text, boundValues } = inspect(where);

    expect(text).not.toContain(EVIL);
    expect(text).not.toContain("ev'il");
    expect(boundValues).toContain(EVIL);
  });

  it('WHERE data.not — malicious path segment is bound, not in SQL text', () => {
    const where = generateWhere({
      where: { data: { path: [EVIL], not: 'x' } },
      fieldConfig,
      tableAlias: 'r',
    });
    const { text } = inspect(where);
    expect(text).not.toContain("ev'il");
  });

  it('ORDER BY data json path — malicious path segment is bound, not in SQL text', () => {
    const order = generateOrderByClauses({
      orderBy: [{ data: { path: [EVIL], direction: 'asc', type: 'text' } }],
      fieldConfig,
      tableAlias: 'r',
    });
    const { text, boundValues } = inspect(order as PrismaSql);
    expect(text).not.toContain("ev'il");
    expect(boundValues).toContain(EVIL);
  });

  it('ORDER BY data aggregation (non-wildcard) — path segment bound, not in SQL text', () => {
    const order = generateOrderByClauses({
      orderBy: [
        { data: { path: ['arr', EVIL], direction: 'asc', type: 'int', aggregation: 'max' } },
      ],
      fieldConfig,
      tableAlias: 'r',
    });
    const { text } = inspect(order as PrismaSql);
    expect(text).not.toContain("ev'il");
  });

  it('ORDER BY data aggregation (wildcard) — path segment bound, not in SQL text', () => {
    const order = generateOrderByClauses({
      orderBy: [
        { data: { path: ['arr', '*', EVIL], direction: 'asc', type: 'int', aggregation: 'max' } },
      ],
      fieldConfig,
      tableAlias: 'r',
    });
    const { text } = inspect(order as PrismaSql);
    expect(text).not.toContain("ev'il");
  });
});
