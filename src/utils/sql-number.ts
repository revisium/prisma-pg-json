import { Prisma, PrismaSql } from '../prisma-adapter';

export function bindSqlNumber(value: number): PrismaSql {
  // Prisma can round fractional number parameters. Bind their decimal text with
  // an explicit numeric type so integer-column comparisons also remain valid.
  if (Number.isFinite(value) && !Number.isInteger(value)) {
    return Prisma.sql`${String(value)}::numeric`;
  }
  return Prisma.sql`${value}`;
}
