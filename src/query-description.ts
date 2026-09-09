import type { FieldConfig, QueryBuilderOptions } from './types';
import { validatePagination, validateQueryInput } from './utils/query-validation';
import { validateSqlIdentifier } from './sub-schema/validation';

const DEFAULT_FIELD_CONFIG: FieldConfig = {};

export interface QueryDescription<TConfig extends FieldConfig = FieldConfig> {
  tableName: string;
  tableAlias: string;
  fields: string[];
  fieldConfig: TConfig;
  take: number;
  skip: number;
  where: QueryBuilderOptions<TConfig>['where'];
  orderBy: QueryBuilderOptions<TConfig>['orderBy'];
}

/**
 * Capture and validate query options without resolving SQL or child clauses.
 */
export function prepareQuery<TConfig extends FieldConfig = FieldConfig>(
  options: QueryBuilderOptions<TConfig>,
): QueryDescription<TConfig> {
  const {
    tableName,
    tableAlias = tableName.substring(0, 1),
    fields = ['*'],
    fieldConfig = DEFAULT_FIELD_CONFIG as TConfig,
    take = 50,
    skip = 0,
    where,
    orderBy,
  } = options;

  validatePagination(take, skip);
  validateQueryInput(where);
  validateQueryInput(orderBy);
  validateQueryInput(fields);
  validateSqlIdentifier(tableAlias, 'tableAlias');

  return { tableName, tableAlias, fields, fieldConfig, take, skip, where, orderBy };
}
