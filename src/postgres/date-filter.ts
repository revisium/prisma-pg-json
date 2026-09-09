import { Prisma, PrismaSql } from '../prisma-adapter';
import type { DateFilter } from '../types';
import {
  describeDateFilter,
  type DateFilterDescription,
  type DateFilterValue,
} from '../where/date-description';

export function compileDateFilter(
  fieldRef: PrismaSql,
  filter: DateFilterValue | DateFilter,
): PrismaSql {
  const conditions: PrismaSql[] = [];

  for (const description of describeDateFilter(filter)) {
    conditions.push(compileDateDescription(fieldRef, description));
  }

  if (conditions.length === 0) {
    throw new Error('Date filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}

function compileDateDescription(
  fieldRef: PrismaSql,
  description: DateFilterDescription,
): PrismaSql {
  switch (description.kind) {
    case 'equals':
      return Prisma.sql`${fieldRef} = ${toDate(description.readValue())}`;
    case 'gt':
      return Prisma.sql`${fieldRef} > ${toDate(description.readValue())}`;
    case 'gte':
      return Prisma.sql`${fieldRef} >= ${toDate(description.readValue())}`;
    case 'lt':
      return Prisma.sql`${fieldRef} < ${toDate(description.readValue())}`;
    case 'lte':
      return Prisma.sql`${fieldRef} <= ${toDate(description.readValue())}`;
    case 'in': {
      const values = description.readValues().map(toDate);
      return Prisma.sql`${fieldRef} IN (${Prisma.join(values, ', ')})`;
    }
    case 'notIn': {
      const values = description.readValues().map(toDate);
      return Prisma.sql`${fieldRef} NOT IN (${Prisma.join(values, ', ')})`;
    }
    case 'notEquals':
      return Prisma.sql`${fieldRef} != ${toDate(description.readValue())}`;
    case 'not': {
      const notCondition = compileDateFilter(fieldRef, description.readFilter());
      return Prisma.sql`NOT (${notCondition})`;
    }
  }
}

function toDate(value: DateFilterValue): Date {
  return typeof value === 'string' ? new Date(value) : value;
}
