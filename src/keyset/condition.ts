import { Prisma, PrismaSql } from '../prisma-adapter';
import { OrderByPart, CursorValue } from '../types';

export function buildKeysetCondition(
  parts: OrderByPart[],
  cursorValues: CursorValue[],
  tiebreaker: string,
  tiebreakerExpression: PrismaSql,
  tiebreakerDirection: 'ASC' | 'DESC' = 'DESC',
): PrismaSql {
  const allParts: { expression: PrismaSql; direction: 'ASC' | 'DESC' }[] = [
    ...parts.map((p) => ({ expression: p.expression, direction: p.direction })),
    {
      expression: tiebreakerExpression,
      direction: tiebreakerDirection,
    },
  ];
  const allValues: CursorValue[] = [
    ...cursorValues,
    tiebreaker,
  ];

  const orClauses: PrismaSql[] = [];

  for (let depth = 0; depth < allParts.length; depth++) {
    const andClauses: PrismaSql[] = [];

    for (let i = 0; i < depth; i++) {
      andClauses.push(
        buildEqualityClause(allParts[i].expression, allValues[i]),
      );
    }

    andClauses.push(
      buildComparisonClause(
        allParts[depth].expression,
        allValues[depth],
        allParts[depth].direction,
      ),
    );

    orClauses.push(Prisma.sql`(${Prisma.join(andClauses, ' AND ')})`);
  }

  return Prisma.sql`(${Prisma.join(orClauses, ' OR ')})`;
}

function buildEqualityClause(
  expression: PrismaSql,
  value: CursorValue,
): PrismaSql {
  if (value === null) {
    return Prisma.sql`${expression} IS NULL`;
  }
  return Prisma.sql`${expression} = ${value}`;
}

// Assumes PostgreSQL default NULL ordering: ASC = NULLS LAST, DESC = NULLS FIRST.
// ASC + null cursor: NULL is last, no rows after it → FALSE.
// DESC + null cursor: NULL is first, all non-null rows follow → IS NOT NULL.
// If ORDER BY uses NULLS FIRST/NULLS LAST overrides, this logic must be adjusted.
// OrderByPart currently does not carry nulls configuration.
function buildComparisonClause(
  expression: PrismaSql,
  value: CursorValue,
  direction: 'ASC' | 'DESC',
): PrismaSql {
  if (value === null) {
    if (direction === 'DESC') {
      return Prisma.sql`${expression} IS NOT NULL`;
    }
    return Prisma.sql`FALSE`;
  }

  if (direction === 'DESC') {
    return Prisma.sql`${expression} < ${value}`;
  }
  return Prisma.sql`${expression} > ${value}`;
}
