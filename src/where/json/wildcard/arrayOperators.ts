import { WildcardContext, PathContext, WildcardOperator } from './types';

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Generate array condition (array_contains, array_starts_with, array_ends_with) for single wildcard
 */
export function generateSingleArrayCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value, isInsensitive } = context;
  const { elementPathStr } = pathContext;

  if (elementPathStr.length > 0) {
    const arrayPath = `(elem#>'{${elementPathStr}}')::jsonb`;
    return generateArrayConditionSql(operator, value, isInsensitive, arrayPath);
  } else {
    return generateArrayConditionSql(operator, value, isInsensitive, 'elem::jsonb');
  }
}

/**
 * Generate array condition (array_contains, array_starts_with, array_ends_with) for nested wildcard
 */
export function generateNestedArrayCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value, isInsensitive } = context;
  const { finalElementPathStr } = pathContext;

  if (finalElementPathStr && finalElementPathStr.length > 0) {
    const arrayPath = `(nested_elem#>'{${finalElementPathStr}}')::jsonb`;
    return generateArrayConditionSql(operator, value, isInsensitive, arrayPath);
  } else {
    return generateArrayConditionSql(operator, value, isInsensitive, 'nested_elem::jsonb');
  }
}

/**
 * Generate SQL condition for array operations
 */
function generateArrayConditionSql(
  operator: WildcardOperator,
  value: unknown,
  isInsensitive: boolean,
  arrayPath: string,
): string {
  switch (operator) {
    case 'array_contains': {
      if (!Array.isArray(value)) {
        throw new Error('array_contains: value must be an array');
      }
      if (value.length === 0) {
        throw new Error('array_contains: value array cannot be empty');
      }
      if (isInsensitive) {
        if (value.length > 1) {
          throw new Error(
            'array_contains: insensitive mode with multiple elements not supported yet',
          );
        }
        if (typeof value[0] === 'string') {
          const escapedValue = escapeSqlString(value[0].toLowerCase());
          return `EXISTS (SELECT 1 FROM jsonb_array_elements_text(${arrayPath}) AS arr_elem WHERE LOWER(arr_elem) = '${escapedValue}')`;
        } else {
          throw new Error('array_contains: insensitive mode only supports strings');
        }
      } else {
        return `${arrayPath} @> '${JSON.stringify(value)}'::jsonb`;
      }
    }

    case 'array_starts_with':
      if (isInsensitive && typeof value === 'string') {
        const escapedValue = escapeSqlString(value.toLowerCase());
        return `(LOWER((${arrayPath})->>0) = '${escapedValue}' AND JSONB_TYPEOF(${arrayPath}) = 'array')`;
      } else {
        return `((${arrayPath}->0)::jsonb = '${JSON.stringify(value)}'::jsonb AND JSONB_TYPEOF(${arrayPath}) = 'array')`;
      }

    case 'array_ends_with':
      if (isInsensitive && typeof value === 'string') {
        const escapedValue = escapeSqlString(value.toLowerCase());
        return `(LOWER((${arrayPath})->>-1) = '${escapedValue}' AND JSONB_TYPEOF(${arrayPath}) = 'array')`;
      } else {
        return `((${arrayPath}->-1)::jsonb = '${JSON.stringify(value)}'::jsonb AND JSONB_TYPEOF(${arrayPath}) = 'array')`;
      }

    default:
      throw new Error(`Invalid array operator: ${operator}`);
  }
}
