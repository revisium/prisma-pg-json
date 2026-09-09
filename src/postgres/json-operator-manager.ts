import { PrismaSql } from '../prisma-adapter';
import type { JsonFilter } from '../types';
import { describeJsonFilter, describeSpecialPathFilter } from '../where/json/filter-description';
import { BaseOperator } from '../where/json/operators/base-operator';
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
} from '../where/json/operators';

export class OperatorManager {
  private readonly operators = new Map<keyof JsonFilter, BaseOperator>();

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

    for (const [key, value] of describeJsonFilter(filter)) {
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
    for (const [key] of describeSpecialPathFilter(filter)) {
      const operator = this.getOperator(key as keyof JsonFilter);
      if (operator?.supportsSpecialPath()) {
        return true;
      }
    }
    return false;
  }
}
