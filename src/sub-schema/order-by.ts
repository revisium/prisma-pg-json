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
  return 'orderBy' in params || 'tableAlias' in params;
}

export function buildSubSchemaOrderBy(params?: SubSchemaOrderByItem[] | SubSchemaOrderByParams): PrismaSql {
  if (!params) {
    return Prisma.empty;
  }

  const isOrderByParams = isSubSchemaOrderByParams(params);
  const orderBy = isOrderByParams ? params.orderBy : params as SubSchemaOrderByItem[];
  const tableAlias = isOrderByParams ? params.tableAlias : undefined;
  const rowTableAlias = isOrderByParams ? params.rowTableAlias : undefined;

  if (tableAlias) {
    validateSqlIdentifier(tableAlias, 'tableAlias');
  }

  if (rowTableAlias) {
    validateSqlIdentifier(rowTableAlias, 'rowTableAlias');
  }

  if (!orderBy || orderBy.length === 0) {
    return Prisma.empty;
  }

  return buildOrderByClause(orderBy, tableAlias, rowTableAlias);
}

export function buildOrderByClause(orderBy: SubSchemaOrderByItem[], tableAlias?: string, rowTableAlias?: string): PrismaSql {
  const orderParts: PrismaSql[] = [];

  for (const item of orderBy) {
    if (item.tableId) {
      const direction = item.tableId === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`${getColumnRef('tableId', tableAlias)} ${direction}`);
    }

    if (item.rowId) {
      const direction = item.rowId === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`${getColumnRef('rowId', tableAlias)} ${direction}`);
    }

    if (item.rowCreatedAt) {
      const direction = item.rowCreatedAt === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`${getColumnRef('createdAt', rowTableAlias)} ${direction}`);
    }

    if (item.fieldPath) {
      const direction = item.fieldPath === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`${getColumnRef('fieldPath', tableAlias)} ${direction}`);
    }

    if (item.data) {
      const jsonPath = buildDataOrderByPath(item.data.path, tableAlias);
      const direction = item.data.order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      const nulls = item.data.nulls === 'first' ? Prisma.sql`NULLS FIRST` : Prisma.sql`NULLS LAST`;
      orderParts.push(Prisma.sql`${jsonPath} ${direction} ${nulls}`);
    }
  }

  if (orderParts.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`ORDER BY ${Prisma.join(orderParts, ', ')}`;
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
  return Prisma.sql`${result}->>${segments[segments.length - 1]}`;
}
