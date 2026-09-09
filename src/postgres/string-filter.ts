import { Prisma, PrismaSql } from '../prisma-adapter';
import type { StringFilter } from '../types';
import {
  describeStringFilter,
  type StringFilterDescription,
} from '../where/string-description';

export function compileStringFilter(
  fieldRef: PrismaSql,
  filter: string | StringFilter,
): PrismaSql {
  const conditions: PrismaSql[] = [];

  for (const description of describeStringFilter(filter)) {
    conditions.push(compileStringDescription(fieldRef, description));
  }

  if (conditions.length === 0) {
    throw new Error('String filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}

function compileStringDescription(
  fieldRef: PrismaSql,
  description: StringFilterDescription,
): PrismaSql {
  switch (description.kind) {
    case 'equals':
      return description.isCaseInsensitive
        ? Prisma.sql`LOWER(${fieldRef}) = LOWER(${description.readValue()})`
        : Prisma.sql`${fieldRef} = ${description.readValue()}`;
    case 'contains': {
      const pattern = `%${description.readValue()}%`;
      return likeCondition(fieldRef, pattern, description.isCaseInsensitive);
    }
    case 'startsWith': {
      const pattern = `${description.readValue()}%`;
      return likeCondition(fieldRef, pattern, description.isCaseInsensitive);
    }
    case 'endsWith': {
      const pattern = `%${description.readValue()}`;
      return likeCondition(fieldRef, pattern, description.isCaseInsensitive);
    }
    case 'in':
      if (description.isCaseInsensitive) {
        const lowercaseValues = description.readValues().map((val) => val.toLowerCase());
        return Prisma.sql`LOWER(${fieldRef}) IN (${Prisma.join(lowercaseValues, ', ')})`;
      }
      return Prisma.sql`${fieldRef} IN (${Prisma.join(description.readValues(), ', ')})`;
    case 'notIn':
      if (description.isCaseInsensitive) {
        const lowercaseValues = description.readValues().map((val) => val.toLowerCase());
        return Prisma.sql`LOWER(${fieldRef}) NOT IN (${Prisma.join(lowercaseValues, ', ')})`;
      }
      return Prisma.sql`${fieldRef} NOT IN (${Prisma.join(description.readValues(), ', ')})`;
    case 'gt':
      return Prisma.sql`${fieldRef} > ${description.readValue()}`;
    case 'gte':
      return Prisma.sql`${fieldRef} >= ${description.readValue()}`;
    case 'lt':
      return Prisma.sql`${fieldRef} < ${description.readValue()}`;
    case 'lte':
      return Prisma.sql`${fieldRef} <= ${description.readValue()}`;
    case 'search':
      return Prisma.sql`to_tsvector('english', ${fieldRef}) @@ plainto_tsquery('english', ${description.readValue()})`;
    case 'notEquals':
      return description.isCaseInsensitive
        ? Prisma.sql`LOWER(${fieldRef}) != LOWER(${description.readValue()})`
        : Prisma.sql`${fieldRef} != ${description.readValue()}`;
    case 'not': {
      const notCondition = compileStringFilter(fieldRef, description.readFilter());
      return Prisma.sql`NOT (${notCondition})`;
    }
  }
}

function likeCondition(
  fieldRef: PrismaSql,
  pattern: string,
  isCaseInsensitive: boolean,
): PrismaSql {
  if (isCaseInsensitive) {
    return Prisma.sql`LOWER(${fieldRef}) LIKE LOWER(${pattern})`;
  }
  return Prisma.sql`${fieldRef} LIKE ${pattern}`;
}
