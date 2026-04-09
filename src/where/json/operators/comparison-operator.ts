import { PrismaSql } from '../../../prisma-adapter';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';
import type { JsonFilter } from '../../../types';

type ComparisonKey = 'gt' | 'gte' | 'lt' | 'lte';

export class ComparisonOperator extends BaseOperator<unknown> {
  readonly key: ComparisonKey;

  constructor(key: ComparisonKey) {
    super();
    this.key = key;
  }

  validate(value: unknown): boolean {
    return value !== undefined && value !== null &&
           (typeof value === 'string' || typeof value === 'number');
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): PrismaSql {
    return generateJsonPathCondition(fieldRef, jsonPath, this.key as keyof JsonFilter, value, isInsensitive);
  }
}
