import { Prisma } from '@prisma/client';

export function processNot(
  jsonbPath: Prisma.Sql,
  jsonTextPath: Prisma.Sql,
  value: unknown,
  _path: string[],
): Prisma.Sql {
  // For not operations, always use text comparison and convert value to string
  return Prisma.sql`${jsonTextPath} != ${String(value)}`;
}
