import { Prisma, PrismaSql } from '../../prisma-adapter';
import type { JsonFilter } from '../../types';
import { convertToJsonPath } from '../../utils/parseJsonPath';
import { OperatorManager } from './operator-manager';

interface PathValidationResult {
  isValid: boolean;
  isSpecialPath: boolean;
}

function validatePath(path: JsonFilter['path']): PathValidationResult {
  if ((Array.isArray(path) && path.length === 0) || path === '') {
    return {
      isValid: true,
      isSpecialPath: true,
    };
  }

  if (typeof path === 'string' && path.includes('..')) {
    return {
      isValid: false,
      isSpecialPath: false,
    };
  }

  return {
    isValid: true,
    isSpecialPath: false,
  };
}

const operatorManager = new OperatorManager();

/**
 * Generate a WHERE condition for a JSONB column using path-based filtering.
 *
 * Supports 14 operators: equals, not, gt, gte, lt, lte, in, notIn,
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
  const pathValidation = validatePath(filter.path);
  if (!pathValidation.isValid) {
    throw new Error('Invalid path');
  }

  if (pathValidation.isSpecialPath) {
    if (!operatorManager.supportsSpecialPath(filter)) {
      throw new Error('No operators in filter support empty path operations');
    }

    const conditions = operatorManager.processFilter(
      fieldRef,
      '',
      filter,
      filter.mode === 'insensitive',
      true,
    );

    return combineConditions(conditions, fieldName);
  }

  const jsonPath = convertToJsonPath(filter.path);

  const isInsensitive = filter.mode === 'insensitive';
  const conditions = operatorManager.processFilter(
    fieldRef,
    jsonPath,
    filter,
    isInsensitive,
    false,
  );

  return combineConditions(conditions, fieldName);
}

function combineConditions(conditions: PrismaSql[], fieldName: string): PrismaSql {
  if (conditions.length === 0) {
    throw new Error(`No valid operations found for field: ${fieldName}`);
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.sql`(${Prisma.join(conditions, ' AND ')})`;
}
