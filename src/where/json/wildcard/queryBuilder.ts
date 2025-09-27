import { Prisma } from '@prisma/client';
import { PathContext } from './types';

/**
 * Build EXISTS query for single wildcard operations
 */
export function buildSingleWildcardQuery(pathContext: PathContext, condition: string): Prisma.Sql {
  const { arrayPathExpr } = pathContext;

  return Prisma.raw(`EXISTS (
    SELECT 1
    FROM jsonb_array_elements(${arrayPathExpr}) AS elem
    WHERE ${condition}
  )`);
}

/**
 * Build nested EXISTS query for double wildcard operations
 */
export function buildNestedWildcardQuery(pathContext: PathContext, condition: string): Prisma.Sql {
  const { arrayPathExpr, nestedArrayPath } = pathContext;

  if (!nestedArrayPath) {
    throw new Error('Nested array path is required for nested wildcard queries');
  }

  return Prisma.raw(`EXISTS (
    SELECT 1
    FROM jsonb_array_elements(${arrayPathExpr}) AS elem
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements(${nestedArrayPath}) AS nested_elem
      WHERE ${condition}
    )
  )`);
}
