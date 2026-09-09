import type { PrismaSql } from '../prisma-adapter';
import type { SubSchemaWhereInput } from './types';
import { compileSubSchemaWhere } from '../postgres/sub-schema/where';

export interface SubSchemaWhereParams {
  where?: SubSchemaWhereInput;
  tableAlias?: string;
}

export function buildSubSchemaWhere(
  params?: SubSchemaWhereInput | SubSchemaWhereParams,
): PrismaSql {
  return compileSubSchemaWhere(params);
}
