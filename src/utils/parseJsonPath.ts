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
        const index = parseInt(segment, 10);
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
      .replace(/\.\[/g, '[')
  ); // Fix .[ to [
}

function parseStringPath(path: string): string[] {
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

  const normalizedPath = trimmedPath.startsWith('$.') ? trimmedPath.substring(2) : trimmedPath;

  if (!normalizedPath.includes('.') && !normalizedPath.includes('[')) {
    return [normalizedPath];
  }

  const pathParts: string[] = [];
  let currentPart = '';
  let inBrackets = false;
  let bracketContent = '';

  for (let i = 0; i < normalizedPath.length; i++) {
    const char = normalizedPath[i];

    if (char === '[') {
      if (currentPart) {
        pathParts.push(currentPart);
        currentPart = '';
      }
      inBrackets = true;
      bracketContent = '';
    } else if (char === ']') {
      if (inBrackets) {
        if (/^-\d+$/.test(bracketContent)) {
          const index = parseInt(bracketContent, 10);
          if (index === -1) {
            pathParts.push('last');
          } else {
            throw new Error(
              `Negative index ${index} is not supported yet. Only -1 (converted to 'last') is supported.`,
            );
          }
        } else {
          pathParts.push(bracketContent);
        }
        inBrackets = false;
        bracketContent = '';
      }
    } else if (char === '.' && !inBrackets) {
      if (currentPart) {
        pathParts.push(currentPart);
        currentPart = '';
      }
    } else {
      if (inBrackets) {
        bracketContent += char;
      } else {
        currentPart += char;
      }
    }
  }

  if (inBrackets) {
    throw new Error('Unclosed bracket in JSON path');
  }

  if (currentPart) {
    pathParts.push(currentPart);
  }

  return pathParts;
}

export function parseJsonPath(path: string | string[]): string[] {
  if (Array.isArray(path)) {
    return path;
  }
  return parseStringPath(path);
}

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
        return `["${segment.replace(/"/g, '\\"')}"]`;
      }
      return segment;
    })
    .join('.')
    .replace(/\.\[/g, '[');
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
