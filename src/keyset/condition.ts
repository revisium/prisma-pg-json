import type { PrismaSql } from '../prisma-adapter';
import type { CursorValue, OrderByPart } from '../types';
import { compileKeysetCondition } from '../postgres/keyset';

/**
 * Build a multi-column WHERE condition for keyset (cursor-based) pagination.
 *
 * Generates `(col1 > v1) OR (col1 = v1 AND col2 > v2) OR ...` style conditions
 * that efficiently skip past the cursor position. Handles mixed ASC/DESC
 * directions and NULL values (assumes PostgreSQL defaults: ASC NULLS LAST,
 * DESC NULLS FIRST).
 *
 * @param parts - OrderByPart array from `generateOrderByParts()`
 * @param cursorValues - Values from `decodeCursor().values`
 * @param tiebreaker - Tiebreaker value from `decodeCursor().tiebreaker`
 * @param tiebreakerExpression - SQL expression for the tiebreaker column
 * @param tiebreakerDirection - Sort direction for the tiebreaker (default: DESC)
 * @returns Parameterized SQL condition to add to WHERE clause
 */
export function buildKeysetCondition(
  parts: OrderByPart[],
  cursorValues: CursorValue[],
  tiebreaker: string,
  tiebreakerExpression: PrismaSql,
  tiebreakerDirection: 'ASC' | 'DESC' = 'DESC',
): PrismaSql {
  return compileKeysetCondition(
    parts,
    cursorValues,
    tiebreaker,
    tiebreakerExpression,
    tiebreakerDirection,
  );
}
