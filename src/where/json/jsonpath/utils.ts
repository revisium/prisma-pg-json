import { Prisma } from '@prisma/client';

export function generateJsonbValue(value: unknown): Prisma.Sql {
  if (typeof value === 'string') {
    return Prisma.sql`to_jsonb(${value}::text)`;
  } else if (typeof value === 'number') {
    return Prisma.sql`to_jsonb(${value}::numeric)`;
  } else if (typeof value === 'boolean') {
    return Prisma.sql`to_jsonb(${value}::boolean)`;
  } else if (value === null) {
    return Prisma.sql`'null'::jsonb`;
  } else if (Array.isArray(value)) {
    return Prisma.sql`${JSON.stringify(value)}::jsonb`;
  } else {
    return Prisma.sql`${JSON.stringify(value)}::jsonb`;
  }
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getComparisonOperator(operator: string): string {
  switch (operator) {
    case 'equals':
      return '==';
    case 'not':
      return '!=';
    case 'gt':
      return '>';
    case 'gte':
      return '>=';
    case 'lt':
      return '<';
    case 'lte':
      return '<=';
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}
