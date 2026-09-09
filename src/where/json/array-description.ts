export type ArrayObjectMember = {
  key: string;
  objValue: unknown;
  keyIndex: number;
};

export function prepareArrayContainsOperand(
  value: unknown,
  errorMessage = 'array_contains value must be an array',
): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(errorMessage);
  }
  return value;
}

export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

export function describeArrayObjectMembers(value: object): ArrayObjectMember[] {
  return Object.entries(value).map(([key, objValue], keyIndex) => ({
    key,
    objValue,
    keyIndex,
  }));
}

export function isJsonContainer(value: unknown): boolean {
  return value !== null && typeof value === 'object';
}
