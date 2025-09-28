/**
 * Parse JSON Path string or array into normalized array format
 *
 * @param path - JSON path as string or array
 * @returns Normalized path array
 *
 * @example
 * parseJsonPath('user.profile.email') // ['user', 'profile', 'email']
 * parseJsonPath('items[0].name') // ['items', '0', 'name']
 * parseJsonPath('products[*].tags') // ['products', '*', 'tags']
 * parseJsonPath(['user', 'email']) // ['user', 'email'] (unchanged)
 */
export function parseJsonPath(path: string | string[]): string[] {
  if (Array.isArray(path)) {
    return path;
  }

  if (!path || path.trim() === '') {
    throw new Error('JSON path cannot be empty');
  }

  let normalizedPath = path;

  if (normalizedPath.startsWith('$.')) {
    normalizedPath = normalizedPath.substring(2);
  } else if (normalizedPath === '$') {
    throw new Error('Root path $ is not supported');
  }

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
        if (bracketContent === '-1') {
          pathParts.push('-1');
        } else if (bracketContent === '*') {
          pathParts.push('*');
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

  // Check for unclosed brackets
  if (inBrackets) {
    throw new Error('Unclosed bracket in JSON path');
  }

  if (currentPart) {
    pathParts.push(currentPart);
  }

  return pathParts;
}

/**
 * Convert array path back to JSON Path string format
 *
 * @param pathArray - Array of path segments
 * @returns JSON path string
 *
 * @example
 * arrayToJsonPath(['user', 'email']) // 'user.email'
 * arrayToJsonPath(['items', '0', 'name']) // 'items[0].name'
 * arrayToJsonPath(['products', '*', 'tags']) // 'products[*].tags'
 * arrayToJsonPath(['items', '-1']) // 'items[-1]'
 */
export function arrayToJsonPath(pathArray: string[]): string {
  return pathArray
    .map((segment) => {
      // Handle numeric indices (including negative)
      if (/^-?\d+$/.test(segment)) {
        return `[${segment}]`;
      }
      // Handle wildcards
      if (segment === '*') {
        return '[*]';
      }
      // Handle segments that need bracket notation (contain dots, brackets, or quotes)
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
