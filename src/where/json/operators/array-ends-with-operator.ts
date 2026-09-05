import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { generateJsonbValue, escapeRegex } from '../jsonpath/utils';
import { BaseOperator } from './base-operator';
import {
  generateJsonPathLikeRegex,
  generateJsonPathExistsWithParam,
} from '../../../utils/sql-jsonpath';

export class ArrayEndsWithOperator extends BaseOperator<unknown> {
  readonly key = 'array_ends_with' as const;

  validate(value: unknown): boolean {
    return value !== undefined;
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): PrismaSql {
    const fullPath = `${jsonPath}[last]`;

    // Compare structured endpoints as JSONB; JSONPath equality unwraps nested arrays.
    if (value !== null && typeof value === 'object') {
      return Prisma.sql`EXISTS (
        SELECT 1 FROM jsonb_path_query(${fieldRef}, ${jsonPath}::jsonpath) AS container(value)
        WHERE jsonb_typeof(container.value) = 'array'
          AND container.value -> -1 = ${generateJsonbValue(value)}
      )`;
    }

    if (isInsensitive && typeof value === 'string') {
      const escapedValue = escapeRegex(value);
      const pattern = `^${escapedValue}$`;
      return generateJsonPathLikeRegex(fieldRef, fullPath, pattern, true);
    } else {
      const jsonbValue = generateJsonbValue(value);
      const condition = `${fullPath} ? (@ == $val)`;
      return generateJsonPathExistsWithParam(fieldRef, condition, jsonbValue);
    }
  }
}
