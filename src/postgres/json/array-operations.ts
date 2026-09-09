import { Prisma, PrismaSql } from '../../prisma-adapter';
import {
  describeArrayObjectMembers,
  isJsonContainer,
  prepareArrayContainsOperand,
} from '../../where/json/array-description';
import { generateJsonPathLikeRegex, generateJsonPathExistsWithParams, generateJsonPathExistsWithParam, generateJsonBuildObject } from '../jsonpath-expressions';
import { generateJsonbValue, escapeRegex } from './utils';

export function generateArrayCondition(
  fieldRef: PrismaSql,
  jsonPath: string,
  operator: string,
  value: unknown[],
  isInsensitive: boolean = false,
): PrismaSql {
  if (operator !== 'array_contains') {
    throw new Error(`Unsupported array operator: ${operator}`);
  }

  const preparedValue = prepareArrayContainsOperand(
    value,
    'processArrayContains: value must be an array',
  );
  if (preparedValue.length === 0) {
    throw new Error('processArrayContains: value array cannot be empty');
  }

  if (isInsensitive && preparedValue.length > 1) {
    throw new Error(
      'processArrayContains: insensitive mode with multiple elements not supported yet',
    );
  }

  const conditions = preparedValue.map((val, index) => {
    if (isInsensitive && typeof val === 'string') {
      const pattern = `^${escapeRegex(val)}$`;
      return generateJsonPathLikeRegex(fieldRef, `${jsonPath}[*]`, pattern, true);
    } else if (Array.isArray(val)) {
      return Prisma.sql`EXISTS (
        SELECT 1 FROM jsonb_path_query(${fieldRef}, ${`${jsonPath}[*]`}::jsonpath) AS element(value)
        WHERE element.value = ${generateJsonbValue(val)}
      )`;
    } else if (typeof val === 'object' && val !== null) {
      // For complex objects, check if a single array element contains all key-value pairs
      const propertyChecks = describeArrayObjectMembers(val).map(({ key, objValue, keyIndex }) => ({
        key,
        objValue,
        paramName: `val${index}${keyIndex}`,
      }));

      if (propertyChecks.some(({ objValue }) => isJsonContainer(objValue))) {
        const memberConditions = propertyChecks.map(({ key, objValue }) => {
          if (isJsonContainer(objValue)) {
            return Prisma.sql`element.value -> ${key}::text = ${generateJsonbValue(objValue)}`;
          }
          return generateJsonPathExistsWithParam(
            Prisma.sql`element.value`,
            `$ ? (@.${JSON.stringify(key)} == $val)`,
            generateJsonbValue(objValue),
          );
        });
        return Prisma.sql`EXISTS (
          SELECT 1 FROM jsonb_path_query(${fieldRef}, ${`${jsonPath}[*]`}::jsonpath) AS element(value)
          WHERE ${Prisma.join(memberConditions, ' AND ')}
        )`;
      }

      const propertyConditions = propertyChecks.map(
        ({ key, paramName }) => `@.${JSON.stringify(key)} == $${paramName}`,
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
      return generateJsonPathExistsWithParams(fieldRef, condition, generateJsonBuildObject(params));
    }
  });
  return Prisma.join(conditions, ' AND ');
}
