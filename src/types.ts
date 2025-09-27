export type StringFilter = {
  equals?: string;
  not?: string | StringFilter;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  mode?: 'default' | 'insensitive';
};

export type NumberFilter = {
  equals?: number;
  not?: number | NumberFilter;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
};

export type BooleanFilter = {
  equals?: boolean;
  not?: boolean | BooleanFilter;
};

export type JsonPathFilter = {
  path: string | string[];
  equals?: unknown;
  not?: unknown;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  mode?: 'default' | 'insensitive';
};

export type WhereConditions = {
  [field: string]: unknown;
  AND?: WhereConditions[];
  OR?: WhereConditions[];
  NOT?: WhereConditions | WhereConditions[];
};

export type OrderByDirection = 'asc' | 'desc';

export type OrderByConditions =
  | {
      [field: string]: OrderByDirection;
    }
  | Array<{
      [field: string]: OrderByDirection;
    }>;

export interface QueryBuilderOptions {
  tableName: string;
  take?: number;
  skip?: number;
  where?: WhereConditions;
  orderBy?: OrderByConditions;
}