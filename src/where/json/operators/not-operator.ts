import { Prisma } from '@prisma/client';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class NotOperator extends BaseOperator<unknown> {
  readonly key = 'not' as const;

  validate(value: unknown): boolean {
    return value !== undefined;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): Prisma.Sql {
    return generateJsonPathCondition(fieldRef, jsonPath, 'not', value, isInsensitive);
  }
}
