import { Prisma, PrismaSql } from '../prisma-adapter';
import { StringFilter } from '../types';

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

function processStringPatterns(
  fieldRef: PrismaSql,
  filter: StringFilter,
  isCaseInsensitive: boolean,
  conditions: PrismaSql[],
): void {
  if (filter.equals !== undefined) {
    if (isCaseInsensitive) {
      conditions.push(Prisma.sql`LOWER(${fieldRef}) = LOWER(${filter.equals})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} = ${filter.equals}`);
    }
  }
  if (filter.contains !== undefined) {
    conditions.push(likeCondition(fieldRef, `%${filter.contains}%`, isCaseInsensitive));
  }
  if (filter.startsWith !== undefined) {
    conditions.push(likeCondition(fieldRef, `${filter.startsWith}%`, isCaseInsensitive));
  }
  if (filter.endsWith !== undefined) {
    conditions.push(likeCondition(fieldRef, `%${filter.endsWith}`, isCaseInsensitive));
  }
}

function processStringArrayFilters(
  fieldRef: PrismaSql,
  filter: StringFilter,
  isCaseInsensitive: boolean,
  conditions: PrismaSql[],
): void {
  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    if (isCaseInsensitive) {
      const lowercaseValues = filter.in.map((val) => val.toLowerCase());
      conditions.push(Prisma.sql`LOWER(${fieldRef}) IN (${Prisma.join(lowercaseValues, ', ')})`);
    } else {
      conditions.push(Prisma.sql`${fieldRef} IN (${Prisma.join(filter.in, ', ')})`);
    }
  }
  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    if (isCaseInsensitive) {
      const lowercaseValues = filter.notIn.map((val) => val.toLowerCase());
      conditions.push(
        Prisma.sql`LOWER(${fieldRef}) NOT IN (${Prisma.join(lowercaseValues, ', ')})`,
      );
    } else {
      conditions.push(Prisma.sql`${fieldRef} NOT IN (${Prisma.join(filter.notIn, ', ')})`);
    }
  }
}

function processStringComparisons(
  fieldRef: PrismaSql,
  filter: StringFilter,
  conditions: PrismaSql[],
): void {
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
    conditions.push(
      Prisma.sql`to_tsvector('english', ${fieldRef}) @@ plainto_tsquery('english', ${filter.search})`,
    );
  }
}

function processStringNot(
  fieldRef: PrismaSql,
  not: string | StringFilter,
  isCaseInsensitive: boolean,
): PrismaSql {
  if (typeof not === 'string') {
    if (isCaseInsensitive) {
      return Prisma.sql`LOWER(${fieldRef}) != LOWER(${not})`;
    }
    return Prisma.sql`${fieldRef} != ${not}`;
  }
  const notCondition = generateStringFilter(fieldRef, not);
  return Prisma.sql`NOT (${notCondition})`;
}

/**
 * Generate a WHERE condition for a string column.
 *
 * Supports: equals, not, contains, startsWith, endsWith, in, notIn, gt, gte, lt, lte, search.
 * Set `mode: 'insensitive'` for case-insensitive matching.
 *
 * @param fieldRef - SQL reference to the column (e.g., `Prisma.sql\`u."name"\``)
 * @param filter - String value for exact match, or StringFilter object
 * @returns Parameterized SQL condition
 */
export function generateStringFilter(
  fieldRef: PrismaSql,
  filter: string | StringFilter,
): PrismaSql {
  if (typeof filter === 'string') {
    return Prisma.sql`${fieldRef} = ${filter}`;
  }

  const conditions: PrismaSql[] = [];
  const isCaseInsensitive = filter.mode === 'insensitive';

  processStringPatterns(fieldRef, filter, isCaseInsensitive, conditions);
  processStringArrayFilters(fieldRef, filter, isCaseInsensitive, conditions);
  processStringComparisons(fieldRef, filter, conditions);

  if (filter.not !== undefined) {
    conditions.push(processStringNot(fieldRef, filter.not, isCaseInsensitive));
  }

  if (conditions.length === 0) {
    throw new Error('String filter must have at least one condition');
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.join(conditions, ' AND ');
}
