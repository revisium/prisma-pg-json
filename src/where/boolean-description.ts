import type { BooleanFilter } from '../types';

export type BooleanFilterDescription =
  | { kind: 'equals'; readValue: () => boolean }
  | { kind: 'notEquals'; readValue: () => boolean }
  | { kind: 'not'; readFilter: () => boolean | BooleanFilter };

export function* describeBooleanFilter(
  filter: boolean | BooleanFilter,
): Generator<BooleanFilterDescription> {
  if (typeof filter === 'boolean') {
    yield { kind: 'equals', readValue: () => filter };
    return;
  }

  if (filter.equals !== undefined) {
    yield { kind: 'equals', readValue: () => filter.equals as boolean };
  }

  if (filter.not !== undefined) {
    if (typeof filter.not === 'boolean') {
      yield { kind: 'notEquals', readValue: () => filter.not as boolean };
    } else {
      const notFilter = filter.not;
      yield { kind: 'not', readFilter: () => notFilter };
    }
  }
}
