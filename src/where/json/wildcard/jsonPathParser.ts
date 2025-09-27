/**
 * Parse JSON Path string into array format with wildcard support
 *
 * Examples:
 * - "name" → ["name"]
 * - "user.profile.email" → ["user", "profile", "email"]
 * - "products[*].name" → ["products", "*", "name"]
 * - "orders[*].items[*].price" → ["orders", "*", "items", "*", "price"]
 * - "data.products[0].tags[*]" → ["data", "products", "0", "tags", "*"]
 */
export function parseJsonPath(path: string): string[] {
  if (!path || typeof path !== 'string') {
    throw new Error('JSON Path must be a non-empty string');
  }

  // Replace array notation with dot notation for easier parsing
  // "products[*].name" → "products.*. name"
  // "products[0].name" → "products.0.name"
  const normalizedPath = path
    .replace(/\[([^\]]+)\]/g, '.$1') // Convert [*] to .*
    .replace(/^\./, ''); // Remove leading dot if present

  // Split by dots and filter empty segments
  const segments = normalizedPath.split('.').filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    throw new Error('JSON Path resulted in empty segments');
  }

  return segments;
}

/**
 * Convert array path back to JSON Path string format
 */
export function arrayToJsonPath(pathArray: string[]): string {
  return pathArray
    .map((segment) => {
      // Convert numeric indices back to array notation
      if (/^\d+$/.test(segment)) {
        return `[${segment}]`;
      }
      // Convert wildcards back to array notation
      if (segment === '*') {
        return '[*]';
      }
      return segment;
    })
    .join('.')
    .replace(/\.\[/g, '['); // Fix ".["" to just "["
}

/**
 * Validate JSON Path string syntax
 */
export function validateJsonPath(path: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    const parsed = parseJsonPath(path);

    // Additional validation rules
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
