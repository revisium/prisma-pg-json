import { Prisma, PrismaSql } from '../prisma-adapter';
import {
  FieldConfig,
  GenerateOrderByParams,
  JsonOrderByInput,
  OrderByConditions,
  OrderByPart,
} from '../types';
import { convertToJsonPath, jsonPathToTextSegments } from './json-path';
import { quoteIdentifier } from './identifiers';
import { resolveFieldType } from '../utils/field-config';
import {
  describeJsonOrder,
  describeOrderBy,
  validateScalarDirection,
} from '../orderBy/order-description';
import { validateQueryInput } from '../utils/query-validation';
import { validateSqlIdentifier } from '../sub-schema/validation';

export function compileOrderByParts<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): OrderByPart[] {
  const { tableAlias, orderBy, fieldConfig } = params;
  validateQueryInput(orderBy);
  validateSqlIdentifier(tableAlias, 'tableAlias');
  if (!orderBy) {
    return [];
  }
  return processOrderByParts(orderBy, fieldConfig, tableAlias);
}

function processOrderByParts<TConfig extends FieldConfig>(
  orderBy: OrderByConditions<TConfig> | OrderByConditions<TConfig>[],
  fieldConfig: TConfig,
  tableAlias: string,
): OrderByPart[] {
  const parts: OrderByPart[] = [];

  for (const { fieldName, orderValue } of describeOrderBy(orderBy)) {
    const part = processFieldOrderBy(tableAlias, fieldName, orderValue, fieldConfig);
    if (part) {
      parts.push(part);
    }
  }

  return parts;
}

export function compileOrderByClauses<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): PrismaSql | null {
  const parts = compileOrderByParts(params);

  if (parts.length === 0) {
    return null;
  }

  const orderClauses = parts.map(
    (part) => Prisma.sql`${part.expression} ${Prisma.raw(part.direction)}`,
  );

  return Prisma.join(orderClauses, ', ');
}

export function compileOrderBy<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateOrderByParams<TConfig>,
): PrismaSql | null {
  const clauses = compileOrderByClauses(params);

  if (!clauses) {
    return null;
  }

  return Prisma.sql`ORDER BY ${clauses}`;
}

function processFieldOrderBy(
  tableAlias: string,
  fieldName: string,
  orderValue: unknown,
  fieldConfig: FieldConfig,
): OrderByPart | null {
  const fieldType = resolveFieldType(fieldName, fieldConfig);
  if (typeof orderValue === 'string') {
    return processStringOrder(tableAlias, fieldName, orderValue);
  }
  if (typeof orderValue === 'object' && orderValue && fieldType === 'json') {
    return processJsonOrder(tableAlias, fieldName, orderValue as JsonOrderByInput);
  }
  return null;
}

function processStringOrder(
  tableAlias: string,
  fieldName: string,
  orderValue: string,
): OrderByPart | null {
  const validDirection = validateScalarDirection(orderValue);
  if (!validDirection) {
    return null;
  }
  const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}.${quoteIdentifier(fieldName)}`;
  const direction = validDirection.toUpperCase() as 'ASC' | 'DESC';
  return { expression: fieldRef, direction, fieldName, isJson: false };
}

function processJsonOrder(
  tableAlias: string,
  fieldName: string,
  jsonOrder: JsonOrderByInput,
): OrderByPart | null {
  const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}.${quoteIdentifier(fieldName)}`;
  const result = processJsonFieldParts(fieldRef, jsonOrder);
  if (!result) {
    return null;
  }
  return {
    expression: result.expression,
    direction: result.direction,
    fieldName,
    isJson: true,
    jsonConfig: jsonOrder,
  };
}

function processJsonFieldParts(
  fieldRef: PrismaSql,
  jsonOrder: JsonOrderByInput,
): { expression: PrismaSql; direction: 'ASC' | 'DESC' } | null {
  const jsonPath = convertToJsonPath(jsonOrder.path);
  const description = describeJsonOrder(jsonOrder);
  if (!description) {
    return null;
  }

  if (description.aggregation) {
    return {
      expression: buildAggregationExpression(
        fieldRef,
        jsonPath,
        description.type,
        description.aggregation,
      ),
      direction: description.direction,
    };
  }

  const pathSegments = jsonPathToTextSegments(jsonPath);
  const jsonPathExpression = Prisma.sql`${fieldRef}#>>${pathSegments}::text[]`;
  const typedExpression = Prisma.sql`(${jsonPathExpression})::${Prisma.raw(description.type)}`;

  return { expression: typedExpression, direction: description.direction };
}

function buildAggregationExpression(
  fieldRef: PrismaSql,
  jsonPath: string,
  type: string,
  aggregation: string,
): PrismaSql {
  const hasWildcard = jsonPath.includes('[*]');

  if (hasWildcard) {
    if (aggregation === 'first' || aggregation === 'last') {
      const modifiedPath = jsonPath.replace('[*]', aggregation === 'first' ? '[0]' : '[last]');
      return castJsonEndpoint(fieldRef, modifiedPath, type);
    }

    const [beforeWildcard, afterWildcard = ''] = jsonPath.split('[*]');
    const pathSegments = jsonPathToTextSegments(beforeWildcard);
    const subPathSegments = jsonPathToTextSegments(afterWildcard);
    const aggregationFunc = aggregation.toUpperCase();
    const elemAccess = subPathSegments.length
      ? Prisma.sql`elem#>>${subPathSegments}::text[]`
      : Prisma.sql`elem#>>'{}'`;

    return Prisma.sql`(
      SELECT ${Prisma.raw(aggregationFunc)}((${elemAccess})::${Prisma.raw(type)})
      FROM jsonb_array_elements((${fieldRef}#>${pathSegments}::text[])::jsonb) AS elem
    )`;
  }

  if (aggregation === 'last') {
    const suffix = '[last]';
    const modifiedPath = jsonPath.endsWith('$')
      ? jsonPath.replace(/\$$/, suffix)
      : jsonPath + suffix;
    return castJsonEndpoint(fieldRef, modifiedPath, type);
  } else if (aggregation === 'first') {
    const suffix = '[0]';
    const modifiedPath = jsonPath.endsWith('$')
      ? jsonPath.replace(/\$$/, suffix)
      : jsonPath + suffix;
    return castJsonEndpoint(fieldRef, modifiedPath, type);
  }

  const pathSegments = jsonPathToTextSegments(jsonPath);

  const aggregationFunc = aggregation.toUpperCase();

  return Prisma.sql`(
    SELECT ${Prisma.raw(aggregationFunc)}((elem#>>'{}')::${Prisma.raw(type)})
    FROM jsonb_array_elements((${fieldRef}#>${pathSegments}::text[])::jsonb) AS elem
  )`;
}

function castJsonEndpoint(fieldRef: PrismaSql, jsonPath: string, type: string): PrismaSql {
  const value = Prisma.sql`jsonb_path_query_first(${fieldRef}, ${jsonPath}::jsonpath)`;
  if (type === 'int') {
    // Retain JSON number rounding while also accepting integer strings.
    return Prisma.sql`CASE WHEN jsonb_typeof(${value}) = 'number'
      THEN (${value})::int ELSE (${value}#>>'{}')::int END`;
  }
  return Prisma.sql`(${value}#>>'{}')::${Prisma.raw(type)}`;
}
