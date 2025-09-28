export type StringFilter = {
  equals?: string;
  not?: string | StringFilter;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  in?: string[];
  notIn?: string[];
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  search?: string;
  mode?: 'default' | 'insensitive';
};

export type NumberFilter = {
  equals?: number;
  not?: number | NumberFilter;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: number[];
  notIn?: number[];
};

export type BooleanFilter = {
  equals?: boolean;
  not?: boolean | BooleanFilter;
};

export type DateFilter = {
  equals?: string | Date;
  not?: string | Date | DateFilter;
  gt?: string | Date;
  gte?: string | Date;
  lt?: string | Date;
  lte?: string | Date;
  in?: (string | Date)[];
  notIn?: (string | Date)[];
};

export type JsonFilter = {
  path: string | string[];
  equals?: unknown;
  not?: unknown;
  string_contains?: string;
  string_starts_with?: string;
  string_ends_with?: string;
  gt?: unknown;
  gte?: unknown;
  lt?: unknown;
  lte?: unknown;
  in?: unknown[];
  notIn?: unknown[];
  array_contains?: unknown;
  array_starts_with?: unknown;
  array_ends_with?: unknown;
  mode?: 'default' | 'insensitive';
  [key: string]: unknown; // Allow dynamic property access
};

export type WhereConditions = {
  [field: string]: unknown;
  AND?: WhereConditions[];
  OR?: WhereConditions[];
  NOT?: WhereConditions | WhereConditions[];
};

export type OrderByDirection = 'asc' | 'desc';

export type JsonValueType = 'text' | 'int' | 'float' | 'boolean' | 'timestamp';
export type JsonAggregation = 'min' | 'max' | 'avg' | 'first' | 'last';

export type JsonOrderInput = {
  path: string | string[];
  direction?: OrderByDirection;
  type?: JsonValueType;
  aggregation?: JsonAggregation;
  subPath?: string;
};

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json';

export type FieldConfig = {
  [fieldName: string]: FieldType;
};

export interface JsonOrderByInput {
  path: string | string[];
  direction?: 'asc' | 'desc';
  type?: 'text' | 'int' | 'float' | 'boolean' | 'timestamp';
  aggregation?: 'first' | 'last' | 'min' | 'max' | 'avg';
}

export type OrderByConditions = {
  [fieldName: string]: 'asc' | 'desc' | JsonOrderByInput;
};

export interface QueryBuilderOptions {
  tableName: string;
  tableAlias?: string;
  fields?: string[];
  fieldConfig?: FieldConfig;
  take?: number;
  skip?: number;
  where?: WhereConditions;
  orderBy?: OrderByConditions | OrderByConditions[];
}

export interface GenerateWhereParams {
  where: WhereConditions;
  fieldConfig: FieldConfig;
  tableAlias: string;
}

export interface GenerateOrderByParams {
  tableAlias: string;
  orderBy: OrderByConditions | OrderByConditions[] | undefined;
  fieldConfig: Record<string, FieldType>;
}
