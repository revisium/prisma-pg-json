import { PrismaSql } from '../../../prisma-adapter';
import { isJsonComparisonOperand } from '../../../where/json/comparison-description';
import { generateJsonPathCondition } from '../comparison';
import { BaseOperator } from './base-operator';

type ComparisonKey = 'gt' | 'gte' | 'lt' | 'lte';

export class ComparisonOperator extends BaseOperator<unknown> {
  readonly key: ComparisonKey;

  constructor(key: ComparisonKey) {
    super();
    this.key = key;
  }

  validate(value: unknown): boolean {
    return isJsonComparisonOperand(value);
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): PrismaSql {
    return generateJsonPathCondition(fieldRef, jsonPath, this.key, value, isInsensitive);
  }
}
