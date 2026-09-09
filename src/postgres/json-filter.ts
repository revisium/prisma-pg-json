import { Prisma, PrismaSql } from '../prisma-adapter';
import type { JsonFilter } from '../types';
import { describeJsonPath } from '../where/json/filter-description';
import { convertToJsonPath } from './json-path';
import { OperatorManager } from './json-operator-manager';

const operatorManager = new OperatorManager();

export function compileJsonFilter(
  fieldRef: PrismaSql,
  filter: JsonFilter,
  fieldName: string,
  _tableAlias: string,
): PrismaSql {
  const pathValidation = describeJsonPath(filter.path);
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

function combineConditions(conditions: PrismaSql[], fieldName: string): PrismaSql {
  if (conditions.length === 0) {
    throw new Error(`No valid operations found for field: ${fieldName}`);
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.sql`(${Prisma.join(conditions, ' AND ')})`;
}
