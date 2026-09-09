import { Prisma, PrismaSql } from '../../prisma-adapter';
import type { JsonFilter, StringFilter } from '../../types';
import { compileJsonFilter } from '../../postgres/json-filter';
import { compileStringFilter } from '../../postgres/string-filter';
import {
  describeSubSchemaWhere,
  isSubSchemaWhereParams,
  SubSchemaWhereParamsShape,
  SubSchemaWhereDescription,
} from '../../sub-schema/where-description';
import type { SubSchemaWhereInput } from '../../sub-schema/types';
import { validateSqlIdentifier } from '../../sub-schema/validation';
import { validateQueryInput } from '../../utils/query-validation';
import { getColumnRef } from './helpers';

export function compileSubSchemaWhere(
  params?: SubSchemaWhereInput | SubSchemaWhereParamsShape,
): PrismaSql {
  validateQueryInput(params);
  if (!params) {
    return Prisma.empty;
  }

  if (isSubSchemaWhereParams(params)) {
    const { where, tableAlias } = params;
    if (tableAlias) validateSqlIdentifier(tableAlias, 'tableAlias');
    if (!where) return Prisma.empty;
    return compileSubSchemaWhereClause(where, tableAlias);
  }

  return compileSubSchemaWhereClause(params);
}

export function compileSubSchemaWhereClause(
  where: SubSchemaWhereInput,
  tableAlias?: string,
): PrismaSql {
  const conditions = compileWhereConditions(where, tableAlias);
  if (conditions.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function compileWhereConditions(
  where: SubSchemaWhereInput,
  tableAlias?: string,
): PrismaSql[] {
  const conditions: PrismaSql[] = [];

  for (const description of describeSubSchemaWhere(where)) {
    conditions.push(...compileWhereDescription(description, tableAlias));
  }

  return conditions;
}

function compileWhereDescription(
  description: SubSchemaWhereDescription,
  tableAlias?: string,
): PrismaSql[] {
  if (description.kind === 'string') {
    const fieldRef = getColumnRef(description.column, tableAlias);
    return [compileStringFilter(fieldRef, description.value as string | StringFilter)];
  }

  if (description.kind === 'data') {
    const fieldRef = getColumnRef('data', tableAlias);
    const filter = description.readValue();
    return [compileJsonFilter(fieldRef, filter as JsonFilter, 'data', '')];
  }

  if (description.kind === 'and') {
    const andConditions = description
      .readChildren()
      .flatMap((child) => compileWhereConditions(child, tableAlias));
    return andConditions.length > 0 ? [Prisma.sql`(${Prisma.join(andConditions, ' AND ')})`] : [];
  }

  if (description.kind === 'or') {
    const orConditions = description.readChildren().flatMap((child) => {
      const childConditions = compileWhereConditions(child, tableAlias);
      if (childConditions.length <= 1) return childConditions;
      return [Prisma.sql`(${Prisma.join(childConditions, ' AND ')})`];
    });
    return orConditions.length > 0 ? [Prisma.sql`(${Prisma.join(orConditions, ' OR ')})`] : [];
  }

  const notConditions = compileWhereConditions(description.readChild(), tableAlias);
  return notConditions.length > 0 ? [Prisma.sql`NOT (${Prisma.join(notConditions, ' AND ')})`] : [];
}
