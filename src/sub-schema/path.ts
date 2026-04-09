export interface ParsedPath {
  isArray: boolean;
  segments: PathSegment[];
}

export interface PathSegment {
  path: string;
  isArray: boolean;
}

export function parsePath(path: string): ParsedPath {
  if (!path.includes('[*]')) {
    return { isArray: false, segments: [{ path, isArray: false }] };
  }

  const parts = path.split('[*]');
  const segments: PathSegment[] = [];

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (part.startsWith('.')) {
      part = part.slice(1);
    }
    if (part.endsWith('.')) {
      part = part.slice(0, -1);
    }
    if (part.length > 0) {
      const isArray = i < parts.length - 1;
      segments.push({ path: part, isArray });
    }
  }

  if (segments.length === 0) {
    throw new Error(`Invalid path: "${path}". Array wildcard [*] requires a field name.`);
  }

  return { isArray: true, segments };
}
