import { Prisma } from '@prisma/client';
import { generateJsonPathCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class EqualsOperator extends BaseOperator<unknown> {
  readonly key = 'equals';

  validate(value: unknown): boolean {
    return value !== undefined;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): Prisma.Sql {
    return generateJsonPathCondition(fieldRef, jsonPath, 'equals', value, isInsensitive);
  }

  handleSpecialPath(fieldRef: Prisma.Sql, value: unknown): Prisma.Sql {
    return Prisma.sql`${fieldRef} = ${JSON.stringify(value)}::jsonb`;
  }

  supportsSpecialPath(): boolean {
    return true;
  }
}
