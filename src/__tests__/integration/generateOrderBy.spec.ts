import './setup';
import { generateOrderBy } from '../../query-builder';
import { FieldConfig } from '../../types';

describe('generateOrderBy function', () => {
  const fieldConfig: FieldConfig = {
    name: 'string',
    age: 'number',
    data: 'json',
  };

  describe('Basic functionality', () => {
    it('should return null for undefined orderBy', () => {
      const result = generateOrderBy('t', undefined, fieldConfig);
      expect(result).toBeNull();
    });

    it('should return null for empty orderBy object', () => {
      const result = generateOrderBy('t', {}, fieldConfig);
      expect(result).toBeNull();
    });

    it('should generate ORDER BY for single field ascending', () => {
      const result = generateOrderBy('t', { name: 'asc' }, fieldConfig);
      expect(result?.sql).toContain('ORDER BY');
      expect(result?.sql).toContain('t."name"');
      expect(result?.sql).toContain('ASC');
    });

    it('should generate ORDER BY for single field descending', () => {
      const result = generateOrderBy('t', { name: 'desc' }, fieldConfig);
      expect(result?.sql).toContain('ORDER BY');
      expect(result?.sql).toContain('t."name"');
      expect(result?.sql).toContain('DESC');
    });
  });

  describe('Array format', () => {
    it('should handle array of order conditions', () => {
      const result = generateOrderBy('t', [{ name: 'asc' }, { age: 'desc' }], fieldConfig);
      expect(result?.sql).toContain('ORDER BY');
      expect(result?.sql).toContain('t."name" ASC');
      expect(result?.sql).toContain('t."age" DESC');
    });

    it('should handle empty array', () => {
      const result = generateOrderBy('t', [], fieldConfig);
      expect(result).toBeNull();
    });

    it('should skip empty objects in array', () => {
      const result = generateOrderBy('t', [{}, { name: 'asc' }, {}], fieldConfig);
      expect(result?.sql).toContain('ORDER BY');
      expect(result?.sql).toContain('t."name" ASC');
      expect(result?.sql.split(',').length).toBe(1);
    });
  });

  describe('JSON field ordering', () => {
    it('should generate ORDER BY for JSON path', () => {
      const result = generateOrderBy(
        't',
        {
          data: {
            path: ['profile', 'priority'],
            direction: 'asc',
            type: 'int',
          },
        },
        fieldConfig,
      );
      expect(result?.sql).toContain('ORDER BY');
      expect(result?.sql).toContain('t."data"');
      expect(result?.sql).toContain('profile,priority');
      expect(result?.sql).toContain('::int');
    });

    it('should handle JSON aggregation in array', () => {
      const result = generateOrderBy(
        't',
        [
          { name: 'asc' },
          {
            data: {
              path: ['items', '*', 'price'],
              direction: 'desc',
              type: 'int',
              aggregation: 'max',
            },
          },
        ],
        fieldConfig,
      );
      expect(result?.sql).toContain('ORDER BY');
      expect(result?.sql).toContain('t."name" ASC');
      expect(result?.sql).toContain('MAX');
    });
  });

  describe('Mixed ordering', () => {
    it('should combine regular and JSON field ordering', () => {
      const result = generateOrderBy(
        'users',
        [
          { name: 'asc' },
          { age: 'desc' },
          {
            data: {
              path: ['profile', 'rating'],
              direction: 'desc',
              type: 'float',
            },
          },
        ],
        fieldConfig,
      );
      expect(result?.sql).toContain('ORDER BY');
      expect(result?.sql).toContain('users."name" ASC');
      expect(result?.sql).toContain('users."age" DESC');
      expect(result?.sql).toContain('users."data"');
      expect(result?.sql).toContain('profile,rating');
      expect(result?.sql).toContain('::float');
    });
  });

  describe('Invalid input handling', () => {
    it('should ignore invalid order directions', () => {
      const result = generateOrderBy('t', { name: 'invalid' as any }, fieldConfig);
      expect(result).toBeNull();
    });

    it('should handle non-JSON field with JSON order syntax', () => {
      const result = generateOrderBy(
        't',
        {
          name: {
            path: ['test'],
            direction: 'asc',
          } as any,
        },
        fieldConfig,
      );
      expect(result).toBeNull();
    });
  });
});