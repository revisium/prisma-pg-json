import {
  QueryBuilderOptions,
  FieldConfig,
  GenerateWhereParams,
} from './types';
import type { PrismaSql } from './prisma-adapter';
import { compileWhere } from './postgres/where';
import { prepareQuery } from './query-description';
import { compileQuery } from './postgres/query';
import { validateQueryInput } from './utils/query-validation';
import { validateSqlIdentifier } from './sub-schema/validation';

/**
 * Build a complete SELECT query with WHERE, ORDER BY, LIMIT, and OFFSET.
 *
 * @param options - Query configuration including table, fields, filters, sorting, and pagination
 * @returns Parameterized SQL ready for `prisma.$queryRaw()`
 *
 * @example
 * ```typescript
 * const sql = buildQuery({
 *   tableName: 'users',
 *   fieldConfig: { name: 'string', age: 'number', data: 'json' },
 *   where: { name: { contains: 'john' }, age: { gte: 18 } },
 *   orderBy: { age: 'desc' },
 *   take: 20,
 *   skip: 0,
 * });
 * const results = await prisma.$queryRaw(sql);
 * ```
 */
export function buildQuery<TConfig extends FieldConfig = FieldConfig>(
  options: QueryBuilderOptions<TConfig>,
): PrismaSql {
  return compileQuery(prepareQuery(options));
}

/**
 * Generate a parameterized WHERE clause from Prisma-like filter conditions.
 *
 * @param params - Filter conditions, field type configuration, and table alias
 * @returns Parameterized SQL fragment (without the `WHERE` keyword)
 *
 * @example
 * ```typescript
 * const where = generateWhere({
 *   where: { name: { contains: 'john' }, data: { path: 'role', equals: 'admin' } },
 *   fieldConfig: { name: 'string', data: 'json' },
 *   tableAlias: 'u',
 * });
 * const sql = Prisma.sql`SELECT * FROM users u WHERE ${where}`;
 * ```
 */
export function generateWhere<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateWhereParams<TConfig>,
): PrismaSql {
  validateQueryInput(params.where);
  validateSqlIdentifier(params.tableAlias, 'tableAlias');
  return compileWhere(params);
}

export { generateOrderBy, generateOrderByClauses } from './orderBy';
