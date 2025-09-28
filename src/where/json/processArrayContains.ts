import { Prisma } from '@prisma/client';

export function processArrayContains(
  jsonbPath: Prisma.Sql,
  value: unknown,
  isInsensitive: boolean,
  _path: string[],
): Prisma.Sql {
  if (isInsensitive && typeof value !== 'string') {
    throw new Error(
      `processArrayContains: insensitive search is only supported for strings, received ${typeof value}`,
    );
  }

  // Case-insensitive for strings - use EXISTS with array elements
  if (isInsensitive) {
    const lowerValue = (value as string).toLowerCase();
    return Prisma.sql`(EXISTS (
      SELECT 1 FROM jsonb_array_elements_text((${jsonbPath})::jsonb) AS elem
      WHERE LOWER(elem) = ${lowerValue}
    ) AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'})`;
  }

  // For primitives: @> needs the value wrapped in array
  // For objects: @> also needs the value wrapped in array
  // PostgreSQL @> checks if left array contains right element(s)
  const wrappedValue =
    typeof value === 'object' && value !== null
      ? [value] // Objects must be wrapped in array for @> to work
      : [value]; // Primitives also wrapped for consistency
  return Prisma.sql`((${jsonbPath})::jsonb @> ${JSON.stringify(wrappedValue)}::jsonb AND JSONB_TYPEOF((${jsonbPath})::jsonb) = ${'array'})`;
}
