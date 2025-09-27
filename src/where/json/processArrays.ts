import { Prisma } from '@prisma/client';

export function processIn(
  jsonbPath: Prisma.Sql,
  jsonTextPath: Prisma.Sql,
  values: unknown[],
  _path: string[],
): Prisma.Sql {
  if (values.length === 0) {
    return Prisma.sql`FALSE`;
  }

  const conditions = values.map((value) => {
    // Use text comparison and convert primitive values to string
    // Use JSON.stringify for objects and arrays
    const stringValue =
      typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    return Prisma.sql`${jsonTextPath} = ${stringValue}`;
  });

  return Prisma.sql`(${Prisma.join(conditions, ' OR ')})`;
}

export function processNotIn(jsonbPath: Prisma.Sql, values: unknown[], _path: string[]): Prisma.Sql {
  if (values.length === 0) {
    return Prisma.sql`TRUE`;
  }

  const conditions = values.map(
    (value) => Prisma.sql`(${jsonbPath})::jsonb != ${JSON.stringify(value)}::jsonb`,
  );

  return Prisma.sql`(${Prisma.join(conditions, ' AND ')})`;
}
