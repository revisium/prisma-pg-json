import { Prisma, PrismaSql } from '../../../prisma-adapter';
import { generateJsonbValue, escapeRegex } from './utils';
import {
  generateJsonPathLikeRegex,
  generateJsonPathExistsWithParams,
  generateJsonBuildObject,
} from '../../../utils/sql-jsonpath';

export function generateArrayCondition(
  fieldRef: PrismaSql,
  jsonPath: string,
  operator: string,
  value: unknown[],
  isInsensitive: boolean = false,
): PrismaSql {
  switch (operator) {
    case 'array_contains': {
      if (!Array.isArray(value)) {
        throw new Error('processArrayContains: value must be an array');
      }
      if (value.length === 0) {
        throw new Error('processArrayContains: value array cannot be empty');
      }

      if (isInsensitive && value.length > 1) {
        throw new Error(
          'processArrayContains: insensitive mode with multiple elements not supported yet',
        );
      }

      const conditions = value.map((val, index) => {
        if (isInsensitive && typeof val === 'string') {
          const pattern = `^${escapeRegex(val)}$`;
          return generateJsonPathLikeRegex(fieldRef, `${jsonPath}[*]`, pattern, true);
        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          // For complex objects, check if a single array element contains all key-value pairs
          const propertyChecks = Object.entries(val).map(([key, objValue], keyIndex) => {
            const paramName = `val${index}${keyIndex}`;
            return { key, objValue, paramName };
          });

          const propertyConditions = propertyChecks.map(
            ({ key, paramName }) => `@.${key} == $${paramName}`,
          );
          const condition = `${jsonPath}[*] ? (${propertyConditions.join(' && ')})`;

          // Build parameters as a JSON object
          const paramsObj: Record<string, unknown> = {};
          propertyChecks.forEach(({ paramName, objValue }) => {
            paramsObj[paramName] = objValue;
          });

          return generateJsonPathExistsWithParams(
            fieldRef,
            condition,
            Prisma.sql`${JSON.stringify(paramsObj)}`,
          );
        } else {
          const jsonbValue = generateJsonbValue(val);
          const condition = `${jsonPath}[*] ? (@ == $val${index})`;
          const params = { [`val${index}`]: jsonbValue };
          return generateJsonPathExistsWithParams(
            fieldRef,
            condition,
            generateJsonBuildObject(params),
          );
        }
      });
      return Prisma.join(conditions, ' AND ');
    }
    default:
      throw new Error(`Unsupported array operator: ${operator}`);
  }
}
