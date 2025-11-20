import { Prisma, PrismaSql } from '../../../prisma-adapter';
import type { JsonFilter } from '../../../types';
import { BaseOperator } from './base-operator';

interface SearchContext {
  language: string;
  searchType: 'plain' | 'phrase';
  searchIn: 'all' | 'values' | 'keys' | 'strings' | 'numbers' | 'booleans';
}

const ALLOWED_LANGUAGES = [
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

type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number];

function validateLanguage(language: string): AllowedLanguage {
  if (ALLOWED_LANGUAGES.includes(language as AllowedLanguage)) {
    return language as AllowedLanguage;
  }
  throw new Error(
    `Invalid search language: ${language}. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`,
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
    const queryFunc = searchType === 'phrase' ? 'phraseto_tsquery' : 'plainto_tsquery';
    const searchInParam = getSearchInParameter(searchIn);

    return Prisma.sql`jsonb_to_tsvector(${Prisma.raw(`'${language}'`)}, ${fieldRef}, '${Prisma.raw(searchInParam)}') @@ ${Prisma.raw(queryFunc)}(${Prisma.raw(`'${language}'`)}, ${value})`;
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
    const queryFunc = searchType === 'phrase' ? 'phraseto_tsquery' : 'plainto_tsquery';
    const searchInParam = getSearchInParameter(searchIn);

    const pathArray = this.parseJsonPathToArray(jsonPath);

    return Prisma.sql`jsonb_to_tsvector(${Prisma.raw(`'${language}'`)}, ${fieldRef} #> ${pathArray}::text[], '${Prisma.raw(searchInParam)}') @@ ${Prisma.raw(queryFunc)}(${Prisma.raw(`'${language}'`)}, ${value})`;
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
