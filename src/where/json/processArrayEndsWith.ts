import { Prisma } from '@prisma/client';

export function processArrayEndsWith(
  jsonbPath: Prisma.Sql,
  value: unknown,
  isInsensitive: boolean,
  _path: string[],
): Prisma.Sql {
  // array_ends_with checks if the last element of the array matches the given value
  // Value can be any JSON type: primitive, array, or object
  // Examples: array_ends_with: 1, array_ends_with: "react", array_ends_with: ["nested"], array_ends_with: {value: 1}

  if (isInsensitive && typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    return Prisma.sql`(LOWER(((${jsonbPath})::jsonb)->>-1) = ${lowerValue} AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'})`;
  }

  return Prisma.sql`(((${jsonbPath})::jsonb->-1)::jsonb = ${JSON.stringify(value)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'})`;
}
