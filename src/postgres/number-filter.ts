import { Prisma, PrismaSql } from '../prisma-adapter';
import type { NumberFilter } from '../types';
import { describeNumberFilter, NumberFilterDescription } from '../where/number-description';
import { bindSqlNumber } from './number';

export function compileNumberFilter(
  fieldRef: PrismaSql,
  filter: number | NumberFilter,
): PrismaSql {
  const conditions: PrismaSql[] = [];

  for (const description of describeNumberFilter(filter)) {
    conditions.push(compileNumberDescription(fieldRef, description));
  }

  if (conditions.length === 0) {
    throw new Error('Number filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}

function compileNumberDescription(
  fieldRef: PrismaSql,
  description: NumberFilterDescription,
): PrismaSql {
  switch (description.kind) {
    case 'equals':
      return Prisma.sql`${fieldRef} = ${bindSqlNumber(description.readValue())}`;
    case 'gt':
      return Prisma.sql`${fieldRef} > ${bindSqlNumber(description.readValue())}`;
    case 'gte':
      return Prisma.sql`${fieldRef} >= ${bindSqlNumber(description.readValue())}`;
    case 'lt':
      return Prisma.sql`${fieldRef} < ${bindSqlNumber(description.readValue())}`;
    case 'lte':
      return Prisma.sql`${fieldRef} <= ${bindSqlNumber(description.readValue())}`;
    case 'in':
      return Prisma.sql`${fieldRef} IN (${Prisma.join(
        description.readValues().map(bindSqlNumber),
        ', ',
      )})`;
    case 'notIn':
      return Prisma.sql`${fieldRef} NOT IN (${Prisma.join(
        description.readValues().map(bindSqlNumber),
        ', ',
      )})`;
    case 'notEquals':
      return Prisma.sql`${fieldRef} != ${bindSqlNumber(description.readValue())}`;
    case 'not': {
      const notCondition = compileNumberFilter(fieldRef, description.readFilter());
      return Prisma.sql`NOT (${notCondition})`;
    }
  }
}
