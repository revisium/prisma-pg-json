import { Prisma } from '@prisma/client';
import { QueryBuilderOptions, WhereConditions } from './types';
import { generateStringFilter } from './where/string';

export function buildQuery(options: QueryBuilderOptions): Prisma.Sql {
  const { tableName, take = 50, skip = 0, where } = options;

  let sql = Prisma.sql`SELECT * FROM "${Prisma.raw(tableName)}"`;

  if (where) {
    const whereClause = generateWhereClause(where);
    sql = Prisma.sql`${sql} WHERE ${whereClause}`;
  }

  sql = Prisma.sql`${sql} LIMIT ${take} OFFSET ${skip}`;

  return sql;
}

function generateWhereClause(where: WhereConditions): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      continue;
    }

    if (typeof value === 'string' || (typeof value === 'object' && value !== null)) {
      const fieldRef = Prisma.sql`"${Prisma.raw(key)}"`;
      const condition = generateStringFilter(fieldRef, value);
      conditions.push(condition);
    }
  }

  if (where.AND && where.AND.length > 0) {
    const andConditions = where.AND.map((cond) => generateWhereClause(cond));
    conditions.push(Prisma.sql`(${Prisma.join(andConditions, ' AND ')})`);
  }

  if (where.OR && where.OR.length > 0) {
    const orConditions = where.OR.map((cond) => generateWhereClause(cond));
    conditions.push(Prisma.sql`(${Prisma.join(orConditions, ' OR ')})`);
  }

  if (where.NOT) {
    const notConditions = Array.isArray(where.NOT) ? where.NOT : [where.NOT];
    const notClauses = notConditions.map((cond) => generateWhereClause(cond));
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