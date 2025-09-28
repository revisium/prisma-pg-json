import { parseJsonPath, arrayToJsonPath, validateJsonPath } from '../../utils/parseJsonPath';

describe('JSON Path Utilities', () => {
  describe('parseJsonPath', () => {
    describe('Array input', () => {
      it('should return array as-is', () => {
        expect(parseJsonPath(['name', 'email'])).toEqual(['name', 'email']);
        expect(parseJsonPath(['products', '*', 'price'])).toEqual(['products', '*', 'price']);
      });
    });

    describe('Simple string paths', () => {
      it('should parse single property', () => {
        expect(parseJsonPath('name')).toEqual(['name']);
      });

      it('should parse dotted path', () => {
        expect(parseJsonPath('user.profile.email')).toEqual(['user', 'profile', 'email']);
      });
    });

    describe('JSON Path with $ prefix', () => {
      it('should handle $.property format', () => {
        expect(parseJsonPath('$.name')).toEqual(['name']);
        expect(parseJsonPath('$.user.email')).toEqual(['user', 'email']);
      });

      it('should throw error for root path $', () => {
        expect(() => parseJsonPath('$')).toThrow('Root path $ is not supported');
      });
    });

    describe('Array notation', () => {
      it('should parse wildcard in brackets', () => {
        expect(parseJsonPath('products[*]')).toEqual(['products', '*']);
        expect(parseJsonPath('products[*].name')).toEqual(['products', '*', 'name']);
      });

      it('should parse numeric index', () => {
        expect(parseJsonPath('items[0]')).toEqual(['items', '0']);
        expect(parseJsonPath('items[0].name')).toEqual(['items', '0', 'name']);
        expect(parseJsonPath('items[42].value')).toEqual(['items', '42', 'value']);
      });

      it('should parse negative index', () => {
        expect(parseJsonPath('items[-1]')).toEqual(['items', '-1']);
        expect(parseJsonPath('items[-1].name')).toEqual(['items', '-1', 'name']);
      });

      it('should parse nested arrays', () => {
        expect(parseJsonPath('orders[*].items[*]')).toEqual(['orders', '*', 'items', '*']);
        expect(parseJsonPath('orders[*].items[*].price')).toEqual([
          'orders',
          '*',
          'items',
          '*',
          'price',
        ]);
      });

      it('should parse mixed notation', () => {
        expect(parseJsonPath('data.products[0].tags[*]')).toEqual([
          'data',
          'products',
          '0',
          'tags',
          '*',
        ]);
      });
    });

    describe('Edge cases', () => {
      it('should throw error for empty string', () => {
        expect(() => parseJsonPath('')).toThrow('JSON path cannot be empty');
      });

      it('should throw error for whitespace-only string', () => {
        expect(() => parseJsonPath('   ')).toThrow('JSON path cannot be empty');
      });

      it('should throw error for non-string input', () => {
        expect(() => parseJsonPath(null as unknown as string)).toThrow('JSON path cannot be empty');
        expect(() => parseJsonPath(undefined as unknown as string)).toThrow(
          'JSON path cannot be empty',
        );
      });

      it('should handle trailing dots', () => {
        expect(parseJsonPath('user.profile.')).toEqual(['user', 'profile']);
      });

      it('should handle multiple consecutive dots', () => {
        expect(parseJsonPath('user..profile')).toEqual(['user', 'profile']);
      });

      it('should handle leading dot', () => {
        expect(parseJsonPath('.name')).toEqual(['name']);
      });

      it('should handle dots gracefully', () => {
        expect(parseJsonPath('.')).toEqual([]);
        expect(parseJsonPath('...')).toEqual([]);
      });
    });
  });

  describe('arrayToJsonPath', () => {
    it('should convert simple array', () => {
      expect(arrayToJsonPath(['name'])).toBe('name');
      expect(arrayToJsonPath(['user', 'email'])).toBe('user.email');
    });

    it('should convert numeric indices to bracket notation', () => {
      expect(arrayToJsonPath(['items', '0'])).toBe('items[0]');
      expect(arrayToJsonPath(['items', '0', 'name'])).toBe('items[0].name');
    });

    it('should convert wildcards to bracket notation', () => {
      expect(arrayToJsonPath(['products', '*'])).toBe('products[*]');
      expect(arrayToJsonPath(['products', '*', 'name'])).toBe('products[*].name');
    });

    it('should convert nested wildcards', () => {
      expect(arrayToJsonPath(['orders', '*', 'items', '*', 'price'])).toBe(
        'orders[*].items[*].price',
      );
    });

    it('should handle mixed paths', () => {
      expect(arrayToJsonPath(['data', 'products', '0', 'tags', '*'])).toBe(
        'data.products[0].tags[*]',
      );
    });
  });

  describe('validateJsonPath', () => {
    it('should validate correct paths', () => {
      expect(validateJsonPath('name')).toEqual({ isValid: true });
      expect(validateJsonPath('user.email')).toEqual({ isValid: true });
      expect(validateJsonPath('products[*].name')).toEqual({ isValid: true });
      expect(validateJsonPath('items[0]')).toEqual({ isValid: true });
    });

    it('should handle bracket notation paths', () => {
      const result = validateJsonPath('user[0].name');
      expect(result.isValid).toBe(true);
    });

    it('should catch parsing errors', () => {
      const result = validateJsonPath('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
