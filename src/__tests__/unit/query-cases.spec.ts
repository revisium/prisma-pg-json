import { Prisma } from '@prisma/client';
import { buildQuery, configurePrisma } from '../../index';
import { expectQuerySql } from '../dsl/query-case';
import { allQueryCases } from '../dsl/all-cases';

const sqlCases = allQueryCases.flatMap(({ name, query, expected }) =>
  expected.sql ? [{ name, query, sql: expected.sql }] : [],
);

describe('query cases: SQL and parameters', () => {
  beforeAll(() => configurePrisma(Prisma));

  it.each(sqlCases)('$name', ({ query, sql }) => {
    expectQuerySql(buildQuery(query), sql);
  });
});
