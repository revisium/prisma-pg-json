import { Prisma, PrismaSql } from '../prisma-adapter';
import { generateStringFilter } from '../where/string';
import { generateJsonFilter } from '../where/json';
import { SubSchemaWhereInput } from './types';
import { validateSqlIdentifier } from './validation';
import { getColumnRef } from './helpers';

export interface SubSchemaWhereParams {
  where?: SubSchemaWhereInput;
  tableAlias?: string;
}

function isSubSchemaWhereParams(params: unknown): params is SubSchemaWhereParams {
  if (typeof params !== 'object' || params === null) {
    return false;
  }
  const hasWhereParamsKeys = 'where' in params || 'tableAlias' in params;
  const hasWhereInputKeys = 'tableId' in params || 'rowId' in params || 'fieldPath' in params ||
    'data' in params || 'AND' in params || 'OR' in params || 'NOT' in params;
  return hasWhereParamsKeys && !hasWhereInputKeys;
}

export function buildSubSchemaWhere(params?: SubSchemaWhereInput | SubSchemaWhereParams): PrismaSql {
  if (!params) {
    return Prisma.empty;
  }

  const isWhereParams = isSubSchemaWhereParams(params);
  const where = isWhereParams ? params.where : params as SubSchemaWhereInput;
  const tableAlias = isWhereParams ? params.tableAlias : undefined;

  if (tableAlias) {
    validateSqlIdentifier(tableAlias, 'tableAlias');
  }

  if (!where) {
    return Prisma.empty;
  }

  const conditions = buildWhereConditions(where, tableAlias);
  if (conditions.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

export function buildWhereClause(where: SubSchemaWhereInput): PrismaSql {
  const conditions = buildWhereConditions(where);
  if (conditions.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function buildWhereConditions(where: SubSchemaWhereInput, tableAlias?: string): PrismaSql[] {
  const conditions: PrismaSql[] = [];

  if (where.tableId !== undefined) {
    const filter = typeof where.tableId === 'string'
      ? { equals: where.tableId }
      : where.tableId;
    conditions.push(generateStringFilter(getColumnRef('tableId', tableAlias), filter));
  }

  if (where.rowId !== undefined) {
    const filter = typeof where.rowId === 'string'
      ? { equals: where.rowId }
      : where.rowId;
    conditions.push(generateStringFilter(getColumnRef('rowId', tableAlias), filter));
  }

  if (where.fieldPath !== undefined) {
    const filter = typeof where.fieldPath === 'string'
      ? { equals: where.fieldPath }
      : where.fieldPath;
    conditions.push(generateStringFilter(getColumnRef('fieldPath', tableAlias), filter));
  }

  if (where.data !== undefined) {
    conditions.push(generateJsonFilter(getColumnRef('data', tableAlias), where.data, 'data', ''));
  }

  if (where.AND !== undefined && where.AND.length > 0) {
    const andConditions = where.AND.flatMap(w => buildWhereConditions(w, tableAlias));
    if (andConditions.length > 0) {
      conditions.push(Prisma.sql`(${Prisma.join(andConditions, ' AND ')})`);
    }
  }

  if (where.OR !== undefined && where.OR.length > 0) {
    const orConditions = where.OR.flatMap(w => {
      const conds = buildWhereConditions(w, tableAlias);
      if (conds.length === 0) {
        return [];
      }
      if (conds.length === 1) {
        return [conds[0]];
      }
      return [Prisma.sql`(${Prisma.join(conds, ' AND ')})`];
    });
    if (orConditions.length > 0) {
      conditions.push(Prisma.sql`(${Prisma.join(orConditions, ' OR ')})`);
    }
  }

  if (where.NOT !== undefined) {
    const notConditions = buildWhereConditions(where.NOT, tableAlias);
    if (notConditions.length > 0) {
      conditions.push(Prisma.sql`NOT (${Prisma.join(notConditions, ' AND ')})`);
    }
  }

  return conditions;
}
