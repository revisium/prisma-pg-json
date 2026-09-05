import type { NumberFilter, StringFilter } from '../../index';
import { fieldConfig, type QueryCase } from '../dsl/query-case';

const query = {
  tableName: 'users',
  tableAlias: 'u',
  fields: ['id'],
  fieldConfig,
  orderBy: { id: 'asc' },
} satisfies QueryCase['query'];

const numberCases: Array<{ name: string; filter: NumberFilter | number; ids: string[] }> = [
  { name: 'number shorthand equals', filter: 18, ids: ['boundary'] },
  { name: 'number equals', filter: { equals: 18 }, ids: ['boundary'] },
  { name: 'number not', filter: { not: 18 }, ids: ['above', 'below'] },
  { name: 'number gt excludes boundary', filter: { gt: 18 }, ids: ['above'] },
  { name: 'number gte includes boundary', filter: { gte: 18 }, ids: ['above', 'boundary'] },
  { name: 'number lt excludes boundary', filter: { lt: 18 }, ids: ['below'] },
  { name: 'number lte includes boundary', filter: { lte: 18 }, ids: ['below', 'boundary'] },
  { name: 'number in', filter: { in: [17, 19] }, ids: ['above', 'below'] },
  { name: 'number notIn', filter: { notIn: [17, 19] }, ids: ['boundary'] },
  { name: 'number nested not reverses comparison', filter: { not: { gte: 18 } }, ids: ['below'] },
  { name: 'number range combines bounds', filter: { gte: 18, lt: 19 }, ids: ['boundary'] },
];

const stringCases: Array<{ name: string; filter: StringFilter | string; ids: string[] }> = [
  { name: 'string shorthand equals is case sensitive', filter: 'Alice', ids: ['exact'] },
  {
    name: 'string equals insensitive',
    filter: { equals: 'ALICE', mode: 'insensitive' },
    ids: ['exact', 'lower'],
  },
  {
    name: 'string contains matches inside a value',
    filter: { contains: 'lic' },
    ids: ['exact', 'lower', 'suffix'],
  },
  {
    name: 'string startsWith excludes interior matches',
    filter: { startsWith: 'Ali' },
    ids: ['exact'],
  },
  {
    name: 'string endsWith excludes prefixes',
    filter: { endsWith: 'ice' },
    ids: ['exact', 'lower', 'suffix'],
  },
  {
    name: 'string in preserves exact spelling',
    filter: { in: ['Alice', 'Bob'] },
    ids: ['exact', 'other'],
  },
  {
    name: 'string notIn preserves exact spelling',
    filter: { notIn: ['Alice', 'Bob'] },
    ids: ['lower', 'suffix'],
  },
];

export const scalarFilterCases: QueryCase[] = [
  ...numberCases.map(
    ({ name, filter, ids }): QueryCase => ({
      name,
      rows: [
        { id: 'below', age: 17 },
        { id: 'boundary', age: 18 },
        { id: 'above', age: 19 },
      ],
      query: { ...query, where: { age: filter } },
      expected: { rows: ids.map((id) => ({ id })) },
    }),
  ),
  ...stringCases.map(
    ({ name, filter, ids }): QueryCase => ({
      name,
      rows: [
        { id: 'exact', name: 'Alice' },
        { id: 'lower', name: 'alice' },
        { id: 'suffix', name: 'Malice' },
        { id: 'other', name: 'Bob' },
      ],
      query: { ...query, where: { name: filter } },
      expected: { rows: ids.map((id) => ({ id })) },
    }),
  ),
  {
    name: 'boolean false shorthand is not treated as an absent filter',
    rows: [
      { id: 'false', isActive: false },
      { id: 'true', isActive: true },
    ],
    query: { ...query, where: { isActive: false } },
    expected: { rows: [{ id: 'false' }] },
  },
  {
    name: 'boolean not false selects true',
    rows: [
      { id: 'false', isActive: false },
      { id: 'true', isActive: true },
    ],
    query: { ...query, where: { isActive: { not: false } } },
    expected: { rows: [{ id: 'true' }] },
  },
  {
    name: 'date range includes lower and excludes upper timestamp',
    rows: [
      { id: 'before', createdAt: '2025-01-01T23:59:59.999Z' },
      { id: 'lower', createdAt: '2025-01-02T00:00:00.000Z' },
      { id: 'upper', createdAt: '2025-01-03T00:00:00.000Z' },
    ],
    query: {
      ...query,
      where: {
        createdAt: { gte: new Date('2025-01-02T00:00:00.000Z'), lt: '2025-01-03T00:00:00.000Z' },
      },
    },
    expected: { rows: [{ id: 'lower' }] },
  },
  {
    name: 'date equality compares instants across timezone offsets',
    rows: [
      { id: 'same', createdAt: '2025-01-02T00:00:00.000Z' },
      { id: 'later', createdAt: '2025-01-02T00:00:01.000Z' },
    ],
    query: { ...query, where: { createdAt: { equals: '2025-01-02T02:00:00+02:00' } } },
    expected: { rows: [{ id: 'same' }] },
  },
];
