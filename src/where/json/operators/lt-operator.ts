import { Prisma } from '@prisma/client';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class LtOperator extends BaseOperator<unknown> {
  readonly key = 'lt' as const;

  validate(value: unknown): boolean {
    return value !== undefined;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): Prisma.Sql {
    return generateJsonPathCondition(fieldRef, jsonPath, 'lt', value, isInsensitive);
  }
}
