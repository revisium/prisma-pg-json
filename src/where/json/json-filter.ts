import { Prisma } from '@prisma/client';
import type { JsonFilter } from '../../types';
import { convertToJsonPath } from '../../utils/parseJsonPath';
import { OperatorManager } from './operator-manager';

interface PathValidationResult {
  isValid: boolean;
  isSpecialPath: boolean;
}

function validatePath(path: JsonFilter['path']): PathValidationResult {
  if ((Array.isArray(path) && path.length === 0) || path === '') {
    return {
      isValid: true,
      isSpecialPath: true,
    };
  }

  if (typeof path === 'string' && path.includes('..')) {
    return {
      isValid: false,
      isSpecialPath: false,
    };
  }

  return {
    isValid: true,
    isSpecialPath: false,
  };
}

const operatorManager = new OperatorManager();

export function generateJsonFilter(
  fieldRef: Prisma.Sql,
  filter: JsonFilter,
  fieldName: string,
  _tableAlias: string,
): Prisma.Sql {
  const pathValidation = validatePath(filter.path);
  if (!pathValidation.isValid) {
    throw new Error('Invalid path');
  }

  if (pathValidation.isSpecialPath) {
    if (!operatorManager.supportsSpecialPath(filter)) {
      throw new Error('No operators in filter support empty path operations');
    }

    const conditions = operatorManager.processFilter(
      fieldRef,
      '',
      filter,
      filter.mode === 'insensitive',
      true,
    );

    return combineConditions(conditions, fieldName);
  }

  const jsonPath = convertToJsonPath(filter.path);

  const isInsensitive = filter.mode === 'insensitive';
  const conditions = operatorManager.processFilter(
    fieldRef,
    jsonPath,
    filter,
    isInsensitive,
    false,
  );

  return combineConditions(conditions, fieldName);
}

function combineConditions(conditions: Prisma.Sql[], fieldName: string): Prisma.Sql {
  if (conditions.length === 0) {
    throw new Error(`No valid operations found for field: ${fieldName}`);
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.sql`(${Prisma.join(conditions, ' AND ')})`;
}
