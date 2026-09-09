import { Prisma, PrismaSql } from '../../prisma-adapter';
import type { SubSchemaOrderByItem } from '../../sub-schema/types';
import {
  describeSubSchemaOrderItem,
  isSubSchemaOrderByParams,
  SubSchemaOrderByParamsShape,
} from '../../sub-schema/order-description';
import type { SubSchemaOrderDescription } from '../../sub-schema/order-description';
import { validateSqlIdentifier } from '../../sub-schema/validation';
import { getColumnRef } from './helpers';

export function compileSubSchemaOrderBy(
  params?: SubSchemaOrderByItem[] | SubSchemaOrderByParamsShape,
): PrismaSql {
  if (!params) {
    return Prisma.empty;
  }

  if (isSubSchemaOrderByParams(params)) {
    const { orderBy, tableAlias, rowTableAlias } = params;
    if (tableAlias) validateSqlIdentifier(tableAlias, 'tableAlias');
    if (rowTableAlias) validateSqlIdentifier(rowTableAlias, 'rowTableAlias');
    if (!orderBy || orderBy.length === 0) return Prisma.empty;
    return compileSubSchemaOrderByClause(orderBy, tableAlias, rowTableAlias);
  }

  if (params.length === 0) return Prisma.empty;
  return compileSubSchemaOrderByClause(params);
}

export function compileSubSchemaOrderByClause(
  orderBy: SubSchemaOrderByItem[],
  tableAlias?: string,
  rowTableAlias?: string,
): PrismaSql {
  const orderParts = orderBy.flatMap((item) => {
    const parts: PrismaSql[] = [];
    for (const description of describeSubSchemaOrderItem(item)) {
      parts.push(...buildOrderByDescription(description, tableAlias, rowTableAlias));
    }
    return parts;
  });

  if (orderParts.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`ORDER BY ${Prisma.join(orderParts, ', ')}`;
}

function buildOrderByDescription(
  description: SubSchemaOrderDescription,
  tableAlias?: string,
  rowTableAlias?: string,
): PrismaSql[] {
  if (description.kind === 'direction') {
    const columnAlias = description.column === 'createdAt' ? rowTableAlias : tableAlias;
    return [
      Prisma.sql`${getColumnRef(description.column, columnAlias)} ${directionSql(description.readDirection())}`,
    ];
  }

  const jsonPath = buildDataOrderByPath(description.readData()!.path, tableAlias);
  const nulls = description.readData()!.nulls === 'first'
    ? Prisma.sql`NULLS FIRST`
    : Prisma.sql`NULLS LAST`;
  return [Prisma.sql`${jsonPath} ${directionSql(description.readData()!.order)} ${nulls}`];
}

function directionSql(dir: 'asc' | 'desc' | undefined): PrismaSql {
  return dir === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
}

function buildDataOrderByPath(path: string | string[], tableAlias?: string): PrismaSql {
  const segments = Array.isArray(path) ? path : path.split('.');
  const dataRef = getColumnRef('data', tableAlias);

  if (segments.length === 1) {
    return Prisma.sql`${dataRef}->>${segments[0]}`;
  }

  let result = dataRef;
  for (let i = 0; i < segments.length - 1; i++) {
    result = Prisma.sql`${result}->${segments[i]}`;
  }
  return Prisma.sql`${result}->>${segments.at(-1)}`;
}
