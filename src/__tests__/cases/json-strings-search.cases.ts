import type { JsonFilter } from '../../index';
import { fieldConfig, type QueryCase } from '../dsl/query-case';

const query = {
  tableName: 'users',
  tableAlias: 'u',
  fields: ['id'],
  fieldConfig,
  orderBy: { id: 'asc' },
} satisfies QueryCase['query'];
const strings: Array<{ name: string; filter: Omit<JsonFilter, 'path'>; ids: string[] }> = [
  {
    name: 'JSON string contains uses literal regex punctuation',
    filter: { string_contains: 'a.b' },
    ids: ['literal'],
  },
  {
    name: 'JSON string starts with checks the beginning',
    filter: { string_starts_with: 'prefix' },
    ids: ['literal', 'lookalike'],
  },
  {
    name: 'JSON string ends with checks the ending',
    filter: { string_ends_with: 'suffix' },
    ids: ['literal', 'lookalike'],
  },
  {
    name: 'JSON string insensitive contains matches mixed case',
    filter: { string_contains: 'PREFIX', mode: 'insensitive' },
    ids: ['literal', 'lookalike'],
  },
];
const controlCharacters = [
  { name: 'newline', value: '\n', escaped: String.raw`\n` },
  { name: 'carriage return', value: '\r', escaped: String.raw`\r` },
  { name: 'tab', value: '\t', escaped: String.raw`\t` },
];
const controlCharacterOperators = [
  { operator: 'string_contains', ids: ['exact', 'prefixed', 'suffixed'] },
  { operator: 'string_starts_with', ids: ['exact', 'suffixed'] },
  { operator: 'string_ends_with', ids: ['exact', 'prefixed'] },
] as const;
const searches: Array<{ name: string; filter: Omit<JsonFilter, 'path'>; ids: string[] }> = [
  {
    name: 'plain search requires all words without adjacency',
    filter: { search: 'red fox', searchType: 'plain' },
    ids: ['adjacent', 'separated'],
  },
  {
    name: 'phrase search requires word adjacency',
    filter: { search: 'red fox', searchType: 'phrase' },
    ids: ['adjacent'],
  },
  {
    name: 'prefix search matches beginnings of words',
    filter: { search: 'fo', searchType: 'prefix' },
    ids: ['adjacent', 'prefix', 'separated'],
  },
  {
    name: 'tsquery search supports explicit OR',
    filter: { search: 'fox | rabbit', searchType: 'tsquery' },
    ids: ['adjacent', 'other', 'separated'],
  },
];
export const jsonStringSearchCases: QueryCase[] = [
  ...strings.map(
    ({ name, filter, ids }): QueryCase => ({
      name,
      rows: [
        { id: 'literal', data: { title: 'prefix a.b suffix' } },
        { id: 'lookalike', data: { title: 'prefix axb suffix' } },
        { id: 'other', data: { title: 'unrelated' } },
      ],
      query: { ...query, where: { data: { path: 'title', ...filter } } },
      expected: { rows: ids.map((id) => ({ id })) },
    }),
  ),
  ...controlCharacters.flatMap(({ name, value, escaped }) =>
    controlCharacterOperators.flatMap(({ operator, ids }) =>
      (['default', 'insensitive'] as const).map(
        (mode): QueryCase => ({
          name: `JSON ${operator} matches literal ${name} in ${mode} mode`,
          rows: [
            { id: 'exact', data: { title: `a${value}b` } },
            { id: 'prefixed', data: { title: `prefix a${value}b` } },
            { id: 'suffixed', data: { title: `a${value}b suffix` } },
            { id: 'uppercase', data: { title: `A${value}B` } },
            { id: 'escaped', data: { title: `a${escaped}b` } },
            { id: 'space', data: { title: 'a b' } },
            { id: 'absent', data: { title: 'ab' } },
          ],
          query: {
            ...query,
            where: { data: { path: 'title', [operator]: `a${value}b`, mode } },
          },
          expected: {
            rows: [...ids, ...(mode === 'insensitive' ? ['uppercase'] : [])].map((id) => ({
              id,
            })),
          },
        }),
      ),
    ),
  ),
  ...searches.map(
    ({ name, filter, ids }): QueryCase => ({
      name,
      rows: [
        { id: 'adjacent', data: { title: 'red fox' } },
        { id: 'separated', data: { title: 'red agile fox' } },
        { id: 'prefix', data: { title: 'forest' } },
        { id: 'other', data: { title: 'rabbit' } },
      ],
      query: { ...query, where: { data: { path: 'title', searchLanguage: 'simple', ...filter } } },
      expected: { rows: ids.map((id) => ({ id })) },
    }),
  ),
  {
    name: 'root search restricted to keys excludes matching values',
    rows: [
      { id: 'key', data: { needle: 'other' } },
      { id: 'value', data: { other: 'needle' } },
    ],
    query: { ...query, where: { data: { path: '', search: 'needle', searchIn: 'keys' } } },
    expected: { rows: [{ id: 'key' }] },
  },
  {
    name: 'root search restricted to values excludes matching keys',
    rows: [
      { id: 'key', data: { needle: 'other' } },
      { id: 'value', data: { other: 'needle' } },
    ],
    query: { ...query, where: { data: { path: [], search: 'needle', searchIn: 'values' } } },
    expected: { rows: [{ id: 'value' }] },
  },
];
