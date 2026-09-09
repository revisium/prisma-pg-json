import type { JsonFilter } from '../../types';

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

export type SearchContext = {
  language: SearchLanguage;
  searchType: 'plain' | 'phrase' | 'prefix' | 'tsquery';
  searchIn: 'all' | 'values' | 'keys' | 'strings' | 'numbers' | 'booleans';
};

function validateLanguage(language: string): SearchLanguage {
  if (SEARCH_LANGUAGES.includes(language as SearchLanguage)) {
    return language as SearchLanguage;
  }
  throw new Error(`Invalid search language: ${language}. Allowed: ${SEARCH_LANGUAGES.join(', ')}`);
}

export function extractSearchContext(filter?: JsonFilter): SearchContext {
  const language = validateLanguage(filter?.searchLanguage || 'simple');
  return {
    language,
    searchType: filter?.searchType || 'plain',
    searchIn: filter?.searchIn || 'all',
  };
}
