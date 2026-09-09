import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { isJsonOperand } from '../../../where/json/comparison-description';
import { generateJsonbValue, escapeRegex } from '../utils';
import { BaseOperator } from './base-operator';
import {
  generateJsonPathLikeRegex,
  generateJsonPathExistsWithParam,
} from '../../jsonpath-expressions';

export class ArrayStartsWithOperator extends BaseOperator<unknown> {
  readonly key = 'array_starts_with' as const;

  validate(value: unknown): boolean {
    return isJsonOperand(value);
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): PrismaSql {
    const fullPath = `${jsonPath}[0]`;

    // Compare structured endpoints as JSONB; JSONPath equality unwraps nested arrays.
    if (value !== null && typeof value === 'object') {
      return Prisma.sql`EXISTS (
        SELECT 1 FROM jsonb_path_query(${fieldRef}, ${jsonPath}::jsonpath) AS container(value)
        WHERE jsonb_typeof(container.value) = 'array'
          AND container.value -> 0 = ${generateJsonbValue(value)}
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
