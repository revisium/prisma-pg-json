import type { FieldConfig, WhereConditionsTyped } from '../types';

type FilterClause<TConfig extends FieldConfig> =
  | { kind: 'field'; fieldName: string; value: unknown }
  | { kind: 'AND' | 'OR' | 'NOT'; conditions: WhereConditionsTyped<TConfig>[] };

// Defer child traversal until the preceding field or group has compiled, so
// invalid inputs keep their existing first error and sparse arrays keep their slots.
export function* describeFilter<TConfig extends FieldConfig>(
  where: WhereConditionsTyped<TConfig>,
): Generator<FilterClause<TConfig>> {
  for (const [fieldName, value] of Object.entries(where)) {
    if (fieldName === 'AND' || fieldName === 'OR' || fieldName === 'NOT') continue;
    if (value === undefined || value === null) continue;
    yield { kind: 'field', fieldName, value };
  }

  if (where.AND && Array.isArray(where.AND) && where.AND.length > 0) {
    yield { kind: 'AND', conditions: where.AND };
  }
  if (where.OR && Array.isArray(where.OR) && where.OR.length > 0) {
    yield { kind: 'OR', conditions: where.OR };
  }
  if (where.NOT) {
    yield { kind: 'NOT', conditions: Array.isArray(where.NOT) ? where.NOT : [where.NOT] };
  }
}
