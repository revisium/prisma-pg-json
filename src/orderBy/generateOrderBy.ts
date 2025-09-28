import { Prisma } from '@prisma/client';
import { OrderByConditions, JsonOrderByInput, FieldType } from '../types';
import { parseJsonPath } from './parseJsonPath';

export function generateOrderByClauses(
  tableAlias: string,
  orderBy: OrderByConditions | OrderByConditions[] | undefined,
  fieldConfig: Record<string, FieldType>,
): Prisma.Sql | null {
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

export function generateOrderBy(
  tableAlias: string,
  orderBy: OrderByConditions | OrderByConditions[] | undefined,
  fieldConfig: Record<string, FieldType>,
): Prisma.Sql | null {
  const clauses = generateOrderByClauses(tableAlias, orderBy, fieldConfig);

  if (!clauses) {
    return null;
  }

  return Prisma.sql`ORDER BY ${clauses}`;
}

function processJsonField(fieldRef: Prisma.Sql, jsonOrder: JsonOrderByInput): Prisma.Sql {
  const path = parseJsonPath(jsonOrder.path);
  const direction = (jsonOrder.direction || 'asc').toUpperCase();
  const aggregation = jsonOrder.aggregation;

  const validTypes = ['text', 'int', 'float', 'boolean', 'timestamp'];
  const type = validTypes.includes(jsonOrder.type || '') ? jsonOrder.type || 'text' : 'text';

  if (aggregation) {
    return processAggregation(fieldRef, path, type, direction, aggregation);
  }

  if (aggregation === 'last' && !path.includes('-1')) {
    path.push('-1');
  }

  const jsonPath = Prisma.sql`${fieldRef}#>>'{${Prisma.raw(path.join(','))}}'`;

  const typedPath = Prisma.sql`(${jsonPath})::${Prisma.raw(type)}`;

  return Prisma.sql`${typedPath} ${Prisma.raw(direction)}`;
}

function processAggregation(
  fieldRef: Prisma.Sql,
  path: string[],
  type: string,
  direction: string,
  aggregation: string,
): Prisma.Sql {
  const hasWildcard = path.some((segment) => segment === '*');

  if (hasWildcard) {
    if (aggregation === 'first' || aggregation === 'last') {
      const newPath = path.map((segment) =>
        segment === '*' ? (aggregation === 'first' ? '0' : '-1') : segment,
      );

      const jsonPath = Prisma.sql`${fieldRef}#>>'{${Prisma.raw(newPath.join(','))}}'`;
      const typedPath = Prisma.sql`(${jsonPath})::${Prisma.raw(type)}`;
      return Prisma.sql`${typedPath} ${Prisma.raw(direction)}`;
    }

    const basePathIndex = path.findIndex((segment) => segment === '*');
    const basePath = path.slice(0, basePathIndex);
    const subPath = path.slice(basePathIndex + 1);

    const aggregationFunc = aggregation.toUpperCase();
    const basePathSql = `{${basePath.join(',')}}`;

    const elemAccess = subPath.length > 0
      ? Prisma.sql`elem#>>'{${Prisma.raw(subPath.join(','))}}'`
      : Prisma.sql`elem`;

    return Prisma.sql`(
      SELECT ${Prisma.raw(aggregationFunc)}((${elemAccess})::${Prisma.raw(type)})
      FROM jsonb_array_elements((${fieldRef}#>'${Prisma.raw(basePathSql)}')::jsonb) AS elem
    ) ${Prisma.raw(direction)}`;
  }

  if (aggregation === 'last') {
    path.push('-1');
  } else if (aggregation === 'first') {
    path.push('0');
  }

  const jsonPath = Prisma.sql`${fieldRef}#>>'{${Prisma.raw(path.join(','))}}'`;

  const typedPath = Prisma.sql`(${jsonPath})::${Prisma.raw(type)}`;
  return Prisma.sql`${typedPath} ${Prisma.raw(direction)}`;
}
