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

  if (isSubSchemaWhereParams(params)) {
    const { where, tableAlias } = params;
    if (tableAlias) validateSqlIdentifier(tableAlias, 'tableAlias');
    if (!where) return Prisma.empty;
    return toWhereClause(buildWhereConditions(where, tableAlias));
  }

  return toWhereClause(buildWhereConditions(params));
}

function toWhereClause(conditions: PrismaSql[]): PrismaSql {
  if (conditions.length === 0) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

export function buildWhereClause(where: SubSchemaWhereInput): PrismaSql {
  const conditions = buildWhereConditions(where);
  if (conditions.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function addStringCondition(conditions: PrismaSql[], value: string | import('../types').StringFilter | undefined, column: string, tableAlias?: string): void {
  if (value === undefined) return;
  const filter = typeof value === 'string' ? { equals: value } : value;
  conditions.push(generateStringFilter(getColumnRef(column, tableAlias), filter));
}

function buildWhereConditions(where: SubSchemaWhereInput, tableAlias?: string): PrismaSql[] {
  const conditions: PrismaSql[] = [];

  addStringCondition(conditions, where.tableId, 'tableId', tableAlias);
  addStringCondition(conditions, where.rowId, 'rowId', tableAlias);
  addStringCondition(conditions, where.fieldPath, 'fieldPath', tableAlias);

  if (where.data !== undefined) {
    conditions.push(generateJsonFilter(getColumnRef('data', tableAlias), where.data, 'data', ''));
  }

  buildLogicalConditions(conditions, where, tableAlias);

  return conditions;
}

function buildLogicalConditions(conditions: PrismaSql[], where: SubSchemaWhereInput, tableAlias?: string): void {
  if (where.AND && where.AND.length > 0) {
    const andConds = where.AND.flatMap(w => buildWhereConditions(w, tableAlias));
    if (andConds.length > 0) {
      conditions.push(Prisma.sql`(${Prisma.join(andConds, ' AND ')})`);
    }
  }

  if (where.OR && where.OR.length > 0) {
    const orConds = where.OR.flatMap(w => {
      const conds = buildWhereConditions(w, tableAlias);
      if (conds.length <= 1) return conds;
      return [Prisma.sql`(${Prisma.join(conds, ' AND ')})`];
    });
    if (orConds.length > 0) {
      conditions.push(Prisma.sql`(${Prisma.join(orConds, ' OR ')})`);
    }
  }

  if (where.NOT) {
    const notConds = buildWhereConditions(where.NOT, tableAlias);
    if (notConds.length > 0) {
      conditions.push(Prisma.sql`NOT (${Prisma.join(notConds, ' AND ')})`);
    }
  }
}
