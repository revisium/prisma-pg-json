import { Prisma, PrismaSql } from '../prisma-adapter';
import { OrderByPart } from '../types';

export function buildKeysetCondition(
  parts: OrderByPart[],
  cursorValues: (string | number | boolean | null)[],
  tiebreaker: string,
  tiebreakerExpression: PrismaSql,
): PrismaSql {
  const allParts: { expression: PrismaSql; direction: 'ASC' | 'DESC' }[] = [
    ...parts.map((p) => ({ expression: p.expression, direction: p.direction })),
    {
      expression: tiebreakerExpression,
      direction: 'DESC' as const,
    },
  ];
  const allValues: (string | number | boolean | null)[] = [
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
  value: string | number | boolean | null,
): PrismaSql {
  if (value === null) {
    return Prisma.sql`${expression} IS NULL`;
  }
  return Prisma.sql`${expression} = ${value}`;
}

function buildComparisonClause(
  expression: PrismaSql,
  value: string | number | boolean | null,
  direction: 'ASC' | 'DESC',
): PrismaSql {
  if (value === null) {
    if (direction === 'ASC') {
      return Prisma.sql`${expression} IS NOT NULL`;
    }
    return Prisma.sql`FALSE`;
  }

  if (direction === 'DESC') {
    return Prisma.sql`${expression} < ${value}`;
  }
  return Prisma.sql`${expression} > ${value}`;
}
