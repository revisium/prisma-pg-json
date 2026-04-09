import { PrismaSql } from '../../prisma-adapter';
import type { JsonFilter } from '../../types';
import { BaseOperator } from './operators/base-operator';
import {
  EqualsOperator,
  NotOperator,
  ComparisonOperator,
  StringPatternOperator,
  ArrayContainsOperator,
  ArrayStartsWithOperator,
  ArrayEndsWithOperator,
  InOperator,
  NotInOperator,
  SearchOperator,
} from './operators';

export class OperatorManager {
  private operators = new Map<keyof JsonFilter, BaseOperator>();

  constructor() {
    this.registerDefaultOperators();
  }

  private registerDefaultOperators(): void {
    const defaultOperators: BaseOperator[] = [
      new EqualsOperator(),
      new NotOperator(),
      new ComparisonOperator('gt'),
      new ComparisonOperator('gte'),
      new ComparisonOperator('lt'),
      new ComparisonOperator('lte'),
      new StringPatternOperator('string_contains'),
      new StringPatternOperator('string_starts_with'),
      new StringPatternOperator('string_ends_with'),
      new ArrayContainsOperator(),
      new ArrayStartsWithOperator(),
      new ArrayEndsWithOperator(),
      new InOperator(),
      new NotInOperator(),
      new SearchOperator(),
    ];

    defaultOperators.forEach((op) => this.register(op));
  }

  register(operator: BaseOperator): void {
    this.operators.set(operator.key, operator);
  }

  getOperator(key: keyof JsonFilter): BaseOperator | undefined {
    return this.operators.get(key);
  }

  processFilter(
    fieldRef: PrismaSql,
    jsonPath: string,
    filter: JsonFilter,
    isInsensitive: boolean,
    isSpecialPath: boolean = false,
  ): PrismaSql[] {
    const conditions: PrismaSql[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (
        key === 'path' ||
        key === 'mode' ||
        key === 'searchLanguage' ||
        key === 'searchType' ||
        key === 'searchIn' ||
        value === undefined
      ) {
        continue;
      }

      const operator = this.getOperator(key as keyof JsonFilter);
      if (operator) {
        try {
          const condition = operator.execute(
            fieldRef,
            jsonPath,
            value,
            isInsensitive,
            isSpecialPath,
            filter,
          );
          conditions.push(condition);
        } catch (error) {
          throw new Error(
            `Error processing operator '${key}': ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        throw new Error(`Unsupported operator: ${key}`);
      }
    }

    return conditions;
  }

  supportsSpecialPath(filter: JsonFilter): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === 'path' || key === 'mode' || value === undefined) {
        continue;
      }

      const operator = this.getOperator(key as keyof JsonFilter);
      if (operator && operator.supportsSpecialPath()) {
        return true;
      }
    }
    return false;
  }
}
