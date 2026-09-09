import { Prisma, PrismaSql } from '../prisma-adapter';
import type { CursorValue, OrderByPart } from '../types';
import { bindSqlNumber } from './number';
import { describeKeysetCondition } from '../keyset/condition-description';

export function compileKeysetCondition(
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
  const allValues: CursorValue[] = [...cursorValues, tiebreaker];

  const orClauses: PrismaSql[] = [];

  for (const branch of describeKeysetCondition(allParts.length)) {
    const andClauses: PrismaSql[] = [];

    for (const equalityIndex of branch.equalityIndexes) {
      andClauses.push(buildEqualityClause(allParts[equalityIndex].expression, allValues[equalityIndex]));
    }

    const comparison = allParts[branch.comparisonIndex];
    andClauses.push(
      buildComparisonClause(
        comparison.expression,
        allValues[branch.comparisonIndex],
        comparison.direction,
      ),
    );

    orClauses.push(Prisma.sql`(${Prisma.join(andClauses, ' AND ')})`);
  }

  return Prisma.sql`(${Prisma.join(orClauses, ' OR ')})`;
}

function buildEqualityClause(expression: PrismaSql, value: CursorValue): PrismaSql {
  if (value === null) {
    return Prisma.sql`${expression} IS NULL`;
  }
  const parameter = typeof value === 'number' ? bindSqlNumber(value) : value;
  return Prisma.sql`${expression} = ${parameter}`;
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

  const parameter = typeof value === 'number' ? bindSqlNumber(value) : value;
  if (direction === 'DESC') {
    return Prisma.sql`${expression} < ${parameter}`;
  }
  return Prisma.sql`(${expression} > ${parameter} OR ${expression} IS NULL)`;
}
