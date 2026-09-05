import { fieldConfig, type QueryCase } from '../dsl/query-case';

const paths: Array<{ name: string; path: string | string[]; ids: string[] }> = [
  { name: 'dot path addresses nested objects', path: 'profile.name', ids: ['nested'] },
  { name: 'segment path addresses nested objects', path: ['profile', 'name'], ids: ['nested'] },
  { name: 'bracket index selects first array element', path: 'items[0].name', ids: ['first'] },
  {
    name: 'segment index selects second array element',
    path: ['items', '1', 'name'],
    ids: ['second'],
  },
  {
    name: 'wildcard matches any array element without duplicating rows',
    path: 'items[*].name',
    ids: ['first', 'second'],
  },
  { name: 'negative index selects final array element', path: 'items[-1].name', ids: ['second'] },
  { name: 'out of bounds index matches nothing', path: 'items[10].name', ids: [] },
];

export const jsonPathCases: QueryCase[] = paths.map(({ name, path, ids }) => ({
  name,
  rows: [
    { id: 'nested', data: { profile: { name: 'target' } } },
    {
      id: 'first',
      data: {
        items: [{ name: 'target' }, { name: 'other' }, { name: 'target' }, { name: 'other' }],
      },
    },
    { id: 'second', data: { items: [{ name: 'other' }, { name: 'target' }] } },
    { id: 'empty', data: { items: [] } },
  ],
  query: {
    tableName: 'users',
    tableAlias: 'u',
    fields: ['id'],
    fieldConfig,
    orderBy: { id: 'asc' },
    where: { data: { path, equals: 'target' } },
  },
  expected: { rows: ids.map((id) => ({ id })) },
}));
