import { Prisma } from '@prisma/client';
import { OrderByPart } from '../../types';

export function regularPart(
  fieldName: string,
  direction: 'ASC' | 'DESC',
): OrderByPart {
  return {
    expression: Prisma.sql`${Prisma.raw('r."' + fieldName + '"')}`,
    direction,
    fieldName,
    isJson: false,
  };
}

export function jsonPart(
  fieldName: string,
  path: string,
  type: 'text' | 'int' | 'float',
  direction: 'ASC' | 'DESC',
): OrderByPart {
  const dirStr = direction.toLowerCase() as 'asc' | 'desc';
  return {
    expression: Prisma.sql`${Prisma.raw('(r."' + fieldName + '"#>>\'{' + path + '}\')::' + type)}`,
    direction,
    fieldName,
    isJson: true,
    jsonConfig: { path, type, direction: dirStr },
  };
}
