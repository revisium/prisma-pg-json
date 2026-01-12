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
 *         { path: 'avatar', isArray: false },        // Single file field
 *         { path: 'gallery', isArray: true },        // Array of files
 *         { path: 'profile.photo', isArray: false }, // Nested object field
 *       ],
 *     },
 *     {
 *       tableId: 'items',
 *       tableVersionId: 'ver_def456',
 *       paths: [{ path: 'icon', isArray: false }],
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
 * // Generated SQL (simplified):
 * // WITH sub_schema_items AS (
 * //   -- Single path query (characters.avatar)
 * //   SELECT 'characters'::text as "tableId", r.id as "rowId",
 * //          r."versionId" as "rowVersionId", 'avatar'::text as "fieldPath",
 * //          r."data"->'avatar' as "data"
 * //   FROM "Row" r
 * //   INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
 * //   WHERE rt."B" = $1 AND jsonb_typeof(r."data"->'avatar') = 'object'
 * //
 * //   UNION ALL
 * //
 * //   -- Array path query (characters.gallery) - expands each element
 * //   SELECT 'characters'::text as "tableId", r.id as "rowId",
 * //          r."versionId" as "rowVersionId",
 * //          ('gallery'::text || '[' || (arr.idx - 1)::text || ']') as "fieldPath",
 * //          arr.elem as "data"
 * //   FROM "Row" r
 * //   INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
 * //   CROSS JOIN LATERAL jsonb_array_elements(r."data"->'gallery')
 * //     WITH ORDINALITY AS arr(elem, idx)
 * //   WHERE rt."B" = $2 AND jsonb_typeof(r."data"->'gallery') = 'array'
 * //
 * //   UNION ALL
 * //   -- ... items.icon query
 * // )
 * // SELECT "tableId", "rowId", "rowVersionId", "fieldPath", "data"
 * // FROM sub_schema_items
 * // WHERE ("data"->>'status' = $3)
 * //   AND ("data"->>'mimeType' LIKE $4 || '%')
 * // ORDER BY "data"->>'size' DESC NULLS LAST
 * // LIMIT 20 OFFSET 0
 *
 * // Result example:
 * // [
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'avatar', data: { fileId: '...', status: 'uploaded', ... } },
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'gallery[0]', data: { fileId: '...', ... } },
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'gallery[1]', data: { fileId: '...', ... } },
 * //   { tableId: 'characters', rowId: 'hero', rowVersionId: 'rv_1',
 * //     fieldPath: 'profile.photo', data: { fileId: '...', ... } },
 * //   { tableId: 'items', rowId: 'sword', rowVersionId: 'rv_2',
 * //     fieldPath: 'icon', data: { fileId: '...', ... } },
 * // ]
 * ```
 *
 * @pathformat
 * The `path` field in SubSchemaPath supports dot-notation for nested objects:
 *
 * **Supported paths:**
 * - `'avatar'` - top-level field → `data->'avatar'`
 * - `'profile.photo'` - nested object → `data->'profile'->'photo'`
 * - `'settings.images.logo'` - deeply nested → `data->'settings'->'images'->'logo'`
 *
 * **Not supported (limitation):**
 * - `'items[0].icon'` - array indexing in path is NOT supported
 * - `'inventory[*].image'` - wildcard array access is NOT supported
 *
 * For array fields, use `isArray: true` to expand each array element into a separate row.
 * The builder will use `jsonb_array_elements()` to iterate over the array.
 *
 * **Use cases:**
 * - File fields: `{ $ref: "File" }` - single file at any nesting level
 * - File arrays: `{ type: "array", items: { $ref: "File" } }` - array of files
 * - Nested files: `{ type: "object", properties: { photo: { $ref: "File" } } }`
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
  SubSchemaPath,
  SubSchemaWhereInput,
  SubSchemaOrderByItem,
} from './types';

export function buildSubSchemaQuery(params: SubSchemaQueryParams): PrismaSql {
  const { tables, where, orderBy, take, skip } = params;

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
      const query = pathConfig.isArray
        ? buildArrayPathQuery(table, pathConfig)
        : buildSinglePathQuery(table, pathConfig);
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
  pathConfig: SubSchemaPath,
): PrismaSql {
  const jsonPath = buildJsonPathAccess(pathConfig.path);
  const tableId = table.tableId;
  const tableVersionId = table.tableVersionId;
  const fieldPath = pathConfig.path;

  return Prisma.sql`
    SELECT
      ${tableId}::text as "tableId",
      r.id as "rowId",
      r."versionId" as "rowVersionId",
      ${fieldPath}::text as "fieldPath",
      ${jsonPath} as "data"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    WHERE rt."B" = ${tableVersionId}
      AND jsonb_typeof(${jsonPath}) = 'object'
  `;
}

function buildArrayPathQuery(
  table: SubSchemaTableConfig,
  pathConfig: SubSchemaPath,
): PrismaSql {
  const jsonPath = buildJsonPathAccess(pathConfig.path);
  const tableId = table.tableId;
  const tableVersionId = table.tableVersionId;
  const basePath = pathConfig.path;

  return Prisma.sql`
    SELECT
      ${tableId}::text as "tableId",
      r.id as "rowId",
      r."versionId" as "rowVersionId",
      (${basePath}::text || '[' || (arr.idx - 1)::text || ']') as "fieldPath",
      arr.elem as "data"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    CROSS JOIN LATERAL jsonb_array_elements(${jsonPath}) WITH ORDINALITY AS arr(elem, idx)
    WHERE rt."B" = ${tableVersionId}
      AND jsonb_typeof(${jsonPath}) = 'array'
  `;
}

function buildJsonPathAccess(path: string): PrismaSql {
  const segments = path.split('.');
  if (segments.length === 1) {
    return Prisma.sql`r."data"->${path}`;
  }

  let result = Prisma.sql`r."data"`;
  for (let i = 0; i < segments.length - 1; i++) {
    result = Prisma.sql`${result}->${segments[i]}`;
  }
  result = Prisma.sql`${result}->${segments[segments.length - 1]}`;
  return result;
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
    const orConditions = where.OR.map(w => {
      const conds = buildWhereConditions(w);
      if (conds.length === 0) {
        return Prisma.sql`true`;
      }
      if (conds.length === 1) {
        return conds[0];
      }
      return Prisma.sql`(${Prisma.join(conds, ' AND ')})`;
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
