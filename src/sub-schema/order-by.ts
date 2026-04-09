import { Prisma, PrismaSql } from '../prisma-adapter';
import { SubSchemaOrderByItem } from './types';
import { validateSqlIdentifier } from './validation';
import { getColumnRef } from './helpers';

export interface SubSchemaOrderByParams {
  orderBy?: SubSchemaOrderByItem[];
  tableAlias?: string;
  rowTableAlias?: string;
}

function isSubSchemaOrderByParams(params: unknown): params is SubSchemaOrderByParams {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return false;
  }
  return 'orderBy' in params || 'tableAlias' in params || 'rowTableAlias' in params;
}

export function buildSubSchemaOrderBy(params?: SubSchemaOrderByItem[] | SubSchemaOrderByParams): PrismaSql {
  if (!params) {
    return Prisma.empty;
  }

  if (isSubSchemaOrderByParams(params)) {
    const { orderBy, tableAlias, rowTableAlias } = params;
    if (tableAlias) validateSqlIdentifier(tableAlias, 'tableAlias');
    if (rowTableAlias) validateSqlIdentifier(rowTableAlias, 'rowTableAlias');
    if (!orderBy || orderBy.length === 0) return Prisma.empty;
    return buildOrderByClause(orderBy, tableAlias, rowTableAlias);
  }

  if (params.length === 0) return Prisma.empty;
  return buildOrderByClause(params);
}

export function buildOrderByClause(orderBy: SubSchemaOrderByItem[], tableAlias?: string, rowTableAlias?: string): PrismaSql {
  const orderParts = orderBy.flatMap((item) =>
    buildOrderByItemParts(item, tableAlias, rowTableAlias),
  );

  if (orderParts.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`ORDER BY ${Prisma.join(orderParts, ', ')}`;
}

function directionSql(dir: 'asc' | 'desc'): PrismaSql {
  return dir === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
}

function buildOrderByItemParts(item: SubSchemaOrderByItem, tableAlias?: string, rowTableAlias?: string): PrismaSql[] {
  const parts: PrismaSql[] = [];

  if (item.tableId) {
    parts.push(Prisma.sql`${getColumnRef('tableId', tableAlias)} ${directionSql(item.tableId)}`);
  }
  if (item.rowId) {
    parts.push(Prisma.sql`${getColumnRef('rowId', tableAlias)} ${directionSql(item.rowId)}`);
  }
  if (item.rowCreatedAt) {
    parts.push(Prisma.sql`${getColumnRef('createdAt', rowTableAlias)} ${directionSql(item.rowCreatedAt)}`);
  }
  if (item.fieldPath) {
    parts.push(Prisma.sql`${getColumnRef('fieldPath', tableAlias)} ${directionSql(item.fieldPath)}`);
  }
  if (item.data) {
    const jsonPath = buildDataOrderByPath(item.data.path, tableAlias);
    const nulls = item.data.nulls === 'first' ? Prisma.sql`NULLS FIRST` : Prisma.sql`NULLS LAST`;
    parts.push(Prisma.sql`${jsonPath} ${directionSql(item.data.order)} ${nulls}`);
  }

  return parts;
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
