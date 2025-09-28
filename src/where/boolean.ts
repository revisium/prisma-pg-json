import { Prisma } from '@prisma/client';
import { BooleanFilter } from '../types';

export function generateBooleanFilter(
  fieldRef: Prisma.Sql,
  filter: boolean | BooleanFilter,
): Prisma.Sql {
  if (typeof filter === 'boolean') {
    return Prisma.sql`${fieldRef} = ${filter}`;
  }

  const conditions: Prisma.Sql[] = [];

  if (filter.equals !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} = ${filter.equals}`);
  }

  if (filter.not !== undefined) {
    if (typeof filter.not === 'boolean') {
      conditions.push(Prisma.sql`${fieldRef} != ${filter.not}`);
    } else {
      const notCondition = generateBooleanFilter(fieldRef, filter.not);
      conditions.push(Prisma.sql`NOT (${notCondition})`);
    }
  }

  if (conditions.length === 0) {
    throw new Error('Boolean filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}
