export function isNonEmptyJsonString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function prepareJsonString(value: unknown, operator: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${operator} requires a string value`);
  }
  return value;
}
