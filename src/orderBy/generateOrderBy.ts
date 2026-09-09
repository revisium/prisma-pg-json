import type { PrismaSql } from '../prisma-adapter';
import { GenerateOrderByParams, FieldConfig, OrderByPart } from '../types';
import {
  compileOrderBy,
  compileOrderByClauses,
  compileOrderByParts,
} from '../postgres/order-by';

/**
 * Parse ORDER BY configuration into structured parts.
 *
 * Returns an array of `OrderByPart` objects containing the SQL expression,
 * direction, and metadata for each sort column. Used by keyset pagination
 * to build cursor conditions.
 *
 * @param params - Order by configuration with field types and table alias
 * @returns Array of OrderByPart objects (empty array if no valid sort columns)
 */
export function generateOrderByParts<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): OrderByPart[] {
  return compileOrderByParts(params);
}

/**
 * Generate ORDER BY clauses without the `ORDER BY` prefix.
 *
 * Returns the comma-separated sort expressions (e.g., `u."name" ASC, u."age" DESC`).
 * Useful when composing ORDER BY with additional tiebreaker columns.
 *
 * @param params - Order by configuration with field types and table alias
 * @returns Parameterized SQL clauses, or null if no valid sort columns
 */
export function generateOrderByClauses<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): PrismaSql | null {
  return compileOrderByClauses(params);
}

/**
 * Generate a complete `ORDER BY ...` clause.
 *
 * Supports scalar columns (`'asc'` / `'desc'`) and JSON fields with
 * path, type casting, and aggregation (min, max, avg, first, last).
 *
 * @param params - Order by configuration with field types and table alias
 * @returns Parameterized SQL with `ORDER BY` prefix, or null if no valid sort columns
 */
export function generateOrderBy<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): PrismaSql | null {
  return compileOrderBy<TConfig>(params);
}
