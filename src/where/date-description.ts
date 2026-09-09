import type { DateFilter } from '../types';

export type DateFilterValue = string | Date;

export type DateFilterDescription =
  | { kind: 'equals'; readValue: () => DateFilterValue }
  | { kind: 'gt'; readValue: () => DateFilterValue }
  | { kind: 'gte'; readValue: () => DateFilterValue }
  | { kind: 'lt'; readValue: () => DateFilterValue }
  | { kind: 'lte'; readValue: () => DateFilterValue }
  | { kind: 'in'; readValues: () => DateFilterValue[] }
  | { kind: 'notIn'; readValues: () => DateFilterValue[] }
  | { kind: 'notEquals'; readValue: () => DateFilterValue }
  | { kind: 'not'; readFilter: () => DateFilterValue | DateFilter };

export function* describeDateFilter(
  filter: DateFilterValue | DateFilter,
): Generator<DateFilterDescription> {
  if (typeof filter === 'string' || filter instanceof Date) {
    yield { kind: 'equals', readValue: () => filter };
    return;
  }

  if (filter.equals !== undefined) {
    yield { kind: 'equals', readValue: () => filter.equals as DateFilterValue };
  }

  if (filter.gt !== undefined) {
    yield { kind: 'gt', readValue: () => filter.gt as DateFilterValue };
  }

  if (filter.gte !== undefined) {
    yield { kind: 'gte', readValue: () => filter.gte as DateFilterValue };
  }

  if (filter.lt !== undefined) {
    yield { kind: 'lt', readValue: () => filter.lt as DateFilterValue };
  }

  if (filter.lte !== undefined) {
    yield { kind: 'lte', readValue: () => filter.lte as DateFilterValue };
  }

  if (filter.in !== undefined && Array.isArray(filter.in) && filter.in.length > 0) {
    yield { kind: 'in', readValues: () => filter.in as DateFilterValue[] };
  }

  if (filter.notIn !== undefined && Array.isArray(filter.notIn) && filter.notIn.length > 0) {
    yield { kind: 'notIn', readValues: () => filter.notIn as DateFilterValue[] };
  }

  if (filter.not !== undefined) {
    const notValue = filter.not;
    if (typeof notValue === 'string' || notValue instanceof Date) {
      yield { kind: 'notEquals', readValue: () => notValue };
    } else {
      yield { kind: 'not', readFilter: () => notValue };
    }
  }
}
