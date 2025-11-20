import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class NotInOperator extends BaseOperator<unknown[]> {
  readonly key = 'notIn' as const;

  validate(value: unknown[]): boolean {
    return Array.isArray(value);
  }

  preprocessValue(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      throw new Error('notIn operator requires an array value');
    }
    return value;
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown[],
    isInsensitive: boolean,
  ): PrismaSql {
    if (value.length === 0) {
      return Prisma.sql`TRUE`;
    }

    const notInConditions = value.map((v) =>
      generateJsonPathCondition(fieldRef, jsonPath, 'not', v, isInsensitive),
    );

    return Prisma.sql`(${Prisma.join(notInConditions, ' AND ')})`;
  }

  getErrorMessage(context: string): string {
    switch (context) {
      case 'validation failed':
        return 'notIn operator requires an array value';
      default:
        return super.getErrorMessage(context);
    }
  }
}
