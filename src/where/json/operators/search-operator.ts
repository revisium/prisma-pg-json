import { Prisma } from '@prisma/client';
import type { JsonFilter } from '../../../types';
import { BaseOperator } from './base-operator';

interface SearchContext {
  language: string;
  searchType: 'plain' | 'phrase';
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
    };
  }

  handleSpecialPath(fieldRef: Prisma.Sql, value: string): Prisma.Sql {
    const language = validateLanguage(this.context?.language || 'simple');
    const searchType = this.context?.searchType || 'plain';
    const queryFunc = searchType === 'phrase' ? 'phraseto_tsquery' : 'plainto_tsquery';

    return Prisma.sql`jsonb_to_tsvector(${Prisma.raw(`'${language}'`)}, ${fieldRef}, '["all"]') @@ ${Prisma.raw(queryFunc)}(${Prisma.raw(`'${language}'`)}, ${value})`;
  }

  generateCondition(
    fieldRef: Prisma.Sql,
    jsonPath: string,
    value: string,
    _isInsensitive: boolean,
  ): Prisma.Sql {
    const language = validateLanguage(this.context?.language || 'simple');
    const searchType = this.context?.searchType || 'plain';
    const queryFunc = searchType === 'phrase' ? 'phraseto_tsquery' : 'plainto_tsquery';

    const pathArray = this.parseJsonPathToArray(jsonPath);

    return Prisma.sql`jsonb_to_tsvector(${Prisma.raw(`'${language}'`)}, ${fieldRef} #> ${pathArray}::text[], '["all"]') @@ ${Prisma.raw(queryFunc)}(${Prisma.raw(`'${language}'`)}, ${value})`;
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
