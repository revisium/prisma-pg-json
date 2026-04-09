import { Prisma, PrismaSql } from '../prisma-adapter';
import { NumberFilter } from '../types';

/**
 * Generate a WHERE condition for a numeric column.
 *
 * Supports: equals, not, gt, gte, lt, lte, in, notIn.
 *
 * @param fieldRef - SQL reference to the column
 * @param filter - Number value for exact match, or NumberFilter object
 * @returns Parameterized SQL condition
 */
export function generateNumberFilter(
  fieldRef: PrismaSql,
  filter: number | NumberFilter,
): PrismaSql {
  if (typeof filter === 'number') {
    return Prisma.sql`${fieldRef} = ${filter}`;
  }

  const conditions: PrismaSql[] = [];

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
    conditions.push(generateNumberNot(fieldRef, filter.not));
  }

  if (conditions.length === 0) {
    throw new Error('Number filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}

function generateNumberNot(fieldRef: PrismaSql, not: number | NumberFilter): PrismaSql {
  if (typeof not === 'number') {
    return Prisma.sql`${fieldRef} != ${not}`;
  }
  const notCondition = generateNumberFilter(fieldRef, not);
  return Prisma.sql`NOT (${notCondition})`;
}
