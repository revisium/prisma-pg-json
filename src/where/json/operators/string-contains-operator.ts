import { PrismaSql } from '../../../prisma-adapter';
import { escapeRegex } from '../jsonpath/utils';
import { BaseOperator } from './base-operator';
import { generateJsonPathLikeRegex } from '../../../utils/sql-jsonpath';

export class StringContainsOperator extends BaseOperator<string> {
  readonly key = 'string_contains';

  validate(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  }

  preprocessValue(value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error('string_contains requires a string value');
    }
    return value;
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: string,
    isInsensitive: boolean,
  ): PrismaSql {
    const escapedValue = escapeRegex(value);
    const pattern = `.*${escapedValue}.*`;

    return generateJsonPathLikeRegex(fieldRef, jsonPath, pattern, isInsensitive);
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
        return 'string_contains requires a non-empty string value';
      case 'special path not supported':
        return 'string_contains does not support operations on empty path';
      default:
        return super.getErrorMessage(context);
    }
  }

  getSearchPattern(value: string): string {
    return `.*${escapeRegex(value)}.*`;
  }
}
