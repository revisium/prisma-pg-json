import { Prisma, PrismaSql } from '../prisma-adapter';
import { JsonOrderByInput, GenerateOrderByParams, FieldConfig, OrderByPart } from '../types';
import { convertToJsonPath } from '../utils/parseJsonPath';

export function generateOrderByParts<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): OrderByPart[] {
  const { tableAlias, orderBy, fieldConfig } = params;
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
  if (typeof orderValue === 'string') {
    return processStringOrder(tableAlias, fieldName, orderValue);
  }
  if (typeof orderValue === 'object' && orderValue && fieldConfig[fieldName] === 'json') {
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
  const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(fieldName)}"`;
  const direction = orderValue.toUpperCase() as 'ASC' | 'DESC';
  return { expression: fieldRef, direction, fieldName, isJson: false };
}

function processJsonOrder(
  tableAlias: string,
  fieldName: string,
  jsonOrder: JsonOrderByInput,
): OrderByPart | null {
  const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(fieldName)}"`;
  const result = processJsonFieldParts(fieldRef, jsonOrder);
  if (!result) {
    return null;
  }
  return { expression: result.expression, direction: result.direction, fieldName, isJson: true, jsonConfig: jsonOrder };
}

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

  const pathSegments = jsonPath
    .replace('$.', '')
    .split(/[.[\]]/)
    .filter((s) => s.length > 0)
    .map((segment) => {
      if (/^-?\d+$/.test(segment)) {
        return segment;
      }
      return segment;
    });
  const jsonPathExpression = Prisma.sql`${fieldRef}#>>'{${Prisma.raw(pathSegments.join(','))}}'`;
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
      return Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
    }

    const parts = jsonPath.split('[*]');
    const beforeWildcard = parts[0].replace('$.', '');
    const afterWildcard = parts[1] || '';

    const pathSegments = beforeWildcard.split('.').filter((s) => s.length > 0);
    const aggregationFunc = aggregation.toUpperCase();
    const basePathSql = `{${pathSegments.join(',')}}`;

    let elemAccess: PrismaSql;
    if (afterWildcard.startsWith('.')) {
      const subPathSegments = afterWildcard
        .substring(1)
        .split('.')
        .filter((s) => s.length > 0);
      elemAccess = Prisma.sql`elem#>>'{${Prisma.raw(subPathSegments.join(','))}}'`;
    } else {
      elemAccess = Prisma.sql`elem#>>'{}'`;
    }

    return Prisma.sql`(
      SELECT ${Prisma.raw(aggregationFunc)}((${elemAccess})::${Prisma.raw(type)})
      FROM jsonb_array_elements((${fieldRef}#>'${Prisma.raw(basePathSql)}')::jsonb) AS elem
    )`;
  }

  if (aggregation === 'last') {
    const suffix = '[last]';
    const modifiedPath = jsonPath.endsWith('$') ? jsonPath.replace(/\$$/, suffix) : jsonPath + suffix;
    return Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
  } else if (aggregation === 'first') {
    const suffix = '[0]';
    const modifiedPath = jsonPath.endsWith('$') ? jsonPath.replace(/\$$/, suffix) : jsonPath + suffix;
    return Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
  }

  const pathSegments = jsonPath
    .replace('$.', '')
    .split(/[.[\]]/)
    .filter((s) => s.length > 0);

  const basePathSql = `{${pathSegments.join(',')}}`;
  const aggregationFunc = aggregation.toUpperCase();

  return Prisma.sql`(
    SELECT ${Prisma.raw(aggregationFunc)}((elem#>>'{}')::${Prisma.raw(type)})
    FROM jsonb_array_elements((${fieldRef}#>'${Prisma.raw(basePathSql)}')::jsonb) AS elem
  )`;
}
