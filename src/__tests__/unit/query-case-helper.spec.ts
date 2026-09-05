import { Prisma } from '@prisma/client';
import { expectQuerySql, type QueryCase } from '../dsl/query-case';

describe('query case assertion fidelity', () => {
  it('accepts formatting changes without substituting parameters', () => {
    expectQuerySql(Prisma.sql`SELECT ${18} AS age`, {
      text: 'SELECT\n $1 AS age',
      parameters: [18],
    });
  });

  it('rejects swapped parameters', () => {
    expect(() =>
      expectQuerySql(Prisma.sql`SELECT ${18}, ${50}`, {
        text: 'SELECT $1, $2',
        parameters: [50, 18],
      }),
    ).toThrow();
  });

  it('rejects changed whitespace inside a literal', () => {
    expect(() =>
      expectQuerySql(Prisma.sql`SELECT 'a  b'`, {
        text: "SELECT 'a b'",
        parameters: [],
      }),
    ).toThrow();
  });

  it('rejects changed whitespace inside an identifier', () => {
    expect(() =>
      expectQuerySql(Prisma.sql`SELECT "a  b" FROM users`, {
        text: 'SELECT "a b" FROM users',
        parameters: [],
      }),
    ).toThrow();
  });
});

// Keep SQL optional, but require text and parameters together when it is present.
const rowsOnly: QueryCase['expected'] = { rows: [] };
const missingParameters: QueryCase['expected'] = {
  rows: [],
  // @ts-expect-error SQL expectations require explicit parameters.
  sql: { text: 'SELECT 1' },
};
const missingText: QueryCase['expected'] = {
  rows: [],
  // @ts-expect-error SQL expectations require explicit text.
  sql: { parameters: [] },
};
void [rowsOnly, missingParameters, missingText];
