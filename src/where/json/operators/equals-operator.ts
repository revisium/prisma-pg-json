import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class EqualsOperator extends BaseOperator<unknown> {
  readonly key = 'equals';

  validate(value: unknown): boolean {
    return value !== undefined;
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): PrismaSql {
    return generateJsonPathCondition(fieldRef, jsonPath, 'equals', value, isInsensitive);
  }

  handleSpecialPath(fieldRef: PrismaSql, value: unknown): PrismaSql {
    return Prisma.sql`${fieldRef} = ${JSON.stringify(value)}::jsonb`;
  }

  supportsSpecialPath(): boolean {
    return true;
  }
}
