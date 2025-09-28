import { Prisma } from '@prisma/client';
import { JsonFilter } from '../../types';
import {
  processArrayEndsWith,
  processArrayStartsWith,
  processArrayContains,
  processEquals,
  processStringContains,
  processStringStartsWith,
  processStringEndsWith,
  processGreaterThan,
  processGreaterThanOrEqual,
  processLessThan,
  processLessThanOrEqual,
  processIn,
  processNotIn,
  processNot,
  hasWildcard,
  generateWildcardCondition,
  parseJsonPath,
  generateJsonPathCondition,
  shouldUseJsonPath,
} from './index';

/**
 * Generate WHERE clause for JSON fields
 */
export function generateJsonFilter(
  fieldRef: Prisma.Sql,
  filter: JsonFilter,
  fieldName: string,
  tableAlias: string,
): Prisma.Sql {
  // Normalize path: convert string to array if needed
  const path = typeof filter.path === 'string' ? parseJsonPath(filter.path) : filter.path || [];

  const mode = filter.mode || 'default';
  const isInsensitive = mode === 'insensitive';

  // Handle empty path for meta field operations (equals entire object)
  if (path.length === 0) {
    if (filter.equals !== undefined) {
      return processEquals(fieldRef, fieldRef, filter.equals, path);
    }
    throw new Error('JSON filter with empty path only supports equals operation');
  }

  // Try PostgreSQL native JSON Path for supported operations
  const supportedOperators = ['equals', 'gt', 'gte', 'lt', 'lte'];
  const activeOperators = supportedOperators.filter((op) => filter[op] !== undefined);

  if (activeOperators.length === 1 && shouldUseJsonPath(path, activeOperators[0])) {
    const operator = activeOperators[0];
    return generateJsonPathCondition(
      Prisma.raw(`${tableAlias}."${fieldName}"`),
      path,
      operator,
      filter[operator],
      isInsensitive,
    );
  }

  // Handle wildcard paths like ['products', '*', 'name']
  if (hasWildcard(path)) {
    const conditions: Prisma.Sql[] = [];

    if (filter.equals !== undefined) {
      conditions.push(
        generateWildcardCondition(fieldRef, path, 'equals', filter.equals, isInsensitive),
      );
    }

    if (filter.gt !== undefined) {
      conditions.push(generateWildcardCondition(fieldRef, path, 'gt', filter.gt, false));
    }

    if (filter.gte !== undefined) {
      conditions.push(generateWildcardCondition(fieldRef, path, 'gte', filter.gte, false));
    }

    if (filter.lt !== undefined) {
      conditions.push(generateWildcardCondition(fieldRef, path, 'lt', filter.lt, false));
    }

    if (filter.lte !== undefined) {
      conditions.push(generateWildcardCondition(fieldRef, path, 'lte', filter.lte, false));
    }

    if (filter.string_contains !== undefined) {
      conditions.push(
        generateWildcardCondition(
          fieldRef,
          path,
          'string_contains',
          filter.string_contains,
          isInsensitive,
        ),
      );
    }

    if (filter.string_starts_with !== undefined) {
      conditions.push(
        generateWildcardCondition(
          fieldRef,
          path,
          'string_starts_with',
          filter.string_starts_with,
          isInsensitive,
        ),
      );
    }

    if (filter.string_ends_with !== undefined) {
      conditions.push(
        generateWildcardCondition(
          fieldRef,
          path,
          'string_ends_with',
          filter.string_ends_with,
          isInsensitive,
        ),
      );
    }

    if (filter.array_contains !== undefined) {
      conditions.push(
        generateWildcardCondition(
          fieldRef,
          path,
          'array_contains',
          filter.array_contains,
          isInsensitive,
        ),
      );
    }

    if (filter.array_starts_with !== undefined) {
      conditions.push(
        generateWildcardCondition(
          fieldRef,
          path,
          'array_starts_with',
          filter.array_starts_with,
          isInsensitive,
        ),
      );
    }

    if (filter.array_ends_with !== undefined) {
      conditions.push(
        generateWildcardCondition(
          fieldRef,
          path,
          'array_ends_with',
          filter.array_ends_with,
          isInsensitive,
        ),
      );
    }

    if (conditions.length === 0) {
      throw new Error(
        `Wildcard path operations require at least one filter: ${JSON.stringify(path)}`,
      );
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return Prisma.sql`(${Prisma.join(conditions, ' AND ')})`;
  }

  // Build JSON path for operations using PostgreSQL array syntax
  const pathArray = Prisma.sql`ARRAY[${Prisma.join(path.map((p: string) => Prisma.sql`${p}`))}]::text[]`;
  const jsonTextPath = Prisma.sql`${fieldRef}#>>${pathArray}`;
  const jsonbPath = Prisma.sql`${fieldRef}#>${pathArray}`;

  const conditions: Prisma.Sql[] = [];

  if (filter.equals !== undefined) {
    conditions.push(processEquals(jsonbPath, jsonTextPath, filter.equals, path, isInsensitive));
  }

  if (filter.string_contains !== undefined) {
    conditions.push(
      processStringContains(jsonTextPath, jsonbPath, filter.string_contains, isInsensitive, path),
    );
  }

  if (filter.string_starts_with !== undefined) {
    conditions.push(
      processStringStartsWith(
        jsonTextPath,
        jsonbPath,
        filter.string_starts_with,
        isInsensitive,
        path,
      ),
    );
  }

  if (filter.string_ends_with !== undefined) {
    conditions.push(
      processStringEndsWith(jsonTextPath, jsonbPath, filter.string_ends_with, isInsensitive, path),
    );
  }

  if (filter.gt !== undefined) {
    conditions.push(processGreaterThan(jsonbPath, filter.gt, path));
  }

  if (filter.gte !== undefined) {
    conditions.push(processGreaterThanOrEqual(jsonbPath, filter.gte, path));
  }

  if (filter.lt !== undefined) {
    conditions.push(processLessThan(jsonbPath, filter.lt, path));
  }

  if (filter.lte !== undefined) {
    conditions.push(processLessThanOrEqual(jsonbPath, filter.lte, path));
  }

  if (filter.in !== undefined) {
    conditions.push(processIn(jsonbPath, jsonTextPath, filter.in, path));
  }

  if (filter.notIn !== undefined) {
    conditions.push(processNotIn(jsonbPath, filter.notIn, path));
  }

  if (filter.not !== undefined) {
    conditions.push(processNot(jsonbPath, jsonTextPath, filter.not, path));
  }

  if (filter.array_contains !== undefined) {
    conditions.push(processArrayContains(jsonbPath, filter.array_contains, isInsensitive, path));
  }

  if (filter.array_starts_with !== undefined) {
    conditions.push(
      processArrayStartsWith(jsonbPath, filter.array_starts_with, isInsensitive, path),
    );
  }

  if (filter.array_ends_with !== undefined) {
    conditions.push(processArrayEndsWith(jsonbPath, filter.array_ends_with, isInsensitive, path));
  }

  if (conditions.length === 0) {
    throw new Error(`Unsupported JsonFilter operation for field: ${fieldName}`);
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.sql`(${Prisma.join(conditions, ' AND ')})`;
}
