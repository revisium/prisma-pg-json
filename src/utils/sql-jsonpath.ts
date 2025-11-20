import { Prisma, PrismaSql } from '../prisma-adapter';

/**
 * Generate jsonb_path_exists expression without parameters
 * @param fieldRef - Field reference (e.g., Prisma.sql`data`)
 * @param condition - JSONPath condition string
 * @returns PrismaSql expression
 */
export function generateJsonPathExists(fieldRef: PrismaSql, condition: string): PrismaSql {
  return Prisma.sql`jsonb_path_exists(${fieldRef}, ${condition}::jsonpath)`;
}

/**
 * Generate jsonb_path_exists expression with single parameter
 * @param fieldRef - Field reference
 * @param condition - JSONPath condition string (should contain $val placeholder)
 * @param value - Parameter value
 * @returns PrismaSql expression
 */
export function generateJsonPathExistsWithParam(
  fieldRef: PrismaSql,
  condition: string,
  value: PrismaSql,
): PrismaSql {
  return Prisma.sql`jsonb_path_exists(
    ${fieldRef},
    ${condition}::jsonpath,
    jsonb_build_object('val', ${value})
  )`;
}

/**
 * Generate jsonb_path_exists expression with multiple parameters
 * @param fieldRef - Field reference
 * @param condition - JSONPath condition string
 * @param parameters - Parameters object as PrismaSql
 * @returns PrismaSql expression
 */
export function generateJsonPathExistsWithParams(
  fieldRef: PrismaSql,
  condition: string,
  parameters: PrismaSql,
): PrismaSql {
  return Prisma.sql`jsonb_path_exists(
    ${fieldRef},
    ${condition}::jsonpath,
    ${parameters}::jsonb
  )`;
}

/**
 * Generate negated jsonb_path_exists expression
 * @param fieldRef - Field reference
 * @param condition - JSONPath condition string
 * @returns PrismaSql expression
 */
export function generateJsonPathNotExists(fieldRef: PrismaSql, condition: string): PrismaSql {
  return Prisma.sql`NOT jsonb_path_exists(${fieldRef}, ${condition}::jsonpath)`;
}

/**
 * Generate jsonb_path_exists expression with like_regex using parameterized queries
 * @param fieldRef - Field reference
 * @param jsonPath - JSONPath string
 * @param pattern - Regular expression pattern (will be passed as parameter)
 * @param isInsensitive - Whether to use case-insensitive matching
 * @returns PrismaSql expression
 */
export function generateJsonPathLikeRegex(
  fieldRef: PrismaSql,
  jsonPath: string,
  pattern: string,
  isInsensitive: boolean = false,
): PrismaSql {
  const flags = isInsensitive ? ' flag "i"' : '';
  // Escape quotes and other special characters for JSONPath string literal
  const escapedPattern = pattern.replace(/["\\\n\r\t]/g, (match) => {
    switch (match) {
      case '"':
        return '\\"';
      case '\\':
        return '\\\\';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      default:
        return match;
    }
  });

  const condition = `${jsonPath} ? (@ like_regex "${escapedPattern}"${flags})`;
  return generateJsonPathExists(fieldRef, condition);
}

/**
 * Generate dynamic jsonb_build_object for multiple parameters
 * @param params - Object with parameter names and PrismaSql values
 * @returns PrismaSql expression for jsonb_build_object
 */
export function generateJsonBuildObject(params: Record<string, PrismaSql>): PrismaSql {
  const entries = Object.entries(params);
  const args = entries.flatMap(([key, value]) => [Prisma.sql`CAST(${key} AS text)`, value]);

  return Prisma.sql`jsonb_build_object(${Prisma.join(args, ', ')})`;
}
