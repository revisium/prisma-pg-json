import { JsonFilter, StringFilter } from '../types';

export interface SubSchemaPath {
  path: string;
}

export interface SubSchemaTableConfig {
  tableId: string;
  tableVersionId: string;
  paths: SubSchemaPath[];
}

export interface SubSchemaWhereInput {
  tableId?: StringFilter | string;
  rowId?: StringFilter | string;
  fieldPath?: StringFilter | string;
  data?: JsonFilter;
  AND?: SubSchemaWhereInput[];
  OR?: SubSchemaWhereInput[];
  NOT?: SubSchemaWhereInput;
}

export interface SubSchemaOrderByItem {
  tableId?: 'asc' | 'desc';
  rowId?: 'asc' | 'desc';
  fieldPath?: 'asc' | 'desc';
  data?: {
    path: string | string[];
    order: 'asc' | 'desc';
    nulls?: 'first' | 'last';
  };
}

export interface SubSchemaQueryParams {
  tables: SubSchemaTableConfig[];
  where?: SubSchemaWhereInput;
  orderBy?: SubSchemaOrderByItem[];
  take: number;
  skip: number;
}

export interface SubSchemaItem {
  tableId: string;
  rowId: string;
  rowVersionId: string;
  fieldPath: string;
  data: unknown;
}
