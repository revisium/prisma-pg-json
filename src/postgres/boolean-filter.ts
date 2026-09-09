import { Prisma, PrismaSql } from '../prisma-adapter';
import type { BooleanFilter } from '../types';
import {
  BooleanFilterDescription,
  describeBooleanFilter,
} from '../where/boolean-description';

export function compileBooleanFilter(
  fieldRef: PrismaSql,
  filter: boolean | BooleanFilter,
): PrismaSql {
  const conditions: PrismaSql[] = [];

  for (const description of describeBooleanFilter(filter)) {
    conditions.push(compileBooleanDescription(fieldRef, description));
  }

  if (conditions.length === 0) {
    throw new Error('Boolean filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}

function compileBooleanDescription(
  fieldRef: PrismaSql,
  description: BooleanFilterDescription,
): PrismaSql {
  switch (description.kind) {
    case 'equals':
      return Prisma.sql`${fieldRef} = ${description.readValue()}`;
    case 'notEquals':
      return Prisma.sql`${fieldRef} != ${description.readValue()}`;
    case 'not': {
      const notCondition = compileBooleanFilter(fieldRef, description.readFilter());
      return Prisma.sql`NOT (${notCondition})`;
    }
  }
}
