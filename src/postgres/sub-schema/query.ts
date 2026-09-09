import { Prisma, PrismaSql } from '../../prisma-adapter';
import type { SubSchemaQueryParams } from '../../sub-schema/types';
import { validatePagination } from '../../sub-schema/validation';
import { validateQueryInput } from '../../utils/query-validation';
import { compileSubSchemaCteQueries } from './cte';
import { getEmptyCteSelect } from './helpers';
import { compileSubSchemaOrderByClause } from './order-by';
import { compileSubSchemaWhereClause } from './where';

export function compileSubSchemaQuery(params: SubSchemaQueryParams): PrismaSql {
  const { tables, where, orderBy, take, skip } = params;

  validatePagination(take, skip);

  if (tables.length === 0) {
    return getEmptyCteSelect();
  }

  const cteQueries = compileSubSchemaCteQueries(tables);
  const cte = Prisma.sql`WITH sub_schema_items AS (${cteQueries})`;

  const whereClause = where ? compileValidatedWhere(where) : Prisma.empty;
  const orderByClause = orderBy ? compileSubSchemaOrderByClause(orderBy) : Prisma.empty;
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

export function compileSubSchemaCountQuery(
  params: Omit<SubSchemaQueryParams, 'take' | 'skip' | 'orderBy'>,
): PrismaSql {
  const { tables, where } = params;

  if (tables.length === 0) {
    return Prisma.sql`SELECT 0::bigint as count`;
  }

  const cteQueries = compileSubSchemaCteQueries(tables);
  const cte = Prisma.sql`WITH sub_schema_items AS (${cteQueries})`;

  const whereClause = where ? compileValidatedWhere(where) : Prisma.empty;

  return Prisma.sql`
    ${cte}
    SELECT COUNT(*)::bigint as count
    FROM sub_schema_items
    ${whereClause}
  `;
}

function compileValidatedWhere(
  where: NonNullable<SubSchemaQueryParams['where']>,
): PrismaSql {
  validateQueryInput(where);
  return compileSubSchemaWhereClause(where);
}
