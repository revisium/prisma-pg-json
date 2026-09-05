import type { FieldConfig, FieldType } from '../types';

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
