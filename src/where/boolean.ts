import type { PrismaSql } from '../prisma-adapter';
import type { BooleanFilter } from '../types';
import { compileBooleanFilter } from '../postgres/boolean-filter';

/**
 * Generate a WHERE condition for a boolean column.
 *
 * Supports: equals, not.
 *
 * @param fieldRef - SQL reference to the column
 * @param filter - Boolean value for exact match, or BooleanFilter object
 * @returns Parameterized SQL condition
 */
export function generateBooleanFilter(
  fieldRef: PrismaSql,
  filter: boolean | BooleanFilter,
): PrismaSql {
  return compileBooleanFilter(fieldRef, filter);
}
