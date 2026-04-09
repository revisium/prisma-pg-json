import { Prisma, PrismaSql } from '../prisma-adapter';
import { DateFilter } from '../types';

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

function processDateComparisons(
  fieldRef: PrismaSql,
  filter: DateFilter,
  conditions: PrismaSql[],
): void {
  if (filter.equals !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} = ${toDate(filter.equals)}`);
  }
  if (filter.gt !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} > ${toDate(filter.gt)}`);
  }
  if (filter.gte !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} >= ${toDate(filter.gte)}`);
  }
  if (filter.lt !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} < ${toDate(filter.lt)}`);
  }
  if (filter.lte !== undefined) {
    conditions.push(Prisma.sql`${fieldRef} <= ${toDate(filter.lte)}`);
  }
}

function processDateArrayFilters(
  fieldRef: PrismaSql,
  filter: DateFilter,
  conditions: PrismaSql[],
): void {
  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    const values = filter.in.map(toDate);
    conditions.push(Prisma.sql`${fieldRef} IN (${Prisma.join(values, ', ')})`);
  }
  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    const values = filter.notIn.map(toDate);
    conditions.push(Prisma.sql`${fieldRef} NOT IN (${Prisma.join(values, ', ')})`);
  }
}

function processDateNot(fieldRef: PrismaSql, not: string | Date | DateFilter): PrismaSql {
  if (typeof not === 'string' || not instanceof Date) {
    return Prisma.sql`${fieldRef} != ${toDate(not)}`;
  }
  const notCondition = generateDateFilter(fieldRef, not);
  return Prisma.sql`NOT (${notCondition})`;
}

/**
 * Generate a WHERE condition for a date/timestamp column.
 *
 * Supports: equals, not, gt, gte, lt, lte, in, notIn.
 * Accepts Date objects or ISO 8601 date strings.
 *
 * @param fieldRef - SQL reference to the column
 * @param filter - Date value for exact match, or DateFilter object
 * @returns Parameterized SQL condition
 */
export function generateDateFilter(
  fieldRef: PrismaSql,
  filter: string | Date | DateFilter,
): PrismaSql {
  if (typeof filter === 'string') {
    return Prisma.sql`${fieldRef} = ${new Date(filter)}`;
  }

  if (filter instanceof Date) {
    return Prisma.sql`${fieldRef} = ${filter}`;
  }

  const conditions: PrismaSql[] = [];

  processDateComparisons(fieldRef, filter, conditions);
  processDateArrayFilters(fieldRef, filter, conditions);

  if (filter.not !== undefined) {
    conditions.push(processDateNot(fieldRef, filter.not));
  }

  if (conditions.length === 0) {
    throw new Error('Date filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}
