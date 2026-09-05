import { fieldConfig, type QueryCase } from '../dsl/query-case';
const query = {
  tableName: 'users',
  tableAlias: 'u',
  fields: ['id'],
  fieldConfig,
} satisfies QueryCase['query'];
export const orderByCases: QueryCase[] = [
  {
    name: 'scalar ascending puts SQL null last and breaks ties by id',
    rows: [
      { id: 'c', age: null },
      { id: 'b', age: 18 },
      { id: 'a', age: 18 },
      { id: 'd', age: 2 },
    ],
    query: { ...query, orderBy: [{ age: 'asc' }, { id: 'asc' }] },
    expected: { rows: [{ id: 'd' }, { id: 'a' }, { id: 'b' }, { id: 'c' }] },
  },
  {
    name: 'scalar descending puts SQL null first',
    rows: [
      { id: 'a', age: 2 },
      { id: 'b', age: 18 },
      { id: 'c', age: null },
    ],
    query: { ...query, orderBy: { age: 'desc' } },
    expected: { rows: [{ id: 'c' }, { id: 'b' }, { id: 'a' }] },
  },
  {
    name: 'JSON integer ordering is numeric and places missing paths last',
    rows: [
      { id: 'ten', data: { rank: 10 } },
      { id: 'two', data: { rank: 2 } },
      { id: 'missing', data: {} },
    ],
    query: { ...query, orderBy: { data: { path: ['rank'], type: 'int', direction: 'asc' } } },
    expected: { rows: [{ id: 'two' }, { id: 'ten' }, { id: 'missing' }] },
  },
  ...(['first', 'last'] as const).map(
    (aggregation): QueryCase => ({
      name: `JSON array ordering by ${aggregation} element`,
      rows: [
        { id: 'a', data: { items: [1, 9] } },
        { id: 'b', data: { items: [2, 3] } },
      ],
      query: {
        ...query,
        orderBy: { data: { path: ['items', '*'], type: 'int', direction: 'asc', aggregation } },
      },
      expected: {
        rows: aggregation === 'first' ? [{ id: 'a' }, { id: 'b' }] : [{ id: 'b' }, { id: 'a' }],
      },
    }),
  ),
];
