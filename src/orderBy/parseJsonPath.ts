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

  if (currentPart) {
    pathParts.push(currentPart);
  }

  return pathParts;
}
