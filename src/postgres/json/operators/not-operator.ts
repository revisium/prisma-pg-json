import { PrismaSql } from '../../../prisma-adapter';
import { isJsonOperand } from '../../../where/json/comparison-description';
import { generateJsonPathCondition } from '../comparison';
import { BaseOperator } from './base-operator';

export class NotOperator extends BaseOperator<unknown> {
  readonly key = 'not' as const;

  validate(value: unknown): boolean {
    return isJsonOperand(value);
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): PrismaSql {
    return generateJsonPathCondition(fieldRef, jsonPath, 'not', value, isInsensitive);
  }
}
