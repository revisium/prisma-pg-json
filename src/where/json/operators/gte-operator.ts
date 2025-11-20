import { PrismaSql } from '../../../prisma-adapter';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class GteOperator extends BaseOperator<unknown> {
  readonly key = 'gte' as const;

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
    return generateJsonPathCondition(fieldRef, jsonPath, 'gte', value, isInsensitive);
  }
}
