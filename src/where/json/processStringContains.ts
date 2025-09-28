import { Prisma } from '@prisma/client';

export function processStringContains(
  jsonTextPath: Prisma.Sql,
  jsonbPath: Prisma.Sql,
  value: string,
  isInsensitive: boolean,
  _path: string[],
): Prisma.Sql {
  const pattern = `%${value}%`;

  if (isInsensitive) {
    return Prisma.sql`(${jsonTextPath} ILIKE ${pattern} AND JSONB_TYPEOF(${jsonbPath}) = ${'string'})`;
  } else {
    return Prisma.sql`(${jsonTextPath} LIKE ${pattern} AND JSONB_TYPEOF(${jsonbPath}) = ${'string'})`;
  }
}
