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
      if (typeof orderValue === 'string') {
        if (orderValue === 'asc' || orderValue === 'desc') {
          const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(fieldName)}"`;
          const direction = orderValue.toUpperCase() as 'ASC' | 'DESC';
          parts.push({
            expression: fieldRef,
            direction,
            fieldName,
            isJson: false,
          });
        }
      } else if (typeof orderValue === 'object' && orderValue) {
        const fieldType = fieldConfig[fieldName];
        if (fieldType === 'json') {
          const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(fieldName)}"`;
          const jsonOrder = orderValue as JsonOrderByInput;
          const { expression, direction } = processJsonFieldParts(fieldRef, jsonOrder);
          parts.push({
            expression,
            direction,
            fieldName,
            isJson: true,
            jsonConfig: jsonOrder,
          });
        }
      }
    }
  }

  return parts;
}

export function generateOrderByClauses<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): PrismaSql | null {
  const parts = generateOrderByParts(params);

  if (parts.length === 0) {
    return null;
  }

  const orderClauses = parts.map(
    (part) => Prisma.sql`${part.expression as PrismaSql} ${Prisma.raw(part.direction)}`,
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

function processJsonFieldParts(
  fieldRef: PrismaSql,
  jsonOrder: JsonOrderByInput,
): { expression: PrismaSql; direction: 'ASC' | 'DESC' } {
  const jsonPath = convertToJsonPath(jsonOrder.path);
  const direction = (jsonOrder.direction || 'asc').toUpperCase() as 'ASC' | 'DESC';
  const aggregation = jsonOrder.aggregation;

  const validTypes = ['text', 'int', 'float', 'boolean', 'timestamp'];
  const type = validTypes.includes(jsonOrder.type || '') ? jsonOrder.type || 'text' : 'text';

  if (aggregation) {
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
      elemAccess = Prisma.sql`elem`;
    }

    return Prisma.sql`(
      SELECT ${Prisma.raw(aggregationFunc)}((${elemAccess})::${Prisma.raw(type)})
      FROM jsonb_array_elements((${fieldRef}#>'${Prisma.raw(basePathSql)}')::jsonb) AS elem
    )`;
  }

  if (aggregation === 'last') {
    const modifiedPath = jsonPath.replace(/\$$/, '[last]');
    return Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
  } else if (aggregation === 'first') {
    const modifiedPath = jsonPath.replace(/\$$/, '[0]');
    return Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
  }

  const pathSegments = jsonPath
    .replace('$.', '')
    .split(/[.[\]]/)
    .filter((s) => s.length > 0);

  const basePathSql = `{${pathSegments.join(',')}}`;
  const aggregationFunc = aggregation.toUpperCase();

  return Prisma.sql`(
    SELECT ${Prisma.raw(aggregationFunc)}((elem)::${Prisma.raw(type)})
    FROM jsonb_array_elements((${fieldRef}#>'${Prisma.raw(basePathSql)}')::jsonb) AS elem
  )`;
}
