import { WildcardContext, PathContext, WildcardOperator } from './types';

/**
 * Generate string condition (string_contains, string_starts_with, string_ends_with) for single wildcard
 */
export function generateSingleStringCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value, isInsensitive } = context;
  const { elementPathStr } = pathContext;

  const pattern = getStringPattern(operator, value);

  if (elementPathStr.length > 0) {
    return isInsensitive
      ? `LOWER(elem#>>'{${elementPathStr}}') LIKE LOWER('${pattern}')`
      : `elem#>>'{${elementPathStr}}' LIKE '${pattern}'`;
  } else {
    return isInsensitive
      ? `LOWER(elem ->> 0) LIKE LOWER('${pattern}')`
      : `elem ->> 0 LIKE '${pattern}'`;
  }
}

/**
 * Generate string condition (string_contains, string_starts_with, string_ends_with) for nested wildcard
 */
export function generateNestedStringCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value, isInsensitive } = context;
  const { finalElementPathStr } = pathContext;

  const pattern = getStringPattern(operator, value);

  if (finalElementPathStr && finalElementPathStr.length > 0) {
    return isInsensitive
      ? `LOWER(nested_elem#>>'{${finalElementPathStr}}') LIKE LOWER('${pattern}')`
      : `nested_elem#>>'{${finalElementPathStr}}' LIKE '${pattern}'`;
  } else {
    return isInsensitive
      ? `LOWER(nested_elem ->> 0) LIKE LOWER('${pattern}')`
      : `nested_elem ->> 0 LIKE '${pattern}'`;
  }
}

/**
 * Generate LIKE pattern for string operators
 */
function getStringPattern(operator: WildcardOperator, value: unknown): string {
  switch (operator) {
    case 'string_contains':
      return `%${value}%`;
    case 'string_starts_with':
      return `${value}%`;
    case 'string_ends_with':
      return `%${value}`;
    default:
      throw new Error(`Invalid string operator: ${operator}`);
  }
}
