import { Prisma } from '@prisma/client';

export function processArrayContains(
  jsonbPath: Prisma.Sql,
  value: unknown[],
  isInsensitive: boolean,
  _path: string[],
): Prisma.Sql {
  if (!Array.isArray(value)) {
    throw new Error(`processArrayContains: value must be an array, received ${typeof value}`);
  }

  if (value.length === 0) {
    throw new Error(`processArrayContains: value array cannot be empty`);
  }

  if (isInsensitive) {
    if (value.length > 1) {
      throw new Error(
        `processArrayContains: insensitive mode with multiple elements not supported yet`,
      );
    }
    if (typeof value[0] !== 'string') {
      throw new Error(
        `processArrayContains: insensitive search is only supported for strings, received ${typeof value[0]}`,
      );
    }
    const lowerValue = (value[0] as string).toLowerCase();
    return Prisma.sql`(JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'} AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text((${jsonbPath})::jsonb) AS elem
      WHERE LOWER(elem) = ${lowerValue}
    ))`;
  }

  // PostgreSQL @> checks if left array contains ALL right elements
  // array_contains: ['a', 'b'] → checks if array contains both 'a' AND 'b'
  return Prisma.sql`((${jsonbPath})::jsonb @> ${JSON.stringify(value)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'})`;
}
