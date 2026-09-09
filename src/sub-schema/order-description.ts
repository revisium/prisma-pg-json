import type { SubSchemaOrderByItem } from './types';

export type SubSchemaDirectionDescription = {
  kind: 'direction';
  column: 'tableId' | 'rowId' | 'createdAt' | 'fieldPath';
  readDirection: () => 'asc' | 'desc' | undefined;
};

export type SubSchemaDataOrderDescription = {
  kind: 'data';
  readData: () => SubSchemaOrderByItem['data'];
};

export type SubSchemaOrderDescription =
  | SubSchemaDirectionDescription
  | SubSchemaDataOrderDescription;

/**
 * Lazily select configured sub-schema order fields in their original order.
 * Field values are reread by the PostgreSQL renderer at the original SQL points.
 */
export function* describeSubSchemaOrderItem(
  item: SubSchemaOrderByItem,
): Generator<SubSchemaOrderDescription> {
  if (item.tableId) {
    yield { kind: 'direction', column: 'tableId', readDirection: () => item.tableId };
  }
  if (item.rowId) {
    yield { kind: 'direction', column: 'rowId', readDirection: () => item.rowId };
  }
  if (item.rowCreatedAt) {
    yield {
      kind: 'direction',
      column: 'createdAt',
      readDirection: () => item.rowCreatedAt,
    };
  }
  if (item.fieldPath) {
    yield {
      kind: 'direction',
      column: 'fieldPath',
      readDirection: () => item.fieldPath,
    };
  }
  if (item.data) {
    yield { kind: 'data', readData: () => item.data };
  }
}

export interface SubSchemaOrderByParamsShape {
  orderBy?: SubSchemaOrderByItem[];
  tableAlias?: string;
  rowTableAlias?: string;
}

export function isSubSchemaOrderByParams(
  params: unknown,
): params is SubSchemaOrderByParamsShape {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return false;
  }
  return 'orderBy' in params || 'tableAlias' in params || 'rowTableAlias' in params;
}
