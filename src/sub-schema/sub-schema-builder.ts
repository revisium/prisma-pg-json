/**
 * SubSchema Query Builder
 *
 * Builds SQL components to extract sub-schema items from JSONB Row.data fields
 * based on $ref paths defined in table schemas. Supports filtering, sorting,
 * and pagination across multiple tables.
 *
 * The builder provides three separate functions that can be combined in the consumer:
 * - buildSubSchemaCte: Generates the CTE (Common Table Expression) with UNION ALL
 * - buildSubSchemaWhere: Generates WHERE clause for filtering
 * - buildSubSchemaOrderBy: Generates ORDER BY clause for sorting
 *
 * @example
 * ```typescript
 * // In consumer (e.g., revisium-core):
 * const cte = buildSubSchemaCte({ tables });
 * const whereClause = buildSubSchemaWhere(where);
 * const orderByClause = buildSubSchemaOrderBy(orderBy);
 *
 * const query = Prisma.sql`
 *   ${cte}
 *   SELECT
 *     r."versionId", r."id", r."data", ...  -- Row fields
 *     t."versionId", t."id", ...            -- Table fields
 *     s."fieldPath", s."data" as "subSchemaData"
 *   FROM sub_schema_items s
 *   INNER JOIN "Row" r ON r."versionId" = s."rowVersionId"
 *   INNER JOIN "Table" t ON t."id" = s."tableId"
 *   ${whereClause}
 *   ${orderByClause}
 *   LIMIT ${take} OFFSET ${skip}
 * `;
 * ```
 *
 * @pathformat
 * The `path` field uses dot-notation for nested objects and `[*]` for arrays:
 *
 * **Single paths (no arrays):**
 * - `'avatar'` - top-level field → `data->'avatar'`
 * - `'profile.photo'` - nested object → `data->'profile'->'photo'`
 * - `'settings.images.logo'` - deeply nested → `data->'settings'->'images'->'logo'`
 *
 * **Array paths (with [*] wildcard):**
 * Use `[*]` to mark array positions. Each array element becomes a separate row.
 * The builder uses `jsonb_array_elements()` with CROSS JOIN LATERAL.
 *
 * - Simple array: `'gallery[*]'` → `gallery[0]`, `gallery[1]`, ...
 * - Nested inside object: `'value.files[*]'` → `value.files[0]`, `value.files[1]`, ...
 * - Object inside array: `'attachments[*].file'` → `attachments[0].file`, `attachments[1].file`, ...
 * - Nested arrays (2 levels): `'items[*].variants[*].image'` → `items[0].variants[0].image`, ...
 *
 * @security
 * - All user inputs are parameterized via Prisma.sql tagged templates
 * - tableId, tableVersionId, paths come from trusted schema traversal (not user input)
 * - where/orderBy filters use generateStringFilter/generateJsonFilter which parameterize values
 * - No string concatenation for SQL - all values go through Prisma's parameterization
 * - JSON paths are validated in generateJsonFilter (rejects '..' traversal attacks)
 *
 * @module sub-schema/sub-schema-builder
 */

import { Prisma, PrismaSql } from '../prisma-adapter';
import { generateStringFilter } from '../where/string';
import { generateJsonFilter } from '../where/json';
import {
  SubSchemaQueryParams,
  SubSchemaTableConfig,
  SubSchemaWhereInput,
  SubSchemaOrderByItem,
} from './types';

export const MAX_TAKE = 10000;
export const MAX_SKIP = 1000000;

export interface ParsedPath {
  isArray: boolean;
  segments: PathSegment[];
}

export interface PathSegment {
  path: string;
  isArray: boolean;
}

export interface SubSchemaCteParams {
  tables: SubSchemaTableConfig[];
  cteName?: string;
}

export function parsePath(path: string): ParsedPath {
  if (!path.includes('[*]')) {
    return { isArray: false, segments: [{ path, isArray: false }] };
  }

  const parts = path.split('[*]');
  const segments: PathSegment[] = [];

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (part.startsWith('.')) {
      part = part.slice(1);
    }
    if (part.endsWith('.')) {
      part = part.slice(0, -1);
    }
    if (part.length > 0) {
      const isArray = i < parts.length - 1;
      segments.push({ path: part, isArray });
    }
  }

  return { isArray: true, segments };
}

function validatePagination(take: number, skip: number): void {
  if (!Number.isInteger(take) || take < 0 || take > MAX_TAKE) {
    throw new Error(`take must be an integer between 0 and ${MAX_TAKE}`);
  }
  if (!Number.isInteger(skip) || skip < 0 || skip > MAX_SKIP) {
    throw new Error(`skip must be an integer between 0 and ${MAX_SKIP}`);
  }
}

const SQL_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateSqlIdentifier(value: string, name: string): void {
  if (!SQL_IDENTIFIER_REGEX.test(value)) {
    throw new Error(`Invalid ${name}: "${value}". Only alphanumeric characters and underscores allowed, must start with letter or underscore.`);
  }
}

function getEmptyCteSelect(): PrismaSql {
  return Prisma.sql`SELECT NULL as "tableId", NULL as "rowId", NULL as "rowVersionId", NULL as "fieldPath", NULL as "data" WHERE false`;
}

/**
 * Builds the CTE (Common Table Expression) that extracts sub-schema items.
 *
 * The CTE produces rows with: tableId, rowId, rowVersionId, fieldPath, data
 *
 * @example
 * ```typescript
 * const cte = buildSubSchemaCte({
 *   tables: [
 *     { tableId: 'characters', tableVersionId: 'ver_123', paths: [{ path: 'avatar' }] },
 *   ],
 * });
 * // => WITH sub_schema_items AS (SELECT ...)
 * ```
 */
export function buildSubSchemaCte(params: SubSchemaCteParams): PrismaSql {
  const { tables, cteName = 'sub_schema_items' } = params;

  validateSqlIdentifier(cteName, 'cteName');

  if (tables.length === 0) {
    return Prisma.sql`WITH ${Prisma.raw(cteName)} AS (${getEmptyCteSelect()})`;
  }

  const cteQueries = buildCteQueries(tables);
  return Prisma.sql`WITH ${Prisma.raw(cteName)} AS (${cteQueries})`;
}

export interface SubSchemaWhereParams {
  where?: SubSchemaWhereInput;
  tableAlias?: string;
}

/**
 * Builds WHERE clause for filtering sub-schema items.
 *
 * Supports filtering by: tableId, rowId, fieldPath, data (JSON fields)
 * and logical operators: AND, OR, NOT
 *
 * @param params - Either SubSchemaWhereInput directly or params object with tableAlias
 * @example
 * ```typescript
 * // Without alias (default)
 * const whereClause = buildSubSchemaWhere({
 *   tableId: 'characters',
 *   data: { path: 'status', equals: 'uploaded' },
 * });
 * // => WHERE "tableId" = 'characters' AND "data" #> '{status}' = ...
 *
 * // With alias (when JOINed with other tables that have 'data' column)
 * const whereClause = buildSubSchemaWhere({
 *   where: { data: { path: 'status', equals: 'uploaded' } },
 *   tableAlias: 'ssi',
 * });
 * // => WHERE ssi."data" #> '{status}' = ...
 * ```
 */
function isSubSchemaWhereParams(params: unknown): params is SubSchemaWhereParams {
  if (typeof params !== 'object' || params === null) {
    return false;
  }
  const hasWhereParamsKeys = 'where' in params || 'tableAlias' in params;
  const hasWhereInputKeys = 'tableId' in params || 'rowId' in params || 'fieldPath' in params ||
    'data' in params || 'AND' in params || 'OR' in params || 'NOT' in params;
  return hasWhereParamsKeys && !hasWhereInputKeys;
}

export function buildSubSchemaWhere(params?: SubSchemaWhereInput | SubSchemaWhereParams): PrismaSql {
  if (!params) {
    return Prisma.empty;
  }

  const isWhereParams = isSubSchemaWhereParams(params);
  const where = isWhereParams ? params.where : params as SubSchemaWhereInput;
  const tableAlias = isWhereParams ? params.tableAlias : undefined;

  if (tableAlias) {
    validateSqlIdentifier(tableAlias, 'tableAlias');
  }

  if (!where) {
    return Prisma.empty;
  }

  const conditions = buildWhereConditions(where, tableAlias);
  if (conditions.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

export interface SubSchemaOrderByParams {
  orderBy?: SubSchemaOrderByItem[];
  tableAlias?: string;
}

/**
 * Builds ORDER BY clause for sorting sub-schema items.
 *
 * Supports sorting by: tableId, rowId, fieldPath, data (JSON fields)
 *
 * @param params - Either array of SubSchemaOrderByItem or params object with tableAlias
 * @example
 * ```typescript
 * // Without alias (default)
 * const orderByClause = buildSubSchemaOrderBy([
 *   { tableId: 'asc' },
 *   { data: { path: 'size', order: 'desc', nulls: 'last' } },
 * ]);
 * // => ORDER BY "tableId" ASC, "data"->>'size' DESC NULLS LAST
 *
 * // With alias
 * const orderByClause = buildSubSchemaOrderBy({
 *   orderBy: [{ data: { path: 'size', order: 'desc' } }],
 *   tableAlias: 'ssi',
 * });
 * // => ORDER BY ssi."data"->>'size' DESC
 * ```
 */
function isSubSchemaOrderByParams(params: unknown): params is SubSchemaOrderByParams {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return false;
  }
  return 'orderBy' in params || 'tableAlias' in params;
}

export function buildSubSchemaOrderBy(params?: SubSchemaOrderByItem[] | SubSchemaOrderByParams): PrismaSql {
  if (!params) {
    return Prisma.empty;
  }

  const isOrderByParams = isSubSchemaOrderByParams(params);
  const orderBy = isOrderByParams ? params.orderBy : params as SubSchemaOrderByItem[];
  const tableAlias = isOrderByParams ? params.tableAlias : undefined;

  if (tableAlias) {
    validateSqlIdentifier(tableAlias, 'tableAlias');
  }

  if (!orderBy || orderBy.length === 0) {
    return Prisma.empty;
  }

  return buildOrderByClause(orderBy, tableAlias);
}

export function buildSubSchemaQuery(params: SubSchemaQueryParams): PrismaSql {
  const { tables, where, orderBy, take, skip } = params;

  validatePagination(take, skip);

  if (tables.length === 0) {
    return getEmptyCteSelect();
  }

  const cteQueries = buildCteQueries(tables);
  const cte = Prisma.sql`WITH sub_schema_items AS (${cteQueries})`;

  const whereClause = where ? buildWhereClause(where) : Prisma.empty;
  const orderByClause = orderBy ? buildOrderByClause(orderBy) : Prisma.empty;
  const paginationClause = Prisma.sql`LIMIT ${take} OFFSET ${skip}`;

  return Prisma.sql`
    ${cte}
    SELECT "tableId", "rowId", "rowVersionId", "fieldPath", "data"
    FROM sub_schema_items
    ${whereClause}
    ${orderByClause}
    ${paginationClause}
  `;
}

export function buildSubSchemaCountQuery(params: Omit<SubSchemaQueryParams, 'take' | 'skip' | 'orderBy'>): PrismaSql {
  const { tables, where } = params;

  if (tables.length === 0) {
    return Prisma.sql`SELECT 0::bigint as count`;
  }

  const cteQueries = buildCteQueries(tables);
  const cte = Prisma.sql`WITH sub_schema_items AS (${cteQueries})`;

  const whereClause = where ? buildWhereClause(where) : Prisma.empty;

  return Prisma.sql`
    ${cte}
    SELECT COUNT(*)::bigint as count
    FROM sub_schema_items
    ${whereClause}
  `;
}

function buildCteQueries(tables: SubSchemaTableConfig[]): PrismaSql {
  const queries: PrismaSql[] = [];

  for (const table of tables) {
    for (const pathConfig of table.paths) {
      const parsed = parsePath(pathConfig.path);
      const query = parsed.isArray
        ? buildArrayPathQuery(table, parsed)
        : buildSinglePathQuery(table, parsed.segments[0].path);
      queries.push(query);
    }
  }

  if (queries.length === 0) {
    return getEmptyCteSelect();
  }

  if (queries.length === 1) {
    return queries[0];
  }

  return queries.reduce((acc, query, index) => {
    if (index === 0) {
      return query;
    }
    return Prisma.sql`${acc} UNION ALL ${query}`;
  });
}

function buildSinglePathQuery(
  table: SubSchemaTableConfig,
  path: string,
): PrismaSql {
  const jsonPath = buildJsonPathAccess(path);
  const tableId = table.tableId;
  const tableVersionId = table.tableVersionId;

  return Prisma.sql`
    SELECT
      ${tableId}::text as "tableId",
      r.id as "rowId",
      r."versionId" as "rowVersionId",
      ${path}::text as "fieldPath",
      ${jsonPath} as "data"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    WHERE rt."B" = ${tableVersionId}
      AND jsonb_typeof(${jsonPath}) = 'object'
  `;
}

function buildArrayPathQuery(
  table: SubSchemaTableConfig,
  parsed: ParsedPath,
): PrismaSql {
  const tableId = table.tableId;
  const tableVersionId = table.tableVersionId;
  const { segments } = parsed;

  const arraySegments = segments.filter(s => s.isArray);
  const lastSegment = segments[segments.length - 1];
  const hasTrailingPath = !lastSegment.isArray;

  if (arraySegments.length === 1) {
    return buildSingleArrayQuery(table, segments, hasTrailingPath);
  }

  return buildNestedArrayQuery(tableId, tableVersionId, segments, hasTrailingPath);
}

function buildSingleArrayQuery(
  table: SubSchemaTableConfig,
  segments: PathSegment[],
  hasTrailingPath: boolean,
): PrismaSql {
  const tableId = table.tableId;
  const tableVersionId = table.tableVersionId;
  const arrayPath = segments[0].path;
  const arrayJsonPath = buildJsonPathAccess(arrayPath);

  if (hasTrailingPath) {
    const itemPath = segments[1].path;
    const itemJsonPath = buildItemJsonPathAccess(itemPath);

    return Prisma.sql`
      SELECT
        ${tableId}::text as "tableId",
        r.id as "rowId",
        r."versionId" as "rowVersionId",
        (${arrayPath}::text || '[' || (arr.idx - 1)::text || '].' || ${itemPath}::text) as "fieldPath",
        ${itemJsonPath} as "data"
      FROM "Row" r
      INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(${arrayJsonPath}) = 'array' THEN ${arrayJsonPath} ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS arr(elem, idx)
      WHERE rt."B" = ${tableVersionId}
        AND jsonb_typeof(${itemJsonPath}) = 'object'
    `;
  }

  return Prisma.sql`
    SELECT
      ${tableId}::text as "tableId",
      r.id as "rowId",
      r."versionId" as "rowVersionId",
      (${arrayPath}::text || '[' || (arr.idx - 1)::text || ']') as "fieldPath",
      arr.elem as "data"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(${arrayJsonPath}) = 'array' THEN ${arrayJsonPath} ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS arr(elem, idx)
    WHERE rt."B" = ${tableVersionId}
  `;
}

interface FieldPathPart {
  sql: PrismaSql;
  hasDotPrefix: boolean;
}

interface NestedArrayParts {
  crossJoins: PrismaSql[];
  fieldPathParts: FieldPathPart[];
  arrayCount: number;
}

function buildCrossJoinsAndFieldPaths(segments: PathSegment[]): NestedArrayParts {
  const crossJoins: PrismaSql[] = [];
  const fieldPathParts: FieldPathPart[] = [];
  let arrayCount = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment.isArray) {
      arrayCount++;
      const arrAlias = `arr${arrayCount}`;
      const prevArrAlias = arrayCount === 1 ? null : `arr${arrayCount - 1}`;

      const arrayAccess = prevArrAlias === null
        ? buildJsonPathAccess(segment.path)
        : buildPathAccess(Prisma.sql`${Prisma.raw(prevArrAlias)}.elem`, segment.path);

      crossJoins.push(Prisma.sql`
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(${arrayAccess}) = 'array' THEN ${arrayAccess} ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS ${Prisma.raw(arrAlias)}(elem, idx)
      `);

      fieldPathParts.push({
        sql: Prisma.sql`${segment.path}::text || '[' || (${Prisma.raw(arrAlias)}.idx - 1)::text || ']'`,
        hasDotPrefix: false,
      });
    } else if (i === segments.length - 1) {
      fieldPathParts.push({
        sql: Prisma.sql`'.' || ${segment.path}::text`,
        hasDotPrefix: true,
      });
    }
  }

  return { crossJoins, fieldPathParts, arrayCount };
}

function joinFieldPathParts(parts: FieldPathPart[]): PrismaSql {
  return parts.reduce((acc, part, idx) => {
    if (idx === 0) {
      return part.sql;
    }
    if (part.hasDotPrefix) {
      return Prisma.sql`${acc} || ${part.sql}`;
    }
    return Prisma.sql`${acc} || '.' || ${part.sql}`;
  }, Prisma.empty as PrismaSql);
}

function buildDataExprAndWhere(
  segments: PathSegment[],
  arrayCount: number,
  hasTrailingPath: boolean,
): { dataExpr: PrismaSql; whereCondition: PrismaSql } {
  const lastArrAlias = `arr${arrayCount}`;

  if (hasTrailingPath) {
    const trailingPath = segments[segments.length - 1].path;
    const dataExpr = buildPathAccess(Prisma.sql`${Prisma.raw(lastArrAlias)}.elem`, trailingPath);
    return {
      dataExpr,
      whereCondition: Prisma.sql`AND jsonb_typeof(${dataExpr}) = 'object'`,
    };
  }

  return {
    dataExpr: Prisma.sql`${Prisma.raw(lastArrAlias)}.elem`,
    whereCondition: Prisma.empty,
  };
}

function buildNestedArrayQuery(
  tableId: string,
  tableVersionId: string,
  segments: PathSegment[],
  hasTrailingPath: boolean,
): PrismaSql {
  const { crossJoins, fieldPathParts, arrayCount } = buildCrossJoinsAndFieldPaths(segments);
  const fieldPathExpr = joinFieldPathParts(fieldPathParts);
  const { dataExpr, whereCondition } = buildDataExprAndWhere(segments, arrayCount, hasTrailingPath);
  const crossJoinsSql = crossJoins.reduce((acc, join) => Prisma.sql`${acc} ${join}`);

  return Prisma.sql`
    SELECT
      ${tableId}::text as "tableId",
      r.id as "rowId",
      r."versionId" as "rowVersionId",
      (${fieldPathExpr}) as "fieldPath",
      ${dataExpr} as "data"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    ${crossJoinsSql}
    WHERE rt."B" = ${tableVersionId}
    ${whereCondition}
  `;
}

function buildPathAccess(base: PrismaSql, path: string): PrismaSql {
  const segments = path.split('.');
  let result = base;
  for (const segment of segments) {
    result = Prisma.sql`${result}->${segment}`;
  }
  return result;
}

function buildJsonPathAccess(path: string): PrismaSql {
  return buildPathAccess(Prisma.sql`r."data"`, path);
}

function buildItemJsonPathAccess(itemPath: string): PrismaSql {
  return buildPathAccess(Prisma.sql`arr.elem`, itemPath);
}

function buildWhereClause(where: SubSchemaWhereInput): PrismaSql {
  const conditions = buildWhereConditions(where);
  if (conditions.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function getColumnRef(column: string, tableAlias?: string): PrismaSql {
  if (tableAlias) {
    return Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(column)}"`;
  }
  return Prisma.sql`"${Prisma.raw(column)}"`;
}

function buildWhereConditions(where: SubSchemaWhereInput, tableAlias?: string): PrismaSql[] {
  const conditions: PrismaSql[] = [];

  if (where.tableId !== undefined) {
    const filter = typeof where.tableId === 'string'
      ? { equals: where.tableId }
      : where.tableId;
    conditions.push(generateStringFilter(getColumnRef('tableId', tableAlias), filter));
  }

  if (where.rowId !== undefined) {
    const filter = typeof where.rowId === 'string'
      ? { equals: where.rowId }
      : where.rowId;
    conditions.push(generateStringFilter(getColumnRef('rowId', tableAlias), filter));
  }

  if (where.fieldPath !== undefined) {
    const filter = typeof where.fieldPath === 'string'
      ? { equals: where.fieldPath }
      : where.fieldPath;
    conditions.push(generateStringFilter(getColumnRef('fieldPath', tableAlias), filter));
  }

  if (where.data !== undefined) {
    conditions.push(generateJsonFilter(getColumnRef('data', tableAlias), where.data, 'data', ''));
  }

  if (where.AND !== undefined && where.AND.length > 0) {
    const andConditions = where.AND.flatMap(w => buildWhereConditions(w, tableAlias));
    if (andConditions.length > 0) {
      conditions.push(Prisma.sql`(${Prisma.join(andConditions, ' AND ')})`);
    }
  }

  if (where.OR !== undefined && where.OR.length > 0) {
    const orConditions = where.OR.flatMap(w => {
      const conds = buildWhereConditions(w, tableAlias);
      if (conds.length === 0) {
        return [];
      }
      if (conds.length === 1) {
        return [conds[0]];
      }
      return [Prisma.sql`(${Prisma.join(conds, ' AND ')})`];
    });
    if (orConditions.length > 0) {
      conditions.push(Prisma.sql`(${Prisma.join(orConditions, ' OR ')})`);
    }
  }

  if (where.NOT !== undefined) {
    const notConditions = buildWhereConditions(where.NOT, tableAlias);
    if (notConditions.length > 0) {
      conditions.push(Prisma.sql`NOT (${Prisma.join(notConditions, ' AND ')})`);
    }
  }

  return conditions;
}

function buildOrderByClause(orderBy: SubSchemaOrderByItem[], tableAlias?: string): PrismaSql {
  const orderParts: PrismaSql[] = [];

  for (const item of orderBy) {
    if (item.tableId) {
      const direction = item.tableId === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`${getColumnRef('tableId', tableAlias)} ${direction}`);
    }

    if (item.rowId) {
      const direction = item.rowId === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`${getColumnRef('rowId', tableAlias)} ${direction}`);
    }

    if (item.fieldPath) {
      const direction = item.fieldPath === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`${getColumnRef('fieldPath', tableAlias)} ${direction}`);
    }

    if (item.data) {
      const jsonPath = buildDataOrderByPath(item.data.path, tableAlias);
      const direction = item.data.order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      const nulls = item.data.nulls === 'first' ? Prisma.sql`NULLS FIRST` : Prisma.sql`NULLS LAST`;
      orderParts.push(Prisma.sql`${jsonPath} ${direction} ${nulls}`);
    }
  }

  if (orderParts.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`ORDER BY ${Prisma.join(orderParts, ', ')}`;
}

function buildDataOrderByPath(path: string | string[], tableAlias?: string): PrismaSql {
  const segments = Array.isArray(path) ? path : path.split('.');
  const dataRef = getColumnRef('data', tableAlias);

  if (segments.length === 1) {
    return Prisma.sql`${dataRef}->>${segments[0]}`;
  }

  let result = dataRef;
  for (let i = 0; i < segments.length - 1; i++) {
    result = Prisma.sql`${result}->${segments[i]}`;
  }
  return Prisma.sql`${result}->>${segments[segments.length - 1]}`;
}
