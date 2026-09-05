import { Prisma, PrismaSql } from '../prisma-adapter';
import { JsonOrderByInput, GenerateOrderByParams, FieldConfig, OrderByPart } from '../types';
import { convertToJsonPath, jsonPathToTextSegments } from '../postgres/json-path';
import { validateQueryInput } from '../utils/query-validation';
import { quoteIdentifier, resolveFieldType } from '../utils/sql-identifiers';
import { validateSqlIdentifier } from '../sub-schema/validation';

/**
 * Parse ORDER BY configuration into structured parts.
 *
 * Returns an array of `OrderByPart` objects containing the SQL expression,
 * direction, and metadata for each sort column. Used by keyset pagination
 * to build cursor conditions.
 *
 * @param params - Order by configuration with field types and table alias
 * @returns Array of OrderByPart objects (empty array if no valid sort columns)
 */
export function generateOrderByParts<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): OrderByPart[] {
  const { tableAlias, orderBy, fieldConfig } = params;
  validateQueryInput(orderBy);
  validateSqlIdentifier(tableAlias, 'tableAlias');
  if (!orderBy) {
    return [];
  }
  const orderArray = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: OrderByPart[] = [];

  for (const orderCondition of orderArray) {
    if (!orderCondition || Object.keys(orderCondition).length === 0) {
      continue;
    }

    for (const [fieldName, orderValue] of Object.entries(orderCondition)) {
      const part = processFieldOrderBy(tableAlias, fieldName, orderValue, fieldConfig);
      if (part) {
        parts.push(part);
      }
    }
  }

  return parts;
}

function processFieldOrderBy(
  tableAlias: string,
  fieldName: string,
  orderValue: unknown,
  fieldConfig: FieldConfig,
): OrderByPart | null {
  const fieldType = resolveFieldType(fieldName, fieldConfig);
  if (typeof orderValue === 'string') {
    return processStringOrder(tableAlias, fieldName, orderValue);
  }
  if (typeof orderValue === 'object' && orderValue && fieldType === 'json') {
    return processJsonOrder(tableAlias, fieldName, orderValue as JsonOrderByInput);
  }
  return null;
}

function processStringOrder(
  tableAlias: string,
  fieldName: string,
  orderValue: string,
): OrderByPart | null {
  if (orderValue !== 'asc' && orderValue !== 'desc') {
    return null;
  }
  const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}.${quoteIdentifier(fieldName)}`;
  const direction = orderValue.toUpperCase() as 'ASC' | 'DESC';
  return { expression: fieldRef, direction, fieldName, isJson: false };
}

function processJsonOrder(
  tableAlias: string,
  fieldName: string,
  jsonOrder: JsonOrderByInput,
): OrderByPart | null {
  const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}.${quoteIdentifier(fieldName)}`;
  const result = processJsonFieldParts(fieldRef, jsonOrder);
  if (!result) {
    return null;
  }
  return {
    expression: result.expression,
    direction: result.direction,
    fieldName,
    isJson: true,
    jsonConfig: jsonOrder,
  };
}

/**
 * Generate ORDER BY clauses without the `ORDER BY` prefix.
 *
 * Returns the comma-separated sort expressions (e.g., `u."name" ASC, u."age" DESC`).
 * Useful when composing ORDER BY with additional tiebreaker columns.
 *
 * @param params - Order by configuration with field types and table alias
 * @returns Parameterized SQL clauses, or null if no valid sort columns
 */
export function generateOrderByClauses<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): PrismaSql | null {
  const parts = generateOrderByParts(params);

  if (parts.length === 0) {
    return null;
  }

  const orderClauses = parts.map(
    (part) => Prisma.sql`${part.expression} ${Prisma.raw(part.direction)}`,
  );

  return Prisma.join(orderClauses, ', ');
}

/**
 * Generate a complete `ORDER BY ...` clause.
 *
 * Supports scalar columns (`'asc'` / `'desc'`) and JSON fields with
 * path, type casting, and aggregation (min, max, avg, first, last).
 *
 * @param params - Order by configuration with field types and table alias
 * @returns Parameterized SQL with `ORDER BY` prefix, or null if no valid sort columns
 */
export function generateOrderBy<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): PrismaSql | null {
  const clauses = generateOrderByClauses<TConfig>(params);

  if (!clauses) {
    return null;
  }

  return Prisma.sql`ORDER BY ${clauses}`;
}

const VALID_DIRECTIONS = new Set(['asc', 'desc']);
const VALID_TYPES = new Set(['text', 'int', 'float', 'boolean', 'timestamp']);
const VALID_AGGREGATIONS = new Set(['first', 'last', 'min', 'max', 'avg']);

function processJsonFieldParts(
  fieldRef: PrismaSql,
  jsonOrder: JsonOrderByInput,
): { expression: PrismaSql; direction: 'ASC' | 'DESC' } | null {
  const jsonPath = convertToJsonPath(jsonOrder.path);
  const rawDirection = (jsonOrder.direction || 'asc').toLowerCase();
  if (!VALID_DIRECTIONS.has(rawDirection)) {
    return null;
  }
  const direction = rawDirection.toUpperCase() as 'ASC' | 'DESC';
  const aggregation = jsonOrder.aggregation;

  const type = VALID_TYPES.has(jsonOrder.type || '') ? jsonOrder.type || 'text' : 'text';

  if (aggregation) {
    if (!VALID_AGGREGATIONS.has(aggregation)) {
      return null;
    }
    return {
      expression: buildAggregationExpression(fieldRef, jsonPath, type, aggregation),
      direction,
    };
  }

  const pathSegments = jsonPathToTextSegments(jsonPath);
  const jsonPathExpression = Prisma.sql`${fieldRef}#>>${pathSegments}::text[]`;
  const typedExpression = Prisma.sql`(${jsonPathExpression})::${Prisma.raw(type)}`;

  return { expression: typedExpression, direction };
}

function buildAggregationExpression(
  fieldRef: PrismaSql,
  jsonPath: string,
  type: string,
  aggregation: string,
): PrismaSql {
  const hasWildcard = jsonPath.includes('[*]');

  if (hasWildcard) {
    if (aggregation === 'first' || aggregation === 'last') {
      const modifiedPath = jsonPath.replace('[*]', aggregation === 'first' ? '[0]' : '[last]');
      return castJsonEndpoint(fieldRef, modifiedPath, type);
    }

    const [beforeWildcard, afterWildcard = ''] = jsonPath.split('[*]');
    const pathSegments = jsonPathToTextSegments(beforeWildcard);
    const subPathSegments = jsonPathToTextSegments(afterWildcard);
    const aggregationFunc = aggregation.toUpperCase();
    const elemAccess = subPathSegments.length
      ? Prisma.sql`elem#>>${subPathSegments}::text[]`
      : Prisma.sql`elem#>>'{}'`;

    return Prisma.sql`(
      SELECT ${Prisma.raw(aggregationFunc)}((${elemAccess})::${Prisma.raw(type)})
      FROM jsonb_array_elements((${fieldRef}#>${pathSegments}::text[])::jsonb) AS elem
    )`;
  }

  if (aggregation === 'last') {
    const suffix = '[last]';
    const modifiedPath = jsonPath.endsWith('$')
      ? jsonPath.replace(/\$$/, suffix)
      : jsonPath + suffix;
    return castJsonEndpoint(fieldRef, modifiedPath, type);
  } else if (aggregation === 'first') {
    const suffix = '[0]';
    const modifiedPath = jsonPath.endsWith('$')
      ? jsonPath.replace(/\$$/, suffix)
      : jsonPath + suffix;
    return castJsonEndpoint(fieldRef, modifiedPath, type);
  }

  const pathSegments = jsonPathToTextSegments(jsonPath);

  const aggregationFunc = aggregation.toUpperCase();

  return Prisma.sql`(
    SELECT ${Prisma.raw(aggregationFunc)}((elem#>>'{}')::${Prisma.raw(type)})
    FROM jsonb_array_elements((${fieldRef}#>${pathSegments}::text[])::jsonb) AS elem
  )`;
}

function castJsonEndpoint(fieldRef: PrismaSql, jsonPath: string, type: string): PrismaSql {
  const value = Prisma.sql`jsonb_path_query_first(${fieldRef}, ${jsonPath}::jsonpath)`;
  if (type === 'int') {
    // Retain JSON number rounding while also accepting integer strings.
    return Prisma.sql`CASE WHEN jsonb_typeof(${value}) = 'number'
      THEN (${value})::int ELSE (${value}#>>'{}')::int END`;
  }
  return Prisma.sql`(${value}#>>'{}')::${Prisma.raw(type)}`;
}
