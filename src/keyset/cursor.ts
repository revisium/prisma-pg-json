import { createHash } from 'node:crypto';
import { JsonOrderByInput, OrderByPart, CursorValue } from '../types';
import { parseJsonPath } from '../utils/parseJsonPath';

interface CursorPayload {
  v: CursorValue[];
  t: string;
  h: string;
}

export function encodeCursor(
  values: CursorValue[],
  tiebreaker: string,
  sortHash: string,
): string {
  const payload: CursorPayload = { v: values, t: tiebreaker, h: sortHash };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

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
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
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
  return createHash('sha256').update(key).digest('hex').substring(0, 16);
}

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
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return null;
}

function extractJsonValue(
  data: unknown,
  jsonConfig: JsonOrderByInput,
): CursorValue {
  if (data === null || data === undefined) {
    return null;
  }

  const pathSegments = parseJsonPath(jsonConfig.path);
  const resolved = resolveJsonPath(data, pathSegments);
  return toCursorValue(resolved);
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
      const index = Number.parseInt(segment, 10);
      if (Number.isNaN(index)) {
        return null;
      }
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }

  return current;
}
