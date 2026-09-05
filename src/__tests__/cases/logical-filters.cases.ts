import { fieldConfig, type QueryCase } from '../dsl/query-case';
const rows = [
  { id: 'a', age: 17, name: 'Alice' },
  { id: 'b', age: 18, name: 'Bob' },
  { id: 'c', age: 19, name: 'Alice' },
  { id: 'd', age: 20, name: 'Carol' },
];
const scenarios: Array<{ name: string; where: QueryCase['query']['where']; ids: string[] }> = [
  { name: 'sibling filters intersect', where: { name: 'Alice', age: { gte: 18 } }, ids: ['c'] },
  {
    name: 'OR unions branches without duplicate rows',
    where: { OR: [{ name: 'Alice' }, { age: { gte: 19 } }] },
    ids: ['a', 'c', 'd'],
  },
  {
    name: 'OR preserves conjunction inside a branch',
    where: { OR: [{ name: 'Alice', age: { gte: 18 } }, { name: 'Bob' }] },
    ids: ['b', 'c'],
  },
  {
    name: 'NOT negates a conjunction',
    where: { NOT: { name: 'Alice', age: { gte: 18 } } },
    ids: ['a', 'b', 'd'],
  },
  {
    name: 'NOT wraps a nested OR',
    where: { NOT: { OR: [{ name: 'Alice' }, { age: { lt: 19 } }] } },
    ids: ['d'],
  },
  {
    name: 'nested AND can contradict itself',
    where: { AND: [{ age: { lt: 18 } }, { age: { gte: 18 } }] },
    ids: [],
  },
];
export const logicalFilterCases: QueryCase[] = scenarios.map(({ name, where, ids }) => ({
  name,
  rows,
  query: {
    tableName: 'users',
    tableAlias: 'u',
    fields: ['id'],
    fieldConfig,
    where,
    orderBy: { id: 'asc' },
  },
  expected: { rows: ids.map((id) => ({ id })) },
}));
