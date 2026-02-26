import { createHash } from 'crypto';
import { JsonOrderByInput, OrderByPart } from '../types';
import { parseJsonPath } from '../utils/parseJsonPath';

interface CursorPayload {
  v: (string | number | boolean | null)[];
  t: string;
  h: string;
}

export function encodeCursor(
  values: (string | number | boolean | null)[],
  tiebreaker: string,
  sortHash: string,
): string {
  const payload: CursorPayload = { v: values, t: tiebreaker, h: sortHash };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): {
  values: (string | number | boolean | null)[];
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

    return { values: payload.v, tiebreaker: payload.t, sortHash: payload.h };
  } catch {
    return null;
  }
}

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
  return createHash('md5').update(key).digest('hex').substring(0, 16);
}

export function extractCursorValues(
  row: Record<string, unknown>,
  parts: OrderByPart[],
): (string | number | boolean | null)[] {
  return parts.map((part) => {
    if (part.isJson && part.jsonConfig) {
      return extractJsonValue(row[part.fieldName], part.jsonConfig);
    }
    const value = row[part.fieldName];
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value === null || value === undefined) {
      return null;
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    return String(value);
  });
}

function extractJsonValue(
  data: unknown,
  jsonConfig: JsonOrderByInput,
): string | number | boolean | null {
  if (data === null || data === undefined) {
    return null;
  }

  const pathSegments = parseJsonPath(jsonConfig.path);

  let current: unknown = data;
  for (const segment of pathSegments) {
    if (current === null || current === undefined) {
      return null;
    }
    if (segment === '*') {
      return null;
    }
    if (typeof current === 'object' && current !== null) {
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        if (isNaN(index)) {
          return null;
        }
        current = current[index];
      } else {
        current = (current as Record<string, unknown>)[segment];
      }
    } else {
      return null;
    }
  }

  if (current === null || current === undefined) {
    return null;
  }
  if (
    typeof current === 'string' ||
    typeof current === 'number' ||
    typeof current === 'boolean'
  ) {
    return current;
  }
  return null;
}
