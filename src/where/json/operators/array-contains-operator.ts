import { Prisma } from '@prisma/client';
import { generateArrayCondition } from '../jsonpath';
import { BaseOperator } from './base-operator';

export class ArrayContainsOperator extends BaseOperator<unknown[]> {
  readonly key = 'array_contains';

  validate(value: unknown[]): boolean {
    return Array.isArray(value) && value.length > 0;
  }

  preprocessValue(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      throw new Error('array_contains value must be an array');
    }
    return value;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown[],
    isInsensitive: boolean,
  ): Prisma.Sql {
    return generateArrayCondition(fieldRef, jsonPath, 'array_contains', value, isInsensitive);
  }

  validatePath(path: string[] | string): boolean {
    if (Array.isArray(path) && path.length === 0) {
      return false;
    }
    return true;
  }

  getErrorMessage(context: string): string {
    switch (context) {
      case 'validation failed':
        return 'array_contains requires a non-empty array value';
      case 'special path not supported':
        return 'array_contains does not support operations on empty path';
      default:
        return super.getErrorMessage(context);
    }
  }
}
