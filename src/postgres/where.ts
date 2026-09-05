import { Prisma, PrismaSql } from '../prisma-adapter';
import type { FieldConfig, FieldType, GenerateWhereParams, JsonFilter } from '../types';
import { describeFilter } from '../where/filter-description';
import { generateStringFilter } from '../where/string';
import { generateNumberFilter } from '../where/number';
import { generateBooleanFilter } from '../where/boolean';
import { generateDateFilter } from '../where/date';
import { generateJsonFilter } from '../where/json/json-filter';
import { resolveFieldType } from '../utils/field-config';
import { quoteIdentifier } from './identifiers';

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
      return generateStringFilter(fieldRef, value as string);
    case 'number':
      return generateNumberFilter(fieldRef, value as number);
    case 'boolean':
      return generateBooleanFilter(fieldRef, value as boolean);
    case 'date':
      return generateDateFilter(fieldRef, value as string | Date);
    case 'json':
      return generateJsonFilter(fieldRef, value as JsonFilter, fieldName, tableAlias);
    default:
      throw new Error(`Unsupported field type: ${fieldType}`);
  }
}
