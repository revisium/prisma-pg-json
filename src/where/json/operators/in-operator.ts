import { Prisma } from '@prisma/client';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class InOperator extends BaseOperator<unknown[]> {
  readonly key = 'in';

  validate(value: unknown[]): boolean {
    return Array.isArray(value);
  }

  preprocessValue(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      throw new Error('in operator requires an array value');
    }
    return value;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown[],
    isInsensitive: boolean,
  ): Prisma.Sql {
    if (value.length === 0) {
      return Prisma.sql`FALSE`;
    }

    const inConditions = value.map((v) =>
      generateJsonPathCondition(fieldRef, jsonPath, 'equals', v, isInsensitive),
    );

    return Prisma.sql`(${Prisma.join(inConditions, ' OR ')})`;
  }

  getErrorMessage(context: string): string {
    switch (context) {
      case 'validation failed':
        return 'in operator requires an array value';
      default:
        return super.getErrorMessage(context);
    }
  }

  // Custom behavior: empty array handling
  handleEmptyArray(): Prisma.Sql {
    return Prisma.sql`FALSE`;
  }
}
