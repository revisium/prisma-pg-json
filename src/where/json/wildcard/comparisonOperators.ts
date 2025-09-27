import { WildcardContext, PathContext, WildcardOperator } from './types';

/**
 * Generate comparison condition (gt, gte, lt, lte) for single wildcard
 */
export function generateSingleComparisonCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value } = context;
  const { elementPathStr } = pathContext;

  const sqlOperator = getComparisonSqlOperator(operator);
  const jsonValue = JSON.stringify(value);

  return elementPathStr.length > 0
    ? `(elem#>'{${elementPathStr}}')::jsonb ${sqlOperator} '${jsonValue}'::jsonb`
    : `elem::jsonb ${sqlOperator} '${jsonValue}'::jsonb`;
}

/**
 * Generate comparison condition (gt, gte, lt, lte) for nested wildcard
 */
export function generateNestedComparisonCondition(
  operator: WildcardOperator,
  context: WildcardContext,
  pathContext: PathContext,
): string {
  const { value } = context;
  const { finalElementPathStr } = pathContext;

  const sqlOperator = getComparisonSqlOperator(operator);
  const jsonValue = JSON.stringify(value);

  return finalElementPathStr && finalElementPathStr.length > 0
    ? `(nested_elem#>'{${finalElementPathStr}}')::jsonb ${sqlOperator} '${jsonValue}'::jsonb`
    : `nested_elem::jsonb ${sqlOperator} '${jsonValue}'::jsonb`;
}

/**
 * Map comparison operators to SQL operators
 */
function getComparisonSqlOperator(operator: WildcardOperator): string {
  switch (operator) {
    case 'gt':
      return '>';
    case 'gte':
      return '>=';
    case 'lt':
      return '<';
    case 'lte':
      return '<=';
    default:
      throw new Error(`Invalid comparison operator: ${operator}`);
  }
}
