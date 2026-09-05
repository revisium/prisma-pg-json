import { validatePagination, validateQueryInput } from '../../utils/query-validation';

describe('query pagination validation', () => {
  it.each([undefined, 0, 1, 10000])('accepts take %s', (take) => {
    expect(() => validatePagination(take, undefined)).not.toThrow();
  });

  it.each([undefined, 0, 1, 1000000])('accepts skip %s', (skip) => {
    expect(() => validatePagination(undefined, skip)).not.toThrow();
  });

  it.each([null, NaN, Infinity, -Infinity, -1, 0.5, '1', true, {}, 10001])(
    'rejects invalid take %s',
    (take) => {
      expect(() => validatePagination(take, 0)).toThrow('take must be an integer between 0 and 10000');
    },
  );

  it.each([null, NaN, Infinity, -Infinity, -1, 0.5, '1', true, {}, 1000001])(
    'rejects invalid skip %s',
    (skip) => {
      expect(() => validatePagination(1, skip)).toThrow('skip must be an integer between 0 and 1000000');
    },
  );
});

describe('query input complexity validation', () => {
  function nestedInput(depth: number): unknown {
    let value: unknown = 'leaf';
    for (let index = 0; index < depth; index++) {
      value = { AND: value };
    }
    return value;
  }

  it('accepts a value at the depth limit', () => {
    expect(() => validateQueryInput(nestedInput(100))).not.toThrow();
  });

  it.each([101, 3000])('rejects depth %s without overflowing the stack', (depth) => {
    expect(() => validateQueryInput(nestedInput(depth))).toThrow('Query input exceeds maximum depth of 100');
  });

  it('counts array elements toward the node budget', () => {
    expect(() => validateQueryInput(Array(9999).fill('value'))).not.toThrow();
    expect(() => validateQueryInput(Array(10000).fill('value'))).toThrow('Query input exceeds maximum node count of 10000');
  });

  it('counts object values toward the node budget', () => {
    const value = Object.fromEntries(Array.from({ length: 9999 }, (_, index) => [index, null]));
    expect(() => validateQueryInput(value)).not.toThrow();
    value.extra = null;
    expect(() => validateQueryInput(value)).toThrow('Query input exceeds maximum node count of 10000');
  });

  it('rejects circular objects and arrays', () => {
    const object: Record<string, unknown> = {};
    object.AND = object;
    const array: unknown[] = [];
    array.push(array);
    expect(() => validateQueryInput(object)).toThrow('Query input contains a cycle');
    expect(() => validateQueryInput(array)).toThrow('Query input contains a cycle');
  });

  it('accepts repeated references that are not cycles', () => {
    const condition = { name: 'hello' };
    expect(() => validateQueryInput({ OR: [condition, condition] })).not.toThrow();
  });

  it('validates null-prototype objects', () => {
    const object = Object.create(null) as Record<string, unknown>;
    object.AND = object;
    expect(() => validateQueryInput(object)).toThrow('Query input contains a cycle');
  });

  it('treats dates and custom instances as leaf values', () => {
    class CustomValue {
      self = this;
    }
    expect(() => validateQueryInput({ date: new Date(), value: new CustomValue() })).not.toThrow();
  });

  it('rejects huge sparse arrays without materializing their elements', () => {
    expect(() => validateQueryInput(new Array(100000000))).toThrow('Query input exceeds maximum node count of 10000');
  });
});
