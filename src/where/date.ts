import { Prisma, PrismaSql } from '../prisma-adapter';
import { DateFilter } from '../types';

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

  if (filter.equals !== undefined) {
    const value = typeof filter.equals === 'string' ? new Date(filter.equals) : filter.equals;
    conditions.push(Prisma.sql`${fieldRef} = ${value}`);
  }

  if (filter.gt !== undefined) {
    const value = typeof filter.gt === 'string' ? new Date(filter.gt) : filter.gt;
    conditions.push(Prisma.sql`${fieldRef} > ${value}`);
  }

  if (filter.gte !== undefined) {
    const value = typeof filter.gte === 'string' ? new Date(filter.gte) : filter.gte;
    conditions.push(Prisma.sql`${fieldRef} >= ${value}`);
  }

  if (filter.lt !== undefined) {
    const value = typeof filter.lt === 'string' ? new Date(filter.lt) : filter.lt;
    conditions.push(Prisma.sql`${fieldRef} < ${value}`);
  }

  if (filter.lte !== undefined) {
    const value = typeof filter.lte === 'string' ? new Date(filter.lte) : filter.lte;
    conditions.push(Prisma.sql`${fieldRef} <= ${value}`);
  }

  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    const values = filter.in.map((val) => (typeof val === 'string' ? new Date(val) : val));
    conditions.push(Prisma.sql`${fieldRef} IN (${Prisma.join(values, ', ')})`);
  }

  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    const values = filter.notIn.map((val) => (typeof val === 'string' ? new Date(val) : val));
    conditions.push(Prisma.sql`${fieldRef} NOT IN (${Prisma.join(values, ', ')})`);
  }

  if (filter.not !== undefined) {
    if (typeof filter.not === 'string' || filter.not instanceof Date) {
      const value = typeof filter.not === 'string' ? new Date(filter.not) : filter.not;
      conditions.push(Prisma.sql`${fieldRef} != ${value}`);
    } else {
      const notCondition = generateDateFilter(fieldRef, filter.not);
      conditions.push(Prisma.sql`NOT (${notCondition})`);
    }
  }

  if (conditions.length === 0) {
    throw new Error('Date filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}
