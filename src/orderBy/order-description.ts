import type { FieldConfig, JsonOrderByInput, OrderByConditions } from '../types';

export interface OrderByDescription {
  fieldName: string;
  orderValue: unknown;
}

export interface JsonOrderDescription {
  direction: 'ASC' | 'DESC';
  type: string;
  aggregation?: string;
}

const VALID_DIRECTIONS = new Set(['asc', 'desc']);
const VALID_TYPES = new Set(['text', 'int', 'float', 'boolean', 'timestamp']);
const VALID_AGGREGATIONS = new Set(['first', 'last', 'min', 'max', 'avg']);

/**
 * Lazily describe each configured order field while preserving condition order.
 * Values are captured by Object.entries when each condition is reached.
 */
export function* describeOrderBy<TConfig extends FieldConfig = FieldConfig>(
  orderBy: OrderByConditions<TConfig> | OrderByConditions<TConfig>[],
): Generator<OrderByDescription> {
  const orderArray = Array.isArray(orderBy) ? orderBy : [orderBy];

  for (const orderCondition of orderArray) {
    if (!orderCondition || Object.keys(orderCondition).length === 0) {
      continue;
    }

    for (const [fieldName, orderValue] of Object.entries(orderCondition)) {
      yield { fieldName, orderValue };
    }
  }
}

export function validateScalarDirection(orderValue: string): 'asc' | 'desc' | null {
  if (orderValue !== 'asc' && orderValue !== 'desc') {
    return null;
  }
  return orderValue;
}

/**
 * Read and validate JSON order metadata after the PostgreSQL compiler has
 * resolved the path. The property access order is part of the public timing.
 */
export function describeJsonOrder(jsonOrder: JsonOrderByInput): JsonOrderDescription | null {
  const rawDirection = (jsonOrder.direction || 'asc').toLowerCase();
  if (!VALID_DIRECTIONS.has(rawDirection)) {
    return null;
  }
  const direction = rawDirection.toUpperCase() as 'ASC' | 'DESC';
  const aggregation = jsonOrder.aggregation;

  const type = VALID_TYPES.has(jsonOrder.type || '') ? jsonOrder.type || 'text' : 'text';

  if (aggregation && !VALID_AGGREGATIONS.has(aggregation)) {
    return null;
  }

  return { direction, type, aggregation };
}
