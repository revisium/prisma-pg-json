import { Prisma } from '@prisma/client';
import { configurePrisma } from '../../prisma-adapter';
import { buildQuery, generateWhere } from '../../query-builder';
import { generateOrderByParts } from '../../orderBy';
import { buildSubSchemaWhere } from '../../sub-schema/where';
import type { QueryBuilderOptions, WhereConditionsTyped } from '../../types';

configurePrisma(Prisma);
const fieldConfig = { name: 'string' } as const;
const options = { tableName: 'users', tableAlias: 't', fieldConfig };

describe('Public query input limits', () => {
  it.each([null, -1, 1.5, Infinity, NaN, '50', 10001])('rejects unsafe take %s', (take) => {
    expect(() => buildQuery({ ...options, take } as QueryBuilderOptions)).toThrow(/take/);
  });

  it.each([null, -1, 1.5, Infinity, '0', 1000001])('rejects unsafe skip %s', (skip) => {
    expect(() => buildQuery({ ...options, skip } as QueryBuilderOptions)).toThrow(/skip/);
  });

  it('retains defaults and accepts zero and maximum pagination', () => {
    expect(buildQuery(options).values).toEqual([50, 0]);
    expect(buildQuery({ ...options, take: 0, skip: 0 }).values).toEqual([0, 0]);
    expect(buildQuery({ ...options, take: 10000, skip: 1000000 }).values).toEqual([10000, 1000000]);
  });

  it('rejects deeply nested WHERE before recursive SQL generation', () => {
    let where: WhereConditionsTyped<typeof fieldConfig> = { name: 'Alice' };
    for (let i = 0; i < 3000; i++) where = { AND: [where] };
    expect(() => buildQuery({ ...options, where })).toThrow(/depth/i);
    expect(() => generateWhere({ ...options, where })).toThrow(/depth/i);
  });

  it('rejects nested scalar NOT filters', () => {
    let filter: unknown = 'Alice';
    for (let i = 0; i < 3000; i++) filter = { not: filter };
    const where = { name: filter } as WhereConditionsTyped<typeof fieldConfig>;
    expect(() => generateWhere({ ...options, where })).toThrow(/depth/i);
  });

  it('rejects overly broad filters', () => {
    const where = { OR: Array.from({ length: 10001 }, () => ({ name: 'Alice' })) };
    expect(() => generateWhere({ ...options, where })).toThrow(/(node|size|complexity)/i);
  });

  it('rejects excessive sort inputs', () => {
    const orderBy = Array.from({ length: 10001 }, () => ({ name: 'asc' as const }));
    expect(() => generateOrderByParts({ ...options, orderBy })).toThrow(/(node|size|complexity)/i);
  });

  it('protects the sub-schema WHERE entry point too', () => {
    let where: import('../../sub-schema/types').SubSchemaWhereInput = { rowId: 'one' };
    for (let i = 0; i < 3000; i++) where = { NOT: where };
    expect(() => buildSubSchemaWhere(where)).toThrow(/depth/i);
  });
});
