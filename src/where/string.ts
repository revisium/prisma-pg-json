import type { PrismaSql } from '../prisma-adapter';
import type { StringFilter } from '../types';
import { compileStringFilter } from '../postgres/string-filter';

/**
 * Generate a WHERE condition for a string column.
 *
 * Supports: equals, not, contains, startsWith, endsWith, in, notIn, gt, gte, lt, lte, search.
 * Set `mode: 'insensitive'` for case-insensitive matching.
 *
 * @param fieldRef - SQL reference to the column (e.g., `Prisma.sql\`u."name"\``)
 * @param filter - String value for exact match, or StringFilter object
 * @returns Parameterized SQL condition
 */
export function generateStringFilter(
  fieldRef: PrismaSql,
  filter: string | StringFilter,
): PrismaSql {
  return compileStringFilter(fieldRef, filter);
}
