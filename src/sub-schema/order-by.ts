import type { PrismaSql } from '../prisma-adapter';
import type { SubSchemaOrderByItem } from './types';
import { compileSubSchemaOrderBy } from '../postgres/sub-schema/order-by';

export interface SubSchemaOrderByParams {
  orderBy?: SubSchemaOrderByItem[];
  tableAlias?: string;
  rowTableAlias?: string;
}

export function buildSubSchemaOrderBy(
  params?: SubSchemaOrderByItem[] | SubSchemaOrderByParams,
): PrismaSql {
  return compileSubSchemaOrderBy(params);
}
