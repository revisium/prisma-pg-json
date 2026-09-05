import type { JsonFilter } from '../../index';
import { fieldConfig, type QueryCase } from '../dsl/query-case';

const query = {
  tableName: 'users',
  tableAlias: 'u',
  fields: ['id'],
  fieldConfig,
  orderBy: { id: 'asc' },
} satisfies QueryCase['query'];
const operators: Array<{ name: string; filter: Omit<JsonFilter, 'path'>; ids: string[] }> = [
  {
    name: 'array contains requires all requested values regardless of order',
    filter: { array_contains: ['red', 'blue'] },
    ids: ['forward', 'reverse'],
  },
  {
    name: 'array starts with checks first element',
    filter: { array_starts_with: 'red' },
    ids: ['forward', 'partial'],
  },
  {
    name: 'array ends with checks last element',
    filter: { array_ends_with: 'red' },
    ids: ['partial', 'reverse'],
  },
  {
    name: 'array contains insensitive matches different casing',
    filter: { array_contains: ['RED'], mode: 'insensitive' },
    ids: ['forward', 'partial', 'reverse'],
  },
];
export const jsonArrayCases: QueryCase[] = [
  ...operators.map(
    ({ name, filter, ids }): QueryCase => ({
      name,
      rows: [
        { id: 'forward', data: { tags: ['red', 'blue'] } },
        { id: 'reverse', data: { tags: ['blue', 'red'] } },
        { id: 'partial', data: { tags: ['red'] } },
        { id: 'empty', data: { tags: [] } },
      ],
      query: { ...query, where: { data: { path: 'tags', ...filter } } },
      expected: { rows: ids.map((id) => ({ id })) },
    }),
  ),
  {
    name: 'object array containment requires properties on the same element',
    rows: [
      { id: 'together', data: { items: [{ role: 'admin', active: true, extra: 1 }] } },
      {
        id: 'split',
        data: {
          items: [
            { role: 'admin', active: false },
            { role: 'user', active: true },
          ],
        },
      },
      { id: 'empty', data: { items: [] } },
    ],
    query: {
      ...query,
      where: { data: { path: 'items', array_contains: [{ role: 'admin', active: true }] } },
    },
    expected: { rows: [{ id: 'together' }] },
  },
  {
    name: 'numeric array containment does not match a string element',
    rows: [
      { id: 'number', data: { items: [18] } },
      { id: 'string', data: { items: ['18'] } },
      { id: 'empty', data: { items: [] } },
    ],
    query: { ...query, where: { data: { path: 'items', array_contains: [18] } } },
    expected: { rows: [{ id: 'number' }] },
  },
];
