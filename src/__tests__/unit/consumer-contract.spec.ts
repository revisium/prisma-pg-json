import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  buildQuery,
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
