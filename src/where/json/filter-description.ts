import type { JsonFilter } from '../../types';

export interface JsonPathDescription {
  isValid: boolean;
  isSpecialPath: boolean;
}

export function describeJsonPath(path: JsonFilter['path']): JsonPathDescription {
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

export function* describeJsonFilter(
  filter: JsonFilter,
): Generator<[key: string, value: unknown], void, undefined> {
  const entries = Object.entries(filter);

  for (const [key, value] of entries) {
    if (
      key === 'path' ||
      key === 'mode' ||
      key === 'searchLanguage' ||
      key === 'searchType' ||
      key === 'searchIn' ||
      value === undefined
    ) {
      continue;
    }

    yield [key, value];
  }
}

export function* describeSpecialPathFilter(
  filter: JsonFilter,
): Generator<[key: string, value: unknown], void, undefined> {
  const entries = Object.entries(filter);

  for (const [key, value] of entries) {
    if (key === 'path' || key === 'mode' || value === undefined) {
      continue;
    }

    yield [key, value];
  }
}
