import { format } from 'sql-formatter';
import {
  buildSubSchemaCte,
  buildSubSchemaWhere,
  buildSubSchemaOrderBy,
  buildSubSchemaQuery,
  buildSubSchemaCountQuery,
} from '../../sub-schema/sub-schema-builder';
import {
  SubSchemaQueryParams,
  SubSchemaTableConfig,
  SubSchemaWhereInput,
  SubSchemaOrderByItem,
} from '../../sub-schema/types';
import { SubSchemaCteParams } from '../../sub-schema/sub-schema-builder';
import { configurePrisma, PrismaSql } from '../../prisma-adapter';
import { Prisma } from '@prisma/client';

configurePrisma(Prisma);

function sqlToString(sql: PrismaSql): string {
  const { strings, values } = sql as unknown as { strings: string[]; values: unknown[] };
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const value = values[i];
      if (typeof value === 'string') {
        result += `'${value}'`;
      } else if (typeof value === 'number') {
        result += value.toString();
      } else {
        result += JSON.stringify(value);
      }
    }
  }

  return format(result, { language: 'postgresql' });
}

describe('SubSchema SQL Generation', () => {
  describe('buildSubSchemaCte', () => {
    it('should generate CTE for single path', () => {
      const params: SubSchemaCteParams = {
        tables: [
          {
            tableId: 'characters',
            tableVersionId: 'ver_characters_001',
            paths: [{ path: 'avatar' }],
          },
        ],
      };

      const cte = buildSubSchemaCte(params);
      const sql = sqlToString(cte);

      expect(sql).toMatchSnapshot();
    });

    it('should generate CTE for multiple paths', () => {
      const params: SubSchemaCteParams = {
        tables: [
          {
            tableId: 'characters',
            tableVersionId: 'ver_characters_001',
            paths: [
              { path: 'avatar' },
              { path: 'profile.photo' },
              { path: 'gallery[*]' },
              { path: 'attachments[*].file' },
              { path: 'items[*].variants[*].image' },
            ],
          },
          {
            tableId: 'items',
            tableVersionId: 'ver_items_001',
            paths: [{ path: 'icon' }],
          },
        ],
      };

      const cte = buildSubSchemaCte(params);
      const sql = sqlToString(cte);

      expect(sql).toMatchSnapshot();
    });

    it('should generate empty CTE for empty tables', () => {
      const params: SubSchemaCteParams = {
        tables: [],
      };

      const cte = buildSubSchemaCte(params);
      const sql = sqlToString(cte);

      expect(sql).toMatchSnapshot();
    });

    it('should use custom CTE name', () => {
      const params: SubSchemaCteParams = {
        tables: [
          {
            tableId: 'files',
            tableVersionId: 'ver_files_001',
            paths: [{ path: 'document' }],
          },
        ],
        cteName: 'custom_cte',
      };

      const cte = buildSubSchemaCte(params);
      const sql = sqlToString(cte);

      expect(sql).toMatchSnapshot();
    });

    it('should generate CTE for nested arrays without trailing path', () => {
      const params: SubSchemaCteParams = {
        tables: [
          {
            tableId: 'galleries',
            tableVersionId: 'ver_galleries_001',
            paths: [{ path: 'sections[*].photos[*]' }],
          },
        ],
      };

      const cte = buildSubSchemaCte(params);
      const sql = sqlToString(cte);

      expect(sql).toMatchSnapshot();
    });

    it('should generate CTE for deeply nested path in object', () => {
      const params: SubSchemaCteParams = {
        tables: [
          {
            tableId: 'settings',
            tableVersionId: 'ver_settings_001',
            paths: [{ path: 'config.theme.logo.image' }],
          },
        ],
      };

      const cte = buildSubSchemaCte(params);
      const sql = sqlToString(cte);

      expect(sql).toMatchSnapshot();
    });
  });

  describe('buildSubSchemaWhere', () => {
    it('should return empty for undefined where', () => {
      const whereClause = buildSubSchemaWhere(undefined);
      expect(sqlToString(whereClause)).toBe('');
    });

    it('should return empty for empty where object', () => {
      const whereClause = buildSubSchemaWhere({});
      expect(sqlToString(whereClause)).toBe('');
    });

    it('should generate WHERE for tableId filter', () => {
      const where: SubSchemaWhereInput = { tableId: 'characters' };
      const whereClause = buildSubSchemaWhere(where);
      const sql = sqlToString(whereClause);

      expect(sql).toMatchSnapshot();
    });

    it('should generate WHERE for data field equals', () => {
      const where: SubSchemaWhereInput = {
        data: { path: 'status', equals: 'uploaded' },
      };
      const whereClause = buildSubSchemaWhere(where);
      const sql = sqlToString(whereClause);

      expect(sql).toMatchSnapshot();
    });

    it('should generate WHERE for complex AND/OR conditions', () => {
      const where: SubSchemaWhereInput = {
        AND: [
          { tableId: 'characters' },
          { data: { path: 'status', equals: 'uploaded' } },
          { data: { path: 'mimeType', string_starts_with: 'image/' } },
        ],
        OR: [
          { data: { path: 'size', gte: 1000 } },
          { data: { path: 'size', lte: 100 } },
        ],
      };
      const whereClause = buildSubSchemaWhere(where);
      const sql = sqlToString(whereClause);

      expect(sql).toMatchSnapshot();
    });

    it('should generate WHERE with NOT condition', () => {
      const where: SubSchemaWhereInput = {
        NOT: { data: { path: 'status', equals: 'ready' } },
      };
      const whereClause = buildSubSchemaWhere(where);
      const sql = sqlToString(whereClause);

      expect(sql).toMatchSnapshot();
    });
  });

  describe('buildSubSchemaOrderBy', () => {
    it('should return empty for undefined orderBy', () => {
      const orderByClause = buildSubSchemaOrderBy(undefined);
      expect(sqlToString(orderByClause)).toBe('');
    });

    it('should return empty for empty orderBy array', () => {
      const orderByClause = buildSubSchemaOrderBy([]);
      expect(sqlToString(orderByClause)).toBe('');
    });

    it('should generate ORDER BY for tableId', () => {
      const orderBy: SubSchemaOrderByItem[] = [{ tableId: 'asc' }];
      const orderByClause = buildSubSchemaOrderBy(orderBy);
      const sql = sqlToString(orderByClause);

      expect(sql).toMatchSnapshot();
    });

    it('should generate ORDER BY for data field with nulls', () => {
      const orderBy: SubSchemaOrderByItem[] = [
        { data: { path: 'size', order: 'desc', nulls: 'last' } },
      ];
      const orderByClause = buildSubSchemaOrderBy(orderBy);
      const sql = sqlToString(orderByClause);

      expect(sql).toMatchSnapshot();
    });

    it('should generate ORDER BY for multiple fields', () => {
      const orderBy: SubSchemaOrderByItem[] = [
        { tableId: 'asc' },
        { rowId: 'desc' },
        { data: { path: 'size', order: 'desc', nulls: 'last' } },
      ];
      const orderByClause = buildSubSchemaOrderBy(orderBy);
      const sql = sqlToString(orderByClause);

      expect(sql).toMatchSnapshot();
    });
  });

  describe('buildSubSchemaQuery (legacy)', () => {
    it('should generate SQL for all path types', () => {
      const params: SubSchemaQueryParams = {
        tables: [
          {
            tableId: 'characters',
            tableVersionId: 'ver_characters_001',
            paths: [
              { path: 'avatar' },
              { path: 'profile.photo' },
              { path: 'gallery[*]' },
              { path: 'attachments[*].file' },
              { path: 'items[*].variants[*].image' },
            ],
          },
          {
            tableId: 'items',
            tableVersionId: 'ver_items_001',
            paths: [{ path: 'icon' }],
          },
        ],
        where: {
          AND: [
            { tableId: 'characters' },
            { data: { path: 'status', equals: 'uploaded' } },
            { data: { path: 'mimeType', string_starts_with: 'image/' } },
          ],
          OR: [
            { data: { path: 'size', gte: 1000 } },
            { data: { path: 'size', lte: 100 } },
          ],
        },
        orderBy: [
          { tableId: 'asc' },
          { data: { path: 'size', order: 'desc', nulls: 'last' } },
        ],
        take: 20,
        skip: 10,
      };

      const query = buildSubSchemaQuery(params);
      const sql = sqlToString(query);

      expect(sql).toMatchSnapshot();
    });

    it('should generate count SQL', () => {
      const params: SubSchemaQueryParams = {
        tables: [
          {
            tableId: 'media',
            tableVersionId: 'ver_media_001',
            paths: [
              { path: 'cover' },
              { path: 'gallery[*]' },
            ],
          },
        ],
        where: {
          data: { path: 'status', equals: 'uploaded' },
        },
        take: 100,
        skip: 0,
      };

      const query = buildSubSchemaCountQuery(params);
      const sql = sqlToString(query);

      expect(sql).toMatchSnapshot();
    });

    it('should generate SQL for nested arrays without trailing path', () => {
      const params: SubSchemaQueryParams = {
        tables: [
          {
            tableId: 'galleries',
            tableVersionId: 'ver_galleries_001',
            paths: [{ path: 'sections[*].photos[*]' }],
          },
        ],
        take: 50,
        skip: 0,
      };

      const query = buildSubSchemaQuery(params);
      const sql = sqlToString(query);

      expect(sql).toMatchSnapshot();
    });

    it('should generate SQL for deeply nested path in object', () => {
      const params: SubSchemaQueryParams = {
        tables: [
          {
            tableId: 'settings',
            tableVersionId: 'ver_settings_001',
            paths: [{ path: 'config.theme.logo.image' }],
          },
        ],
        take: 10,
        skip: 0,
      };

      const query = buildSubSchemaQuery(params);
      const sql = sqlToString(query);

      expect(sql).toMatchSnapshot();
    });

    it('should generate SQL for empty tables array', () => {
      const params: SubSchemaQueryParams = {
        tables: [],
        take: 10,
        skip: 0,
      };

      const query = buildSubSchemaQuery(params);
      const sql = sqlToString(query);

      expect(sql).toMatchSnapshot();
    });
  });

  describe('combined usage (new API)', () => {
    it('should produce equivalent SQL when combining CTE, WHERE, ORDER BY', () => {
      const tables: SubSchemaTableConfig[] = [
        {
          tableId: 'files',
          tableVersionId: 'ver_files_001',
          paths: [{ path: 'attachment' }],
        },
      ];
      const where: SubSchemaWhereInput = {
        data: { path: 'status', equals: 'uploaded' },
      };
      const orderBy: SubSchemaOrderByItem[] = [
        { data: { path: 'size', order: 'desc', nulls: 'last' } },
      ];

      const cte = buildSubSchemaCte({ tables });
      const whereClause = buildSubSchemaWhere(where);
      const orderByClause = buildSubSchemaOrderBy(orderBy);

      const cteSql = sqlToString(cte);
      const whereSql = sqlToString(whereClause);
      const orderBySql = sqlToString(orderByClause);

      expect(cteSql).toContain('sub_schema_items AS');
      expect(cteSql).toContain('files');
      expect(whereSql).toContain('WHERE');
      expect(whereSql).toContain('status');
      expect(orderBySql).toContain('ORDER BY');
      expect(orderBySql).toContain('size');
    });

    it('should use tableAlias in WHERE clause when provided', () => {
      const where: SubSchemaWhereInput = {
        tableId: 'characters',
        data: { path: 'status', equals: 'uploaded' },
      };

      const whereClause = buildSubSchemaWhere({ where, tableAlias: 'ssi' });
      const sql = sqlToString(whereClause);

      expect(sql).toContain('ssi."tableId"');
      expect(sql).toContain('ssi."data"');
    });

    it('should use tableAlias in ORDER BY clause when provided', () => {
      const orderBy: SubSchemaOrderByItem[] = [
        { tableId: 'asc' },
        { data: { path: 'size', order: 'desc', nulls: 'last' } },
      ];

      const orderByClause = buildSubSchemaOrderBy({ orderBy, tableAlias: 'ssi' });
      const sql = sqlToString(orderByClause);

      expect(sql).toContain('ssi."tableId"');
      expect(sql).toContain('ssi."data"');
    });

    it('should use tableAlias in nested AND/OR/NOT conditions', () => {
      const where: SubSchemaWhereInput = {
        AND: [
          { tableId: 'characters' },
          { data: { path: 'status', equals: 'uploaded' } },
        ],
        OR: [
          { data: { path: 'size', gte: 1000 } },
          { rowId: 'hero' },
        ],
        NOT: { fieldPath: 'avatar' },
      };

      const whereClause = buildSubSchemaWhere({ where, tableAlias: 'ssi' });
      const sql = sqlToString(whereClause);

      expect(sql).toContain('ssi."tableId"');
      expect(sql).toContain('ssi."data"');
      expect(sql).toContain('ssi."rowId"');
      expect(sql).toContain('ssi."fieldPath"');
      expect(sql).not.toMatch(/(?<!ssi\.)"tableId"/);
      expect(sql).not.toMatch(/(?<!ssi\.)"rowId"/);
      expect(sql).not.toMatch(/(?<!ssi\.)"fieldPath"/);
    });
  });

  describe('validation', () => {
    it('should throw error for invalid cteName', () => {
      expect(() => {
        buildSubSchemaCte({
          tables: [{ tableId: 't1', tableVersionId: 'v1', paths: [{ path: 'f' }] }],
          cteName: 'invalid-name',
        });
      }).toThrow('Invalid cteName');
    });

    it('should throw error for invalid tableAlias in WHERE', () => {
      expect(() => {
        buildSubSchemaWhere({ where: { tableId: 'test' }, tableAlias: 'DROP TABLE;--' });
      }).toThrow('Invalid tableAlias');
    });

    it('should throw error for invalid tableAlias in ORDER BY', () => {
      expect(() => {
        buildSubSchemaOrderBy({ orderBy: [{ tableId: 'asc' }], tableAlias: 'SELECT *' });
      }).toThrow('Invalid tableAlias');
    });

    it('should accept valid SQL identifiers', () => {
      expect(() => {
        buildSubSchemaCte({
          tables: [{ tableId: 't1', tableVersionId: 'v1', paths: [{ path: 'f' }] }],
          cteName: 'valid_cte_name_123',
        });
      }).not.toThrow();

      expect(() => {
        buildSubSchemaWhere({ where: { tableId: 'test' }, tableAlias: '_alias123' });
      }).not.toThrow();

      expect(() => {
        buildSubSchemaOrderBy({ orderBy: [{ tableId: 'asc' }], tableAlias: 'Alias_Name' });
      }).not.toThrow();
    });
  });
});
