import type { JsonFilter, StringFilter } from '../types';
import type { SubSchemaWhereInput } from './types';

export type SubSchemaStringCondition = {
  kind: 'string';
  column: 'tableId' | 'rowId' | 'fieldPath';
  value: string | StringFilter;
};

export type SubSchemaDataCondition = {
  kind: 'data';
  readValue: () => JsonFilter | undefined;
};

export type SubSchemaAndCondition = {
  kind: 'and';
  readChildren: () => SubSchemaWhereInput[];
};

export type SubSchemaOrCondition = {
  kind: 'or';
  readChildren: () => SubSchemaWhereInput[];
};

export type SubSchemaNotCondition = {
  kind: 'not';
  readChild: () => SubSchemaWhereInput;
};

export type SubSchemaWhereDescription =
  | SubSchemaStringCondition
  | SubSchemaDataCondition
  | SubSchemaAndCondition
  | SubSchemaOrCondition
  | SubSchemaNotCondition;

/**
 * Describe the sub-schema WHERE grammar in its fixed field and logical order.
 * SQL references and deferred values are resolved by the PostgreSQL compiler.
 */
export function* describeSubSchemaWhere(
  where: SubSchemaWhereInput,
): Generator<SubSchemaWhereDescription> {
  const tableId = where.tableId;
  if (tableId !== undefined) {
    yield {
      kind: 'string',
      column: 'tableId',
      value: typeof tableId === 'string' ? { equals: tableId } : tableId,
    };
  }

  const rowId = where.rowId;
  if (rowId !== undefined) {
    yield {
      kind: 'string',
      column: 'rowId',
      value: typeof rowId === 'string' ? { equals: rowId } : rowId,
    };
  }

  const fieldPath = where.fieldPath;
  if (fieldPath !== undefined) {
    yield {
      kind: 'string',
      column: 'fieldPath',
      value: typeof fieldPath === 'string' ? { equals: fieldPath } : fieldPath,
    };
  }

  if (where.data !== undefined) {
    yield { kind: 'data', readValue: () => where.data };
  }

  if (where.AND && where.AND.length > 0) {
    yield { kind: 'and', readChildren: () => where.AND! };
  }

  if (where.OR && where.OR.length > 0) {
    yield { kind: 'or', readChildren: () => where.OR! };
  }

  if (where.NOT) {
    yield { kind: 'not', readChild: () => where.NOT! };
  }
}

export interface SubSchemaWhereParamsShape {
  where?: SubSchemaWhereInput;
  tableAlias?: string;
}

export function isSubSchemaWhereParams(
  params: unknown,
): params is SubSchemaWhereParamsShape {
  if (typeof params !== 'object' || params === null) {
    return false;
  }
  const hasWhereParamsKeys = 'where' in params || 'tableAlias' in params;
  const hasWhereInputKeys =
    'tableId' in params ||
    'rowId' in params ||
    'fieldPath' in params ||
    'data' in params ||
    'AND' in params ||
    'OR' in params ||
    'NOT' in params;
  return hasWhereParamsKeys && !hasWhereInputKeys;
}
