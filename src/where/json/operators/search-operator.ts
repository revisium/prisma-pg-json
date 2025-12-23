import { Prisma, PrismaSql } from '../../../prisma-adapter';
import type { JsonFilter } from '../../../types';
import { BaseOperator } from './base-operator';

interface SearchContext {
  language: string;
  searchType: 'plain' | 'phrase' | 'prefix' | 'tsquery';
  searchIn: 'all' | 'values' | 'keys' | 'strings' | 'numbers' | 'booleans';
}

export const SEARCH_LANGUAGES = [
  'simple',
  'arabic',
  'armenian',
  'basque',
  'catalan',
  'danish',
  'dutch',
  'english',
  'finnish',
  'french',
  'german',
  'greek',
  'hindi',
  'hungarian',
  'indonesian',
  'irish',
  'italian',
  'lithuanian',
  'nepali',
  'norwegian',
  'portuguese',
  'romanian',
  'russian',
  'serbian',
  'spanish',
  'swedish',
  'tamil',
  'turkish',
  'yiddish',
] as const;

export type SearchLanguage = (typeof SEARCH_LANGUAGES)[number];

function validateLanguage(language: string): SearchLanguage {
  if (SEARCH_LANGUAGES.includes(language as SearchLanguage)) {
    return language as SearchLanguage;
  }
  throw new Error(
    `Invalid search language: ${language}. Allowed: ${SEARCH_LANGUAGES.join(', ')}`,
  );
}

function getSearchInParameter(
  searchIn: 'all' | 'values' | 'keys' | 'strings' | 'numbers' | 'booleans',
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
      const escaped = word.replace(/[&|!():*\\'"<>]/g, '');
      return escaped.length > 0 ? `${escaped}:*` : '';
    })
    .filter((term) => term.length > 0)
    .join(' & ');
}

function getQueryFuncAndValue(
  searchType: 'plain' | 'phrase' | 'prefix' | 'tsquery',
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
  private context?: SearchContext;

  validate(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  }

  preprocessValue(value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error('search requires a string value');
    }
    return value;
  }

  supportsSpecialPath(): boolean {
    return true;
  }

  setContext(filter: JsonFilter): void {
    const language = filter.searchLanguage || 'simple';
    validateLanguage(language);

    this.context = {
      language,
      searchType: filter.searchType || 'plain',
      searchIn: filter.searchIn || 'all',
    };
  }

  handleSpecialPath(fieldRef: PrismaSql, value: string): PrismaSql {
    const language = validateLanguage(this.context?.language || 'simple');
    const searchType = this.context?.searchType || 'plain';
    const searchIn = this.context?.searchIn || 'all';
    const { func, value: queryValue } = getQueryFuncAndValue(searchType, value);
    const searchInParam = getSearchInParameter(searchIn);

    return Prisma.sql`jsonb_to_tsvector(${Prisma.raw(`'${language}'`)}, ${fieldRef}, '${Prisma.raw(searchInParam)}') @@ ${Prisma.raw(func)}(${Prisma.raw(`'${language}'`)}, ${queryValue})`;
  }

  generateCondition(
    fieldRef: PrismaSql,
    jsonPath: string,
    value: string,
    _isInsensitive: boolean,
  ): PrismaSql {
    const language = validateLanguage(this.context?.language || 'simple');
    const searchType = this.context?.searchType || 'plain';
    const searchIn = this.context?.searchIn || 'all';
    const { func, value: queryValue } = getQueryFuncAndValue(searchType, value);
    const searchInParam = getSearchInParameter(searchIn);

    const pathArray = this.parseJsonPathToArray(jsonPath);

    return Prisma.sql`jsonb_to_tsvector(${Prisma.raw(`'${language}'`)}, ${fieldRef} #> ${pathArray}::text[], '${Prisma.raw(searchInParam)}') @@ ${Prisma.raw(func)}(${Prisma.raw(`'${language}'`)}, ${queryValue})`;
  }

  private parseJsonPathToArray(jsonPath: string): string[] {
    if (!jsonPath || jsonPath === '$') {
      return [];
    }

    const withoutDollar = jsonPath.startsWith('$.') ? jsonPath.substring(2) : jsonPath;

    return withoutDollar.split(/[.[\]]/).filter((s) => s !== '');
  }


  validatePath(_path: string[] | string): boolean {
    return true;
  }

  getErrorMessage(context: string): string {
    switch (context) {
      case 'validation failed':
        return 'search requires a non-empty string value';
      default:
        return super.getErrorMessage(context);
    }
  }
}
