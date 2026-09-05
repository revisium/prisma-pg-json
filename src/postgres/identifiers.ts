import { Prisma, PrismaSql } from '../prisma-adapter';

/** Quote one PostgreSQL identifier; identifiers cannot be bound as values. */
export function quoteIdentifier(identifier: string): PrismaSql {
  if (typeof identifier !== 'string' || identifier.length === 0 || identifier.includes('\0')) {
    throw new Error('Invalid SQL identifier');
  }
  return Prisma.raw('"' + identifier.replaceAll('"', '""') + '"');
}
