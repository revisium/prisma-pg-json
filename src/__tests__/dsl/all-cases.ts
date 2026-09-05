import { contractMatrixCases, unsupportedRootCases } from '../cases/contract-matrix.cases';
import { extendedResultCases } from '../cases/extended-results.cases';
import { orderByCases } from '../cases/order-by.cases';
import { queryCases } from './query.cases';
import { queryBasicCases } from '../cases/query-basics.cases';
import { logicalFilterCases } from '../cases/logical-filters.cases';
import { offsetPaginationCases } from '../cases/offset-pagination.cases';
import { scalarFilterCases } from '../cases/scalar-filters.cases';
import { jsonComparisonCases } from '../cases/json-comparisons.cases';
import { jsonArrayCases } from '../cases/json-arrays.cases';
import { jsonNullMissingCases } from '../cases/json-null-missing.cases';
import { jsonStringSearchCases } from '../cases/json-strings-search.cases';
import { jsonPathCases } from '../cases/json-paths.cases';
export const allQueryCases = [
  ...contractMatrixCases,
  ...extendedResultCases,
  ...queryCases,
  ...orderByCases,
  ...queryBasicCases,
  ...logicalFilterCases,
  ...offsetPaginationCases,
  ...scalarFilterCases,
  ...jsonComparisonCases,
  ...jsonArrayCases,
  ...jsonNullMissingCases,
  ...jsonStringSearchCases,
  ...jsonPathCases,
];

export const unsupportedQueryCases = unsupportedRootCases;
