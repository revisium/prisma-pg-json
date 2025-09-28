import { Prisma } from '@prisma/client';
import { NumberFilter } from '../types';

export function generateNumberFilter(
  fieldRef: Prisma.Sql,
  filter: number | NumberFilter,
): Prisma.Sql {
  if (typeof filter === 'number') {
    return Prisma.sql`${fieldRef} = ${filter}`;
  }

  const conditions: Prisma.Sql[] = [];

  if (filter.equals !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} = ${filter.equals}`);
  }

  if (filter.gt !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} > ${filter.gt}`);
  }

  if (filter.gte !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} >= ${filter.gte}`);
  }

  if (filter.lt !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} < ${filter.lt}`);
  }

  if (filter.lte !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} <= ${filter.lte}`);
  }

  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    conditions.push(Prisma.sql`${fieldRef} IN (${Prisma.join(filter.in, ', ')})`);
  }

  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    conditions.push(Prisma.sql`${fieldRef} NOT IN (${Prisma.join(filter.notIn, ', ')})`);
  }

  if (filter.not !== undefined) {
    if (typeof filter.not === 'number') {
      conditions.push(Prisma.sql`${fieldRef} != ${filter.not}`);
    } else {
      const notCondition = generateNumberFilter(fieldRef, filter.not);
      conditions.push(Prisma.sql`NOT (${notCondition})`);
    }
  }

  if (conditions.length === 0) {
    throw new Error('Number filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}
