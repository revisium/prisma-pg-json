import { Prisma, PrismaSql } from '../prisma-adapter';
import { SubSchemaTableConfig } from './types';
import { ParsedPath, PathSegment, parsePath } from './path';
import { validateSqlIdentifier } from './validation';
import {
  getEmptyCteSelect,
  unquotePath,
  buildPathAccess,
  buildJsonPathAccess,
  buildItemJsonPathAccess,
} from './helpers';

export interface SubSchemaCteParams {
  tables: SubSchemaTableConfig[];
  cteName?: string;
}

/**
 * Builds the CTE (Common Table Expression) that extracts sub-schema items.
 *
 * The CTE produces rows with: tableId, tableVersionId, rowId, rowVersionId, fieldPath, data
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

export function buildCteQueries(tables: SubSchemaTableConfig[]): PrismaSql {
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

  return Prisma.join(queries, ' UNION ALL ');
}

function buildSinglePathQuery(
  table: SubSchemaTableConfig,
  path: string,
): PrismaSql {
  const jsonPath = buildJsonPathAccess(path);
  const tableId = table.tableId;
  const tableVersionId = table.tableVersionId;
  const fieldPath = unquotePath(path);

  return Prisma.sql`
    SELECT
      ${tableId}::text as "tableId",
      ${tableVersionId}::text as "tableVersionId",
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
  parsed: ParsedPath,
): PrismaSql {
  const tableId = table.tableId;
  const tableVersionId = table.tableVersionId;
  const { segments } = parsed;

  const arraySegments = segments.filter(s => s.isArray);
  const hasTrailingPath = !segments.at(-1)!.isArray;

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
  const arrayFieldPath = unquotePath(arrayPath);

  if (hasTrailingPath) {
    const itemPath = segments[1].path;
    const itemJsonPath = buildItemJsonPathAccess(itemPath);
    const itemFieldPath = unquotePath(itemPath);

    return Prisma.sql`
      SELECT
        ${tableId}::text as "tableId",
        ${tableVersionId}::text as "tableVersionId",
        r.id as "rowId",
        r."versionId" as "rowVersionId",
        (${arrayFieldPath}::text || '[' || (arr.idx - 1)::text || '].' || ${itemFieldPath}::text) as "fieldPath",
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
      ${tableVersionId}::text as "tableVersionId",
      r.id as "rowId",
      r."versionId" as "rowVersionId",
      (${arrayFieldPath}::text || '[' || (arr.idx - 1)::text || ']') as "fieldPath",
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
        sql: Prisma.sql`${unquotePath(segment.path)}::text || '[' || (${Prisma.raw(arrAlias)}.idx - 1)::text || ']'`,
        hasDotPrefix: false,
      });
    } else if (i === segments.length - 1) {
      fieldPathParts.push({
        sql: Prisma.sql`'.' || ${unquotePath(segment.path)}::text`,
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
  }, Prisma.empty);
}

function buildDataExprAndWhere(
  segments: PathSegment[],
  arrayCount: number,
  hasTrailingPath: boolean,
): { dataExpr: PrismaSql; whereCondition: PrismaSql } {
  const lastArrAlias = `arr${arrayCount}`;

  if (hasTrailingPath) {
    const trailingPath = segments.at(-1)!.path;
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
  const crossJoinsSql = Prisma.join(crossJoins, ' ');

  return Prisma.sql`
    SELECT
      ${tableId}::text as "tableId",
      ${tableVersionId}::text as "tableVersionId",
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
