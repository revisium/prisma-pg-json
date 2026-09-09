import type { JsonFilter } from '../../types';

export function isJsonOperand(value: unknown): boolean {
  return value !== undefined;
}

export function isJsonComparisonOperand(value: unknown): boolean {
  return value !== undefined && value !== null && (typeof value === 'string' || typeof value === 'number');
}

export function prepareJsonMembershipOperand(value: unknown, operator: 'in' | 'notIn'): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${operator} operator requires an array value`);
  }
  return value;
}

export function nestJsonComparisonValue(pathSegments: string[], value: object): JsonFilter['equals'] {
  let nestedValue: unknown = value;
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    nestedValue = { [pathSegments[i]]: nestedValue };
  }
  return nestedValue;
}
