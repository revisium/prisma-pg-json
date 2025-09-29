import { Prisma } from '@prisma/client';
import { escapeRegex } from '../jsonpath/utils';
import { BaseOperator } from './base-operator';
import { generateJsonPathLikeRegex } from '../../../utils/sql-jsonpath';

export class StringEndsWithOperator extends BaseOperator<string> {
  readonly key = 'string_ends_with' as const;

  validate(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  }

  preprocessValue(value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error('string_ends_with requires a string value');
    }
    return value;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: string,
    isInsensitive: boolean,
  ): Prisma.Sql {
    const escapedValue = escapeRegex(value);
    const pattern = `.*${escapedValue}$`;

    return generateJsonPathLikeRegex(fieldRef, jsonPath, pattern, isInsensitive);
  }

  getErrorMessage(context: string): string {
    switch (context) {
      case 'validation failed':
        return 'string_ends_with requires a non-empty string value';
      default:
        return super.getErrorMessage(context);
    }
  }
}
