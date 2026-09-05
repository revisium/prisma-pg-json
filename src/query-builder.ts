import {
  QueryBuilderOptions,
  FieldConfig,
  GenerateWhereParams,
} from './types';
import { Prisma, PrismaSql } from './prisma-adapter';
import { compileWhere } from './postgres/where';
import { generateOrderBy } from './orderBy';
import { validatePagination, validateQueryInput } from './utils/query-validation';
import { quoteIdentifier } from './postgres/identifiers';
import { validateSqlIdentifier } from './sub-schema/validation';

const DEFAULT_FIELD_CONFIG: FieldConfig = {};

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
  const {
    tableName,
    tableAlias = tableName.substring(0, 1),
    fields = ['*'],
    fieldConfig = DEFAULT_FIELD_CONFIG,
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

  const fieldList =
    fields[0] === '*'
      ? Prisma.sql`${Prisma.raw(tableAlias)}.*`
      : Prisma.join(
          fields.map((f) => Prisma.sql`${Prisma.raw(tableAlias)}.${quoteIdentifier(f)}`),
          ', ',
        );

  let sql = Prisma.sql`SELECT ${fieldList} FROM ${quoteIdentifier(tableName)} ${Prisma.raw(tableAlias)}`;

  if (where) {
    const whereClause = compileWhere({
      where,
      fieldConfig: fieldConfig as TConfig,
      tableAlias,
    });
    sql = Prisma.sql`${sql} WHERE ${whereClause}`;
  }

  if (orderBy) {
    const orderByClause = generateOrderBy({
      tableAlias,
      orderBy,
      fieldConfig: fieldConfig as TConfig,
    });
    if (orderByClause) {
      sql = Prisma.sql`${sql} ${orderByClause}`;
    }
  }

  sql = Prisma.sql`${sql} LIMIT ${take} OFFSET ${skip}`;

  return sql;
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
