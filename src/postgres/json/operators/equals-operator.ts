import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { isJsonOperand } from '../../../where/json/comparison-description';
import { generateJsonPathCondition } from '../comparison';
import { BaseOperator } from './base-operator';

export class EqualsOperator extends BaseOperator<unknown> {
  readonly key = 'equals';

  validate(value: unknown): boolean {
    return isJsonOperand(value);
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
