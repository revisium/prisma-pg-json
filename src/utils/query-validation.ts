import { validatePagination as validatePaginationBounds } from '../sub-schema/validation';

const MAX_QUERY_DEPTH = 100;
const MAX_QUERY_NODES = 10000;

function paginationNumber(value: unknown): number {
  if (value === undefined) return 0;
  return typeof value === 'number' ? value : Number.NaN;
}

export function validatePagination(take: unknown, skip: unknown): void {
  validatePaginationBounds(paginationNumber(take), paginationNumber(skip));
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function* childValues(value: Record<string, unknown> | unknown[]): Generator<unknown> {
  if (Array.isArray(value)) {
    for (const element of value) yield element;
  } else {
    for (const key in value) {
      if (Object.hasOwn(value, key)) yield value[key];
    }
  }
}

export function validateQueryInput(value: unknown): void {
  const ancestors = new WeakSet<object>();
  const stack: { values: Iterator<unknown>; container?: object; depth: number }[] = [
    { values: [value].values(), depth: 0 },
  ];
  let nodeCount = 0;

  while (stack.length > 0) {
    const frame = stack.at(-1)!;
    const next = frame.values.next();
    if (next.done) {
      if (frame.container) ancestors.delete(frame.container);
      stack.pop();
      continue;
    }

    nodeCount++;
    if (nodeCount > MAX_QUERY_NODES) {
      throw new Error(`Query input exceeds maximum node count of ${MAX_QUERY_NODES}`);
    }
    if (frame.depth > MAX_QUERY_DEPTH) {
      throw new Error(`Query input exceeds maximum depth of ${MAX_QUERY_DEPTH}`);
    }
    if (!isContainer(next.value)) continue;
    if (ancestors.has(next.value)) {
      throw new Error('Query input contains a cycle');
    }

    ancestors.add(next.value);
    stack.push({
      values: childValues(next.value),
      container: next.value,
      depth: frame.depth + 1,
    });
  }
}
