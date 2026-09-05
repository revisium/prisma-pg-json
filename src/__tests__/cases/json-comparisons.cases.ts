import type { JsonFilter } from '../../index';
import { fieldConfig, type QueryCase } from '../dsl/query-case';

const comparisons: Array<{ name: string; filter: Omit<JsonFilter, 'path'>; ids: string[] }> = [
  { name: 'JSON numeric equals', filter: { equals: 18 }, ids: ['boundary'] },
  { name: 'JSON numeric not', filter: { not: 18 }, ids: ['above', 'below'] },
  { name: 'JSON numeric gt excludes boundary', filter: { gt: 18 }, ids: ['above'] },
  { name: 'JSON numeric gte includes boundary', filter: { gte: 18 }, ids: ['above', 'boundary'] },
  { name: 'JSON numeric lt excludes boundary', filter: { lt: 18 }, ids: ['below'] },
  { name: 'JSON numeric lte includes boundary', filter: { lte: 18 }, ids: ['below', 'boundary'] },
  { name: 'JSON numeric in', filter: { in: [17, 19] }, ids: ['above', 'below'] },
  { name: 'JSON numeric notIn', filter: { notIn: [17, 19] }, ids: ['boundary'] },
  { name: 'JSON numeric combined bounds', filter: { gte: 18, lt: 19 }, ids: ['boundary'] },
];

export const jsonComparisonCases: QueryCase[] = [
  ...comparisons.map(
    ({ name, filter, ids }): QueryCase => ({
      name,
      rows: [
        { id: 'below', data: { score: 17 } },
        { id: 'boundary', data: { score: 18 } },
        { id: 'above', data: { score: 19 } },
      ],
      query: {
        tableName: 'users',
        tableAlias: 'u',
        fields: ['id'],
        fieldConfig,
        orderBy: { id: 'asc' },
        where: { data: { path: 'score', ...filter } },
      },
      expected: { rows: ids.map((id) => ({ id })) },
    }),
  ),
  {
    name: 'JSON boolean equals distinguishes boolean and string',
    rows: [
      { id: 'boolean', data: { active: true } },
      { id: 'string', data: { active: 'true' } },
      { id: 'false', data: { active: false } },
    ],
    query: {
      tableName: 'users',
      tableAlias: 'u',
      fields: ['id'],
      fieldConfig,
      orderBy: { id: 'asc' },
      where: { data: { path: 'active', equals: true } },
    },
    expected: { rows: [{ id: 'boolean' }] },
  },
];
