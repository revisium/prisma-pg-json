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

    normalizedPath = parseStringPath(path);
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

function validatePathInput(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new Error('JSON path cannot be empty');
  }

  const trimmedPath = path.trim();
  if (!trimmedPath) {
    throw new Error('JSON path cannot be empty');
  }

  if (trimmedPath === '$') {
    throw new Error('Root path $ is not supported');
  }

  return trimmedPath;
}

function resolveBracketContent(bracketContent: string): string {
  if (/^-\d+$/.test(bracketContent)) {
    const index = Number.parseInt(bracketContent, 10);
    if (index === -1) {
      return 'last';
    }
    throw new Error(
      `Negative index ${index} is not supported yet. Only -1 (converted to 'last') is supported.`,
    );
  }
  return bracketContent;
}

interface PathParserState {
  pathParts: string[];
  currentPart: string;
  inBrackets: boolean;
  bracketContent: string;
}

function processPathChar(state: PathParserState, char: string): void {
  if (char === '[') {
    if (state.currentPart) {
      state.pathParts.push(state.currentPart);
      state.currentPart = '';
    }
    state.inBrackets = true;
    state.bracketContent = '';
  } else if (char === ']' && state.inBrackets) {
    state.pathParts.push(resolveBracketContent(state.bracketContent));
    state.inBrackets = false;
    state.bracketContent = '';
  } else if (char === '.' && !state.inBrackets) {
    if (state.currentPart) {
      state.pathParts.push(state.currentPart);
      state.currentPart = '';
    }
  } else if (state.inBrackets) {
    state.bracketContent += char;
  } else {
    state.currentPart += char;
  }
}

function parseStringPath(path: string): string[] {
  const trimmedPath = validatePathInput(path);

  const normalizedPath = trimmedPath.startsWith('$.') ? trimmedPath.substring(2) : trimmedPath;

  if (!normalizedPath.includes('.') && !normalizedPath.includes('[')) {
    return [normalizedPath];
  }

  const state: PathParserState = {
    pathParts: [],
    currentPart: '',
    inBrackets: false,
    bracketContent: '',
  };

  for (const char of normalizedPath) {
    processPathChar(state, char);
  }

  if (state.inBrackets) {
    throw new Error('Unclosed bracket in JSON path');
  }

  if (state.currentPart) {
    state.pathParts.push(state.currentPart);
  }

  return state.pathParts;
}

/**
 * Parse a JSON path string into an array of segments.
 *
 * If the input is already an array, returns it as-is.
 *
 * @param path - JSON path as string (`'user.name'`, `'items[0].price'`) or array
 * @returns Array of path segments
 *
 * @example
 * ```typescript
 * parseJsonPath('user.profile.name')    // ['user', 'profile', 'name']
 * parseJsonPath('items[0].price')       // ['items', '0', 'price']
 * parseJsonPath('tags[*].name')         // ['tags', '*', 'name']
 * parseJsonPath('items[-1]')            // ['items', 'last']
 * parseJsonPath(['already', 'parsed'])  // ['already', 'parsed']
 * ```
 */
export function parseJsonPath(path: string | string[]): string[] {
  if (Array.isArray(path)) {
    return path;
  }
  return parseStringPath(path);
}

/**
 * Convert an array of path segments back to a JSON path string.
 *
 * Inverse of `parseJsonPath()`. Numeric segments become bracket notation,
 * `*` becomes `[*]`, `last` becomes `[last]`.
 *
 * @param pathArray - Array of path segments
 * @returns JSON path string
 *
 * @example
 * ```typescript
 * arrayToJsonPath(['user', 'name'])        // 'user.name'
 * arrayToJsonPath(['items', '0', 'price']) // 'items[0].price'
 * arrayToJsonPath(['tags', '*', 'name'])   // 'tags[*].name'
 * ```
 */
export function arrayToJsonPath(pathArray: string[]): string {
  return pathArray
    .map((segment) => {
      if (segment === '*') return '[*]';
      if (segment === 'last') return '[last]';
      if (/^-?\d+$/.test(segment)) return `[${segment}]`;
      if (
        segment.includes('.') ||
        segment.includes('[') ||
        segment.includes(']') ||
        segment.includes('"')
      ) {
        const escaped = segment.replaceAll('"', String.raw`\"`);
        return `["${escaped}"]`;
      }
      return segment;
    })
    .join('.')
    .replaceAll('.[', '[');
}

/**
 * Validate JSON Path string syntax
 *
 * @param path - JSON path string to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateJsonPath('user.email') // { isValid: true }
 * validateJsonPath('items[0].name') // { isValid: true }
 * validateJsonPath('items[') // { isValid: false, error: 'Unclosed bracket in JSON path' }
 * validateJsonPath('') // { isValid: false, error: 'JSON path cannot be empty' }
 */
export function validateJsonPath(path: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    const parsed = parseJsonPath(path);

    if (parsed.some((segment) => segment.includes('[') || segment.includes(']'))) {
      return {
        isValid: false,
        error: 'Invalid bracket notation in parsed segments',
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}
