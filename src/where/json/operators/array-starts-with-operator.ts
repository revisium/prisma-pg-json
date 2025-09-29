import { Prisma } from '@prisma/client';
import { generateJsonbValue, escapeRegex } from '../jsonpath/utils';
import { BaseOperator } from './base-operator';
import {
  generateJsonPathLikeRegex,
  generateJsonPathExistsWithParam,
} from '../../../utils/sql-jsonpath';

export class ArrayStartsWithOperator extends BaseOperator<unknown> {
  readonly key = 'array_starts_with' as const;

  validate(value: unknown): boolean {
    return value !== undefined;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
  ): Prisma.Sql {
    const fullPath = `${jsonPath}[0]`;

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
