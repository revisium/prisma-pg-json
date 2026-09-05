import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  buildQuery,
  generateWhere,
  configurePrisma,
  decodeCursor,
  encodeCursor,
  parseJsonPath,
  arrayToJsonPath,
  type CursorValue,
  type QueryBuilderOptions,
  type WhereConditionsTyped,
} from '../../index';
import { Prisma } from '@prisma/client';
import { fieldConfig } from '../dsl/query-case';

beforeAll(() => configurePrisma(Prisma));

describe('consumer contract: opaque values and public validation', () => {
  it.each<CursorValue[]>([
    [],
    [''],
    [null, true, false, 0, -1, 1.5, '42'],
    ['Привет 👋', 'line\nbreak', "x' OR true --", '2024-01-01T00:00:00.000Z'],
  ])('cursor round trip preserves the supplied values: %j', (...values) => {
    const cursor = encodeCursor(values, 'row:👋', 'sort-hash');
    expect(typeof cursor).toBe('string');
    expect(decodeCursor(cursor)).toEqual({ values, tiebreaker: 'row:👋', sortHash: 'sort-hash' });
  });

  it.each(['', 'not a cursor', 'e30=', 'bnVsbA=='])('rejects invalid cursor %j', (cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });

  it.each([
    ['profile', 'role'],
    ['items', '0', 'name'],
    ['items', '*', 'name'],
  ])('public JSON path conversion round trip: %j', (...segments) => {
    expect(parseJsonPath(arrayToJsonPath(segments))).toEqual(segments);
  });

  it('public JSON path parser returns the supplied segments without copying or rewriting them', () => {
    const segments = ['items', '-1', 'name'];
    expect(parseJsonPath(segments)).toBe(segments);
    expect(segments).toEqual(['items', '-1', 'name']);
  });

  it.each(['$.items[ 0 ].price', '$."profile.data".rank'])(
    'preserves an explicitly prefixed PostgreSQL path in the bound query: %s',
    (jsonPath) => {
      const query = buildQuery({
        tableName: 'users',
        fieldConfig,
        where: { data: { path: jsonPath, gt: 10 } },
      });
      expect(query.values).toContain(`${jsonPath} ? (@ > $val)`);
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid take %s', (take) => {
    expect(() => buildQuery({ tableName: 'users', take })).toThrow();
  });
  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid skip %s', (skip) => {
    expect(() => buildQuery({ tableName: 'users', skip })).toThrow();
  });
  it.each(['u; DROP TABLE users', 'u"', 'a.b', '1alias'])(
    'rejects invalid alias %j',
    (tableAlias) => {
      expect(() => buildQuery({ tableName: 'users', tableAlias })).toThrow();
    },
  );
  it.each(['where', 'orderBy'] as const)('fieldConfig rejects unknown %s field', (option) => {
    const options = {
      tableName: 'users',
      fieldConfig,
      [option]: { secret: option === 'where' ? 'value' : 'asc' },
    };
    expect(() => buildQuery(options)).toThrow();
  });

  it('consumer types accept the documented field-specific filters and sorting', () => {
    const options = {
      tableName: 'users',
      fieldConfig,
      where: {
        AND: [
          { age: { gte: 18 } },
          { name: { startsWith: 'A' } },
          { isActive: { equals: true } },
          { createdAt: { lte: new Date('2025-01-01') } },
          { data: { path: ['role'], equals: 'admin' } },
        ],
      },
      orderBy: [{ data: { path: 'rank', type: 'int', direction: 'desc' } }, { id: 'asc' }],
    } satisfies QueryBuilderOptions<typeof fieldConfig>;
    expect(() => buildQuery(options)).not.toThrow();
  });

  it('consumer types reject operators belonging to another field type', () => {
    const invalid: WhereConditionsTyped<typeof fieldConfig> = {
      // @ts-expect-error String operators must not be accepted for numeric fields.
      age: { contains: '18' },
      // @ts-expect-error Numeric comparisons must not be accepted for boolean fields.
      isActive: { gt: true },
      // @ts-expect-error JSON filters require a path.
      data: { equals: 1 },
    };
    expect(Object.keys(invalid)).toHaveLength(3);
  });
});

describe('consumer contract: filter traversal compatibility', () => {
  function compile(where: unknown) {
    return generateWhere({
      where: where as WhereConditionsTyped<typeof fieldConfig>,
      fieldConfig,
      tableAlias: 'u',
    });
  }

  it.each([
    [{}, 'TRUE'],
    [{ AND: [], OR: [] }, 'TRUE'],
    [{ AND: { name: 'ignored' }, OR: { name: 'ignored' } }, 'TRUE'],
    [{ NOT: {} }, 'NOT (TRUE)'],
    [{ NOT: 1 }, 'NOT (TRUE)'],
    [{ NOT: 0 }, 'TRUE'],
    [{ name: null, age: undefined }, 'TRUE'],
  ])('preserves empty and ignored input %j', (where, sql) => {
    expect(compile(where).sql).toBe(sql);
    expect(compile(where).values).toEqual([]);
  });

  it.each([null, { AND: [null] }, { NOT: [] }])(
    'preserves the failure for malformed input %j',
    (where) => {
      expect(() => compile(where)).toThrow(TypeError);
    },
  );

  it.each([
    { data: { path: 'x' }, unknown: 'x' },
    { data: { path: 'x' }, AND: [null] },
    { OR: [null], data: { path: 'x' } },
    { data: { path: 'x' }, NOT: [] },
  ])('reports the first field error before later clauses: %j', (where) => {
    expect(() => compile(where)).toThrow('No valid operations found for field: data');
  });

  it('compiles fields in insertion order, followed by AND, OR, then NOT', () => {
    const query = compile({
      NOT: [{ name: 'excluded-1' }, { name: 'excluded-2' }],
      OR: [{ name: 'choice' }],
      age: 21,
      AND: [{ name: 'required' }],
      name: 'first',
    });
    expect(query.sql).toBe(
      'u."age" = ? AND u."name" = ? AND (u."name" = ?) AND (u."name" = ?) AND NOT (u."name" = ?) AND NOT (u."name" = ?)',
    );
    expect(query.values).toEqual([21, 'first', 'required', 'choice', 'excluded-1', 'excluded-2']);
  });

  it.each(['AND', 'OR', 'NOT'])('preserves sparse %s array slots', (operator) => {
    const children = new Array(2);
    children[1] = { name: 'second' };
    const query = compile({ [operator]: children });
    expect(query.values).toEqual([undefined, 'second']);
    expect(query.sql).toBe(
      operator === 'NOT' ? '? AND NOT (u."name" = ?)' : `(? ${operator} u."name" = ?)`,
    );
  });
});

function typescriptFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? typescriptFiles(filename)
      : filename.endsWith('.ts')
        ? [filename]
        : [];
  });
}

it('black-box test cohort imports library code only through its public entrypoint', () => {
  const tests = path.resolve(__dirname, '..');
  const source = path.resolve(tests, '..');
  const files = [
    ...typescriptFiles(path.join(tests, 'cases')),
    ...typescriptFiles(path.join(tests, 'dsl')),
    path.join(tests, 'integration/consumer-workflows.spec.ts'),
    path.join(tests, 'integration/query-cases.spec.ts'),
    path.join(tests, 'integration/numeric-precision.spec.ts'),
    __filename,
  ];
  const violations: string[] = [];
  for (const filename of files) {
    const ast = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue;
      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith('.')) continue;
      const target = path.resolve(path.dirname(filename), specifier);
      const withinSource = target.startsWith(source + path.sep);
      const withinTests = target.startsWith(tests + path.sep);
      if (withinSource && !withinTests && target !== path.join(source, 'index')) {
        violations.push(`${path.relative(tests, filename)}: ${specifier}`);
      }
    }
  }
  expect(violations).toEqual([]);
});
