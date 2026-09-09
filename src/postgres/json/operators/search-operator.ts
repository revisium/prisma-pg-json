import { Prisma, PrismaSql } from '../../../prisma-adapter';
import type { JsonFilter } from '../../../types';
import { extractSearchContext, type SearchContext } from '../../../where/json/search-description';
import { prepareJsonString, isNonEmptyJsonString } from '../../../where/json/string-description';
import { BaseOperator } from './base-operator';

function getSearchInParameter(
  searchIn: SearchContext['searchIn'],
): string {
  switch (searchIn) {
    case 'all':
      return '["all"]';
    case 'values':
      return '["string", "numeric", "boolean"]';
    case 'keys':
      return '["key"]';
    case 'strings':
      return '["string"]';
    case 'numbers':
      return '["numeric"]';
    case 'booleans':
      return '["boolean"]';
  }
}

function toPrefixQuery(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => {
      const escaped = word.replaceAll(/[&|!():*\\'"<>]/g, '');
      return escaped.length > 0 ? `${escaped}:*` : '';
    })
    .filter((term) => term.length > 0)
    .join(' & ');
}

function getQueryFuncAndValue(
  searchType: SearchContext['searchType'],
  value: string,
): { func: string; value: string } {
  switch (searchType) {
    case 'phrase':
      return { func: 'phraseto_tsquery', value };
    case 'prefix':
      return { func: 'to_tsquery', value: toPrefixQuery(value) };
    case 'tsquery':
      return { func: 'to_tsquery', value };
    case 'plain':
    default:
      return { func: 'plainto_tsquery', value };
  }
}

export class SearchOperator extends BaseOperator<string> {
  readonly key = 'search';

  validate(value: string): boolean {
    return isNonEmptyJsonString(value);
  }

  preprocessValue(value: unknown): string {
    return prepareJsonString(value, 'search');
  }

  supportsSpecialPath(): boolean {
    return true;
  }

  execute(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: unknown,
    isInsensitive: boolean,
    isSpecialPath: boolean = false,
    filter?: JsonFilter,
  ): PrismaSql {
    const processedValue = this.preprocessValue(value);

    if (!this.validate(processedValue)) {
      throw new Error(this.getErrorMessage('validation failed'));
    }

    const ctx = extractSearchContext(filter);

    if (isSpecialPath) {
      return this.buildSearchSql(fieldRef, null, processedValue, ctx);
    }

    return this.buildSearchSql(fieldRef, jsonPath, processedValue, ctx);
  }

  handleSpecialPath(fieldRef: PrismaSql, value: string): PrismaSql {
    return this.buildSearchSql(fieldRef, null, value, extractSearchContext());
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: string,
    _isInsensitive: boolean,
  ): PrismaSql {
    return this.buildSearchSql(fieldRef, jsonPath, value, extractSearchContext());
  }

  private buildSearchSql(
    fieldRef: PrismaSql,
    jsonPath: string | null,
    value: string,
    ctx: SearchContext,
  ): PrismaSql {
    const { language, searchType, searchIn } = ctx;
    const { func, value: queryValue } = getQueryFuncAndValue(searchType, value);
    const searchInParam = getSearchInParameter(searchIn);
    const langLiteral = Prisma.raw("'" + language + "'");

    if (jsonPath === null) {
      return Prisma.sql`jsonb_to_tsvector(${langLiteral}, ${fieldRef}, '${Prisma.raw(searchInParam)}') @@ ${Prisma.raw(func)}(${langLiteral}, ${queryValue})`;
    }

    const pathArray = this.parseJsonPathToArray(jsonPath);

    return Prisma.sql`jsonb_to_tsvector(${langLiteral}, ${fieldRef} #> ${pathArray}::text[], '${Prisma.raw(searchInParam)}') @@ ${Prisma.raw(func)}(${langLiteral}, ${queryValue})`;
  }

  private parseJsonPathToArray(jsonPath: string): string[] {
    if (!jsonPath || jsonPath === '$') {
      return [];
    }

    const withoutDollar = jsonPath.startsWith('$.') ? jsonPath.substring(2) : jsonPath;

    return withoutDollar.split(/[.[\]]/).filter((s) => s !== '');
  }

  getErrorMessage(context: string): string {
    if (context === 'validation failed') {
      return 'search requires a non-empty string value';
    }
    return super.getErrorMessage(context);
  }
}
