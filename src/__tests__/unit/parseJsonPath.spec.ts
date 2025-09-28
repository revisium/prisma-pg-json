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

      it('should convert -1 to last', () => {
        expect(parseJsonPath('items[-1]')).toEqual(['items', 'last']);
        expect(parseJsonPath('items[-1].name')).toEqual(['items', 'last', 'name']);
      });

      it('should throw error for other negative indexes', () => {
        expect(() => parseJsonPath('items[-2]')).toThrow(
          "Negative index -2 is not supported yet. Only -1 (converted to 'last') is supported.",
        );
        expect(() => parseJsonPath('items[-3]')).toThrow(
          "Negative index -3 is not supported yet. Only -1 (converted to 'last') is supported.",
        );
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

      it('should throw error for unclosed brackets', () => {
        expect(() => parseJsonPath('items[')).toThrow('Unclosed bracket in JSON path');
        expect(() => parseJsonPath('data.items[0')).toThrow('Unclosed bracket in JSON path');
        expect(() => parseJsonPath('products[*')).toThrow('Unclosed bracket in JSON path');
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

    it('should handle last keyword correctly', () => {
      expect(arrayToJsonPath(['items', 'last'])).toBe('items[last]');
      expect(arrayToJsonPath(['items', 'last', 'name'])).toBe('items[last].name');
    });

    it('should handle segments with special characters', () => {
      expect(arrayToJsonPath(['user', 'profile.data'])).toBe('user["profile.data"]');
      expect(arrayToJsonPath(['items', 'field[0]'])).toBe('items["field[0]"]');
      expect(arrayToJsonPath(['data', 'field]with]brackets'])).toBe('data["field]with]brackets"]');
    });

    it('should escape quotes in segment names', () => {
      expect(arrayToJsonPath(['user', 'field"with"quotes'])).toBe('user["field\\"with\\"quotes"]');
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

    it('should detect unclosed brackets', () => {
      const result1 = validateJsonPath('items[');
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Unclosed bracket in JSON path');

      const result2 = validateJsonPath('data.items[0');
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Unclosed bracket in JSON path');

      const result3 = validateJsonPath('products[*');
      expect(result3.isValid).toBe(false);
      expect(result3.error).toBe('Unclosed bracket in JSON path');
    });

    it('should handle valid bracket notation', () => {
      expect(validateJsonPath('items[0]')).toEqual({ isValid: true });
      expect(validateJsonPath('items[-1]')).toEqual({ isValid: true }); // -1 gets converted to 'last'
      expect(validateJsonPath('products[*].tags')).toEqual({ isValid: true });
    });

    it('should catch error for unsupported negative indexes', () => {
      const result = validateJsonPath('items[-2]');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Negative index -2 is not supported yet. Only -1 (converted to 'last') is supported.",
      );
    });
  });
});
