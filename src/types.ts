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
  array_contains?: unknown[];
  array_starts_with?: unknown;
  array_ends_with?: unknown;
  search?: string;
  searchLanguage?: string;
  searchType?: 'plain' | 'phrase';
  mode?: 'default' | 'insensitive';
};

export type FieldFilterType<T extends FieldType> = T extends 'string'
  ? string | StringFilter
  : T extends 'number'
    ? number | NumberFilter
    : T extends 'boolean'
      ? boolean | BooleanFilter
      : T extends 'date'
        ? string | Date | DateFilter
        : T extends 'json'
          ? JsonFilter
          : never;

type WhereFieldConditions<TConfig extends FieldConfig> = {
  [K in keyof TConfig]?: FieldFilterType<TConfig[K]>;
};

type WhereLogicalOperators<TConfig extends FieldConfig> = {
  AND?: WhereConditionsTyped<TConfig>[];
  OR?: WhereConditionsTyped<TConfig>[];
  NOT?: WhereConditionsTyped<TConfig> | WhereConditionsTyped<TConfig>[];
};

export type WhereConditionsTyped<TConfig extends FieldConfig> = WhereFieldConditions<TConfig> &
  WhereLogicalOperators<TConfig>;


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

export type FieldOrderByType<T extends FieldType> = T extends 'json'
  ? JsonOrderByInput | OrderByDirection
  : OrderByDirection;

export type OrderByConditionsTyped<TConfig extends FieldConfig> = {
  [K in keyof TConfig]?: FieldOrderByType<TConfig[K]>;
};

export type OrderByConditions<TConfig extends FieldConfig = FieldConfig> =
  OrderByConditionsTyped<TConfig>;

export interface QueryBuilderOptions<TConfig extends FieldConfig = FieldConfig> {
  tableName: string;
  tableAlias?: string;
  fields?: string[];
  fieldConfig?: TConfig;
  take?: number;
  skip?: number;
  where?: WhereConditionsTyped<TConfig>;
  orderBy?: OrderByConditions<TConfig> | OrderByConditions<TConfig>[];
}

export interface GenerateWhereParams<TConfig extends FieldConfig = FieldConfig> {
  where: WhereConditionsTyped<TConfig>;
  fieldConfig: TConfig;
  tableAlias: string;
}

export interface GenerateOrderByParams<TConfig extends FieldConfig = FieldConfig> {
  tableAlias: string;
  orderBy: OrderByConditions<TConfig> | OrderByConditions<TConfig>[] | undefined;
  fieldConfig: TConfig;
}
