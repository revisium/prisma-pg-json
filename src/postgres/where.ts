import { Prisma, PrismaSql } from '../prisma-adapter';
import type { FieldConfig, FieldType, GenerateWhereParams, JsonFilter } from '../types';
import { describeFilter } from '../where/filter-description';
import { compileJsonFilter } from './json-filter';
import { resolveFieldType } from '../utils/field-config';
import { quoteIdentifier } from './identifiers';
import { compileNumberFilter } from './number-filter';
import { compileBooleanFilter } from './boolean-filter';
import { compileStringFilter } from './string-filter';
import { compileDateFilter } from './date-filter';

export function compileWhere<TConfig extends FieldConfig = FieldConfig>(
  params: GenerateWhereParams<TConfig>,
): PrismaSql {
  const { where, fieldConfig, tableAlias } = params;
  const conditions: PrismaSql[] = [];

  for (const clause of describeFilter(where)) {
    if (clause.kind === 'field') {
      const fieldType = resolveFieldType(clause.fieldName, fieldConfig);
      const fieldRef = Prisma.sql`${Prisma.raw(tableAlias)}.${quoteIdentifier(clause.fieldName)}`;
      const condition = generateFieldCondition(
        fieldRef,
        clause.value,
        fieldType,
        clause.fieldName,
        tableAlias,
      );
      if (condition) conditions.push(condition);
    } else if (clause.kind === 'NOT') {
      const notClauses = clause.conditions.map(
        (cond) => Prisma.sql`NOT (${compileWhere({ where: cond, fieldConfig, tableAlias })})`,
      );
      conditions.push(Prisma.join(notClauses, ' AND '));
    } else {
      const groupConditions = clause.conditions.map((cond) =>
        compileWhere({ where: cond, fieldConfig, tableAlias }),
      );
      conditions.push(Prisma.sql`(${Prisma.join(groupConditions, ' ' + clause.kind + ' ')})`);
    }
  }

  if (conditions.length === 0) return Prisma.sql`TRUE`;
  if (conditions.length === 1) return conditions[0];
  return Prisma.join(conditions, ' AND ');
}

function generateFieldCondition(
  fieldRef: PrismaSql,
  value: unknown,
  fieldType: FieldType,
  fieldName: string,
  tableAlias: string,
): PrismaSql | null {
  switch (fieldType) {
    case 'string':
      return compileStringFilter(fieldRef, value as string);
    case 'number':
      return compileNumberFilter(fieldRef, value as number);
    case 'boolean':
      return compileBooleanFilter(fieldRef, value as boolean);
    case 'date':
      return compileDateFilter(fieldRef, value as string | Date);
    case 'json':
      return compileJsonFilter(fieldRef, value as JsonFilter, fieldName, tableAlias);
    default:
      throw new Error(`Unsupported field type: ${fieldType}`);
  }
}
