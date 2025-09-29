import { Prisma } from '@prisma/client';
import { JsonOrderByInput, GenerateOrderByParams, FieldConfig } from '../types';
import { convertToJsonPath } from '../utils/parseJsonPath';

export function generateOrderByClauses<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): Prisma.Sql | null {
  const { tableAlias, orderBy, fieldConfig } = params;
  if (!orderBy) {
    return null;
  }

  const orderArray = Array.isArray(orderBy) ? orderBy : [orderBy];
  const orderClauses: Prisma.Sql[] = [];

  for (const orderCondition of orderArray) {
    if (!orderCondition || Object.keys(orderCondition).length === 0) {
      continue;
    }

    for (const [fieldName, orderValue] of Object.entries(orderCondition)) {
      if (typeof orderValue === 'string') {
        if (orderValue === 'asc' || orderValue === 'desc') {
          const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(fieldName)}"`;
          const direction = orderValue.toUpperCase();
          orderClauses.push(Prisma.sql`${fieldRef} ${Prisma.raw(direction)}`);
        }
      } else if (typeof orderValue === 'object' && orderValue) {
        const fieldType = fieldConfig[fieldName];
        if (fieldType === 'json') {
          const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(fieldName)}"`;
          orderClauses.push(processJsonField(fieldRef, orderValue as JsonOrderByInput));
        }
      }
    }
  }

  if (orderClauses.length === 0) {
    return null;
  }

  return Prisma.join(orderClauses, ', ');
}

export function generateOrderBy<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): Prisma.Sql | null {
  const clauses = generateOrderByClauses<TConfig>(params);

  if (!clauses) {
    return null;
  }

  return Prisma.sql`ORDER BY ${clauses}`;
}

function processJsonField(fieldRef: Prisma.Sql, jsonOrder: JsonOrderByInput): Prisma.Sql {
  const jsonPath = convertToJsonPath(jsonOrder.path);
  const direction = (jsonOrder.direction || 'asc').toUpperCase();
  const aggregation = jsonOrder.aggregation;

  const validTypes = ['text', 'int', 'float', 'boolean', 'timestamp'];
  const type = validTypes.includes(jsonOrder.type || '') ? jsonOrder.type || 'text' : 'text';

  if (aggregation) {
    return processAggregation(fieldRef, jsonPath, type, direction, aggregation);
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

  return Prisma.sql`${typedExpression} ${Prisma.raw(direction)}`;
}

function processAggregation(
  fieldRef: Prisma.Sql,
  jsonPath: string,
  type: string,
  direction: string,
  aggregation: string,
): Prisma.Sql {
  const hasWildcard = jsonPath.includes('[*]');

  if (hasWildcard) {
    if (aggregation === 'first' || aggregation === 'last') {
      // Replace [*] with [0] or [last] for first/last
      const modifiedPath = jsonPath.replace('[*]', aggregation === 'first' ? '[0]' : '[last]');
      const typedExpression = Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
      return Prisma.sql`${typedExpression} ${Prisma.raw(direction)}`;
    }

    const parts = jsonPath.split('[*]');
    const beforeWildcard = parts[0].replace('$.', '');
    const afterWildcard = parts[1] || '';

    const pathSegments = beforeWildcard.split('.').filter((s) => s.length > 0);
    const aggregationFunc = aggregation.toUpperCase();
    const basePathSql = `{${pathSegments.join(',')}}`;

    let elemAccess: Prisma.Sql;
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
    ) ${Prisma.raw(direction)}`;
  }

  if (aggregation === 'last') {
    const modifiedPath = jsonPath.replace(/\$$/, '[last]');
    const typedExpression = Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
    return Prisma.sql`${typedExpression} ${Prisma.raw(direction)}`;
  } else if (aggregation === 'first') {
    const modifiedPath = jsonPath.replace(/\$$/, '[0]');
    const typedExpression = Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${modifiedPath}::jsonpath))::${Prisma.raw(type)}`;
    return Prisma.sql`${typedExpression} ${Prisma.raw(direction)}`;
  }

  let aggregateFunction: string;
  switch (aggregation) {
    case 'min':
      aggregateFunction = 'min()';
      break;
    case 'max':
      aggregateFunction = 'max()';
      break;
    case 'avg':
      aggregateFunction = 'avg()';
      break;
    default:
      throw new Error(`Unsupported aggregation: ${aggregation}`);
  }

  const arrayPath = `${jsonPath}.${aggregateFunction}`;
  const typedExpression = Prisma.sql`(jsonb_path_query_first(${fieldRef}, ${arrayPath}::jsonpath))::${Prisma.raw(type)}`;
  return Prisma.sql`${typedExpression} ${Prisma.raw(direction)}`;
}
