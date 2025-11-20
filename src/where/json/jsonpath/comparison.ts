import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { generateJsonbValue, getComparisonOperator, escapeRegex } from './utils';
import { parseJsonPath } from '../../../utils/parseJsonPath';
import {
  generateJsonPathLikeRegex,
  generateJsonPathExistsWithParam,
} from '../../../utils/sql-jsonpath';

export function generateJsonPathCondition(
  fieldRef: PrismaSql,
  jsonPath: string,
  operator: string,
  value: unknown,
  isInsensitive: boolean = false,
): PrismaSql {
  // For complex object comparisons, use @> operator (GIN-optimized)
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const pathSegments = parseJsonPath(jsonPath);

    // Build nested object for @> operator
    let nestedValue = value;
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      nestedValue = { [pathSegments[i]]: nestedValue };
    }

    if (operator === 'equals') {
      return Prisma.sql`${fieldRef} @> ${JSON.stringify(nestedValue)}::jsonb`;
    } else if (operator === 'not') {
      return Prisma.sql`NOT (${fieldRef} @> ${JSON.stringify(nestedValue)}::jsonb)`;
    }
  }

  // Handle case insensitive string operations for equals/not
  if (isInsensitive && typeof value === 'string' && (operator === 'equals' || operator === 'not')) {
    const escapedValue = escapeRegex(value);
    const pattern = `^${escapedValue}$`;

    if (operator === 'not') {
      // For NOT operation, we need to negate the entire expression
      return Prisma.sql`NOT ${generateJsonPathLikeRegex(fieldRef, jsonPath, pattern, true)}`;
    } else {
      return generateJsonPathLikeRegex(fieldRef, jsonPath, pattern, true);
    }
  }

  // Optimize simple equals/not with #> operator for better performance (but not for wildcards or 'last' keyword)
  if (
    (operator === 'equals' || operator === 'not') &&
    !jsonPath.includes('[*]') &&
    !jsonPath.includes('[last]')
  ) {
    const pathSegments = parseJsonPath(jsonPath);

    // If segments contain 'last', use jsonb_path_exists instead
    if (!pathSegments.includes('last')) {
      const pathExpression = Prisma.sql`${fieldRef}#>'{${Prisma.raw(pathSegments.join(','))}}'`;
      const jsonbValue = generateJsonbValue(value);

      if (operator === 'equals') {
        return Prisma.sql`${pathExpression} = ${jsonbValue}`;
      } else {
        return Prisma.sql`${pathExpression} != ${jsonbValue}`;
      }
    }
  }

  // Complex comparison operations use jsonb_path_exists
  const jsonbValue = generateJsonbValue(value);
  const comparisonOp = getComparisonOperator(operator);
  const condition = `${jsonPath} ? (@ ${comparisonOp} $val)`;

  return generateJsonPathExistsWithParam(fieldRef, condition, jsonbValue);
}
