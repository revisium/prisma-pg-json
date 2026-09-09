import type { PrismaSql } from '../prisma-adapter';
import type { NumberFilter } from '../types';
import { compileNumberFilter } from '../postgres/number-filter';

/**
 * Generate a WHERE condition for a numeric column.
 *
 * Supports: equals, not, gt, gte, lt, lte, in, notIn.
 *
 * @param fieldRef - SQL reference to the column
 * @param filter - Number value for exact match, or NumberFilter object
 * @returns Parameterized SQL condition
 */
export function generateNumberFilter(
  fieldRef: PrismaSql,
  filter: number | NumberFilter,
): PrismaSql {
  return compileNumberFilter(fieldRef, filter);
}
