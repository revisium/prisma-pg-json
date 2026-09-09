import type { PrismaSql } from '../../prisma-adapter';
import type { JsonFilter } from '../../types';
import { compileJsonFilter } from '../../postgres/json-filter';

/**
 * Generate a WHERE condition for a JSONB column using path-based filtering.
 *
 * Supports 15 operators: equals, not, gt, gte, lt, lte, in, notIn,
 * string_contains, string_starts_with, string_ends_with,
 * array_contains, array_starts_with, array_ends_with, search.
 *
 * Paths support dot notation (`'user.name'`), wildcards (`'items[*].price'`),
 * array indices (`'items[0]'`), and negative indices (`'items[-1]'`).
 *
 * @param fieldRef - SQL reference to the JSONB column
 * @param filter - JsonFilter with path and operator(s)
 * @param fieldName - Column name (used in error messages)
 * @param _tableAlias - Table alias (reserved for future use)
 * @returns Parameterized SQL condition
 */
export function generateJsonFilter(
  fieldRef: PrismaSql,
  filter: JsonFilter,
  fieldName: string,
  _tableAlias: string,
): PrismaSql {
  return compileJsonFilter(fieldRef, filter, fieldName, _tableAlias);
}
