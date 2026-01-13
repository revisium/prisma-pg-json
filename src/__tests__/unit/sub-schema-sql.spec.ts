import { format } from 'sql-formatter';
import { buildSubSchemaQuery, buildSubSchemaCountQuery } from '../../sub-schema/sub-schema-builder';
import { SubSchemaQueryParams } from '../../sub-schema/types';
import { configurePrisma } from '../../prisma-adapter';
import { Prisma } from '@prisma/client';

configurePrisma(Prisma);

function sqlToString(sql: ReturnType<typeof buildSubSchemaQuery>): string {
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
