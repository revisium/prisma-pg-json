import { Prisma } from '@prisma/client';
import type { JsonFilter } from '../../types';
import { BaseOperator } from './operators/base-operator';
import {
  EqualsOperator,
  NotOperator,
  GtOperator,
  GteOperator,
  LtOperator,
  LteOperator,
  StringContainsOperator,
  StringStartsWithOperator,
  StringEndsWithOperator,
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
    const defaultOperators = [
      new EqualsOperator(),
      new NotOperator(),
      new GtOperator(),
      new GteOperator(),
      new LtOperator(),
      new LteOperator(),
      new StringContainsOperator(),
      new StringStartsWithOperator(),
      new StringEndsWithOperator(),
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
    fieldRef: Prisma.Sql,
    jsonPath: string,
    filter: JsonFilter,
    isInsensitive: boolean,
    isSpecialPath: boolean = false,
  ): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [];

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
          if (operator instanceof SearchOperator) {
            operator.setContext(filter);
          }

          const condition = operator.execute(
            fieldRef,
            jsonPath,
            value,
            isInsensitive,
            isSpecialPath,
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
