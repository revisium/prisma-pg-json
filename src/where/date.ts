import type { PrismaSql } from '../prisma-adapter';
import type { DateFilter } from '../types';
import { compileDateFilter } from '../postgres/date-filter';

/**
 * Generate a WHERE condition for a date/timestamp column.
 *
 * Supports: equals, not, gt, gte, lt, lte, in, notIn.
 * Accepts Date objects or ISO 8601 date strings.
 *
 * @param fieldRef - SQL reference to the column
 * @param filter - Date value for exact match, or DateFilter object
 * @returns Parameterized SQL condition
 */
export function generateDateFilter(
  fieldRef: PrismaSql,
  filter: string | Date | DateFilter,
): PrismaSql {
  return compileDateFilter(fieldRef, filter);
}
