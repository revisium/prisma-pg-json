import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { generateJsonbValue, getComparisonOperator, escapeRegex } from './utils';
import { parseJsonPath } from '../../../utils/parseJsonPath';
import {
  generateJsonPathLikeRegex,
  generateJsonPathExistsWithParam,
} from '../../../utils/sql-jsonpath';

function handleObjectComparison(
  fieldRef: PrismaSql,
  jsonPath: string,
  operator: string,
  value: object,
): PrismaSql | null {
  const pathSegments = parseJsonPath(jsonPath);

  let nestedValue: unknown = value;
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    nestedValue = { [pathSegments[i]]: nestedValue };
  }

  if (operator === 'equals') {
    return Prisma.sql`${fieldRef} @> ${JSON.stringify(nestedValue)}::jsonb`;
  }
  if (operator === 'not') {
    return Prisma.sql`NOT (${fieldRef} @> ${JSON.stringify(nestedValue)}::jsonb)`;
  }
  return null;
}

function handleInsensitiveString(
  fieldRef: PrismaSql,
  jsonPath: string,
  operator: string,
  value: string,
): PrismaSql {
  const pattern = `^${escapeRegex(value)}$`;

  if (operator === 'not') {
    return Prisma.sql`NOT ${generateJsonPathLikeRegex(fieldRef, jsonPath, pattern, true)}`;
  }
  return generateJsonPathLikeRegex(fieldRef, jsonPath, pattern, true);
}

function handleOptimizedEqualsNot(
  fieldRef: PrismaSql,
  jsonPath: string,
  operator: string,
  value: unknown,
): PrismaSql | null {
  if (jsonPath.includes('[*]') || jsonPath.includes('[last]')) {
    return null;
  }

  const pathSegments = parseJsonPath(jsonPath);
  if (pathSegments.includes('last')) {
    return null;
  }

  const pathExpression = Prisma.sql`${fieldRef}#>'{${Prisma.raw(pathSegments.join(','))}}'`;
  const jsonbValue = generateJsonbValue(value);

  if (operator === 'equals') {
    return Prisma.sql`${pathExpression} = ${jsonbValue}`;
  }
  return Prisma.sql`${pathExpression} != ${jsonbValue}`;
}

export function generateJsonPathCondition(
  fieldRef: PrismaSql,
  jsonPath: string,
  operator: string,
  value: unknown,
  isInsensitive: boolean = false,
): PrismaSql {
  // For complex object comparisons, use @> operator (GIN-optimized)
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const result = handleObjectComparison(fieldRef, jsonPath, operator, value);
    if (result) return result;
  }

  // Handle case insensitive string operations for equals/not
  if (isInsensitive && typeof value === 'string' && (operator === 'equals' || operator === 'not')) {
    return handleInsensitiveString(fieldRef, jsonPath, operator, value);
  }

  // Optimize simple equals/not with #> operator for better performance
  if (operator === 'equals' || operator === 'not') {
    const result = handleOptimizedEqualsNot(fieldRef, jsonPath, operator, value);
    if (result) return result;
  }

  // Complex comparison operations use jsonb_path_exists
  const jsonbValue = generateJsonbValue(value);
  const comparisonOp = getComparisonOperator(operator);
  const condition = `${jsonPath} ? (@ ${comparisonOp} $val)`;

  return generateJsonPathExistsWithParam(fieldRef, condition, jsonbValue);
}
