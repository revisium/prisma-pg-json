import type { PrismaSql } from '../prisma-adapter';
import type { SubSchemaQueryParams } from './types';
import { compileSubSchemaCountQuery, compileSubSchemaQuery } from '../postgres/sub-schema/query';

export function buildSubSchemaQuery(params: SubSchemaQueryParams): PrismaSql {
  return compileSubSchemaQuery(params);
}

export function buildSubSchemaCountQuery(
  params: Omit<SubSchemaQueryParams, 'take' | 'skip' | 'orderBy'>,
): PrismaSql {
  return compileSubSchemaCountQuery(params);
}
