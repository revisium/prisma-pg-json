import { Prisma, PrismaSql } from '../prisma-adapter';
import type { FieldConfig, GenerateOrderByParams, GenerateWhereParams } from '../types';
import type { QueryDescription } from '../query-description';
import { compileWhere } from './where';
import { compileOrderBy } from './order-by';
import { quoteIdentifier } from './identifiers';

export function compileQuery<TConfig extends FieldConfig = FieldConfig>(
  description: QueryDescription<TConfig>,
): PrismaSql {
  const { tableName, tableAlias, fields, fieldConfig, take, skip, where, orderBy } = description;

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
    } satisfies GenerateWhereParams<TConfig>);
    sql = Prisma.sql`${sql} WHERE ${whereClause}`;
  }

  if (orderBy) {
    const orderByClause = compileOrderBy({
      tableAlias,
      orderBy,
      fieldConfig: fieldConfig as TConfig,
    } satisfies GenerateOrderByParams<TConfig>);
    if (orderByClause) {
      sql = Prisma.sql`${sql} ${orderByClause}`;
    }
  }

  sql = Prisma.sql`${sql} LIMIT ${take} OFFSET ${skip}`;

  return sql;
}
