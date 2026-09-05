import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  buildQuery,
  buildKeysetCondition,
  configurePrisma,
  generateNumberFilter,
  generateOrderByParts,
  type NumberFilter,
} from '../../index';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000,
  }),
});
const fieldConfig = { id: 'string', value: 'number' } as const;

beforeAll(async () => {
  configurePrisma(Prisma);
  await prisma.$connect();
});
afterAll(async () => prisma.$disconnect());

async function execute(
  query: Prisma.Sql,
  fixture: string,
  type: 'double precision' | 'numeric' | 'integer',
) {
  return prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH rows AS (
      SELECT * FROM jsonb_to_recordset(${fixture}::jsonb)
      AS fixture(id text, value ${Prisma.raw(type)})
    ) ${query}
  `);
}

const filters = (
  value: number,
): { name: string; filter: number | NumberFilter; ids: string[]; integerIds: string[] }[] => [
  { name: 'shorthand', filter: value, ids: ['b'], integerIds: [] },
  { name: 'equals', filter: { equals: value }, ids: ['b'], integerIds: [] },
  { name: 'not', filter: { not: value }, ids: ['a', 'c', 'd'], integerIds: ['a', 'b', 'c', 'd'] },
  { name: 'gt', filter: { gt: value }, ids: ['c', 'd'], integerIds: ['c', 'd'] },
  { name: 'gte', filter: { gte: value }, ids: ['b', 'c', 'd'], integerIds: ['c', 'd'] },
  { name: 'lt', filter: { lt: value }, ids: ['a'], integerIds: ['a', 'b'] },
  { name: 'lte', filter: { lte: value }, ids: ['a', 'b'], integerIds: ['a', 'b'] },
  { name: 'in', filter: { in: [value, 2] }, ids: ['b', 'd'], integerIds: ['d'] },
  { name: 'notIn', filter: { notIn: [value, 2] }, ids: ['a', 'c'], integerIds: ['a', 'b', 'c'] },
  {
    name: 'nested not',
    filter: { not: { equals: value } },
    ids: ['a', 'c', 'd'],
    integerIds: ['a', 'b', 'c', 'd'],
  },
];

const scenarios = [
  {
    name: 'positive',
    value: 0.15000000000000002,
    fixture:
      '[{"id":"a","value":0.15},{"id":"b","value":0.15000000000000002},{"id":"c","value":0.15000000000000004},{"id":"d","value":2},{"id":"z","value":null}]',
  },
  {
    name: 'negative',
    value: -0.15000000000000002,
    fixture:
      '[{"id":"a","value":-0.15000000000000004},{"id":"b","value":-0.15000000000000002},{"id":"c","value":-0.15},{"id":"d","value":2},{"id":"z","value":null}]',
  },
];

describe.each(scenarios)('$name adjacent fractions', ({ value, fixture }) => {
  it.each(
    (['double precision', 'numeric'] as const).flatMap((type) =>
      filters(value).map((test) => ({ ...test, type })),
    ),
  )(
    '$type $name preserves the requested number without matching its rounded neighbor',
    async ({ type, filter, ids }) => {
      const query = buildQuery({
        tableName: 'rows',
        tableAlias: 'r',
        fieldConfig,
        fields: ['id'],
        where: { value: filter },
        orderBy: { id: 'asc' },
      });
      expect(await execute(query, fixture, type)).toEqual(ids.map((id) => ({ id })));
    },
  );

  it('direct numeric filter fragment preserves the same precision', async () => {
    const query = Prisma.sql`SELECT r.id FROM rows r WHERE ${generateNumberFilter(Prisma.sql`r.value`, { equals: value })} ORDER BY r.id`;
    expect(await execute(query, fixture, 'double precision')).toEqual([{ id: 'b' }]);
  });
});

const integerFixture =
  '[{"id":"a","value":-1},{"id":"b","value":0},{"id":"c","value":1},{"id":"d","value":2},{"id":"z","value":null}]';
it.each(filters(0.15000000000000002))(
  'integer column $name accepts a fractional comparison',
  async ({ filter, integerIds }) => {
    const query = buildQuery({
      tableName: 'rows',
      tableAlias: 'r',
      fieldConfig,
      fields: ['id'],
      where: { value: filter },
      orderBy: { id: 'asc' },
    });
    expect(await execute(query, integerFixture, 'integer')).toEqual(
      integerIds.map((id) => ({ id })),
    );
  },
);

it('integer keyset columns accept fractional boundaries without truncating or rejecting them', async () => {
  const parts = generateOrderByParts({ tableAlias: 'r', fieldConfig, orderBy: { value: 'asc' } });
  const condition = buildKeysetCondition(parts, [0.15000000000000002], 'a', Prisma.sql`r.id`);
  expect(
    await execute(
      Prisma.sql`SELECT r.id FROM rows r WHERE ${condition} ORDER BY r.id`,
      integerFixture,
      'integer',
    ),
  ).toEqual([{ id: 'c' }, { id: 'd' }, { id: 'z' }]);
});
