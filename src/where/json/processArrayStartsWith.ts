import { Prisma } from '@prisma/client';

export function processArrayStartsWith(
  jsonbPath: Prisma.Sql,
  value: unknown,
  isInsensitive: boolean,
  _path: string[],
): Prisma.Sql {
  // array_starts_with checks if the first element of the array matches the given value
  // Value can be any JSON type: primitive, array, or object
  // Examples: array_starts_with: 1, array_starts_with: "admin", array_starts_with: ["nested"], array_starts_with: {value: 1}

  if (isInsensitive && typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    return Prisma.sql`(LOWER(((${jsonbPath})::jsonb)->>0) = ${lowerValue} AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'})`;
  }

  return Prisma.sql`(((${jsonbPath})::jsonb->0)::jsonb = ${JSON.stringify(value)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'})`;
}
