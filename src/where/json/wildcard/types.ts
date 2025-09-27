export type WildcardOperator =
  | 'equals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'string_contains'
  | 'string_starts_with'
  | 'string_ends_with'
  | 'array_contains'
  | 'array_starts_with'
  | 'array_ends_with';

export interface WildcardContext {
  fieldRefStr: string;
  beforeWildcard: string[];
  afterWildcard: string[];
  hasNestedWildcard: boolean;
  value: unknown;
  isInsensitive: boolean;
}

export interface PathContext {
  arrayPathStr: string;
  arrayPathExpr: string;
  elementPathStr: string;
  nestedArrayPathStr?: string;
  finalElementPathStr?: string;
  nestedArrayPath?: string;
}
