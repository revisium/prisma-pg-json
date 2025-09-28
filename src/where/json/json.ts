import { Prisma } from '@prisma/client';
import type { JsonFilter } from '../../types';
import { generateJsonFilterV2 } from './json-filter-v2';

/**
 * Generate WHERE clause for JSON fields using native PostgreSQL JSON Path
 *
 * This function now uses the refactored v2 implementation for better maintainability.
 * The old implementation has been replaced with a clean operator-based architecture.
 */
export function generateJsonFilter(
  fieldRef: Prisma.Sql,
  filter: JsonFilter,
  fieldName: string,
  tableAlias: string,
): Prisma.Sql {
  return generateJsonFilterV2(fieldRef, filter, fieldName, tableAlias);
}
