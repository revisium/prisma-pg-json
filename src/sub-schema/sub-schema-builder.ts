/**
 * SubSchema Query Builder
 *
 * Builds SQL queries to extract sub-schema items from JSONB Row.data fields
 * based on $ref paths defined in table schemas. Supports filtering, sorting,
 * and pagination across multiple tables.
 *
 * @example
 * ```typescript
 * // Input: Find all File references with filtering
 * const params: SubSchemaQueryParams = {
 *   tables: [
 *     {
 *       tableId: 'characters',
 *       tableVersionId: 'ver_abc123',
 *       paths: [
 *         { path: 'avatar' },                    // single file
 *         { path: 'gallery[*]' },                // array of files
 *         { path: 'profile.photo' },             // nested single file
 *         { path: 'attachments[*].file' },       // file inside array of objects
 *         { path: 'items[*].variants[*].image' }, // nested arrays (2 levels)
 *       ],
 *     },
 *     {
 *       tableId: 'items',
 *       tableVersionId: 'ver_def456',
 *       paths: [{ path: 'icon' }],
 *     },
 *   ],
 *   where: {
 *     AND: [
 *       { data: { path: 'status', equals: 'uploaded' } },
 *       { data: { path: 'mimeType', string_starts_with: 'image/' } },
 *     ],
 *   },
 *   orderBy: [{ data: { path: 'size', order: 'desc', nulls: 'last' } }],
 *   take: 20,
 *   skip: 0,
 * };
 *
 * const query = buildSubSchemaQuery(params);
 * const items = await prisma.$queryRaw<SubSchemaItem[]>(query);
 *
 * // Generated SQL uses CTE with UNION ALL for each path.
 * // See __tests__/unit/__snapshots__/sub-schema-sql.spec.ts.snap for full examples.
 *
 * // Result example:
 * // [
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'avatar', data: { fileId: '...', ... } },
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'gallery[0]', data: { fileId: '...', ... } },
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'gallery[1]', data: { fileId: '...', ... } },
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'profile.photo', data: { fileId: '...', ... } },
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'attachments[0].file', data: { fileId: '...', ... } },
 * //   { tableId: 'items', rowId: 'sword', rowVersionId: 'rv_2',
 * //     fieldPath: 'icon', data: { fileId: '...', ... } },
 * // ]
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
 * **Schema → Path mapping:**
 * - `{ $ref: "File" }` → `'avatar'`
 * - `{ type: "array", items: { $ref: "File" } }` → `'gallery[*]'`
 * - `{ type: "object", properties: { photo: { $ref: "File" } } }` → `'profile.photo'`
 * - `{ type: "array", items: { type: "object", properties: { file: { $ref: "File" } } } }` → `'attachments[*].file'`
 *
 * @security
 * - All user inputs are parameterized via Prisma.sql tagged templates
 * - tableId, tableVersionId, paths come from trusted schema traversal (not user input)
 * - where/orderBy filters use generateStringFilter/generateJsonFilter which parameterize values
 * - No string concatenation for SQL - all values go through Prisma's parameterization
 * - JSON paths are validated in generateJsonFilter (rejects '..' traversal attacks)
 * - take/skip are numbers passed directly to LIMIT/OFFSET (type-safe)
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

export function buildSubSchemaQuery(params: SubSchemaQueryParams): PrismaSql {
  const { tables, where, orderBy, take, skip } = params;

  validatePagination(take, skip);

  if (tables.length === 0) {
    return Prisma.sql`SELECT NULL as "tableId", NULL as "rowId", NULL as "rowVersionId", NULL as "fieldPath", NULL as "data" WHERE false`;
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
    return Prisma.sql`SELECT NULL as "tableId", NULL as "rowId", NULL as "rowVersionId", NULL as "fieldPath", NULL as "data" WHERE false`;
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

function buildWhereConditions(where: SubSchemaWhereInput): PrismaSql[] {
  const conditions: PrismaSql[] = [];

  if (where.tableId !== undefined) {
    const filter = typeof where.tableId === 'string'
      ? { equals: where.tableId }
      : where.tableId;
    conditions.push(generateStringFilter(Prisma.sql`"tableId"`, filter));
  }

  if (where.rowId !== undefined) {
    const filter = typeof where.rowId === 'string'
      ? { equals: where.rowId }
      : where.rowId;
    conditions.push(generateStringFilter(Prisma.sql`"rowId"`, filter));
  }

  if (where.fieldPath !== undefined) {
    const filter = typeof where.fieldPath === 'string'
      ? { equals: where.fieldPath }
      : where.fieldPath;
    conditions.push(generateStringFilter(Prisma.sql`"fieldPath"`, filter));
  }

  if (where.data !== undefined) {
    conditions.push(generateJsonFilter(Prisma.sql`"data"`, where.data, 'data', ''));
  }

  if (where.AND !== undefined && where.AND.length > 0) {
    const andConditions = where.AND.flatMap(w => buildWhereConditions(w));
    if (andConditions.length > 0) {
      conditions.push(Prisma.sql`(${Prisma.join(andConditions, ' AND ')})`);
    }
  }

  if (where.OR !== undefined && where.OR.length > 0) {
    const orConditions = where.OR.flatMap(w => {
      const conds = buildWhereConditions(w);
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
    const notConditions = buildWhereConditions(where.NOT);
    if (notConditions.length > 0) {
      conditions.push(Prisma.sql`NOT (${Prisma.join(notConditions, ' AND ')})`);
    }
  }

  return conditions;
}

function buildOrderByClause(orderBy: SubSchemaOrderByItem[]): PrismaSql {
  const orderParts: PrismaSql[] = [];

  for (const item of orderBy) {
    if (item.tableId) {
      const direction = item.tableId === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`"tableId" ${direction}`);
    }

    if (item.rowId) {
      const direction = item.rowId === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`"rowId" ${direction}`);
    }

    if (item.fieldPath) {
      const direction = item.fieldPath === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      orderParts.push(Prisma.sql`"fieldPath" ${direction}`);
    }

    if (item.data) {
      const jsonPath = buildDataOrderByPath(item.data.path);
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

function buildDataOrderByPath(path: string | string[]): PrismaSql {
  const segments = Array.isArray(path) ? path : path.split('.');

  if (segments.length === 1) {
    return Prisma.sql`"data"->>${segments[0]}`;
  }

  let result = Prisma.sql`"data"`;
  for (let i = 0; i < segments.length - 1; i++) {
    result = Prisma.sql`${result}->${segments[i]}`;
  }
  return Prisma.sql`${result}->>${segments[segments.length - 1]}`;
}
