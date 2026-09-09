import { PrismaSql } from '../../../prisma-adapter';
import { prepareJsonString, isNonEmptyJsonString } from '../../../where/json/string-description';
import { escapeRegex } from '../utils';
import { BaseOperator } from './base-operator';
import { generateJsonPathLikeRegex } from '../../jsonpath-expressions';

type StringPatternKey = 'string_contains' | 'string_starts_with' | 'string_ends_with';

export class StringPatternOperator extends BaseOperator<string> {
  readonly key: StringPatternKey;
  private readonly buildPattern: (escaped: string) => string;

  constructor(key: StringPatternKey) {
    super();
    this.key = key;

    switch (key) {
      case 'string_contains':
        this.buildPattern = (v) => `.*${v}.*`;
        break;
      case 'string_starts_with':
        this.buildPattern = (v) => `^${v}.*`;
        break;
      case 'string_ends_with':
        this.buildPattern = (v) => `.*${v}$`;
        break;
    }
  }

  validate(value: string): boolean {
    return isNonEmptyJsonString(value);
  }

  preprocessValue(value: unknown): string {
    return prepareJsonString(value, this.key);
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: string,
    isInsensitive: boolean,
  ): PrismaSql {
    const pattern = this.buildPattern(escapeRegex(value));
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
        return `${this.key} requires a non-empty string value`;
      case 'special path not supported':
        return `${this.key} does not support operations on empty path`;
      default:
        return super.getErrorMessage(context);
    }
  }
}
