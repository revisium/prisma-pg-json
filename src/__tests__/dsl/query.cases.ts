import { fieldConfig, type QueryCase } from './query-case';

export const queryCases: QueryCase[] = [
  {
    name: 'age gte includes the boundary and excludes younger users',
    rows: [
      { id: 'younger', age: 17 },
      { id: 'boundary', age: 18 },
      { id: 'older', age: 19 },
    ],
    query: {
      tableName: 'users',
      tableAlias: 'u',
      fields: ['id'],
      fieldConfig,
      where: { age: { gte: 18 } },
      orderBy: { age: 'asc' },
      take: 50,
      skip: 0,
    },
    expected: {
      rows: [{ id: 'boundary' }, { id: 'older' }],
    },
  },
  {
    name: 'AND applies to both branches of a nested OR',
    rows: [
      { id: 'adult-alice', name: 'Alice', age: 18 },
      { id: 'adult-bob', name: 'Bob', age: 25 },
      { id: 'young-bob', name: 'Bob', age: 17 },
      { id: 'adult-carol', name: 'Carol', age: 25 },
    ],
    query: {
      tableName: 'users',
      tableAlias: 'u',
      fields: ['id'],
      fieldConfig,
      where: {
        AND: [{ age: { gte: 18 } }, { OR: [{ name: 'Alice' }, { name: 'Bob' }] }],
      },
      orderBy: { id: 'asc' },
    },
    expected: {
      rows: [{ id: 'adult-alice' }, { id: 'adult-bob' }],
    },
  },
  {
    name: 'JSON path equality excludes other values and missing keys',
    rows: [
      { id: 'admin', data: { profile: { role: 'admin' } } },
      { id: 'user', data: { profile: { role: 'user' } } },
      { id: 'missing', data: { profile: {} } },
    ],
    query: {
      tableName: 'users',
      tableAlias: 'u',
      fields: ['id'],
      fieldConfig,
      where: { data: { path: ['profile', 'role'], equals: 'admin' } },
    },
    expected: {
      rows: [{ id: 'admin' }],
    },
  },
  {
    name: 'SQL-like string values match literally without broadening the query',
    rows: [
      { id: 'literal', name: "x' OR true --" },
      { id: 'other', name: 'Alice' },
    ],
    query: {
      tableName: 'users',
      tableAlias: 'u',
      fields: ['id'],
      fieldConfig,
      where: { name: "x' OR true --" },
    },
    expected: {
      sql: {
        text: `
        SELECT u."id" FROM "users" u
        WHERE u."name" = $1
        LIMIT $2 OFFSET $3
      `,
        parameters: ["x' OR true --", 50, 0],
      },
      rows: [{ id: 'literal' }],
    },
  },
  {
    name: 'array_contains treats SQL/JSONPath syntax in object keys literally',
    rows: [
      { id: 'literal', data: { items: [{ 'role == "user" || @.role': 'admin' }] } },
      { id: 'user', data: { items: [{ role: 'user' }] } },
      { id: 'admin', data: { items: [{ role: 'admin' }] } },
    ],
    query: {
      tableName: 'users',
      tableAlias: 'u',
      fields: ['id'],
      fieldConfig,
      where: {
        data: { path: ['items'], array_contains: [{ 'role == "user" || @.role': 'admin' }] },
      },
    },
    expected: {
      sql: {
        text: `
        SELECT u."id" FROM "users" u
        WHERE jsonb_path_exists(u."data", $1::jsonpath, $2::jsonb)
        LIMIT $3 OFFSET $4
      `,
        parameters: [
          String.raw`$.items[*] ? (@."role == \"user\" || @.role" == $val00)`,
          '{"val00":"admin"}',
          50,
          0,
        ],
      },
      rows: [{ id: 'literal' }],
    },
  },
];
