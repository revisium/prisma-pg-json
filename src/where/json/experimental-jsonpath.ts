import { Prisma } from '@prisma/client';

/**
 * Experimental PostgreSQL JSON Path generator
 *
 * This is a prototype implementation to test PostgreSQL native JSON Path
 * vs our current EXISTS-based wildcard approach.
 */

/**
 * Convert our path format to PostgreSQL JSON Path format
 */
export function convertToJsonPath(path: string[] | string): string {
  let normalizedPath: string[];

  if (typeof path === 'string') {
    // Handle string paths like 'products[*].name' or 'user.profile.email'
    if (path.startsWith('$.')) {
      return path; // Already JSON Path format
    }

    // Parse our string format to array
    normalizedPath = path
      .replace(/\[([^\]]+)\]/g, '.$1') // Convert [*] to .*
      .replace(/^\./, '') // Remove leading dot
      .split('.')
      .filter((segment) => segment.length > 0);
  } else {
    normalizedPath = path;
  }

  // Convert array to JSON Path: ['products', '*', 'name'] → '$.products[*].name'
  return (
    '$.' +
    normalizedPath
      .map((segment) => {
        if (segment === '*') {
          return '[*]';
        }
        // Check if it's a numeric index
        if (/^\d+$/.test(segment)) {
          return `[${segment}]`;
        }
        return segment;
      })
      .join('.')
      .replace(/\.\[/g, '[')
  ); // Fix .[ to [
}

/**
 * Map our filter operations to JSON Path operators
 */
// mapOperationToJsonPath removed - using parameterized queries with $val variables

// formatJsonPathValue removed - using parameterized queries with jsonb_build_object

/**
 * Escape special regex characters for like_regex
 */
function _escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate PostgreSQL JSON Path condition using @? operator
 */
/**
 * Generate proper type cast for jsonb_build_object based on value type
 */
function generateJsonbValue(value: unknown): Prisma.Sql {
  if (typeof value === 'string') {
    return Prisma.sql`to_jsonb(${value}::text)`;
  } else if (typeof value === 'number') {
    return Prisma.sql`to_jsonb(${value}::numeric)`;
  } else if (typeof value === 'boolean') {
    return Prisma.sql`to_jsonb(${value}::boolean)`;
  } else if (value === null) {
    return Prisma.sql`'null'::jsonb`;
  } else {
    // For complex objects, convert to text first
    return Prisma.sql`to_jsonb(${JSON.stringify(value)}::text)`;
  }
}

export function generateJsonPathCondition(
  fieldRef: Prisma.Sql,
  path: string[] | string,
  operator: string,
  value: unknown,
  _isInsensitive: boolean = false,
): Prisma.Sql {
  const jsonPath = convertToJsonPath(path);
  const _hasWildcard = jsonPath.includes('[*]');
  const jsonbValue = generateJsonbValue(value);

  if (_hasWildcard) {
    // For wildcard paths: $.products[*] ? (@.name == $val)
    const parts = jsonPath.split('[*]');
    const beforeWildcard = parts[0]; // $.products
    const afterWildcard = parts[1] || ''; // .name or empty

    const comparisonOp = getComparisonOperator(operator);
    let condition: string;

    if (afterWildcard.startsWith('.')) {
      // Remove leading dot: .name → name
      const fieldPathName = afterWildcard.substring(1);
      condition = `${beforeWildcard}[*] ? (@.${fieldPathName} ${comparisonOp} $val)`;
    } else {
      condition = `${beforeWildcard}[*] ? (@ ${comparisonOp} $val)`;
    }

    return Prisma.sql`jsonb_path_exists(
      ${fieldRef},
      ${condition}::jsonpath,
      jsonb_build_object('val', ${jsonbValue})
    )`;
  } else {
    // For simple paths without wildcards
    const comparisonOp = getComparisonOperator(operator);
    const condition = `${jsonPath} ? (@ ${comparisonOp} $val)`;

    return Prisma.sql`jsonb_path_exists(
      ${fieldRef},
      ${condition}::jsonpath,
      jsonb_build_object('val', ${jsonbValue})
    )`;
  }
}

/**
 * Map our operators to JSON Path comparison operators
 */
function getComparisonOperator(operator: string): string {
  switch (operator) {
    case 'equals':
      return '==';
    case 'gt':
      return '>';
    case 'gte':
      return '>=';
    case 'lt':
      return '<';
    case 'lte':
      return '<=';
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

/**
 * Check if we should use experimental JSON Path vs legacy approach
 */
export function shouldUseJsonPath(path: string[] | string, operator: string): boolean {
  // Start with simple cases only
  const supportedOperators = ['equals', 'gt', 'gte', 'lt', 'lte'];

  if (!supportedOperators.includes(operator)) {
    return false;
  }

  // Don't use JSON Path for empty paths (whole object comparison)
  if (Array.isArray(path) && path.length === 0) {
    return false;
  }

  // Only enable for simple paths without wildcards for now
  const pathStr = Array.isArray(path) ? path.join('.') : path;
  const _hasWildcards = pathStr.includes('*');

  // Temporarily disable while debugging
  return false;
}
