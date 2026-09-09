import type { PrismaSql } from '../prisma-adapter';
import type { SubSchemaTableConfig } from './types';
import { compileSubSchemaCte } from '../postgres/sub-schema/cte';
import { validateSqlIdentifier } from './validation';

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
  return compileSubSchemaCte(tables, cteName);
}
