import { fieldConfig, type QueryCase } from '../dsl/query-case';
const rows = [
  { id: 'd', age: 20 },
  { id: 'b', age: 18 },
  { id: 'a', age: 17 },
  { id: 'c', age: 19 },
];
const scenarios = [
  { name: 'first page follows explicit ordering', take: 2, skip: 0, ids: ['b', 'c'] },
  { name: 'offset applies after filtering', take: 2, skip: 1, ids: ['c', 'd'] },
  { name: 'last page can be shorter', take: 2, skip: 2, ids: ['d'] },
  { name: 'offset beyond matches returns no rows', take: 2, skip: 3, ids: [] },
  { name: 'zero take returns no rows', take: 0, skip: 0, ids: [] },
];
export const offsetPaginationCases: QueryCase[] = scenarios.map(({ name, take, skip, ids }) => ({
  name,
  rows,
  query: {
    tableName: 'users',
    tableAlias: 'u',
    fields: ['id'],
    fieldConfig,
    where: { age: { gte: 18 } },
    orderBy: { id: 'asc' },
    take,
    skip,
  },
  expected: { rows: ids.map((id) => ({ id })) },
}));
