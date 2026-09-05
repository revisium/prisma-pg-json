import { Prisma } from '@prisma/client';
import { configurePrisma } from '../../prisma-adapter';
import { buildQuery, generateWhere } from '../../query-builder';
import { generateOrderByParts } from '../../orderBy';

configurePrisma(Prisma);
const fieldConfig = { name: 'string', data: 'json' } as const;
const options = { tableName: 'users', tableAlias: 't', fieldConfig };
const attack = 'name" = $1 OR true OR t."name';

describe('SQL identifier boundaries', () => {
  it.each([attack, 'password', 'toString', '__proto__'])('rejects unconfigured WHERE field %s', (key) => {
    expect(() => buildQuery({ ...options, where: { [key]: 'never' } })).toThrow(/Unknown field/);
  });

  it('checks fields in nested logical conditions', () => {
    expect(() => generateWhere({ tableAlias: 't', fieldConfig, where: JSON.parse(JSON.stringify({ AND: [{ [attack]: 'never' }] })) })).toThrow(/Unknown field/);
  });

  it.each([attack, 'password', 'toString'])('rejects unconfigured ORDER BY field %s', (key) => {
    expect(() => generateOrderByParts({ tableAlias: 't', fieldConfig, orderBy: { [key]: 'asc' } })).toThrow(/Unknown field/);
  });

  it('quotes a configured field containing double quotes', () => {
    const key = 'display"name';
    const query = buildQuery({ ...options, fieldConfig: { [key]: 'string' }, fields: [key], where: { [key]: 'Alice' }, orderBy: { [key]: 'asc' } });
    expect(query.text).toBe('SELECT t."display""name" FROM "users" t WHERE t."display""name" = $1 ORDER BY t."display""name" ASC LIMIT $2 OFFSET $3');
    expect(query.values).toEqual(['Alice', 50, 0]);
  });

  it('quotes table names as one identifier', () => {
    const query = buildQuery({ ...options, tableName: 'users" JOIN secrets ON true --' });
    expect(query.text).toBe('SELECT t.* FROM "users"" JOIN secrets ON true --" t LIMIT $1 OFFSET $2');
  });

  it('escapes fields even when fieldConfig is omitted', () => {
    const query = buildQuery({ tableName: 'users', tableAlias: 't', where: { [attack]: 'never' } });
    expect(query.text).toBe('SELECT t.* FROM "users" t WHERE t."name"" = $1 OR true OR t.""name" = $1 LIMIT $2 OFFSET $3');
  });

  it.each(['t JOIN secrets ON true --', 't; SELECT 1', 't"', ''])('rejects invalid aliases in all entry points: %s', (tableAlias) => {
    expect(() => buildQuery({ ...options, tableAlias })).toThrow(/Invalid tableAlias/);
    expect(() => generateWhere({ tableAlias, fieldConfig, where: { name: 'Alice' } })).toThrow(/Invalid tableAlias/);
    expect(() => generateOrderByParts({ tableAlias, fieldConfig, orderBy: { name: 'asc' } })).toThrow(/Invalid tableAlias/);
  });

  it.each(['', 'bad\0name'])('rejects invalid table and projection identifiers: %s', (name) => {
    expect(() => buildQuery({ ...options, tableName: name })).toThrow(/identifier/);
    expect(() => buildQuery({ ...options, fields: [name] })).toThrow(/identifier/);
  });
});
