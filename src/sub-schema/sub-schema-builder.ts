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

// Re-export all public API from split modules — keeps imports stable
export { parsePath } from './path';
export type { ParsedPath, PathSegment } from './path';

export { MAX_TAKE, MAX_SKIP } from './validation';

export { buildSubSchemaCte } from './cte';
export type { SubSchemaCteParams } from './cte';

export { buildSubSchemaWhere } from './where';
export type { SubSchemaWhereParams } from './where';

export { buildSubSchemaOrderBy } from './order-by';
export type { SubSchemaOrderByParams } from './order-by';

export { buildSubSchemaQuery, buildSubSchemaCountQuery } from './query';
