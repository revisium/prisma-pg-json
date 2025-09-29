import { Prisma } from '@prisma/client';
import type { JsonFilter } from '../../../types';

export abstract class BaseOperator<T = unknown> {
  abstract readonly key: keyof JsonFilter;

  /**
   * Validate if the value is acceptable for this operator
   */
  abstract validate(value: T): boolean;

  /**
   * Generate the main SQL condition for this operator
   */
  abstract generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: T,
    isInsensitive: boolean,
  ): Prisma.Sql;

  /**
   * Optional: preprocess the value before using it
   */
  preprocessValue(value: unknown): T {
    return value as T;
  }

  /**
   * Optional: handle special path cases (e.g., empty path)
   */
  handleSpecialPath(_fieldRef: Prisma.Sql, _value: T): Prisma.Sql {
    throw new Error(`Operator ${this.key} does not support empty path operations`);
  }

  /**
   * Whether this operator supports special path handling
   */
  supportsSpecialPath(): boolean {
    return false;
  }

  /**
   * Optional: additional validation logic specific to operator
   */
  validatePath(_path: string[] | string): boolean {
    return true;
  }

  /**
   * Optional: custom error messages
   */
  getErrorMessage(context: string): string {
    return `Error in ${this.key} operator: ${context}`;
  }

  /**
   * Main execution method that coordinates all logic
   */
  execute(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
    isSpecialPath: boolean = false,
  ): Prisma.Sql {
    const processedValue = this.preprocessValue(value);

    if (!this.validate(processedValue)) {
      throw new Error(this.getErrorMessage('validation failed'));
    }

    if (isSpecialPath) {
      if (!this.supportsSpecialPath()) {
        throw new Error(this.getErrorMessage('special path not supported'));
      }
      return this.handleSpecialPath(fieldRef, processedValue);
    }

    return this.generateCondition(fieldRef, jsonPath, processedValue, isInsensitive);
  }
}
