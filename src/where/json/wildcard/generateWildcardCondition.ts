import { Prisma } from '@prisma/client';
import { WildcardOperator, WildcardContext, PathContext } from './types';
import { buildPathContext } from './pathUtils';
import { buildSingleWildcardQuery, buildNestedWildcardQuery } from './queryBuilder';
import { generateSingleEqualsCondition, generateNestedEqualsCondition } from './equalsOperator';
import {
  generateSingleComparisonCondition,
  generateNestedComparisonCondition,
} from './comparisonOperators';
import { generateSingleStringCondition, generateNestedStringCondition } from './stringOperators';
import { generateSingleArrayCondition, generateNestedArrayCondition } from './arrayOperators';

/**
 * Check if path contains wildcard "*"
 */
export function hasWildcard(path: string[]): boolean {
  return path.includes('*');
}

/**
 * Generate SQL for wildcard path like ['products', '*', 'name']
 * Uses EXISTS with jsonb_array_elements to filter by fields inside array elements
 */
export function generateWildcardCondition(
  fieldRef: Prisma.Sql,
  path: string[],
  operator: WildcardOperator,
  value: unknown,
  isInsensitive: boolean = false,
): Prisma.Sql {
  // Convert Prisma.Sql to string for use in wildcard operations
  const fieldRefStr = fieldRef.inspect().sql;
  const wildcardIndex = path.indexOf('*');

  if (wildcardIndex === -1) {
    throw new Error('No wildcard found in path');
  }

  // Split path into: before wildcard, after wildcard
  const beforeWildcard = path.slice(0, wildcardIndex);
  const afterWildcard = path.slice(wildcardIndex + 1);

  // Check if there's another wildcard in the remaining path
  const hasNestedWildcard = afterWildcard.includes('*');

  const context: WildcardContext = {
    fieldRefStr,
    beforeWildcard,
    afterWildcard,
    hasNestedWildcard,
    value,
    isInsensitive,
  };

  const pathContext = buildPathContext(context);

  // Generate condition based on operator and wildcard type
  const condition = hasNestedWildcard
    ? generateNestedCondition(operator, context, pathContext)
    : generateSingleCondition(operator, context, pathContext);

  // Build appropriate EXISTS query
  return hasNestedWildcard
    ? buildNestedWildcardQuery(pathContext, condition)
    : buildSingleWildcardQuery(pathContext, condition);
}

/**
 * Generate condition for single wildcard operations
 */
function generateSingleCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  switch (operator) {
    case 'equals':
      return generateSingleEqualsCondition(context, pathContext);

    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return generateSingleComparisonCondition(operator, context, pathContext);

    case 'string_contains':
    case 'string_starts_with':
    case 'string_ends_with':
      return generateSingleStringCondition(operator, context, pathContext);

    case 'array_contains':
    case 'array_starts_with':
    case 'array_ends_with':
      return generateSingleArrayCondition(operator, context, pathContext);

    default:
      throw new Error(`Unsupported operator for wildcard: ${operator}`);
  }
}

/**
 * Generate condition for nested wildcard operations
 */
function generateNestedCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  switch (operator) {
    case 'equals':
      return generateNestedEqualsCondition(context, pathContext);

    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return generateNestedComparisonCondition(operator, context, pathContext);

    case 'string_contains':
    case 'string_starts_with':
    case 'string_ends_with':
      return generateNestedStringCondition(operator, context, pathContext);

    case 'array_contains':
    case 'array_starts_with':
    case 'array_ends_with':
      return generateNestedArrayCondition(operator, context, pathContext);

    default:
      throw new Error(`Unsupported operator for nested wildcard: ${operator}`);
  }
}
