import { Prisma, PrismaSql } from '../prisma-adapter';
import type { FieldConfig, FieldType } from '../types';

/** Quote one PostgreSQL identifier; identifiers cannot be bound as values. */
export function quoteIdentifier(identifier: string): PrismaSql {
  if (typeof identifier !== 'string' || identifier.length === 0 || identifier.includes('\0')) {
    throw new Error('Invalid SQL identifier');
  }
  return Prisma.raw('"' + identifier.replaceAll('"', '""') + '"');
}

/** An empty config preserves the legacy string-field fallback. */
export function resolveFieldType(field: string, fieldConfig: FieldConfig): FieldType {
  if (Object.hasOwn(fieldConfig, field)) {
    return fieldConfig[field];
  }
  if (Object.keys(fieldConfig).length > 0) {
    throw new Error(`Unknown field: ${field}`);
  }
  return 'string';
}
