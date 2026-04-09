import { Prisma, PrismaSql } from '../prisma-adapter';

export function getEmptyCteSelect(): PrismaSql {
  return Prisma.sql`SELECT NULL as "tableId", NULL as "tableVersionId", NULL as "rowId", NULL as "rowVersionId", NULL as "fieldPath", NULL as "data" WHERE false`;
}

export function unquoteSegment(segment: string): string {
  if (segment.startsWith('"') && segment.endsWith('"')) {
    return segment.slice(1, -1);
  }
  return segment;
}

export function unquotePath(path: string): string {
  return path.split('.').map(unquoteSegment).join('.');
}

export function buildPathAccess(base: PrismaSql, path: string): PrismaSql {
  const segments = path.split('.');
  let result = base;
  for (const segment of segments) {
    result = Prisma.sql`${result}->${unquoteSegment(segment)}`;
  }
  return result;
}

export function buildJsonPathAccess(path: string): PrismaSql {
  return buildPathAccess(Prisma.sql`r."data"`, path);
}

export function buildItemJsonPathAccess(itemPath: string): PrismaSql {
  return buildPathAccess(Prisma.sql`arr.elem`, itemPath);
}

export function getColumnRef(column: string, tableAlias?: string): PrismaSql {
  if (tableAlias) {
    return Prisma.sql`${Prisma.raw(tableAlias)}."${Prisma.raw(column)}"`;
  }
  return Prisma.sql`"${Prisma.raw(column)}"`;
}
