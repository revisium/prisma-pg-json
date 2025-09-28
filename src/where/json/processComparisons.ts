import { Prisma } from '@prisma/client';

export function processGreaterThan(jsonbPath: Prisma.Sql, value: unknown, _path: string[]): Prisma.Sql {
  return Prisma.sql`((${jsonbPath})::jsonb > ${JSON.stringify(value)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'number'})`;
}

export function processGreaterThanOrEqual(
  jsonbPath: Prisma.Sql,
  value: unknown,
  _path: string[],
): Prisma.Sql {
  return Prisma.sql`((${jsonbPath})::jsonb >= ${JSON.stringify(value)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'number'})`;
}

export function processLessThan(jsonbPath: Prisma.Sql, value: unknown, _path: string[]): Prisma.Sql {
  return Prisma.sql`((${jsonbPath})::jsonb < ${JSON.stringify(value)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'number'})`;
}

export function processLessThanOrEqual(
  jsonbPath: Prisma.Sql,
  value: unknown,
  _path: string[],
): Prisma.Sql {
  return Prisma.sql`((${jsonbPath})::jsonb <= ${JSON.stringify(value)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'number'})`;
}
