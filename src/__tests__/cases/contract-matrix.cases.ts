import type {
  BooleanFilter,
  DateFilter,
  JsonFilter,
  NumberFilter,
  StringFilter,
  WhereConditionsTyped,
} from '../../index';
import { fieldConfig, type QueryCase, type TestFieldConfig, type UserRow } from '../dsl/query-case';

type Where = WhereConditionsTyped<TestFieldConfig>;
type Predicate = { name: string; where: Where; matches: string[] };
const query = {
  tableName: 'users',
  tableAlias: 'u',
  fields: ['id'],
  fieldConfig,
  orderBy: { id: 'asc' },
  take: 100,
} satisfies QueryCase['query'];
const rows: UserRow[] = [
  {
    id: 'a',
    age: 17,
    name: 'alpha',
    isActive: false,
    createdAt: '2025-01-01T00:00:00Z',
    data: { score: 17 },
  },
  {
    id: 'b',
    age: 18,
    name: 'beta',
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
    data: { score: 18 },
  },
  {
    id: 'c',
    age: 19,
    name: 'gamma',
    isActive: false,
    createdAt: '2025-01-03T00:00:00Z',
    data: { score: 19 },
  },
  {
    id: 'd',
    age: 18,
    name: 'beta gamma',
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
    data: { score: 18 },
  },
];
const predicates: Predicate[] = [
  { name: 'number shorthand', where: { age: 18 }, matches: ['b', 'd'] },
  { name: 'number equals', where: { age: { equals: 18 } }, matches: ['b', 'd'] },
  { name: 'number not value', where: { age: { not: 18 } }, matches: ['a', 'c'] },
  { name: 'number gt', where: { age: { gt: 18 } }, matches: ['c'] },
  { name: 'number gte', where: { age: { gte: 18 } }, matches: ['b', 'c', 'd'] },
  { name: 'number lt', where: { age: { lt: 18 } }, matches: ['a'] },
  { name: 'number lte', where: { age: { lte: 18 } }, matches: ['a', 'b', 'd'] },
  { name: 'number in', where: { age: { in: [17, 19] } }, matches: ['a', 'c'] },
  { name: 'number notIn', where: { age: { notIn: [17, 19] } }, matches: ['b', 'd'] },
  { name: 'number not filter', where: { age: { not: { gte: 18 } } }, matches: ['a'] },
  { name: 'number double not', where: { age: { not: { not: 18 } } }, matches: ['b', 'd'] },
  { name: 'number range', where: { age: { gte: 18, lt: 19 } }, matches: ['b', 'd'] },
  { name: 'string shorthand', where: { name: 'beta' }, matches: ['b'] },
  { name: 'string equals', where: { name: { equals: 'beta' } }, matches: ['b'] },
  { name: 'string not value', where: { name: { not: 'beta' } }, matches: ['a', 'c', 'd'] },
  { name: 'string contains', where: { name: { contains: 'eta' } }, matches: ['b', 'd'] },
  { name: 'string startsWith', where: { name: { startsWith: 'beta' } }, matches: ['b', 'd'] },
  { name: 'string endsWith', where: { name: { endsWith: 'gamma' } }, matches: ['c', 'd'] },
  { name: 'string in', where: { name: { in: ['alpha', 'gamma'] } }, matches: ['a', 'c'] },
  { name: 'string notIn', where: { name: { notIn: ['alpha', 'gamma'] } }, matches: ['b', 'd'] },
  { name: 'string gt', where: { name: { gt: 'beta' } }, matches: ['c', 'd'] },
  { name: 'string gte', where: { name: { gte: 'beta' } }, matches: ['b', 'c', 'd'] },
  { name: 'string lt', where: { name: { lt: 'beta' } }, matches: ['a'] },
  { name: 'string lte', where: { name: { lte: 'beta' } }, matches: ['a', 'b'] },
  { name: 'string search', where: { name: { search: 'beta gamma' } }, matches: ['d'] },
  {
    name: 'string not filter',
    where: { name: { not: { startsWith: 'beta' } } },
    matches: ['a', 'c'],
  },
  { name: 'string double not', where: { name: { not: { not: 'beta' } } }, matches: ['b'] },
  { name: 'boolean shorthand true', where: { isActive: true }, matches: ['b', 'd'] },
  { name: 'boolean shorthand false', where: { isActive: false }, matches: ['a', 'c'] },
  { name: 'boolean equals true', where: { isActive: { equals: true } }, matches: ['b', 'd'] },
  { name: 'boolean equals false', where: { isActive: { equals: false } }, matches: ['a', 'c'] },
  { name: 'boolean not true', where: { isActive: { not: true } }, matches: ['a', 'c'] },
  { name: 'boolean not false', where: { isActive: { not: false } }, matches: ['b', 'd'] },
  {
    name: 'boolean not filter',
    where: { isActive: { not: { equals: true } } },
    matches: ['a', 'c'],
  },
  { name: 'boolean double not', where: { isActive: { not: { not: true } } }, matches: ['b', 'd'] },
  { name: 'JSON numeric predicate', where: { data: { path: 'score', gt: 18 } }, matches: ['c'] },
];
for (const valueType of ['string', 'Date'] as const) {
  const date = (day: number) =>
    valueType === 'Date' ? new Date(`2025-01-0${day}T00:00:00Z`) : `2025-01-0${day}T00:00:00Z`;
  const datePredicates: Predicate[] = [
    { name: 'shorthand', where: { createdAt: date(2) }, matches: ['b', 'd'] },
    { name: 'equals', where: { createdAt: { equals: date(2) } }, matches: ['b', 'd'] },
    { name: 'not value', where: { createdAt: { not: date(2) } }, matches: ['a', 'c'] },
    { name: 'gt', where: { createdAt: { gt: date(2) } }, matches: ['c'] },
    { name: 'gte', where: { createdAt: { gte: date(2) } }, matches: ['b', 'c', 'd'] },
    { name: 'lt', where: { createdAt: { lt: date(2) } }, matches: ['a'] },
    { name: 'lte', where: { createdAt: { lte: date(2) } }, matches: ['a', 'b', 'd'] },
    { name: 'in', where: { createdAt: { in: [date(1), date(3)] } }, matches: ['a', 'c'] },
    { name: 'notIn', where: { createdAt: { notIn: [date(1), date(3)] } }, matches: ['b', 'd'] },
    { name: 'not filter', where: { createdAt: { not: { gte: date(2) } } }, matches: ['a'] },
    { name: 'double not', where: { createdAt: { not: { not: date(2) } } }, matches: ['b', 'd'] },
    { name: 'range', where: { createdAt: { gte: date(2), lt: date(3) } }, matches: ['b', 'd'] },
  ];
  predicates.push(...datePredicates.map((p) => ({ ...p, name: `date ${valueType} ${p.name}` })));
}

function resultCase(name: string, fixture: UserRow[], where: Where, matches: string[]): QueryCase {
  return {
    name: `contract matrix: ${name}`,
    rows: fixture,
    query: { ...query, where },
    expected: { rows: [...matches].sort().map((id) => ({ id })) },
  };
}
const scalarCases = predicates.flatMap(({ name, where, matches }) => {
  const complement = rows.filter((row) => !matches.includes(row.id)).map((row) => row.id);
  const contexts: Array<{ name: string; where: Where; matches: string[] }> = [
    { name: 'direct', where, matches },
    {
      name: 'AND guard',
      where: { AND: [where, { id: { in: ['a', 'b'] } }] },
      matches: matches.filter((id) => ['a', 'b'].includes(id)),
    },
    {
      name: 'OR guard',
      where: { OR: [where, { id: 'a' }] },
      matches: [...new Set([...matches, 'a'])],
    },
    { name: 'NOT object', where: { NOT: where }, matches: complement },
    { name: 'NOT singleton array', where: { NOT: [where] }, matches: complement },
    { name: 'double NOT', where: { NOT: { NOT: where } }, matches },
    {
      name: 'nested OR within AND',
      where: { AND: [{ OR: [where, { id: 'a' }] }, { id: { not: 'c' } }] },
      matches: [...new Set([...matches, 'a'])].filter((id) => id !== 'c'),
    },
  ];
  return contexts.map((context) =>
    resultCase(`${name} / ${context.name}`, rows, context.where, context.matches),
  );
});

const nullableScalarCases: QueryCase[] = scalarCases
  .filter((scenario) => !scenario.name.includes('JSON numeric predicate'))
  .map((scenario) => ({
    ...scenario,
    name: `${scenario.name} / null field excluded`,
    rows: [
      ...scenario.rows,
      { id: 'z-null', name: null, age: null, isActive: null, createdAt: null, data: null },
    ],
  }));

const representatives: Predicate[] = [
  { name: 'number gt', where: { age: { gt: 18 } }, matches: ['c'] },
  { name: 'string contains', where: { name: { contains: 'eta' } }, matches: ['b', 'd'] },
  { name: 'boolean equals true', where: { isActive: { equals: true } }, matches: ['b', 'd'] },
  { name: 'date gt', where: { createdAt: { gt: '2025-01-02T00:00:00Z' } }, matches: ['c'] },
  { name: 'JSON numeric predicate', where: { data: { path: 'score', gt: 18 } }, matches: ['c'] },
];
const logicalPairs = representatives.flatMap((left) =>
  representatives.flatMap((right) => {
    const both = left.matches.filter((id) => right.matches.includes(id));
    const either = [...new Set([...left.matches, ...right.matches])];
    return [
      resultCase(`${left.name} AND ${right.name}`, rows, { AND: [left.where, right.where] }, both),
      resultCase(`${left.name} OR ${right.name}`, rows, { OR: [left.where, right.where] }, either),
      resultCase(
        `NOT (${left.name} OR ${right.name})`,
        rows,
        { NOT: { OR: [left.where, right.where] } },
        rows.filter((row) => !either.includes(row.id)).map((row) => row.id),
      ),
      resultCase(
        `NOT (${left.name} AND ${right.name})`,
        rows,
        { NOT: { AND: [left.where, right.where] } },
        rows.filter((row) => !both.includes(row.id)).map((row) => row.id),
      ),
    ];
  }),
);

type JsonValue = NonNullable<UserRow['data']>;
type JsonPathFixture = {
  name: string;
  path: JsonFilter['path'];
  wrap: (value: JsonValue) => JsonValue;
};
const paths: JsonPathFixture[] = [
  { name: 'root string', path: '', wrap: (value) => value },
  { name: 'root array', path: [], wrap: (value) => value },
  { name: 'member string', path: 'value', wrap: (value) => ({ value }) },
  { name: 'member array', path: ['value'], wrap: (value) => ({ value }) },
  { name: 'nested string', path: 'outer.value', wrap: (value) => ({ outer: { value } }) },
  { name: 'nested array', path: ['outer', 'value'], wrap: (value) => ({ outer: { value } }) },
  { name: 'index string', path: 'items[0].value', wrap: (value) => ({ items: [{ value }] }) },
  { name: 'index array', path: ['items', '0', 'value'], wrap: (value) => ({ items: [{ value }] }) },
  { name: 'wildcard string', path: 'items[*].value', wrap: (value) => ({ items: [{ value }] }) },
  {
    name: 'wildcard array',
    path: ['items', '*', 'value'],
    wrap: (value) => ({ items: [{ value }] }),
  },
];
type JsonPredicate = { name: string; filter: Omit<JsonFilter, 'path'>; matches: string[] };
const numericJson: JsonPredicate[] = [
  { name: 'equals', filter: { equals: 18 }, matches: ['b'] },
  { name: 'not', filter: { not: 18 }, matches: ['a', 'c'] },
  { name: 'gt', filter: { gt: 18 }, matches: ['c'] },
  { name: 'gte', filter: { gte: 18 }, matches: ['b', 'c'] },
  { name: 'lt', filter: { lt: 18 }, matches: ['a'] },
  { name: 'lte', filter: { lte: 18 }, matches: ['a', 'b'] },
  { name: 'in', filter: { in: [17, 19] }, matches: ['a', 'c'] },
  { name: 'notIn', filter: { notIn: [17, 19] }, matches: ['b'] },
  { name: 'range', filter: { gte: 18, lt: 19 }, matches: ['b'] },
];
const stringJson: JsonPredicate[] = [
  { name: 'equals', filter: { equals: 'beta' }, matches: ['b'] },
  { name: 'not', filter: { not: 'beta' }, matches: ['a', 'c', 'd'] },
  { name: 'in', filter: { in: ['alpha', 'gamma'] }, matches: ['a', 'c'] },
  { name: 'notIn', filter: { notIn: ['alpha', 'gamma'] }, matches: ['b', 'd'] },
  { name: 'gt', filter: { gt: 'beta' }, matches: ['c', 'd'] },
  { name: 'gte', filter: { gte: 'beta' }, matches: ['b', 'c', 'd'] },
  { name: 'lt', filter: { lt: 'beta' }, matches: ['a'] },
  { name: 'lte', filter: { lte: 'beta' }, matches: ['a', 'b'] },
  { name: 'contains', filter: { string_contains: 'eta' }, matches: ['b', 'd'] },
  { name: 'starts', filter: { string_starts_with: 'beta' }, matches: ['b', 'd'] },
  { name: 'ends', filter: { string_ends_with: 'gamma' }, matches: ['c', 'd'] },
];
const booleanJson: JsonPredicate[] = [
  { name: 'equals true', filter: { equals: true }, matches: ['b'] },
  { name: 'equals false', filter: { equals: false }, matches: ['a'] },
  { name: 'not true', filter: { not: true }, matches: ['a'] },
  { name: 'not false', filter: { not: false }, matches: ['b'] },
  { name: 'in', filter: { in: [true] }, matches: ['b'] },
  { name: 'notIn', filter: { notIn: [true] }, matches: ['a'] },
];
function jsonPathCases(
  type: string,
  values: JsonValue[],
  filters: JsonPredicate[],
  fixturePaths: JsonPathFixture[] = paths,
): QueryCase[] {
  return fixturePaths.flatMap(({ name, path, wrap }) =>
    filters.map(({ name: operation, filter, matches }) =>
      resultCase(
        `JSON ${type} ${operation} / ${name}`,
        values.map((value, i) => ({ id: String.fromCharCode(97 + i), data: wrap(value) })),
        { data: { path, ...filter } },
        matches,
      ),
    ),
  );
}

const insensitiveCases = (['default', 'insensitive'] as const).flatMap((mode) => {
  const fixture: UserRow[] = [
    { id: 'a', name: 'Beta', data: { value: 'Beta' } },
    { id: 'b', name: 'beta', data: { value: 'beta' } },
    { id: 'c', name: 'gamma', data: { value: 'gamma' } },
  ];
  const matches = mode === 'insensitive' ? ['a', 'b'] : ['b'];
  return [
    ...(['contains', 'startsWith', 'endsWith'] as const).map((operation) =>
      resultCase(
        `string ${operation} / mode ${mode}`,
        fixture,
        { name: { [operation]: 'beta', mode } },
        matches,
      ),
    ),
    ...(['string_contains', 'string_starts_with', 'string_ends_with'] as const).map((operation) =>
      resultCase(
        `JSON ${operation} / mode ${mode}`,
        fixture,
        { data: { path: 'value', [operation]: 'beta', mode } },
        matches,
      ),
    ),
  ];
});
const wildcardRows: UserRow[] = [
  { id: 'a', data: { items: [{ value: 17 }, { value: 19 }] } },
  { id: 'b', data: { items: [{ value: 18 }] } },
  { id: 'c', data: { items: [{ value: 17 }] } },
  { id: 'd', data: { items: [{ value: 20 }] } },
];
const wildcardPredicates: JsonPredicate[] = [
  { name: 'equals selects any matching element', filter: { equals: 19 }, matches: ['a'] },
  { name: 'gt selects any matching element', filter: { gt: 18 }, matches: ['a', 'd'] },
  { name: 'gte selects any matching element', filter: { gte: 18 }, matches: ['a', 'b', 'd'] },
  { name: 'lt selects any matching element', filter: { lt: 18 }, matches: ['a', 'c'] },
  { name: 'lte selects any matching element', filter: { lte: 18 }, matches: ['a', 'b', 'c'] },
  { name: 'in selects any matching element', filter: { in: [17, 19] }, matches: ['a', 'c'] },
];
const wildcardCompatibility: JsonPredicate[] = [
  {
    name: 'wildcard bounds independently match any element',
    filter: { gte: 18, lt: 19 },
    matches: ['a', 'b'],
  },
  {
    name: 'wildcard not matches any unequal element',
    filter: { not: 19 },
    matches: ['a', 'b', 'c', 'd'],
  },
  {
    name: 'wildcard notIn matches any unlisted element',
    filter: { notIn: [19] },
    matches: ['a', 'b', 'c', 'd'],
  },
];
function wildcardCases(filters: JsonPredicate[]): QueryCase[] {
  return paths
    .filter(({ name }) => name.startsWith('wildcard'))
    .flatMap(({ name, path }) =>
      filters.map(({ name: title, filter, matches }) =>
        resultCase(`${title} / ${name}`, wildcardRows, { data: { path, ...filter } }, matches),
      ),
    );
}

const notArrayRows: UserRow[] = [...rows, { id: 'z-null', age: null, name: null }];
const notArrayCases: QueryCase[] = [
  resultCase(
    'NOT array excludes each child match',
    notArrayRows,
    { NOT: [{ age: { gt: 18 } }, { name: { contains: 'eta' } }] },
    ['a'],
  ),
  resultCase(
    'NOT object conjunction negates the whole object',
    notArrayRows,
    { NOT: { age: { gt: 18 }, name: { contains: 'eta' } } },
    ['a', 'b', 'c', 'd'],
  ),
  resultCase(
    'NOT array retains conjunction inside each child',
    notArrayRows,
    { NOT: [{ age: { gte: 18 }, name: { startsWith: 'beta' } }, { age: { gt: 18 } }] },
    ['a'],
  ),
  resultCase(
    'NOT array retains OR grouping inside each child',
    notArrayRows,
    { NOT: [{ OR: [{ age: 17 }, { name: 'beta' }] }, { age: { gt: 18 } }] },
    ['d'],
  ),
  resultCase(
    'nested NOT array restores either child match but excludes null',
    notArrayRows,
    { NOT: { NOT: [{ age: { gt: 18 } }, { name: { contains: 'eta' } }] } },
    ['b', 'c', 'd'],
  ),
];

const jsonTypes = [
  { name: 'number', values: [17, 18, 19], filters: numericJson },
  { name: 'string', values: ['alpha', 'beta', 'gamma', 'beta gamma'], filters: stringJson },
  { name: 'boolean', values: [false, true], filters: booleanJson },
];
const rootPaths = paths.slice(0, 2);
const memberPaths = paths.slice(2);
export const contractMatrixCases: QueryCase[] = [
  ...notArrayCases,
  ...scalarCases,
  ...nullableScalarCases,
  ...logicalPairs,
  ...jsonTypes.flatMap(({ name, values, filters }) => [
    ...jsonPathCases(name, values, filters, memberPaths),
    ...jsonPathCases(
      name,
      values,
      filters.filter(({ filter }) => filter.equals !== undefined),
      rootPaths,
    ),
  ]),
  ...insensitiveCases,
  ...wildcardCases(wildcardPredicates),
  ...wildcardCases(wildcardCompatibility),
];

// Root paths are documented for search. Other root operations are permitted by
// the public type, but only equals succeeds in these fixtures. Preserve the
// intuitive desired results separately until root support is explicitly decided.
export const unsupportedRootCases: QueryCase[] = jsonTypes.flatMap(({ name, values, filters }) =>
  jsonPathCases(
    name,
    values,
    filters.filter(({ filter }) => filter.equals === undefined),
    rootPaths,
  ),
);

// A public filter option cannot be added without assigning it a contract scenario family.
// These are coverage pointers, not generated expectations or engine behavior.
export const filterContractCoverage = {
  string: {
    equals: 'scalar contexts',
    not: 'scalar contexts',
    contains: 'scalar contexts and modes',
    startsWith: 'scalar contexts and modes',
    endsWith: 'scalar contexts and modes',
    in: 'scalar contexts',
    notIn: 'scalar contexts',
    lt: 'scalar contexts',
    lte: 'scalar contexts',
    gt: 'scalar contexts',
    gte: 'scalar contexts',
    search: 'scalar contexts',
    mode: 'modes',
  } satisfies Record<keyof StringFilter, string>,
  number: {
    equals: 'scalar contexts',
    not: 'scalar contexts',
    gt: 'scalar contexts',
    gte: 'scalar contexts',
    lt: 'scalar contexts',
    lte: 'scalar contexts',
    in: 'scalar contexts',
    notIn: 'scalar contexts',
  } satisfies Record<keyof NumberFilter, string>,
  boolean: { equals: 'scalar contexts', not: 'scalar contexts' } satisfies Record<
    keyof BooleanFilter,
    string
  >,
  date: {
    equals: 'Date and string scalar contexts',
    not: 'Date and string scalar contexts',
    gt: 'Date and string scalar contexts',
    gte: 'Date and string scalar contexts',
    lt: 'Date and string scalar contexts',
    lte: 'Date and string scalar contexts',
    in: 'Date and string scalar contexts',
    notIn: 'Date and string scalar contexts',
  } satisfies Record<keyof DateFilter, string>,
  json: {
    path: 'JSON paths',
    equals: 'JSON paths',
    not: 'JSON paths',
    string_contains: 'JSON paths and modes',
    string_starts_with: 'JSON paths and modes',
    string_ends_with: 'JSON paths and modes',
    gt: 'JSON paths',
    gte: 'JSON paths',
    lt: 'JSON paths',
    lte: 'JSON paths',
    in: 'JSON paths',
    notIn: 'JSON paths',
    array_contains: 'json-arrays.cases.ts',
    array_starts_with: 'json-arrays.cases.ts',
    array_ends_with: 'json-arrays.cases.ts',
    search: 'extended-results.cases.ts',
    searchLanguage: 'extended-results.cases.ts',
    searchType: 'extended-results.cases.ts',
    searchIn: 'extended-results.cases.ts',
    mode: 'modes',
  } satisfies Record<keyof JsonFilter, string>,
};
