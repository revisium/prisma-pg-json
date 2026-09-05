import { parseJsonPath } from '../paths/json-path';

/**
 * Convert path to PostgreSQL JSON Path format
 *
 * @param path - JSON path as string or array
 * @returns PostgreSQL JSON Path string ($.path.format)
 *
 * @example
 * convertToJsonPath('user.profile.email') // '$.user.profile.email'
 * convertToJsonPath('items[0].name') // '$.items[0].name'
 * convertToJsonPath('products[*].tags') // '$.products[*].tags'
 * convertToJsonPath(['user', 'email']) // '$.user.email'
 * convertToJsonPath(['items', '0', 'name']) // '$.items[0].name'
 * convertToJsonPath(['products', '*', 'tags']) // '$.products[*].tags'
 */
export function convertToJsonPath(path: string | string[]): string {
  let normalizedPath: string[];

  if (typeof path === 'string') {
    if (path.startsWith('$.')) {
      return path;
    }

    if (!path || path.trim() === '') {
      throw new Error('JSON path cannot be empty');
    }

    if (path === '$') {
      throw new Error('Root path $ is not supported');
    }

    normalizedPath = parseJsonPath(path);
  } else {
    normalizedPath = path.map((segment) => {
      if (typeof segment === 'string' && /^-\d+$/.test(segment)) {
        const index = Number.parseInt(segment, 10);
        if (index === -1) {
          return 'last';
        } else {
          throw new Error(
            `Negative index ${index} is not supported yet. Only -1 (converted to 'last') is supported.`,
          );
        }
      }
      return segment;
    });
  }

  if (normalizedPath.length === 0) {
    throw new Error('JSON path cannot be empty');
  }

  return (
    '$.' +
    normalizedPath
      .map((segment) => {
        if (segment === '*') {
          return '[*]';
        }
        if (segment === 'last') {
          return '[last]';
        }
        if (/^-?\d+$/.test(segment)) {
          return `[${segment}]`;
        }
        return segment;
      })
      .join('.')
      .replaceAll('.[', '[')
  ); // Fix .[ to [
}

export function jsonPathToTextSegments(jsonPath: string): string[] {
  if (!jsonPath) return [];
  return parseJsonPath(jsonPath).map((segment) => (segment === 'last' ? '-1' : segment));
}
