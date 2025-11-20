import { Prisma, PrismaSql } from '../prisma-adapter';
import { BooleanFilter } from '../types';

export function generateBooleanFilter(
  fieldRef: PrismaSql,
  filter: boolean | BooleanFilter,
): PrismaSql {

  if (typeof filter === 'boolean') {
    return Prisma.sql`${fieldRef} = ${filter}`;
  }

  const conditions: PrismaSql[] = [];

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
