import { WildcardContext, PathContext } from './types';
import { applyInsensitiveMode } from './pathUtils';

/**
 * Generate equals condition for single wildcard
 */
export function generateSingleEqualsCondition(
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value, isInsensitive } = context;
  const { elementPathStr } = pathContext;
  const paramPlaceholder = applyInsensitiveMode(value, isInsensitive);

  if (isInsensitive && typeof value === 'string') {
    return elementPathStr.length > 0
      ? `LOWER(elem#>'{${elementPathStr}}' ->> 0) = '${paramPlaceholder}'`
      : `LOWER(elem ->> 0) = '${paramPlaceholder}'`;
  } else {
    return elementPathStr.length > 0
      ? `(elem#>'{${elementPathStr}}')::jsonb = '${JSON.stringify(value)}'::jsonb`
      : `elem::jsonb = '${JSON.stringify(value)}'::jsonb`;
  }
}

/**
 * Generate equals condition for nested wildcard
 */
export function generateNestedEqualsCondition(
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value, isInsensitive } = context;
  const { finalElementPathStr } = pathContext;
  const paramPlaceholder = applyInsensitiveMode(value, isInsensitive);

  if (isInsensitive && typeof value === 'string') {
    return finalElementPathStr && finalElementPathStr.length > 0
      ? `LOWER(nested_elem#>'{${finalElementPathStr}}' ->> 0) = '${paramPlaceholder}'`
      : `LOWER(nested_elem ->> 0) = '${paramPlaceholder}'`;
  } else {
    return finalElementPathStr && finalElementPathStr.length > 0
      ? `(nested_elem#>'{${finalElementPathStr}}')::jsonb = '${JSON.stringify(value)}'::jsonb`
      : `nested_elem::jsonb = '${JSON.stringify(value)}'::jsonb`;
  }
}
