import type { JsonFilter } from '../../index';
import { fieldConfig, type QueryCase } from '../dsl/query-case';

const checks: Array<{ name: string; filter: Omit<JsonFilter, 'path'>; ids: string[] }> = [
  {
    name: 'JSON equals null matches explicit null but not absent key',
    filter: { equals: null },
    ids: ['null'],
  },
  {
    name: 'JSON not null matches values but not absent key',
    filter: { not: null },
    ids: ['value'],
  },
  {
    name: 'JSON not string includes explicit null but not absent key',
    filter: { not: 'active' },
    ids: ['null'],
  },
  { name: 'JSON in excludes null and absent key', filter: { in: ['active'] }, ids: ['value'] },
  {
    name: 'JSON notIn includes explicit null but not absent key',
    filter: { notIn: ['inactive'] },
    ids: ['null', 'value'],
  },
  {
    name: 'JSON string match excludes null and absent key',
    filter: { string_contains: 'act' },
    ids: ['value'],
  },
];

export const jsonNullMissingCases: QueryCase[] = checks.map(({ name, filter, ids }) => ({
  name,
  rows: [
    { id: 'value', data: { profile: { status: 'active' } } },
    { id: 'null', data: { profile: { status: null } } },
    { id: 'missing', data: { profile: {} } },
    { id: 'parent-null', data: { profile: null } },
    { id: 'parent-missing', data: {} },
  ],
  query: {
    tableName: 'users',
    tableAlias: 'u',
    fields: ['id'],
    fieldConfig,
    orderBy: { id: 'asc' },
    where: { data: { path: 'profile.status', ...filter } },
  },
  expected: { rows: ids.map((id) => ({ id })) },
}));
