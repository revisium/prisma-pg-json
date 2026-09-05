import { SEARCH_LANGUAGES, type JsonFilter, type JsonOrderByInput } from '../../index';
import { fieldConfig, type QueryCase, type UserRow } from '../dsl/query-case';

const query = {
  tableName: 'users',
  tableAlias: 'u',
  fields: ['id'],
  fieldConfig,
} satisfies QueryCase['query'];
const directions = ['asc', 'desc'] as const;
function resultCase(
  name: string,
  rows: UserRow[],
  options: Partial<QueryCase['query']>,
  ids: string[],
): QueryCase {
  return {
    name,
    rows,
    query: { ...query, orderBy: { id: 'asc' }, ...options },
    expected: { rows: ids.map((id) => ({ id })) },
  };
}
const casts: Array<{
  type: JsonOrderByInput['type'];
  low: string | number | boolean;
  high: string | number | boolean;
}> = [
  { type: 'int', low: '2', high: '10' },
  { type: 'float', low: '2.25', high: '2.75' },
  { type: 'text', low: '10', high: '2' },
  { type: 'boolean', low: false, high: true },
  { type: 'timestamp', low: '2024-01-01T00:00:00Z', high: '2024-01-02T00:00:00Z' },
];
const castCases = casts.flatMap(({ type, low, high }) =>
  directions.map((direction) =>
    resultCase(
      `JSON sort ${type} ${direction} with ties, null and missing`,
      [
        { id: 'b', data: { value: high } },
        { id: 'a', data: { value: low } },
        { id: 'c', data: { value: low } },
        { id: 'n', data: { value: null } },
        { id: 'm', data: {} },
      ],
      { orderBy: [{ data: { path: 'value', type, direction } }, { id: 'asc' }] },
      direction === 'asc' ? ['a', 'c', 'b', 'm', 'n'] : ['m', 'n', 'b', 'a', 'c'],
    ),
  ),
);
const aggregateOrder = {
  first: ['a', 'c', 'b'],
  last: ['b', 'c', 'a'],
  min: ['a', 'b', 'c'],
  max: ['b', 'c', 'a'],
  avg: ['b', 'a', 'c'],
} as const;
const aggregateCases = (Object.keys(aggregateOrder) as Array<keyof typeof aggregateOrder>).flatMap(
  (aggregation) =>
    directions.map((direction) =>
      resultCase(
        `JSON sort ${aggregation} ${direction} uses all relevant array elements`,
        [
          { id: 'a', data: { items: [1, 2, 12] } },
          { id: 'b', data: { items: [8, 3, 2] } },
          { id: 'c', data: { items: [5, 9, 7] } },
        ],
        {
          orderBy: [
            { data: { path: ['items', '*'], type: 'float', aggregation, direction } },
            { id: 'asc' },
          ],
        },
        direction === 'asc'
          ? [...aggregateOrder[aggregation]]
          : [...aggregateOrder[aggregation]].reverse(),
      ),
    ),
);
const searchScopes: Array<{
  scope: NonNullable<JsonFilter['searchIn']>;
  search: string;
  ids: string[];
}> = [
  { scope: 'all', search: '42', ids: ['key', 'number', 'string'] },
  { scope: 'values', search: '42', ids: ['number', 'string'] },
  { scope: 'keys', search: '42', ids: ['key'] },
  { scope: 'strings', search: '42', ids: ['string'] },
  { scope: 'numbers', search: '42', ids: ['number'] },
  { scope: 'booleans', search: 'true', ids: ['boolean'] },
];
const searchCases = searchScopes.flatMap(({ scope, search, ids }) =>
  (['plain', 'phrase', 'prefix', 'tsquery'] as const).flatMap((searchType) =>
    (['default', 'insensitive'] as const).map((mode) =>
      resultCase(
        `search ${searchType} scope ${scope} mode ${mode} distinguishes JSON value types`,
        [
          { id: 'key', data: { '42': 'other' } },
          { id: 'number', data: { v: 42 } },
          { id: 'string', data: { v: '42' } },
          { id: 'boolean', data: { v: true } },
          { id: 'null', data: { v: null } },
          { id: 'false', data: { v: false } },
        ],
        {
          where: {
            data: { path: [], search, searchType, searchIn: scope, searchLanguage: 'simple', mode },
          },
        },
        ids,
      ),
    ),
  ),
);
const languageCases = SEARCH_LANGUAGES.map((searchLanguage) =>
  resultCase(
    `search language ${searchLanguage} accepts a language-neutral numeric token`,
    [
      { id: 'match', data: { value: 42 } },
      { id: 'other', data: { value: 41 } },
    ],
    { where: { data: { path: '', search: '42', searchLanguage, searchIn: 'numbers' } } },
    ['match'],
  ),
);
const arrayExamples: Array<{
  title: string;
  items: unknown;
  filter: Omit<JsonFilter, 'path'>;
  ids: string[];
}> = [
  {
    title: 'mixed primitive requirements',
    items: ['x', 2, true],
    filter: { array_contains: ['x', 2, true] },
    ids: ['match'],
  },
  {
    title: 'numeric values are distinct from strings',
    items: [2],
    filter: { array_contains: [2] },
    ids: ['match'],
  },
  {
    title: 'boolean values are distinct from strings',
    items: [true],
    filter: { array_contains: [true] },
    ids: ['match'],
  },
  {
    title: 'duplicate requirements do not require duplicate elements',
    items: ['x'],
    filter: { array_contains: ['x', 'x'] },
    ids: ['match'],
  },
  {
    title: 'object properties must match one element',
    items: [{ role: 'admin', active: true, extra: 1 }],
    filter: { array_contains: [{ role: 'admin', active: true }] },
    ids: ['match'],
  },
  {
    title: 'independent object requirements can match separate elements',
    items: [{ role: 'admin' }, { active: true }],
    filter: { array_contains: [{ role: 'admin' }, { active: true }] },
    ids: ['match', 'split'],
  },
  {
    title: 'nested object requirement',
    items: [{ profile: { role: 'admin' }, extra: true }],
    filter: { array_contains: [{ profile: { role: 'admin' } }] },
    ids: ['match'],
  },
];
const arrayCases = arrayExamples.map(({ title, items, filter, ids }) =>
  resultCase(
    `array contains ${title}`,
    [
      { id: 'match', data: { items } as UserRow['data'] },
      { id: 'empty', data: { items: [] } },
      { id: 'strings', data: { items: ['2', 'true'] } },
      {
        id: 'split',
        data: {
          items: [
            { role: 'admin', active: false },
            { role: 'user', active: true },
          ],
        },
      },
    ],
    { where: { data: { path: 'items', ...filter } } },
    ids,
  ),
);
const literalCases = [
  "x' OR true --",
  'a.b*+?^$[](){}|\\',
  'Привет 👋',
  'line\nbreak',
  '"quoted"',
  '',
].flatMap((literal) => [
  resultCase(
    `scalar equals literal ${JSON.stringify(literal)}`,
    [
      { id: 'match', name: literal },
      { id: 'other', name: 'other' },
    ],
    { where: { name: { equals: literal } } },
    ['match'],
  ),
  resultCase(
    `JSON equals literal ${JSON.stringify(literal)}`,
    [
      { id: 'match', data: { value: literal } },
      { id: 'other', data: { value: 'other' } },
    ],
    { where: { data: { path: 'value', equals: literal } } },
    ['match'],
  ),
]);
const aggregateCastCases = casts.flatMap(({ type, low, high }) => {
  const aggregations: NonNullable<JsonOrderByInput['aggregation']>[] =
    type === 'boolean'
      ? ['first', 'last']
      : type === 'int' || type === 'float'
        ? ['first', 'last', 'min', 'max', 'avg']
        : ['first', 'last', 'min', 'max'];
  return aggregations.flatMap((aggregation) =>
    directions.map((direction) =>
      resultCase(
        `JSON aggregation ${aggregation} cast ${type} direction ${direction}`,
        [
          { id: 'a', data: { values: [low, low] } },
          { id: 'b', data: { values: [high, high] } },
        ],
        { orderBy: { data: { path: ['values', '*'], type, aggregation, direction } } },
        direction === 'asc' ? ['a', 'b'] : ['b', 'a'],
      ),
    ),
  );
});
const sparseAggregateCases = (['first', 'last', 'min', 'max', 'avg'] as const).flatMap(
  (aggregation) =>
    directions.map((direction) =>
      resultCase(
        `JSON aggregation ${aggregation} ${direction} with empty and missing arrays`,
        [
          { id: 'value', data: { items: [3, 4] } },
          { id: 'empty', data: { items: [] } },
          { id: 'missing', data: {} },
        ],
        {
          orderBy: [
            { data: { path: ['items', '*'], type: 'float', aggregation, direction } },
            { id: 'asc' },
          ],
        },
        direction === 'asc' ? ['value', 'empty', 'missing'] : ['empty', 'missing', 'value'],
      ),
    ),
);
const endpointValues = ['red', 2, true, null, { role: 'admin' }, ['nested']] as const;
const endpointCases = endpointValues.flatMap((value) =>
  (['array_starts_with', 'array_ends_with'] as const).flatMap((operator) =>
    (['items', ['items']] as const).map((path) =>
      resultCase(
        `array endpoint ${operator} value ${JSON.stringify(value)} path ${JSON.stringify(path)}`,
        [
          { id: 'first', data: { items: [value, 'other'] } },
          { id: 'last', data: { items: ['other', value] } },
          { id: 'middle', data: { items: ['other', value, 'other'] } },
          { id: 'only', data: { items: [value] } },
          { id: 'empty', data: { items: [] } },
        ],
        {
          where: { data: { path: typeof path === 'string' ? path : [...path], [operator]: value } },
        },
        operator === 'array_starts_with' ? ['first', 'only'] : ['last', 'only'],
      ),
    ),
  ),
);
const defaultRows = Array.from({ length: 52 }, (_, index) => ({
  id: String(index).padStart(2, '0'),
}));
const queryOptionCases: QueryCase[] = [
  resultCase(
    'omitted take returns first fifty rows',
    defaultRows,
    {},
    defaultRows.slice(0, 50).map(({ id }) => id),
  ),
  resultCase(
    'omitted tableAlias uses a valid generated alias',
    [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    { tableAlias: undefined, where: { name: 'Alice' } },
    ['a'],
  ),
  resultCase(
    'omitted fieldConfig keeps legacy string filters',
    [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    { fieldConfig: undefined, where: { name: { contains: 'lic' } } },
    ['a'],
  ),
  resultCase(
    'empty fieldConfig keeps legacy string filters',
    [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    { fieldConfig: {} as typeof fieldConfig, where: { name: { contains: 'lic' } } },
    ['a'],
  ),
  {
    name: 'omitted fields projects complete rows with typed scalar values',
    rows: [
      {
        id: 'a',
        name: 'Alice',
        age: 18,
        isActive: false,
        createdAt: '2024-01-01T00:00:00Z',
        data: { role: 'admin' },
      },
    ],
    query: { ...query, fields: undefined },
    expected: {
      rows: [
        {
          id: 'a',
          name: 'Alice',
          age: 18,
          isActive: false,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          data: { role: 'admin' },
        },
      ],
    },
  },
  {
    name: 'projection preserves duplicate rows',
    rows: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Alice' },
    ],
    query: { ...query, fields: ['name'], orderBy: { id: 'asc' } },
    expected: { rows: [{ name: 'Alice' }, { name: 'Alice' }] },
  },
  ...[0, 2, 4].map((skip) =>
    resultCase(
      `offset page ${skip / 2} with duplicate primary sort values`,
      [
        { id: 'd', age: 20 },
        { id: 'c', age: 18 },
        { id: 'b', age: 18 },
        { id: 'a', age: 18 },
        { id: 'e', age: 20 },
      ],
      { orderBy: [{ age: 'asc' }, { id: 'desc' }], skip, take: 2 },
      [['c', 'b'], ['a', 'e'], ['d']][skip / 2],
    ),
  ),
];
const numericEndpointAggregateCases = (['int', 'float'] as const).flatMap((type) =>
  (['first', 'last'] as const).flatMap((aggregation) =>
    directions.map((direction) =>
      resultCase(
        `JSON numeric aggregation ${aggregation} ${type} ${direction}`,
        [
          { id: 'a', data: { items: [2, 3] } },
          { id: 'b', data: { items: [10, 11] } },
        ],
        { orderBy: { data: { path: ['items', '*'], type, aggregation, direction } } },
        direction === 'asc' ? ['a', 'b'] : ['b', 'a'],
      ),
    ),
  ),
);
export const extendedResultCases: QueryCase[] = [
  ...(['first', 'last'] as const).map((aggregation) =>
    resultCase(
      `integer ${aggregation} aggregation retains JSON number rounding`,
      [
        { id: 'z-positive-rounded', data: { items: [2.5] } },
        { id: 'a-positive-integer', data: { items: [3] } },
        { id: 'z-negative-rounded', data: { items: [-2.5] } },
        { id: 'a-negative-integer', data: { items: [-3] } },
      ],
      { orderBy: [{ data: { path: 'items', aggregation, type: 'int' } }, { id: 'asc' }] },
      ['a-negative-integer', 'z-negative-rounded', 'a-positive-integer', 'z-positive-rounded'],
    ),
  ),
  ...(['first', 'last'] as const).map((aggregation) =>
    resultCase(
      `array ${aggregation} numeric string aggregation without wildcard`,
      [
        { id: 'low', data: { items: ['2'] } },
        { id: 'high', data: { items: ['10'] } },
        { id: 'empty', data: { items: [] } },
      ],
      { orderBy: [{ data: { path: 'items', aggregation, type: 'int' } }, { id: 'asc' }] },
      ['low', 'high', 'empty'],
    ),
  ),
  ...([false, true] as const).flatMap((withObject) =>
    (['items', ['items']] as const).map((path) => {
      const properties = withObject ? { profile: { role: 'admin' } } : {};
      return resultCase(
        `array contains nested array requires exact sequence with object ${withObject} path ${JSON.stringify(path)}`,
        [
          { id: 'exact', data: { items: [{ ...properties, tags: ['x', 'y'], extra: true }] } },
          { id: 'extra', data: { items: [{ ...properties, tags: ['x', 'y', 'z'] }] } },
          { id: 'reverse', data: { items: [{ ...properties, tags: ['y', 'x'] }] } },
          { id: 'short', data: { items: [{ ...properties, tags: ['x'] }] } },
          { id: 'scalar', data: { items: [{ ...properties, tags: 'x' }] } },
          { id: 'object', data: { items: [{ ...properties, tags: { '0': 'x', '1': 'y' } }] } },
          { id: 'null', data: { items: [{ ...properties, tags: null }] } },
        ],
        {
          where: {
            data: {
              path: typeof path === 'string' ? path : [...path],
              array_contains: [{ ...properties, tags: ['x', 'y'] }],
            },
          },
        },
        ['exact'],
      );
    }),
  ),
  resultCase(
    'array contains nested array object scalar and null properties match the same element',
    [
      {
        id: 'exact',
        data: {
          items: [
            { 'tags"\\key': ['x', null], profile: { role: 'admin' }, active: true, optional: null },
          ],
        },
      },
      {
        id: 'split',
        data: {
          items: [
            { 'tags"\\key': ['x', null], profile: { role: 'admin' } },
            { active: true, optional: null },
          ],
        },
      },
      {
        id: 'missing',
        data: { items: [{ 'tags"\\key': ['x', null], profile: { role: 'admin' }, active: true }] },
      },
      {
        id: 'wrong',
        data: {
          items: [
            { 'tags"\\key': [null, 'x'], profile: { role: 'admin' }, active: true, optional: null },
          ],
        },
      },
    ],
    {
      where: {
        data: {
          path: 'items',
          array_contains: [
            { 'tags"\\key': ['x', null], profile: { role: 'admin' }, active: true, optional: null },
          ],
        },
      },
    },
    ['exact'],
  ),
  resultCase(
    'array contains nested object requires exact member equality in the same element',
    [
      { id: 'exact', data: { items: [{ profile: { role: 'admin' }, active: true, extra: 1 }] } },
      { id: 'extra', data: { items: [{ profile: { role: 'admin', extra: 1 }, active: true }] } },
      { id: 'split', data: { items: [{ profile: { role: 'admin' } }, { active: true }] } },
    ],
    {
      where: {
        data: { path: 'items', array_contains: [{ profile: { role: 'admin' }, active: true }] },
      },
    },
    ['exact'],
  ),
  resultCase(
    'array contains nested object with literal SQL-looking member and value',
    [
      { id: 'exact', data: { items: [{ 'key" OR true --': { value: "x' OR true --" } }] } },
      { id: 'other', data: { items: [{ key: { value: 'other' } }] } },
    ],
    {
      where: {
        data: {
          path: 'items',
          array_contains: [{ 'key" OR true --': { value: "x' OR true --" } }],
        },
      },
    },
    ['exact'],
  ),
  ...(['array_starts_with', 'array_ends_with'] as const).map((operator) =>
    resultCase(
      `object endpoint ${operator} compares whole object and binds literal data`,
      [
        { id: 'exact', data: { items: [{ 'key" OR true --': "x' OR true --" }] } },
        { id: 'object', data: { items: { 'key" OR true --': "x' OR true --" } } },
        { id: 'null', data: { items: null } },
        { id: 'missing', data: {} },
        { id: 'empty', data: { items: [] } },
        { id: 'extra', data: { items: [{ 'key" OR true --': "x' OR true --", extra: 1 }] } },
        { id: 'other', data: { items: [{ key: 'other' }] } },
      ],
      { where: { data: { path: 'items', [operator]: { 'key" OR true --': "x' OR true --" } } } },
      ['exact'],
    ),
  ),
  ...(['array_starts_with', 'array_ends_with'] as const).map((operator) =>
    resultCase(
      `object endpoint ${operator} wildcard path ignores object key order`,
      [
        {
          id: 'match',
          data: { groups: [{ items: [] }, { items: [{ active: true, 'quoted"\\key': 'admin' }] }] },
        },
        {
          id: 'other',
          data: { groups: [{ items: [{ active: false, 'quoted"\\key': 'admin' }] }] },
        },
      ],
      {
        where: {
          data: {
            path: ['groups', '*', 'items'],
            [operator]: { 'quoted"\\key': 'admin', active: true },
          },
        },
      },
      ['match'],
    ),
  ),
  ...(['array_starts_with', 'array_ends_with'] as const).map((operator) => {
    const endpoints = [
      { id: 'exact', endpoint: ['x', 'y'] },
      { id: 'extra', endpoint: ['x', 'y', 'z'] },
      { id: 'reverse', endpoint: ['y', 'x'] },
      { id: 'subset', endpoint: ['x'] },
      { id: 'scalar', endpoint: 'x' },
      { id: 'null', endpoint: null },
      { id: 'object', endpoint: { '0': 'x', '1': 'y' } },
    ];
    return resultCase(
      `nested array endpoint ${operator} requires exact sequence`,
      endpoints.map(({ id, endpoint }) => ({
        id,
        data: {
          items: operator === 'array_starts_with' ? [endpoint, 'other'] : ['other', endpoint],
        },
      })),
      { where: { data: { path: 'items', [operator]: ['x', 'y'] } } },
      ['exact'],
    );
  }),
  ...([false, true] as const).map((multiple) =>
    resultCase(
      `array contains nested array elements require exact sequence with multiple requirements ${multiple}`,
      [
        { id: 'exact', data: { items: [['x', 'y'], 'required'] } },
        { id: 'extra', data: { items: [['x', 'y', 'z'], 'required'] } },
        { id: 'reverse', data: { items: [['y', 'x'], 'required'] } },
        { id: 'subset', data: { items: [['x'], 'required'] } },
        { id: 'scalar', data: { items: ['x', 'y', 'required'] } },
        { id: 'missing', data: { items: [['x', 'y']] } },
        { id: 'object', data: { items: [{ '0': 'x', '1': 'y' }, 'required'] } },
      ],
      {
        where: {
          data: {
            path: 'items',
            array_contains: multiple ? ['required', ['x', 'y']] : [['x', 'y']],
          },
        },
      },
      multiple ? ['exact'] : ['exact', 'missing'],
    ),
  ),
  ...(['min', 'max', 'avg'] as const).flatMap((aggregation) =>
    directions.flatMap((direction) =>
      (['0', '-1'] as const).flatMap((index) =>
        (['before', 'after', 'without'] as const).flatMap((position) => {
          const segments =
            position === 'before'
              ? ['groups', index, 'scores', '*']
              : position === 'after'
                ? ['groups', '*', 'scores', index]
                : ['groups', index, 'scores'];
          const stringPath =
            position === 'before'
              ? `groups[${index}].scores[*]`
              : position === 'after'
                ? `groups[*].scores[${index}]`
                : `groups[${index}].scores`;
          return [stringPath, segments].map((path) =>
            resultCase(
              `indexed aggregate ${aggregation} ${direction} index ${index} ${position} wildcard path ${JSON.stringify(path)}`,
              [
                {
                  id: 'z',
                  data: {
                    groups:
                      position === 'after'
                        ? [{ scores: [1, 8] }, { scores: [3, 10] }]
                        : [{ scores: [1, 3] }, { scores: [8, 10] }],
                  },
                },
                {
                  id: 'a',
                  data: {
                    groups:
                      position === 'after'
                        ? [{ scores: [8, 1] }, { scores: [10, 3] }]
                        : [{ scores: [8, 10] }, { scores: [1, 3] }],
                  },
                },
                { id: 'empty', data: { groups: [] } },
                { id: 'missing', data: {} },
              ],
              {
                orderBy: [{ data: { path, aggregation, type: 'float', direction } }, { id: 'asc' }],
              },
              direction === 'asc'
                ? [...(index === '0' ? ['z', 'a'] : ['a', 'z']), 'empty', 'missing']
                : ['empty', 'missing', ...(index === '0' ? ['a', 'z'] : ['z', 'a'])],
            ),
          );
        }),
      ),
    ),
  ),
  ...directions.flatMap((direction) =>
    (['scores[-1]', ['scores', '-1']] as const).map((path) =>
      resultCase(
        `negative index scalar JSON sort ${direction} path ${JSON.stringify(path)}`,
        [
          { id: 'z', data: { scores: [9, 1] } },
          { id: 'a', data: { scores: [1, 9] } },
          { id: 'empty', data: { scores: [] } },
          { id: 'missing', data: {} },
        ],
        {
          orderBy: [
            {
              data: { path: typeof path === 'string' ? path : [...path], type: 'float', direction },
            },
            { id: 'asc' },
          ],
        },
        direction === 'asc' ? ['z', 'a', 'empty', 'missing'] : ['empty', 'missing', 'a', 'z'],
      ),
    ),
  ),
  ...castCases,
  ...aggregateCastCases,
  ...numericEndpointAggregateCases,
  ...sparseAggregateCases,
  ...queryOptionCases,
  ...endpointCases,
  ...aggregateCases,
  ...searchCases,
  ...languageCases,
  ...arrayCases,
  ...literalCases,
  ...(['english', 'simple'] as const).map((searchLanguage) =>
    resultCase(
      `search ${searchLanguage} stemming distinction`,
      [
        { id: 'base', data: { title: 'run' } },
        { id: 'inflected', data: { title: 'running' } },
      ],
      { where: { data: { path: 'title', search: 'run', searchLanguage } } },
      searchLanguage === 'english' ? ['base', 'inflected'] : ['base'],
    ),
  ),
  ...directions.map((direction) =>
    resultCase(
      `timestamp ${direction} across timezone offsets orders wall-clock values`,
      [
        { id: 'earlier', data: { value: '2024-01-01T00:00:00Z' } },
        { id: 'later', data: { value: '2023-12-31T23:30:00-02:00' } },
      ],
      { orderBy: { data: { path: 'value', type: 'timestamp', direction } } },
      direction === 'asc' ? ['later', 'earlier'] : ['earlier', 'later'],
    ),
  ),
];
