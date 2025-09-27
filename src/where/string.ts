import { Prisma } from '@prisma/client';
import { StringFilter } from '../types';

export function generateStringFilter(
  fieldRef: Prisma.Sql,
  filter: string | StringFilter,
): Prisma.Sql {
  if (typeof filter === 'string') {
    return Prisma.sql`${fieldRef} = ${filter}`;
  }

  const conditions: Prisma.Sql[] = [];
  const isCaseInsensitive = filter.mode === 'insensitive';

  if (filter.equals !== undefined) {
    if (isCaseInsensitive) {
      conditions.push(Prisma.sql`LOWER(${fieldRef}) = LOWER(${filter.equals})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} = ${filter.equals}`);
    }
  }

  if (filter.contains !== undefined) {
    const pattern = `%${filter.contains}%`;
    if (isCaseInsensitive) {
      conditions.push(Prisma.sql`LOWER(${fieldRef}) LIKE LOWER(${pattern})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} LIKE ${pattern}`);
    }
  }

  if (filter.startsWith !== undefined) {
    const pattern = `${filter.startsWith}%`;
    if (isCaseInsensitive) {
      conditions.push(Prisma.sql`LOWER(${fieldRef}) LIKE LOWER(${pattern})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} LIKE ${pattern}`);
    }
  }

  if (filter.endsWith !== undefined) {
    const pattern = `%${filter.endsWith}`;
    if (isCaseInsensitive) {
      conditions.push(Prisma.sql`LOWER(${fieldRef}) LIKE LOWER(${pattern})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} LIKE ${pattern}`);
    }
  }

  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    if (isCaseInsensitive) {
      const lowercaseValues = filter.in.map(val => val.toLowerCase());
      conditions.push(Prisma.sql`LOWER(${fieldRef}) IN (${Prisma.join(lowercaseValues, ', ')})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} IN (${Prisma.join(filter.in, ', ')})`);
    }
  }

  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    if (isCaseInsensitive) {
      const lowercaseValues = filter.notIn.map(val => val.toLowerCase());
      conditions.push(Prisma.sql`LOWER(${fieldRef}) NOT IN (${Prisma.join(lowercaseValues, ', ')})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} NOT IN (${Prisma.join(filter.notIn, ', ')})`);
    }
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

  if (filter.search !== undefined) {
    // PostgreSQL full-text search using to_tsvector and plainto_tsquery
    conditions.push(Prisma.sql`to_tsvector('english', ${fieldRef}) @@ plainto_tsquery('english', ${filter.search})`);
  }

  if (filter.not !== undefined) {
    if (typeof filter.not === 'string') {
      if (isCaseInsensitive) {
        conditions.push(Prisma.sql`LOWER(${fieldRef}) != LOWER(${filter.not})`);
      } else {
        conditions.push(Prisma.sql`${fieldRef} != ${filter.not}`);
      }
    } else {
      const notCondition = generateStringFilter(fieldRef, filter.not);
      conditions.push(Prisma.sql`NOT (${notCondition})`);
    }
  }

  if (conditions.length === 0) {
    throw new Error('String filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}
