import { Prisma } from '@prisma/client';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class LteOperator extends BaseOperator<unknown> {
  readonly key = 'lte' as const;

  validate(value: unknown): boolean {
    return value !== undefined && value !== null &&
           (typeof value === 'string' || typeof value === 'number');
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): Prisma.Sql {
    return generateJsonPathCondition(fieldRef, jsonPath, 'lte', value, isInsensitive);
  }
}
