import { createHash } from 'node:crypto';
import { JsonOrderByInput, OrderByPart, CursorValue } from '../types';
import { parseJsonPath } from '../utils/parseJsonPath';

interface CursorPayload {
  v: CursorValue[];
  t: string;
  h: string;
}

/**
 * Encode cursor values into an opaque base64url string for keyset pagination.
 *
 * @param values - Sort column values extracted from the last row
 * @param tiebreaker - Unique row identifier (e.g., versionId) for deterministic ordering
 * @param sortHash - Hash from `computeSortHash()` to detect sort order changes
 * @returns Opaque cursor string to pass as `after` parameter
 */
export function encodeCursor(values: CursorValue[], tiebreaker: string, sortHash: string): string {
  const payload: CursorPayload = { v: values, t: tiebreaker, h: sortHash };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decode an opaque cursor string back into its components.
 *
 * Returns null for invalid or malformed cursors (never throws).
 *
 * @param cursor - Opaque cursor string from `encodeCursor()`
 * @returns Decoded values, tiebreaker, and sortHash, or null if invalid
 */
export function decodeCursor(cursor: string): {
  values: CursorValue[];
  tiebreaker: string;
  sortHash: string;
} | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as CursorPayload;

    if (
      !payload ||
      !Array.isArray(payload.v) ||
      typeof payload.t !== 'string' ||
      typeof payload.h !== 'string'
    ) {
      return null;
    }

    if (!payload.v.every(isValidCursorValue)) {
      return null;
    }

    return { values: payload.v, tiebreaker: payload.t, sortHash: payload.h };
  } catch {
    return null;
  }
}

function isValidCursorValue(value: unknown): value is CursorValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Compute a SHA256-based hash of the sort configuration.
 *
 * Used to detect when the sort order changes between pagination pages.
 * If the hash from a decoded cursor doesn't match the current sort,
 * the cursor should be rejected.
 *
 * @param parts - OrderByPart array from `generateOrderByParts()`
 * @returns 16-character hex hash string
 */
export function computeSortHash(parts: OrderByPart[]): string {
  const key = parts
    .map((p) => {
      if (p.isJson && p.jsonConfig) {
        const path = Array.isArray(p.jsonConfig.path)
          ? p.jsonConfig.path.join('.')
          : p.jsonConfig.path;
        return `${p.fieldName}:json:${path}:${p.jsonConfig.type || 'text'}:${p.jsonConfig.aggregation || ''}:${p.direction}`;
      }
      return `${p.fieldName}:${p.direction}`;
    })
    .join('|');
  return createHash('sha256').update(key).digest('hex').substring(0, 16);
}

/**
 * Extract cursor values from a result row based on the sort configuration.
 *
 * For JSON fields, walks the JSON data using the configured path.
 * Array aggregations are evaluated for scalar first/last and numeric min/max.
 * AVG is extracted only for safe integer inputs with an exact binary average.
 * Database-dependent aggregates require projecting OrderByPart.expression in SQL
 * and passing its value to encodeCursor instead.
 *
 * @param row - Result row object
 * @param parts - OrderByPart array from `generateOrderByParts()`
 * @returns Array of cursor values matching the sort columns
 */
export function extractCursorValues(
  row: Record<string, unknown>,
  parts: OrderByPart[],
): CursorValue[] {
  return parts.map((part) => {
    if (part.isJson && part.jsonConfig) {
      return extractJsonValue(row[part.fieldName], part.jsonConfig);
    }
    return toCursorValue(row[part.fieldName]);
  });
}

function toCursorValue(value: unknown): CursorValue {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
}

function extractJsonValue(data: unknown, jsonConfig: JsonOrderByInput): CursorValue {
  if (data === null || data === undefined) {
    return null;
  }

  const pathSegments = jsonConfig.path === '$' ? [] : parseJsonPath(jsonConfig.path);
  if (!jsonConfig.aggregation) {
    return toCursorValue(resolveJsonPath(data, pathSegments));
  }

  if (pathSegments.some((segment) => /[.[\]"\\]/.test(segment))) {
    throw new Error('Automatic aggregate cursor extraction requires unambiguous path segments.');
  }

  const wildcard = pathSegments.indexOf('*');
  const arrayPath = wildcard < 0 ? pathSegments : pathSegments.slice(0, wildcard);
  const elementPath = wildcard < 0 ? [] : pathSegments.slice(wildcard + 1);
  if (elementPath.includes('*')) {
    throw new Error(
      'Automatic aggregate cursor extraction supports at most one wildcard. Nested-wildcard aggregation requires a supported SQL ordering expression.',
    );
  }
  const array = resolveJsonPath(data, arrayPath);
  if (array === null || array === undefined) {
    return null;
  }
  if (!Array.isArray(array)) {
    throw projectedCursorRequired();
  }
  if (array.length === 0) {
    return null;
  }
  const { aggregation, type = 'text' } = jsonConfig;
  if (aggregation === 'first' || aggregation === 'last') {
    const element = array[aggregation === 'first' ? 0 : array.length - 1];
    return castCursorValue(resolveJsonPath(element, elementPath), type);
  }

  if (type !== 'int' && type !== 'float') {
    throw projectedCursorRequired();
  }

  const values = array
    .map((element) => castCursorValue(resolveJsonPath(element, elementPath), type))
    .filter((value): value is Exclude<CursorValue, null> => value !== null);
  if (values.length === 0) {
    return null;
  }
  if (aggregation === 'avg') {
    return exactAverage(values.map(Number));
  }
  return values.reduce((selected, value) => {
    const smaller = value < selected;
    return (aggregation === 'min' ? smaller : value > selected) ? value : selected;
  });
}

function projectedCursorRequired(): Error {
  return new Error(
    'Cannot extract this aggregate cursor exactly in JavaScript. Project the OrderByPart.expression in SQL and pass its database value to encodeCursor().',
  );
}

function exactAverage(values: number[]): number {
  let sum = 0;
  for (const value of values) {
    sum += value;
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(sum)) {
      throw projectedCursorRequired();
    }
  }
  // After removing powers of two, the denominator must divide the numerator
  // for the average to have an exact binary floating-point representation.
  let denominator = values.length;
  while (denominator % 2 === 0) {
    denominator /= 2;
  }
  if (sum % denominator !== 0) {
    throw projectedCursorRequired();
  }
  return sum / values.length;
}

function castCursorValue(value: unknown, type: JsonOrderByInput['type']): CursorValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    throw projectedCursorRequired();
  }
  if (type === 'int' || type === 'float') {
    if (typeof value !== 'number' && typeof value !== 'string') {
      throw projectedCursorRequired();
    }
    if (
      typeof value === 'string' &&
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
    ) {
      throw projectedCursorRequired();
    }
    if (type === 'int' && typeof value === 'string' && !/^[+-]?\d+$/.test(value.trim())) {
      throw projectedCursorRequired();
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || String(value).trim() === '') {
      throw projectedCursorRequired();
    }
    if (type === 'float') {
      return numeric;
    }
    // JSON parsing may already have rounded a database decimal across a half
    // boundary. Only PostgreSQL can safely cast fractional JSON numbers to int.
    if (!Number.isInteger(numeric) || numeric < -2147483648 || numeric > 2147483647) {
      throw projectedCursorRequired();
    }
    return numeric;
  }
  if (type === 'boolean') {
    const text = String(value).trim().toLowerCase();
    if (['true', 't', 'yes', 'y', 'on', '1'].includes(text)) return true;
    if (['false', 'f', 'no', 'n', 'off', '0'].includes(text)) return false;
    throw projectedCursorRequired();
  }
  if (typeof value !== 'string' && !(type === 'text' && typeof value === 'boolean')) {
    throw projectedCursorRequired();
  }
  return String(value);
}

function resolveJsonPath(data: unknown, pathSegments: string[]): unknown {
  let current: unknown = data;

  for (const segment of pathSegments) {
    if (current === null || current === undefined || segment === '*') {
      return null;
    }
    if (typeof current !== 'object') {
      return null;
    }
    if (Array.isArray(current)) {
      if (segment !== 'last' && !/^-?\d+$/.test(segment)) {
        return null;
      }
      const index = segment === 'last' ? -1 : Number(segment);
      current = current[index < 0 ? current.length + index : index];
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }

  return current;
}
