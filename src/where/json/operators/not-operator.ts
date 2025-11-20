import { PrismaSql } from '../../../prisma-adapter';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class NotOperator extends BaseOperator<unknown> {
  readonly key = 'not' as const;

  validate(value: unknown): boolean {
    return value !== undefined;
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
