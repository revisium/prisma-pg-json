import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  buildKeysetCondition,
  buildSubSchemaQuery,
  buildSubSchemaCountQuery,
  buildSubSchemaCte,
  buildSubSchemaWhere,
  buildSubSchemaOrderBy,
  configurePrisma,
  computeSortHash,
  decodeCursor,
  encodeCursor,
  extractCursorValues,
  generateOrderBy,
  generateOrderByClauses,
  generateOrderByParts,
  generateWhere,
  generateStringFilter,
  generateNumberFilter,
  generateBooleanFilter,
  generateDateFilter,
  generateJsonFilter,
  type OrderByConditions,
  type SubSchemaQueryParams,
} from '../../index';

const fieldConfig = {
  id: 'string',
  name: 'string',
  age: 'number',
  active: 'boolean',
  createdAt: 'date',
  data: 'json',
} as const;
const rows = [
  {
    id: 'a',
    name: 'Amy',
    age: 10,
    active: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    data: { rank: 2 },
  },
  {
    id: 'b',
    name: 'Bob',
    age: 20,
    active: true,
    createdAt: '2025-01-02T00:00:00.000Z',
    data: { rank: 1 },
  },
  {
    id: 'c',
    name: 'Cal',
    age: 20,
    active: true,
    createdAt: '2025-01-02T00:00:00.000Z',
    data: { rank: 1 },
  },
  {
    id: 'd',
    name: 'Dan',
    age: 30,
    active: false,
    createdAt: '2025-01-03T00:00:00.000Z',
    data: { rank: 2 },
  },
];
type Row = Omit<(typeof rows)[number], 'createdAt'> & { createdAt: Date };

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000,
  }),
});

async function queryRows<T = Row>(query: Prisma.Sql, fixture: unknown = rows): Promise<T[]> {
  return prisma.$queryRaw<T[]>(Prisma.sql`
    WITH rows AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(fixture)}::jsonb)
      AS fixture(id text, name text, age integer, active boolean, "createdAt" timestamptz, data jsonb)
    ) ${query}
  `);
}

async function traverse(
  orderBy: OrderByConditions<typeof fieldConfig> | OrderByConditions<typeof fieldConfig>[],
  fixture: unknown[],
  take = 1,
): Promise<string[]> {
  const params = { tableAlias: 'r', fieldConfig, orderBy };
  const parts = generateOrderByParts(params);
  const projections = parts.map((part) => Prisma.sql`(${part.expression})::text`);
  let cursor: string | undefined;
  const seen: string[] = [];
  for (let page = 0; page <= fixture.length; page++) {
    const decoded = cursor ? decodeCursor(cursor) : null;
    const condition = decoded
      ? buildKeysetCondition(parts, decoded.values, decoded.tiebreaker, Prisma.sql`r.id`)
      : Prisma.sql`TRUE`;
    const result = await queryRows<Row & { cursorValues: (string | null)[] }>(
      Prisma.sql`SELECT r.*, ARRAY[${Prisma.join(projections)}] AS "cursorValues" FROM rows r WHERE ${condition} ${generateOrderBy(params)}, r.id DESC LIMIT ${take}`,
      fixture,
    );
    if (!result.length) break;
    const row = result[result.length - 1];
    seen.push(...result.map((item) => item.id));
    cursor = encodeCursor(row.cursorValues, row.id, computeSortHash(parts));
  }
  return seen;
}

beforeAll(async () => {
  configurePrisma(Prisma);
  await prisma.$connect();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('consumer keyset workflow', () => {
  const sorts: { name: string; orderBy: OrderByConditions<typeof fieldConfig>[]; ids: string[] }[] =
    [
      { name: 'scalar ascending with ties', orderBy: [{ age: 'asc' }], ids: ['a', 'c', 'b', 'd'] },
      {
        name: 'scalar descending with ties',
        orderBy: [{ age: 'desc' }],
        ids: ['d', 'c', 'b', 'a'],
      },
      {
        name: 'mixed directions',
        orderBy: [{ age: 'asc' }, { name: 'desc' }],
        ids: ['a', 'c', 'b', 'd'],
      },
      {
        name: 'JSON ascending with ties',
        orderBy: [{ data: { path: 'rank', type: 'int', direction: 'asc' } }],
        ids: ['c', 'b', 'd', 'a'],
      },
      {
        name: 'JSON descending with ties',
        orderBy: [{ data: { path: 'rank', type: 'int', direction: 'desc' } }],
        ids: ['d', 'a', 'c', 'b'],
      },
      {
        name: 'date descending with ties',
        orderBy: [{ createdAt: 'desc' }],
        ids: ['d', 'c', 'b', 'a'],
      },
      {
        name: 'boolean ascending with ties',
        orderBy: [{ active: 'asc' }],
        ids: ['d', 'a', 'c', 'b'],
      },
    ];

  it.each(sorts.flatMap((sort) => [1, 2, 3, 5].map((take) => ({ ...sort, take }))))(
    '$name, page size $take: all rows exactly once',
    async ({ orderBy, ids, take }) => {
      const params = { tableAlias: 'r', fieldConfig, orderBy };
      const parts = generateOrderByParts(params);
      const sortHash = computeSortHash(parts);
      let cursor: string | undefined;
      const seen: string[] = [];
      for (let page = 0; page <= rows.length; page++) {
        const decoded = cursor ? decodeCursor(cursor) : null;
        if (cursor) {
          expect(decoded).not.toBeNull();
          expect(decoded?.sortHash).toBe(sortHash);
        }
        const condition = decoded
          ? buildKeysetCondition(parts, decoded.values, decoded.tiebreaker, Prisma.sql`r.id`)
          : Prisma.sql`TRUE`;
        const result = await queryRows(
          Prisma.sql`SELECT r.* FROM rows r WHERE ${condition} ${generateOrderBy(params)} , r.id DESC LIMIT ${take}`,
        );
        expect(result.map((row) => row.id)).toEqual(ids.slice(seen.length, seen.length + take));
        if (!result.length) break;
        seen.push(...result.map((row) => row.id));
        const last = result[result.length - 1];
        cursor = encodeCursor(extractCursorValues(last, parts), last.id, sortHash);
      }
      expect(seen).toEqual(ids);
      expect(new Set(seen).size).toBe(rows.length);
    },
  );

  describe.each([
    {
      direction: 'asc' as const,
      orderBy: { age: 'asc' as const },
      fixture: [...rows, { id: 'y', age: null }, { id: 'z', age: null }],
      ids: ['a', 'c', 'b', 'd', 'z', 'y'],
      name: 'scalar ASC',
    },
    {
      direction: 'desc' as const,
      orderBy: { age: 'desc' as const },
      fixture: [...rows, { id: 'y', age: null }, { id: 'z', age: null }],
      ids: ['z', 'y', 'd', 'c', 'b', 'a'],
      name: 'scalar DESC',
    },
    {
      direction: 'asc' as const,
      orderBy: { data: { path: 'rank', type: 'int' as const, direction: 'asc' as const } },
      fixture: [...rows, { id: 'y', data: { rank: null } }, { id: 'z', data: {} }],
      ids: ['c', 'b', 'd', 'a', 'z', 'y'],
      name: 'JSON ASC',
    },
    {
      direction: 'desc' as const,
      orderBy: { data: { path: 'rank', type: 'int' as const, direction: 'desc' as const } },
      fixture: [...rows, { id: 'y', data: { rank: null } }, { id: 'z', data: {} }],
      ids: ['z', 'y', 'd', 'a', 'c', 'b'],
      name: 'JSON DESC',
    },
  ])('$name NULL traversal', ({ orderBy, fixture, ids }) => {
    let seen: string[];
    beforeAll(async () => {
      seen = await traverse(orderBy, fixture);
    });
    it('visits NULL and non-NULL rows exactly once', () => {
      expect(seen).toEqual(ids);
    });
  });

  it('mixed three-column directions preserve ties across pages', async () => {
    expect(await traverse([{ active: 'asc' }, { age: 'desc' }, { name: 'asc' }], rows)).toEqual([
      'd',
      'a',
      'b',
      'c',
    ]);
  });

  it.each([
    {
      name: 'insertion beyond the cursor',
      fixture: [...rows, { ...rows[0], id: 'new', age: 25 }],
      expected: ['new', 'd'],
    },
    {
      name: 'deletion beyond the cursor',
      fixture: rows.filter((row) => row.id !== 'd'),
      expected: [],
    },
    {
      name: 'insertion before the cursor',
      fixture: [...rows, { ...rows[0], id: 'new', age: 5 }],
      expected: ['d'],
    },
  ])('$name does not shift the cursor position', async ({ fixture, expected }) => {
    const params = { tableAlias: 'r', fieldConfig, orderBy: { age: 'asc' as const } };
    const parts = generateOrderByParts(params);
    const firstPage = await queryRows(
      Prisma.sql`SELECT r.* FROM rows r ${generateOrderBy(params)}, r.id DESC LIMIT 3`,
    );
    expect(firstPage.map((row) => row.id)).toEqual(['a', 'c', 'b']);
    const last = firstPage[2];
    const decoded = decodeCursor(
      encodeCursor(extractCursorValues(last, parts), last.id, computeSortHash(parts)),
    )!;
    const condition = buildKeysetCondition(
      parts,
      decoded.values,
      decoded.tiebreaker,
      Prisma.sql`r.id`,
    );
    expect(
      (
        await queryRows(
          Prisma.sql`SELECT r.* FROM rows r WHERE ${condition} ${generateOrderBy(params)}, r.id DESC`,
          fixture,
        )
      ).map((row) => row.id),
    ).toEqual(expected);
  });

  describe.each([
    { aggregation: 'first' as const, ids: ['b', 'a'] },
    { aggregation: 'last' as const, ids: ['a', 'b'] },
    { aggregation: 'min' as const, ids: ['a', 'b'] },
    { aggregation: 'max' as const, ids: ['b', 'a'] },
    { aggregation: 'avg' as const, ids: ['a', 'b'] },
  ])('aggregate $aggregation cursor', ({ aggregation, ids }) => {
    const fixture = [
      { id: 'a', data: { scores: [3, 1] } },
      { id: 'b', data: { scores: [2, 3] } },
    ];
    const orderBy = {
      data: { path: 'scores[*]', type: 'float' as const, direction: 'asc' as const, aggregation },
    };
    let cursorValues: unknown;
    let sortedIds: string[];
    beforeAll(async () => {
      const params = { tableAlias: 'r', fieldConfig, orderBy };
      const result = await queryRows(
        Prisma.sql`SELECT r.* FROM rows r ${generateOrderBy(params)}, r.id DESC`,
        fixture,
      );
      sortedIds = result.map((row) => row.id);
      cursorValues = extractCursorValues(fixture[0], generateOrderByParts(params));
    });
    it('orders actual data by the aggregate', () => {
      expect(sortedIds).toEqual(ids);
    });
    it('preserves wildcard extraction as null', () => {
      expect(cursorValues).toEqual([null]);
    });
  });

  it.each(
    (['first', 'last', 'min', 'max', 'avg'] as const).flatMap((aggregation) =>
      (['asc', 'desc'] as const).flatMap((direction) =>
        [1, 2, 4].flatMap((take) =>
          ['scores', 'scores[*]', 'items[*].score'].map((path) => ({
            aggregation,
            direction,
            take,
            path,
          })),
        ),
      ),
    ),
  )(
    '$aggregation $direction $path page size $take visits ties, empty and missing arrays',
    async ({ aggregation, direction, take, path }) => {
      const fixture = [
        { id: 'a', data: { scores: [1, 3], items: [{ score: 1 }, { score: 3 }] } },
        { id: 'b', data: { scores: [4, 6], items: [{ score: 4 }, { score: 6 }] } },
        { id: 'c', data: { scores: [4, 6], items: [{ score: 4 }, { score: 6 }] } },
        { id: 'y', data: { scores: [], items: [] } },
        { id: 'z', data: {} },
      ];
      expect(
        await traverse({ data: { path, type: 'float', aggregation, direction } }, fixture, take),
      ).toEqual(direction === 'asc' ? ['a', 'c', 'b', 'z', 'y'] : ['z', 'y', 'c', 'b', 'a']);
    },
  );

  it.each([
    { aggregation: 'first' as const, type: 'text' as const, values: ['z', 'a'], expected: 'z' },
    { aggregation: 'last' as const, type: 'text' as const, values: ['z', 'a'], expected: 'a' },
    {
      aggregation: 'first' as const,
      type: 'int' as const,
      values: [-2.5, 3.5],
      expected: -3,
    },
    {
      aggregation: 'last' as const,
      type: 'int' as const,
      values: [-2.5, 3.5],
      expected: 4,
    },
    {
      aggregation: 'first' as const,
      type: 'float' as const,
      values: ['2.5', '-3.5'],
      expected: 2.5,
    },
    {
      aggregation: 'last' as const,
      type: 'float' as const,
      values: ['2.5', '-3.5'],
      expected: -3.5,
    },
    {
      aggregation: 'first' as const,
      type: 'boolean' as const,
      values: ['yes', 'off'],
      expected: true,
    },
    {
      aggregation: 'last' as const,
      type: 'boolean' as const,
      values: ['yes', 'off'],
      expected: false,
    },
    { aggregation: 'first' as const, type: 'float' as const, values: [null, 2], expected: null },
    { aggregation: 'last' as const, type: 'float' as const, values: [2, null], expected: null },
    {
      aggregation: 'min' as const,
      type: 'float' as const,
      values: [null, '3.5', '-1'],
      expected: -1,
    },
    {
      aggregation: 'max' as const,
      type: 'float' as const,
      values: [null, '3.5', '-1'],
      expected: 3.5,
    },
    {
      aggregation: 'avg' as const,
      type: 'float' as const,
      values: [null, '3.5', '-1'],
      expected: 1.25,
    },
    { aggregation: 'avg' as const, type: 'int' as const, values: ['1', '2'], expected: 1.5 },
    {
      aggregation: 'min' as const,
      type: 'text' as const,
      values: ['z', 'a'],
      expected: 'a',
    },
    {
      aggregation: 'max' as const,
      type: 'text' as const,
      values: ['z', 'a'],
      expected: 'z',
    },
    { aggregation: 'min' as const, type: 'float' as const, values: [null, null], expected: null },
  ])(
    '$aggregation $type cursor cast for $values matches the public sort value',
    async ({ aggregation, type, values, expected }) => {
      const fixture = [{ id: 'a', data: { scores: values } }];
      const params = {
        tableAlias: 'r',
        fieldConfig,
        orderBy: { data: { path: 'scores[*]', aggregation, type } },
      };
      const parts = generateOrderByParts(params);
      const result = await queryRows<{ value: unknown }>(
        Prisma.sql`SELECT ${parts[0].expression} AS value FROM rows r`,
        fixture,
      );
      const sqlValue = result[0].value;
      expect(
        typeof sqlValue === 'object' && sqlValue !== null ? Number(sqlValue) : sqlValue,
      ).toEqual(expected);
      expect(extractCursorValues(fixture[0], parts)).toEqual([null]);
      expect(await traverse(params.orderBy, fixture)).toEqual(['a']);
    },
  );

  it.each(
    [
      {
        type: 'text' as const,
        aggregation: 'min' as const,
        values: [
          ['b', 'a'],
          ['d', 'c'],
        ],
      },
      {
        type: 'timestamp' as const,
        aggregation: 'max' as const,
        values: [
          ['2025-01-01', '2025-01-02'],
          ['2025-02-01', '2025-02-02'],
        ],
      },
      {
        type: 'float' as const,
        aggregation: 'avg' as const,
        values: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      },
      {
        type: 'int' as const,
        aggregation: 'avg' as const,
        values: [
          [1, 1, 2],
          [2, 2, 3],
        ],
      },
    ].flatMap((sort) =>
      (['asc', 'desc'] as const).flatMap((direction) =>
        [1, 2].map((take) => ({ ...sort, direction, take })),
      ),
    ),
  )(
    '$type $aggregation $direction page size $take uses database-projected cursor values',
    async ({ type, aggregation, values, direction, take }) => {
      const fixture = [
        { id: 'a', data: { scores: values[0] } },
        { id: 'b', data: { scores: values[1] } },
        { id: 'c', data: { scores: values[1] } },
        { id: 'z', data: { scores: [] } },
      ];
      const params = {
        tableAlias: 'r',
        fieldConfig,
        orderBy: { data: { path: 'scores[*]', type, aggregation, direction } },
      };
      const parts = generateOrderByParts(params);
      expect(extractCursorValues(fixture[0], parts)).toEqual([null]);
      let cursor: string | undefined;
      const seen: string[] = [];
      for (let page = 0; page <= fixture.length; page++) {
        const decoded = cursor ? decodeCursor(cursor) : null;
        const condition = decoded
          ? buildKeysetCondition(parts, decoded.values, decoded.tiebreaker, Prisma.sql`r.id`)
          : Prisma.sql`TRUE`;
        const result = await queryRows<{
          id: string;
          sortValue: string | null;
        }>(
          Prisma.sql`SELECT r.id, (${parts[0].expression})::text AS "sortValue" FROM rows r WHERE ${condition} ${generateOrderBy(params)}, r.id DESC LIMIT ${take}`,
          fixture,
        );
        if (!result.length) break;
        seen.push(...result.map((row) => row.id));
        const last = result[result.length - 1];
        cursor = encodeCursor([last.sortValue], last.id, computeSortHash(parts));
      }
      expect(seen).toEqual(direction === 'asc' ? ['a', 'c', 'b', 'z'] : ['z', 'c', 'b', 'a']);
    },
  );

  it.each([
    { aggregation: 'first' as const, type: 'int' as const, values: ['1.5'] },
    { aggregation: 'first' as const, type: 'float' as const, values: ['Infinity'] },
    { aggregation: 'first' as const, type: 'text' as const, values: [{ a: 1 }] },
    { aggregation: 'first' as const, type: 'text' as const, values: [1.0] },
    { aggregation: 'avg' as const, type: 'float' as const, values: [Number.MAX_SAFE_INTEGER, 1] },
    {
      aggregation: 'avg' as const,
      type: 'float' as const,
      values: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER],
    },
  ])(
    'preserves null wildcard extraction for $aggregation $type with $values',
    ({ aggregation, type, values }) => {
      const parts = generateOrderByParts({
        tableAlias: 'r',
        fieldConfig,
        orderBy: { data: { path: 'scores[*]', type, aggregation } },
      });
      expect(extractCursorValues({ data: { scores: values } }, parts)).toEqual([null]);
    },
  );

  it.each(['min', 'max', 'first', 'last'] as const)(
    '%s preserves fractional cursor precision at a page boundary',
    async (aggregation) => {
      const fixture = [
        { id: 'a', data: { scores: [0.15000000000000002] } },
        { id: 'b', data: { scores: [0.3] } },
      ];
      expect(
        await traverse({ data: { path: 'scores[*]', type: 'float', aggregation } }, fixture),
      ).toEqual(['a', 'b']);
    },
  );

  it.each(
    (['first', 'last'] as const).flatMap((aggregation) => [
      { aggregation, decimal: '2.4999999999999999', rounded: '2', following: 3 },
      { aggregation, decimal: '-2.4999999999999999', rounded: '-2', following: 0 },
    ]),
  )(
    '$aggregation int preserves raw JSONB decimal $decimal through projected cursor traversal',
    async ({ aggregation, decimal, rounded, following }) => {
      // Keep the database decimal lexeme intact; JSON.stringify would round it first.
      const fixture =
        '[{"id":"a","data":{"scores":[' +
        decimal +
        ']}},{"id":"b","data":{"scores":[' +
        following +
        ']}}]';
      const params = {
        tableAlias: 'r',
        fieldConfig,
        orderBy: { data: { path: 'scores[*]', type: 'int' as const, aggregation } },
      };
      const parts = generateOrderByParts(params);
      const seen: string[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 3; page++) {
        const decoded = cursor ? decodeCursor(cursor) : null;
        const condition = decoded
          ? buildKeysetCondition(parts, decoded.values, decoded.tiebreaker, Prisma.sql`r.id`)
          : Prisma.sql`TRUE`;
        const result = await prisma.$queryRaw<
          { id: string; data: unknown; sortValue: string }[]
        >(Prisma.sql`
        WITH rows AS (SELECT * FROM jsonb_to_recordset(${fixture}::jsonb) AS fixture(id text, data jsonb))
        SELECT r.*, (${parts[0].expression})::text AS "sortValue" FROM rows r
        WHERE ${condition} ${generateOrderBy(params)}, r.id DESC LIMIT 1
      `);
        if (!result.length) break;
        const row = result[0];
        if (row.id === 'a') {
          expect(row.sortValue).toBe(rounded);
          expect(extractCursorValues(row, parts)).toEqual([null]);
        }
        seen.push(row.id);
        cursor = encodeCursor([row.sortValue], row.id, computeSortHash(parts));
      }
      expect(seen).toEqual(['a', 'b']);
    },
  );

  it.each(
    [
      { path: 'groups[0].scores[*]', min: 1, max: 3, avg: 2 },
      { path: ['groups', '0', 'scores', '*'], min: 1, max: 3, avg: 2 },
      { path: 'groups[-1].scores[*]', min: 7, max: 9, avg: 8 },
      { path: ['groups', '-1', 'scores', '*'], min: 7, max: 9, avg: 8 },
      { path: 'groups[*].scores[0]', min: 1, max: 7, avg: 4 },
      { path: ['groups', '*', 'scores', '0'], min: 1, max: 7, avg: 4 },
      { path: 'groups[*].scores[-1]', min: 3, max: 9, avg: 6 },
      { path: ['groups', '*', 'scores', '-1'], min: 3, max: 9, avg: 6 },
    ].flatMap((scenario) =>
      (['min', 'max', 'avg'] as const).flatMap((aggregation) =>
        (['asc', 'desc'] as const).flatMap((direction) =>
          [1, 2].map((take) => ({ ...scenario, aggregation, direction, take })),
        ),
      ),
    ),
  )(
    '$aggregation $path $direction page size $take preserves indexed array values and missing rows',
    async ({ path, aggregation, direction, take, ...expected }) => {
      const fixture = [
        { id: 'a', data: { groups: [{ scores: [1, 3] }, { scores: [7, 9] }] } },
        { id: 'b', data: { groups: [{ scores: [4, 6] }, { scores: [10, 12] }] } },
        { id: 'c', data: { groups: [{ scores: [4, 6] }, { scores: [10, 12] }] } },
        { id: 'y', data: { groups: [] } },
        { id: 'z', data: {} },
      ];
      const orderBy = { data: { path, aggregation, direction, type: 'float' as const } };
      const parts = generateOrderByParts({ tableAlias: 'r', fieldConfig, orderBy });
      const projected = await queryRows<{ value: unknown }>(
        Prisma.sql`SELECT ${parts[0].expression} AS value FROM rows r WHERE r.id = 'a'`,
        fixture,
      );
      expect(Number(projected[0].value)).toBe(expected[aggregation]);
      expect(extractCursorValues(fixture[0], parts)).toEqual([null]);
      expect(await traverse(orderBy, fixture, take)).toEqual(
        direction === 'asc' ? ['a', 'c', 'b', 'z', 'y'] : ['z', 'y', 'c', 'b', 'a'],
      );
    },
  );

  it.each(
    [
      ['literal.key', '*'],
      ['literal[0]', '*'],
      ['literal"key', '*'],
      ['literal\\key', '*'],
    ].map((path) => ({ path })),
  )('preserves null wildcard extraction with literal member $path', ({ path }) => {
    const parts = generateOrderByParts({
      tableAlias: 'r',
      fieldConfig,
      orderBy: { data: { path, aggregation: 'min', type: 'float' } },
    });
    expect(extractCursorValues({ data: { [path[0]]: [1, 2] } }, parts)).toEqual([null]);
  });

  it.each(['groups[-2].score', ['groups', '-2', 'score']].map((path) => ({ path })))(
    'retains rejection of unsupported negative index in $path',
    ({ path }) => {
      expect(() =>
        generateOrderByParts({
          tableAlias: 'r',
          fieldConfig,
          orderBy: { data: { path, type: 'float' } },
        }),
      ).toThrow('Negative index -2');
    },
  );

  it.each(
    [
      'groups[0].scores[0]',
      'groups[-1].scores[-1]',
      ['groups', '0', 'scores', '0'],
      ['groups', '-1', 'scores', '-1'],
    ].map((path) => ({ path })),
  )('nonaggregate indexed JSON path $path paginates missing values and ties', async ({ path }) => {
    const fixture = [
      { id: 'a', data: { groups: [{ scores: [1, 2] }] } },
      { id: 'b', data: { groups: [{ scores: [3, 4] }] } },
      { id: 'c', data: { groups: [{ scores: [3, 4] }] } },
      { id: 'y', data: { groups: [] } },
      { id: 'z', data: {} },
    ];
    expect(await traverse({ data: { path, type: 'float' } }, fixture)).toEqual([
      'a',
      'c',
      'b',
      'z',
      'y',
    ]);
  });

  it('preserves null extraction across multiple wildcards', () => {
    const parts = generateOrderByParts({
      tableAlias: 'r',
      fieldConfig,
      orderBy: { data: { path: 'groups[*].scores[*]', aggregation: 'min', type: 'float' } },
    });
    expect(extractCursorValues({ data: { groups: [{ scores: [1, 2] }] } }, parts)).toEqual([null]);
  });

  it.each(['0x', '0abc', '1e0'])(
    'array member %s is not interpreted as a partial numeric index',
    async (member) => {
      const fixture = [
        { id: 'a', data: { groups: [{ scores: [1, 3] }] } },
        { id: 'b', data: { groups: { [member]: { scores: [4, 6] } } } },
      ];
      const orderBy = {
        data: {
          path: ['groups', member, 'scores', '*'],
          aggregation: 'min' as const,
          type: 'float' as const,
        },
      };
      const parts = generateOrderByParts({ tableAlias: 'r', fieldConfig, orderBy });
      const values = await queryRows<{ id: string; sortValue: number | null }>(
        Prisma.sql`SELECT r.id, ${parts[0].expression} AS "sortValue" FROM rows r ORDER BY r.id`,
        fixture,
      );
      expect(values).toEqual([
        { id: 'a', sortValue: null },
        { id: 'b', sortValue: 4 },
      ]);
      expect(extractCursorValues(fixture[0], parts)).toEqual([null]);
      expect(extractCursorValues(fixture[1], parts)).toEqual([null]);
      expect(await traverse(orderBy, fixture)).toEqual(['b', 'a']);
    },
  );

  it.each(
    (['first', 'last', 'min', 'max', 'avg'] as const).flatMap((aggregation) =>
      [
        { path: 'scores[*]', value: [1, 3], expected: null },
        { path: 'scores', value: [1, 3], expected: null },
        { path: 'scores', value: 3, expected: 3 },
        { path: 'scores', value: '3', expected: '3' },
        { path: 'scores', value: null, expected: null },
        { path: 'scores', value: undefined, expected: null },
        { path: 'scores', value: { score: 3 }, expected: null },
      ].map((scenario) => ({ ...scenario, aggregation })),
    ),
  )(
    'legacy extraction $aggregation $path from $value returns $expected',
    ({ aggregation, path, value, expected }) => {
      const parts = generateOrderByParts({
        tableAlias: 'r',
        fieldConfig,
        orderBy: { data: { path, aggregation, type: 'float' } },
      });
      expect(extractCursorValues({ data: { scores: value } }, parts)).toEqual([expected]);
    },
  );

  it.each(
    [
      { member: '0x', expected: null },
      { member: '0abc', expected: null },
      { member: '1e0', expected: null },
      { member: '0', expected: 4 },
      { member: '1', expected: 8 },
      { member: '-1', expected: 8 },
      { member: '2', expected: null },
      { member: 'missing', expected: null },
    ].flatMap(({ member, expected }) => [
      { path: ['groups', member, 'score'], expected },
      { path: `groups.${member}.score`, expected },
    ]),
  )('scalar cursor path $path resolves complete array indices', ({ path, expected }) => {
    const parts = generateOrderByParts({
      tableAlias: 'r',
      fieldConfig,
      orderBy: { data: { path, type: 'float' } },
    });
    expect(extractCursorValues({ data: { groups: [{ score: 4 }, { score: 8 }] } }, parts)).toEqual([
      expected,
    ]);
  });

  it('supports an explicit ascending tiebreaker', async () => {
    const parts = generateOrderByParts({ tableAlias: 'r', fieldConfig, orderBy: { age: 'asc' } });
    const condition = buildKeysetCondition(parts, [20], 'b', Prisma.sql`r.id`, 'ASC');
    expect(
      (
        await queryRows(
          Prisma.sql`SELECT r.* FROM rows r WHERE ${condition} ORDER BY r.age ASC, r.id ASC`,
        )
      ).map((row) => row.id),
    ).toEqual(['c', 'd']);
  });

  it.each([
    '',
    'not-valid-base64!!!',
    Buffer.from('not JSON').toString('base64url'),
    Buffer.from('{}').toString('base64url'),
  ])('rejects malformed cursor %j', (cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });

  it('roundtrips all cursor value types and punctuation without SQL interpretation', () => {
    const values = [null, false, true, 0, -1, 1.5, '', "O'Reilly", '雪'];
    expect(decodeCursor(encodeCursor(values, "id'quoted", 'consumer-sort'))).toEqual({
      values,
      tiebreaker: "id'quoted",
      sortHash: 'consumer-sort',
    });
  });

  it('lets the consumer detect changed sorting before using a cursor', () => {
    const parts = (orderBy: OrderByConditions<typeof fieldConfig>[]) =>
      generateOrderByParts({ tableAlias: 'r', fieldConfig, orderBy });
    const original = computeSortHash(parts([{ age: 'asc' }]));
    const decoded = decodeCursor(encodeCursor([20], 'b', original));
    expect(decoded?.sortHash).toBe(original);
    for (const changed of [
      [{ age: 'desc' }],
      [{ name: 'asc' }],
      [{ age: 'asc' }, { name: 'asc' }],
    ] as OrderByConditions<typeof fieldConfig>[][]) {
      expect(decoded?.sortHash).not.toBe(computeSortHash(parts(changed)));
    }
  });
});

const sourceRows = [
  {
    id: 'hero',
    versionId: 'row-v1',
    createdAt: '2025-02-01T00:00:00.000Z',
    data: {
      avatar: { name: 'A', status: 'ready' },
      gallery: [
        { name: 'C', status: 'ready' },
        { name: 'B', status: 'draft' },
      ],
      groups: [{ items: [{ image: { name: 'D', status: 'ready' } }] }],
      'quoted.key': { name: 'Q' },
    },
  },
  {
    id: 'villain',
    versionId: 'row-v2',
    createdAt: '2025-01-01T00:00:00.000Z',
    data: { avatar: { name: 'E', status: 'draft' }, gallery: [], groups: [] },
  },
  { id: 'missing', versionId: 'row-v3', data: {} },
  { id: 'other-version', versionId: 'row-v4', data: { avatar: { name: 'excluded' } } },
];
const links = [
  { A: 'row-v1', B: 'table-v1' },
  { A: 'row-v2', B: 'table-v1' },
  { A: 'row-v3', B: 'table-v1' },
  { A: 'row-v4', B: 'table-v2' },
];
const tablesFor = (path: string) => [
  { tableId: 'characters', tableVersionId: 'table-v1', paths: [{ path }] },
];

async function querySubSchema<T>(
  query: Prisma.Sql,
  fixtureRows: unknown = sourceRows,
  fixtureLinks: unknown = links,
): Promise<T[]> {
  return prisma.$queryRaw<T[]>(Prisma.sql`
    WITH "Row" AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(fixtureRows)}::jsonb)
      AS fixture(id text, "versionId" text, "createdAt" timestamptz, data jsonb)
    ), "_RowToTable" AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(fixtureLinks)}::jsonb) AS fixture("A" text, "B" text)
    ) SELECT * FROM (${query}) AS consumer_result
  `);
}

describe('consumer sub-schema workflow', () => {
  it.each([
    {
      path: 'avatar',
      expected: [
        { rowId: 'hero', fieldPath: 'avatar', data: { name: 'A', status: 'ready' } },
        { rowId: 'villain', fieldPath: 'avatar', data: { name: 'E', status: 'draft' } },
      ],
    },
    {
      path: 'gallery[*]',
      expected: [
        { rowId: 'hero', fieldPath: 'gallery[0]', data: { name: 'C', status: 'ready' } },
        { rowId: 'hero', fieldPath: 'gallery[1]', data: { name: 'B', status: 'draft' } },
      ],
    },
    {
      path: 'groups[*].items[*].image',
      expected: [
        {
          rowId: 'hero',
          fieldPath: 'groups[0].items[0].image',
          data: { name: 'D', status: 'ready' },
        },
      ],
    },
    { path: 'missing', expected: [] },
  ])('extracts $path, preserving source identity and data', async ({ path, expected }) => {
    const result = await querySubSchema<{
      rowId: string;
      fieldPath: string;
      data: unknown;
      tableId: string;
      rowVersionId: string;
    }>(
      buildSubSchemaQuery({
        tables: tablesFor(path),
        orderBy: [{ rowId: 'asc' }, { fieldPath: 'asc' }],
        take: 50,
        skip: 0,
      }),
    );
    expect(result.map(({ rowId, fieldPath, data }) => ({ rowId, fieldPath, data }))).toEqual(
      expected,
    );
    for (const item of result) {
      expect(item.tableId).toBe('characters');
      expect(item.rowVersionId).toBe(item.rowId === 'hero' ? 'row-v1' : 'row-v2');
    }
  });

  it('dot notation selects nested members without interpreting a literal dotted sibling', async () => {
    const fixture = [
      {
        id: 'hero',
        versionId: 'row-v1',
        data: {
          quoted: { key: { name: 'nested' } },
          'quoted.key': { name: 'literal' },
        },
      },
    ];
    const result = await querySubSchema<{ data: unknown }>(
      buildSubSchemaQuery({ tables: tablesFor('quoted.key'), take: 10, skip: 0 }),
      fixture,
    );
    expect(result.map((row) => row.data)).toEqual([{ name: 'nested' }]);
  });

  const tables = [
    { ...tablesFor('avatar')[0], paths: [{ path: 'avatar' }, { path: 'gallery[*]' }] },
  ];
  const filters: { name: string; where: SubSchemaQueryParams['where']; names: string[] }[] = [
    { name: 'no filter', where: undefined, names: ['A', 'B', 'C', 'E'] },
    { name: 'table id', where: { tableId: 'characters' }, names: ['A', 'B', 'C', 'E'] },
    { name: 'missing table', where: { tableId: 'other' }, names: [] },
    { name: 'row id', where: { rowId: 'hero' }, names: ['A', 'B', 'C'] },
    { name: 'field path', where: { fieldPath: { startsWith: 'gallery[' } }, names: ['B', 'C'] },
    {
      name: 'JSON filter',
      where: { data: { path: 'status', equals: 'ready' } },
      names: ['A', 'C'],
    },
    {
      name: 'AND',
      where: { AND: [{ rowId: 'hero' }, { data: { path: 'status', equals: 'draft' } }] },
      names: ['B'],
    },
    {
      name: 'OR groups',
      where: {
        OR: [
          { rowId: 'hero', data: { path: 'status', equals: 'ready' } },
          { rowId: 'villain', data: { path: 'status', equals: 'draft' } },
        ],
      },
      names: ['A', 'C', 'E'],
    },
    {
      name: 'NOT',
      where: { NOT: { data: { path: 'status', equals: 'draft' } } },
      names: ['A', 'C'],
    },
  ];
  it.each(filters)(
    '$name: filtering, ordered pages and total count agree',
    async ({ where, names }) => {
      const options = {
        tables,
        where,
        orderBy: [{ data: { path: 'name', order: 'asc' as const } }],
        take: 2,
        skip: 0,
      };
      const actual: string[] = [];
      for (let skip = 0; skip <= names.length; skip += 2) {
        const page = await querySubSchema<{ data: { name: string } }>(
          buildSubSchemaQuery({ ...options, skip }),
        );
        expect(page.map((item) => item.data.name)).toEqual(names.slice(skip, skip + 2));
        actual.push(...page.map((item) => item.data.name));
      }
      expect(actual).toEqual(names);
      expect(await querySubSchema(buildSubSchemaCountQuery({ tables, where }))).toEqual([
        { count: BigInt(names.length) },
      ]);
    },
  );

  it('composes public fragments with alias, custom CTE name and projection', async () => {
    const query = Prisma.sql`${buildSubSchemaCte({ tables, cteName: 'images' })}
      SELECT s."rowId", s.data->>'name' AS name FROM images s
      ${buildSubSchemaWhere({ where: { rowId: 'hero' }, tableAlias: 's' })}
      ${buildSubSchemaOrderBy({ orderBy: [{ data: { path: 'name', order: 'desc' } }], tableAlias: 's' })}`;
    expect(await querySubSchema(query)).toEqual([
      { rowId: 'hero', name: 'C' },
      { rowId: 'hero', name: 'B' },
      { rowId: 'hero', name: 'A' },
    ]);
  });

  it.each(['asc', 'desc'] as const)(
    'rowCreatedAt %s composition orders source rows',
    async (direction) => {
      const query = Prisma.sql`${buildSubSchemaCte({ tables: tablesFor('avatar') })}
      SELECT s."rowId" FROM sub_schema_items s
      JOIN "Row" r ON r."versionId" = s."rowVersionId"
      ${buildSubSchemaOrderBy({ orderBy: [{ rowCreatedAt: direction }], tableAlias: 's', rowTableAlias: 'r' })}`;
      expect(await querySubSchema(query)).toEqual(
        (direction === 'asc' ? ['villain', 'hero'] : ['hero', 'villain']).map((rowId) => ({
          rowId,
        })),
      );
    },
  );

  it.each([
    { order: 'asc' as const, nulls: 'first' as const, expected: ['missing', 'null', 'a', 'b'] },
    { order: 'asc' as const, nulls: 'last' as const, expected: ['a', 'b', 'missing', 'null'] },
    { order: 'desc' as const, nulls: 'first' as const, expected: ['missing', 'null', 'b', 'a'] },
    { order: 'desc' as const, nulls: 'last' as const, expected: ['b', 'a', 'missing', 'null'] },
  ])('JSON $order NULLS $nulls', async ({ order, nulls, expected }) => {
    const fixture = [
      { id: 'a', versionId: 'a', data: { avatar: { name: 'A' } } },
      { id: 'b', versionId: 'b', data: { avatar: { name: 'B' } } },
      { id: 'null', versionId: 'null', data: { avatar: { name: null } } },
      { id: 'missing', versionId: 'missing', data: { avatar: {} } },
    ];
    const fixtureLinks = fixture.map((row) => ({ A: row.versionId, B: 'table-v1' }));
    const result = await querySubSchema<{ rowId: string }>(
      buildSubSchemaQuery({
        tables: tablesFor('avatar'),
        take: 10,
        skip: 0,
        orderBy: [{ data: { path: 'name', order, nulls } }, { rowId: 'asc' }],
      }),
      fixture,
      fixtureLinks,
    );
    expect(result.map((row) => row.rowId)).toEqual(expected);
  });

  it('multiple table versions preserve table and row identities', async () => {
    const query = buildSubSchemaQuery({
      tables: [
        tablesFor('avatar')[0],
        { tableId: 'archived', tableVersionId: 'table-v2', paths: [{ path: 'avatar' }] },
      ],
      orderBy: [{ tableId: 'asc' }, { rowId: 'asc' }],
      take: 10,
      skip: 0,
    });
    const result = await querySubSchema<{
      tableId: string;
      rowId: string;
      rowVersionId: string;
      data: unknown;
    }>(query);
    expect(
      result.map(({ tableId, rowId, rowVersionId, data }) => ({
        tableId,
        rowId,
        rowVersionId,
        data,
      })),
    ).toEqual([
      {
        tableId: 'archived',
        rowId: 'other-version',
        rowVersionId: 'row-v4',
        data: { name: 'excluded' },
      },
      {
        tableId: 'characters',
        rowId: 'hero',
        rowVersionId: 'row-v1',
        data: { name: 'A', status: 'ready' },
      },
      {
        tableId: 'characters',
        rowId: 'villain',
        rowVersionId: 'row-v2',
        data: { name: 'E', status: 'draft' },
      },
    ]);
  });

  const stringFieldCases = [
    {
      field: 'tableId' as const,
      match: 'characters',
      other: 'missing',
      prefix: 'char',
      suffix: 'ters',
      part: 'ract',
      matching: ['A', 'B', 'C', 'E'],
      rest: [],
    },
    {
      field: 'rowId' as const,
      match: 'hero',
      other: 'missing',
      prefix: 'he',
      suffix: 'ro',
      part: 'er',
      matching: ['A', 'B', 'C'],
      rest: ['E'],
    },
    {
      field: 'fieldPath' as const,
      match: 'avatar',
      other: 'missing',
      prefix: 'ava',
      suffix: 'tar',
      part: 'vat',
      matching: ['A', 'E'],
      rest: ['B', 'C'],
    },
  ];
  const stringCases = stringFieldCases.flatMap((field) => [
    { ...field, operation: 'equals', filter: { equals: field.match }, expected: field.matching },
    { ...field, operation: 'not', filter: { not: field.match }, expected: field.rest },
    {
      ...field,
      operation: 'in',
      filter: { in: [field.match, field.other] },
      expected: field.matching,
    },
    {
      ...field,
      operation: 'notIn',
      filter: { notIn: [field.match, field.other] },
      expected: field.rest,
    },
    { ...field, operation: 'contains', filter: { contains: field.part }, expected: field.matching },
    {
      ...field,
      operation: 'startsWith',
      filter: { startsWith: field.prefix },
      expected: field.matching,
    },
    {
      ...field,
      operation: 'endsWith',
      filter: { endsWith: field.suffix },
      expected: field.matching,
    },
    {
      ...field,
      operation: 'insensitive',
      filter: { equals: field.match.toUpperCase(), mode: 'insensitive' as const },
      expected: field.matching,
    },
  ]);
  it.each(stringCases)(
    '$field $operation composed with a JSON logical condition',
    async ({ field, filter, expected }) => {
      const query = buildSubSchemaQuery({
        tables,
        where: {
          AND: [
            { [field]: filter },
            {
              OR: [
                { data: { path: 'status', equals: 'ready' } },
                { data: { path: 'status', equals: 'draft' } },
              ],
            },
          ],
        },
        orderBy: [{ data: { path: 'name', order: 'asc' } }],
        take: 10,
        skip: 0,
      });
      expect(
        (await querySubSchema<{ data: { name: string } }>(query)).map((row) => row.data.name),
      ).toEqual(expected);
    },
  );

  it('empty table selection has no rows and count zero', async () => {
    expect(await querySubSchema(buildSubSchemaQuery({ tables: [], take: 10, skip: 0 }))).toEqual(
      [],
    );
    expect(await querySubSchema(buildSubSchemaCountQuery({ tables: [] }))).toEqual([{ count: 0n }]);
  });
});

describe('consumer filter and order fragments', () => {
  it.each([
    {
      name: 'string',
      condition: () => generateStringFilter(Prisma.sql`r.name`, { startsWith: 'B' }),
      ids: ['b'],
    },
    {
      name: 'number',
      condition: () => generateNumberFilter(Prisma.sql`r.age`, { gte: 20, lt: 30 }),
      ids: ['b', 'c'],
    },
    {
      name: 'boolean',
      condition: () => generateBooleanFilter(Prisma.sql`r.active`, true),
      ids: ['b', 'c'],
    },
    {
      name: 'date',
      condition: () =>
        generateDateFilter(Prisma.sql`r."createdAt"`, {
          equals: new Date('2025-01-02T00:00:00.000Z'),
        }),
      ids: ['b', 'c'],
    },
    {
      name: 'JSON',
      condition: () =>
        generateJsonFilter(Prisma.sql`r.data`, { path: 'rank', equals: 1 }, 'data', 'r'),
      ids: ['b', 'c'],
    },
  ])('$name fragment returns expected rows', async ({ condition, ids }) => {
    expect(
      (await queryRows(Prisma.sql`SELECT r.* FROM rows r WHERE ${condition()} ORDER BY r.id`)).map(
        (row) => row.id,
      ),
    ).toEqual(ids);
  });

  it('where and both order APIs compose into the same result', async () => {
    const params = {
      tableAlias: 'r',
      fieldConfig,
      orderBy: [{ age: 'desc' as const }, { id: 'asc' as const }],
    };
    const where = generateWhere({ tableAlias: 'r', fieldConfig, where: { active: true } });
    const fullOrder = generateOrderBy(params);
    const clauses = generateOrderByClauses(params);
    for (const order of [fullOrder, Prisma.sql`ORDER BY ${clauses}`]) {
      expect(
        (await queryRows(Prisma.sql`SELECT r.* FROM rows r WHERE ${where} ${order}`)).map(
          (row) => row.id,
        ),
      ).toEqual(['b', 'c']);
    }
  });
});
