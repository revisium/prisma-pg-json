import { WildcardContext, PathContext } from './types';

/**
 * Build path expressions for wildcard operations
 */
export function buildPathContext(context: WildcardContext): PathContext {
  const { fieldRefStr, beforeWildcard, afterWildcard, hasNestedWildcard } = context;

  // Build path to the array that contains objects
  const arrayPathStr =
    beforeWildcard.length > 0
      ? `ARRAY[${beforeWildcard.map((p) => `'${p}'`).join(',')}]::text[]`
      : `ARRAY[]::text[]`;

  const arrayPathExpr =
    beforeWildcard.length > 0
      ? `(${fieldRefStr}#>${arrayPathStr})::jsonb`
      : `${fieldRefStr}::jsonb`;

  const elementPathStr = afterWildcard.length > 0 ? afterWildcard.join(',') : '';

  let nestedArrayPathStr: string | undefined;
  let finalElementPathStr: string | undefined;
  let nestedArrayPath: string | undefined;

  if (hasNestedWildcard) {
    const nextWildcardIndex = afterWildcard.indexOf('*');
    const pathBeforeNextWildcard = afterWildcard.slice(0, nextWildcardIndex);
    const pathAfterNextWildcard = afterWildcard.slice(nextWildcardIndex + 1);

    nestedArrayPathStr = pathBeforeNextWildcard.join(',');
    finalElementPathStr = pathAfterNextWildcard.length > 0 ? pathAfterNextWildcard.join(',') : '';

    nestedArrayPath =
      nestedArrayPathStr.length > 0 ? `(elem#>'{${nestedArrayPathStr}}')::jsonb` : `elem::jsonb`;
  }

  return {
    arrayPathStr,
    arrayPathExpr,
    elementPathStr,
    nestedArrayPathStr,
    finalElementPathStr,
    nestedArrayPath,
  };
}

/**
 * Apply case-insensitive mode to a value if needed
 */
export function applyInsensitiveMode(value: unknown, isInsensitive: boolean) {
  return isInsensitive && typeof value === 'string' ? value.toLowerCase() : value;
}
