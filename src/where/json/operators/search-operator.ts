import { Prisma } from '@prisma/client';
import type { JsonFilter } from '../../../types';
import { BaseOperator } from './base-operator';

interface SearchContext {
  language: string;
  searchType: 'plain' | 'phrase';
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
    this.context = {
      language: filter.searchLanguage || 'simple',
      searchType: filter.searchType || 'plain',
    };
  }

  handleSpecialPath(fieldRef: Prisma.Sql, value: string): Prisma.Sql {
    const language = this.context?.language || 'simple';
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
    const language = this.context?.language || 'simple';
    const searchType = this.context?.searchType || 'plain';
    const queryFunc = searchType === 'phrase' ? 'phraseto_tsquery' : 'plainto_tsquery';

    const pathArray = this.parseJsonPathToArray(jsonPath);
    const postgresPath = this.convertToPostgresPath(pathArray);

    return Prisma.sql`jsonb_to_tsvector(${Prisma.raw(`'${language}'`)}, ${fieldRef} #> ${Prisma.raw(postgresPath)}::text[], '["all"]') @@ ${Prisma.raw(queryFunc)}(${Prisma.raw(`'${language}'`)}, ${value})`;
  }

  private parseJsonPathToArray(jsonPath: string): string[] {
    if (!jsonPath || jsonPath === '$') {
      return [];
    }

    const withoutDollar = jsonPath.startsWith('$.') ? jsonPath.substring(2) : jsonPath;

    return withoutDollar.split(/[.[\]]/).filter((s) => s !== '');
  }

  private convertToPostgresPath(pathArray: string[]): string {
    if (pathArray.length === 0) {
      return "'{}'";
    }

    const quotedSegments = pathArray.map((segment) => {
      if (segment === '*' || segment === 'last') {
        return segment;
      }
      return segment;
    });

    return `'{${quotedSegments.join(',')}}'`;
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
