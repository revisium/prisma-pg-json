import { fieldConfig, type QueryCase } from '../dsl/query-case';

const query = {
  tableName: 'users',
  tableAlias: 'u',
  fields: ['id'],
  fieldConfig,
  orderBy: { id: 'asc' },
} satisfies QueryCase['query'];
export const queryBasicCases: QueryCase[] = [
  { name: 'empty fixture returns no rows', rows: [], query, expected: { rows: [] } },
  {
    name: 'absent filter returns all rows',
    rows: [{ id: 'b' }, { id: 'a' }],
    query,
    expected: { rows: [{ id: 'a' }, { id: 'b' }] },
  },
  {
    name: 'empty filter returns all rows',
    rows: [{ id: 'a' }],
    query: { ...query, where: {} },
    expected: { rows: [{ id: 'a' }] },
  },
  {
    name: 'projection returns selected scalar and JSON values',
    rows: [{ id: 'a', name: 'Alice', data: { nested: [1, true, null] } }],
    query: { ...query, fields: ['name', 'data'] },
    expected: { rows: [{ name: 'Alice', data: { nested: [1, true, null] } }] },
  },
  {
    name: 'projection preserves SQL null and timestamp values',
    rows: [{ id: 'a', name: null, createdAt: '2025-01-01T00:00:00Z' }],
    query: { ...query, fields: ['name', 'createdAt'] },
    expected: { rows: [{ name: null, createdAt: new Date('2025-01-01T00:00:00Z') }] },
  },
];
