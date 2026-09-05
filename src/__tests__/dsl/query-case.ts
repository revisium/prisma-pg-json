import type { Prisma } from '@prisma/client';
import { format } from 'sql-formatter';
import type { QueryBuilderOptions } from '../../index';

export interface UserRow {
  id: string;
  name?: string | null;
  age?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  data?: Prisma.InputJsonValue | null;
}

export type ResultRow = Omit<UserRow, 'createdAt'> & { createdAt?: Date | null };

export const fieldConfig = {
  id: 'string',
  name: 'string',
  age: 'number',
  isActive: 'boolean',
  createdAt: 'date',
  data: 'json',
} as const;

export type TestFieldConfig = typeof fieldConfig;

export interface SqlExpectation {
  text: string;
  parameters: unknown[];
}

export interface QueryCase {
  name: string;
  rows: UserRow[];
  query: QueryBuilderOptions<TestFieldConfig>;
  expected: {
    rows: Array<Partial<ResultRow>>;
    sql?: SqlExpectation;
  };
}

export function expectQuerySql(actual: Prisma.Sql, expected: SqlExpectation): void {
  expect(format(actual.text, { language: 'postgresql' })).toBe(
    format(expected.text, { language: 'postgresql' }),
  );
  expect(actual.values).toEqual(expected.parameters);
}
