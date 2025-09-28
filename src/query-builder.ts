import { Prisma } from '@prisma/client';
import { QueryBuilderOptions, FieldConfig, FieldType, JsonFilter, GenerateWhereParams } from './types';
import { generateStringFilter } from './where/string';
import { generateNumberFilter } from './where/number';
import { generateBooleanFilter } from './where/boolean';
import { generateDateFilter } from './where/date';
import { generateJsonFilter } from './where/json';
import { generateOrderBy } from './orderBy';

const DEFAULT_FIELD_CONFIG: FieldConfig = {};

export function buildQuery(options: QueryBuilderOptions): Prisma.Sql {
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

  const fieldList =
    fields[0] === '*'
      ? Prisma.sql`${Prisma.raw(tableAlias)}.*`
      : Prisma.join(
          fields.map((f) => Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(f)}"`),
          ', ',
        );

  let sql = Prisma.sql`SELECT ${fieldList} FROM "${Prisma.raw(tableName)}" ${Prisma.raw(tableAlias)}`;

  if (where) {
    const whereClause = generateWhereClause({ where, fieldConfig, tableAlias });
    sql = Prisma.sql`${sql} WHERE ${whereClause}`;
  }

  if (orderBy) {
    const orderByClause = generateOrderBy({ tableAlias, orderBy, fieldConfig });
    if (orderByClause) {
      sql = Prisma.sql`${sql} ${orderByClause}`;
    }
  }

  sql = Prisma.sql`${sql} LIMIT ${take} OFFSET ${skip}`;

  return sql;
}

export function generateWhere(params: GenerateWhereParams): Prisma.Sql {
  return generateWhereClause(params);
}

export { generateOrderBy, generateOrderByClauses } from './orderBy';

function generateWhereClause(params: GenerateWhereParams): Prisma.Sql {
  const { where, fieldConfig, tableAlias } = params;
  const conditions: Prisma.Sql[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    const fieldType = fieldConfig[key] || 'string';
    const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(key)}"`;

    const condition = generateFieldCondition(fieldRef, value, fieldType, key, tableAlias);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (where.AND && Array.isArray(where.AND) && where.AND.length > 0) {
    const andConditions = where.AND.map((cond) =>
      generateWhereClause({ where: cond, fieldConfig, tableAlias }),
    );
    conditions.push(Prisma.sql`(${Prisma.join(andConditions, ' AND ')})`);
  }

  if (where.OR && Array.isArray(where.OR) && where.OR.length > 0) {
    const orConditions = where.OR.map((cond) => generateWhereClause({ where: cond, fieldConfig, tableAlias }));
    conditions.push(Prisma.sql`(${Prisma.join(orConditions, ' OR ')})`);
  }

  if (where.NOT) {
    const notConditions = Array.isArray(where.NOT) ? where.NOT : [where.NOT];
    const notClauses = notConditions.map((cond) =>
      generateWhereClause({ where: cond, fieldConfig, tableAlias }),
    );
    conditions.push(Prisma.sql`NOT (${Prisma.join(notClauses, ' AND ')})`);
  }

  if (conditions.length === 0) {
    return Prisma.sql`TRUE`;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}

function generateFieldCondition(
  fieldRef: Prisma.Sql,
  value: unknown,
  fieldType: FieldType,
  fieldName: string,
  tableAlias: string,
): Prisma.Sql | null {
  switch (fieldType) {
    case 'string':
      return generateStringFilter(fieldRef, value as string);
    case 'number':
      return generateNumberFilter(fieldRef, value as number);
    case 'boolean':
      return generateBooleanFilter(fieldRef, value as boolean);
    case 'date':
      return generateDateFilter(fieldRef, value as string | Date);
    case 'json':
      return generateJsonFilter(fieldRef, value as JsonFilter, fieldName, tableAlias);
    default:
      throw new Error(`Unsupported field type: ${fieldType}`);
  }
}
