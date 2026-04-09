import { Prisma, PrismaSql } from '../prisma-adapter';
import { SubSchemaQueryParams } from './types';
import { validatePagination } from './validation';
import { getEmptyCteSelect } from './helpers';
import { buildCteQueries } from './cte';
import { buildWhereClause } from './where';
import { buildOrderByClause } from './order-by';

export function buildSubSchemaQuery(params: SubSchemaQueryParams): PrismaSql {
  const { tables, where, orderBy, take, skip } = params;

  validatePagination(take, skip);

  if (tables.length === 0) {
    return getEmptyCteSelect();
  }

  const cteQueries = buildCteQueries(tables);
  const cte = Prisma.sql`WITH sub_schema_items AS (${cteQueries})`;

  const whereClause = where ? buildWhereClause(where) : Prisma.empty;
  const orderByClause = orderBy ? buildOrderByClause(orderBy) : Prisma.empty;
  const paginationClause = Prisma.sql`LIMIT ${take} OFFSET ${skip}`;

  return Prisma.sql`
    ${cte}
    SELECT "tableId", "tableVersionId", "rowId", "rowVersionId", "fieldPath", "data"
    FROM sub_schema_items
    ${whereClause}
    ${orderByClause}
    ${paginationClause}
  `;
}

export function buildSubSchemaCountQuery(params: Omit<SubSchemaQueryParams, 'take' | 'skip' | 'orderBy'>): PrismaSql {
  const { tables, where } = params;

  if (tables.length === 0) {
    return Prisma.sql`SELECT 0::bigint as count`;
  }

  const cteQueries = buildCteQueries(tables);
  const cte = Prisma.sql`WITH sub_schema_items AS (${cteQueries})`;

  const whereClause = where ? buildWhereClause(where) : Prisma.empty;

  return Prisma.sql`
    ${cte}
    SELECT COUNT(*)::bigint as count
    FROM sub_schema_items
    ${whereClause}
  `;
}
