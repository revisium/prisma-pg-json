import { Prisma } from '@prisma/client';

export function processEquals(
  jsonbPath: Prisma.Sql,
  jsonTextPath: Prisma.Sql,
  value: unknown,
  path: string[],
  isInsensitive: boolean = false,
): Prisma.Sql {
  // For empty path (meta field operations), compare entire JSONB object
  if (path.length === 0) {
    return Prisma.sql`${jsonbPath}::jsonb = ${JSON.stringify(value)}::jsonb`;
  }

  // For objects with non-empty path, use JSONB comparison
  if (typeof value === 'object' && value !== null) {
    return Prisma.sql`(${jsonbPath})::jsonb = ${JSON.stringify(value)}::jsonb`;
  }

  // For primitive values, use text comparison
  const stringValue = String(value);

  if (isInsensitive && typeof value === 'string') {
    return Prisma.sql`LOWER(${jsonTextPath}) = LOWER(${stringValue})`;
  }

  return Prisma.sql`${jsonTextPath} = ${stringValue}`;
}
