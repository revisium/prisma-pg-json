import type { ParsedPath } from './path';
import { parsePath } from './path';
import type { SubSchemaTableConfig } from './types';

export interface SubSchemaCteDescription {
  table: SubSchemaTableConfig;
  parsed: ParsedPath;
}

/**
 * Lazily traverse configured tables and parse each path as it is compiled.
 * The original table object remains available for PostgreSQL value reads.
 */
export function* describeSubSchemaCte(
  tables: SubSchemaTableConfig[],
): Generator<SubSchemaCteDescription> {
  for (const table of tables) {
    for (const pathConfig of table.paths) {
      yield { table, parsed: parsePath(pathConfig.path) };
    }
  }
}
