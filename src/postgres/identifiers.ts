import { Prisma, PrismaSql } from '../prisma-adapter';

export function escapeIdentifier(identifier: string): string {
  if (typeof identifier !== 'string' || identifier.length === 0 || identifier.includes('\0')) {
    throw new Error('Invalid SQL identifier');
  }
  return identifier.replaceAll('"', '""');
}

/** Quote one PostgreSQL identifier; identifiers cannot be bound as values. */
export function quoteIdentifier(identifier: string): PrismaSql {
  const escapedIdentifier = escapeIdentifier(identifier);
  return Prisma.raw('"' + escapedIdentifier + '"');
}
