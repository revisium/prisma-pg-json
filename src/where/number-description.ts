import type { NumberFilter } from '../types';

export type NumberFilterDescription =
  | { kind: 'equals'; readValue: () => number }
  | { kind: 'gt'; readValue: () => number }
  | { kind: 'gte'; readValue: () => number }
  | { kind: 'lt'; readValue: () => number }
  | { kind: 'lte'; readValue: () => number }
  | { kind: 'in'; readValues: () => number[] }
  | { kind: 'notIn'; readValues: () => number[] }
  | { kind: 'notEquals'; readValue: () => number }
  | { kind: 'not'; readFilter: () => number | NumberFilter };

export function* describeNumberFilter(
  filter: number | NumberFilter,
): Generator<NumberFilterDescription> {
  if (typeof filter === 'number') {
    yield { kind: 'equals', readValue: () => filter };
    return;
  }

  if (filter.equals !== undefined) {
    yield { kind: 'equals', readValue: () => filter.equals as number };
  }

  if (filter.gt !== undefined) {
    yield { kind: 'gt', readValue: () => filter.gt as number };
  }

  if (filter.gte !== undefined) {
    yield { kind: 'gte', readValue: () => filter.gte as number };
  }

  if (filter.lt !== undefined) {
    yield { kind: 'lt', readValue: () => filter.lt as number };
  }

  if (filter.lte !== undefined) {
    yield { kind: 'lte', readValue: () => filter.lte as number };
  }

  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    yield { kind: 'in', readValues: () => filter.in as number[] };
  }

  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    yield { kind: 'notIn', readValues: () => filter.notIn as number[] };
  }

  if (filter.not !== undefined) {
    const notValue = filter.not;
    if (typeof notValue === 'number') {
      yield { kind: 'notEquals', readValue: () => notValue };
    } else {
      yield { kind: 'not', readFilter: () => notValue };
    }
  }
}
