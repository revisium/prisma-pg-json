import { Prisma } from '@prisma/client';

/**
 * Generate jsonb_path_exists expression without parameters
 * @param fieldRef - Field reference (e.g., Prisma.sql`data`)
 * @param condition - JSONPath condition string
 * @returns Prisma.Sql expression
 */
export function generateJsonPathExists(fieldRef: Prisma.Sql, condition: string): Prisma.Sql {
  return Prisma.sql`jsonb_path_exists(${fieldRef}, ${condition}::jsonpath)`;
}

/**
 * Generate jsonb_path_exists expression with single parameter
 * @param fieldRef - Field reference
 * @param condition - JSONPath condition string (should contain $val placeholder)
 * @param value - Parameter value
 * @returns Prisma.Sql expression
 */
export function generateJsonPathExistsWithParam(
  fieldRef: Prisma.Sql,
  condition: string,
  value: Prisma.Sql,
): Prisma.Sql {
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
 * @param parameters - Parameters object as Prisma.Sql
 * @returns Prisma.Sql expression
 */
export function generateJsonPathExistsWithParams(
  fieldRef: Prisma.Sql,
  condition: string,
  parameters: Prisma.Sql,
): Prisma.Sql {
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
 * @returns Prisma.Sql expression
 */
export function generateJsonPathNotExists(fieldRef: Prisma.Sql, condition: string): Prisma.Sql {
  return Prisma.sql`NOT jsonb_path_exists(${fieldRef}, ${condition}::jsonpath)`;
}

/**
 * Generate jsonb_path_exists expression with like_regex using parameterized queries
 * @param fieldRef - Field reference
 * @param jsonPath - JSONPath string
 * @param pattern - Regular expression pattern (will be passed as parameter)
 * @param isInsensitive - Whether to use case-insensitive matching
 * @returns Prisma.Sql expression
 */
export function generateJsonPathLikeRegex(
  fieldRef: Prisma.Sql,
  jsonPath: string,
  pattern: string,
  isInsensitive: boolean = false,
): Prisma.Sql {
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
 * @param params - Object with parameter names and Prisma.Sql values
 * @returns Prisma.Sql expression for jsonb_build_object
 */
export function generateJsonBuildObject(params: Record<string, Prisma.Sql>): Prisma.Sql {
  const entries = Object.entries(params);
  const args = entries.flatMap(([key, value]) => [Prisma.sql`CAST(${key} AS text)`, value]);

  return Prisma.sql`jsonb_build_object(${Prisma.join(args, ', ')})`;
}
