import type { StringFilter } from '../types';

export type StringFilterDescription =
  | { kind: 'equals'; isCaseInsensitive: boolean; readValue: () => string }
  | { kind: 'contains'; isCaseInsensitive: boolean; readValue: () => string }
  | { kind: 'startsWith'; isCaseInsensitive: boolean; readValue: () => string }
  | { kind: 'endsWith'; isCaseInsensitive: boolean; readValue: () => string }
  | { kind: 'in'; isCaseInsensitive: boolean; readValues: () => string[] }
  | { kind: 'notIn'; isCaseInsensitive: boolean; readValues: () => string[] }
  | { kind: 'gt'; readValue: () => string }
  | { kind: 'gte'; readValue: () => string }
  | { kind: 'lt'; readValue: () => string }
  | { kind: 'lte'; readValue: () => string }
  | { kind: 'search'; readValue: () => string }
  | { kind: 'notEquals'; isCaseInsensitive: boolean; readValue: () => string }
  | { kind: 'not'; readFilter: () => string | StringFilter };

export function* describeStringFilter(
  filter: string | StringFilter,
): Generator<StringFilterDescription> {
  if (typeof filter === 'string') {
    yield { kind: 'equals', isCaseInsensitive: false, readValue: () => filter };
    return;
  }

  const isCaseInsensitive = filter.mode === 'insensitive';
  yield* describeStringPatterns(filter, isCaseInsensitive);
  yield* describeStringArrays(filter, isCaseInsensitive);
  yield* describeStringComparisons(filter);

  if (filter.not !== undefined) {
    const notValue = filter.not;
    if (typeof notValue === 'string') {
      yield { kind: 'notEquals', isCaseInsensitive, readValue: () => notValue };
    } else {
      yield { kind: 'not', readFilter: () => notValue };
    }
  }
}

function* describeStringPatterns(
  filter: StringFilter,
  isCaseInsensitive: boolean,
): Generator<StringFilterDescription> {
  if (filter.equals !== undefined) {
    yield { kind: 'equals', isCaseInsensitive, readValue: () => filter.equals as string };
  }

  if (filter.contains !== undefined) {
    yield { kind: 'contains', isCaseInsensitive, readValue: () => filter.contains as string };
  }

  if (filter.startsWith !== undefined) {
    yield { kind: 'startsWith', isCaseInsensitive, readValue: () => filter.startsWith as string };
  }

  if (filter.endsWith !== undefined) {
    yield { kind: 'endsWith', isCaseInsensitive, readValue: () => filter.endsWith as string };
  }
}

function* describeStringArrays(
  filter: StringFilter,
  isCaseInsensitive: boolean,
): Generator<StringFilterDescription> {
  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    yield { kind: 'in', isCaseInsensitive, readValues: () => filter.in as string[] };
  }

  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    yield { kind: 'notIn', isCaseInsensitive, readValues: () => filter.notIn as string[] };
  }
}

function* describeStringComparisons(filter: StringFilter): Generator<StringFilterDescription> {
  if (filter.gt !== undefined) {
    yield { kind: 'gt', readValue: () => filter.gt as string };
  }

  if (filter.gte !== undefined) {
    yield { kind: 'gte', readValue: () => filter.gte as string };
  }

  if (filter.lt !== undefined) {
    yield { kind: 'lt', readValue: () => filter.lt as string };
  }

  if (filter.lte !== undefined) {
    yield { kind: 'lte', readValue: () => filter.lte as string };
  }

  if (filter.search !== undefined) {
    yield { kind: 'search', readValue: () => filter.search as string };
  }
}
