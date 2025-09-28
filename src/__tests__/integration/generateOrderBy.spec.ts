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
      expect(result?.sql).toEqual('ORDER BY t."name" ASC');
    });

    it('should generate ORDER BY for single field descending', () => {
      const result = generateOrderBy('t', { name: 'desc' }, fieldConfig);
      expect(result?.sql).toEqual('ORDER BY t."name" DESC');
    });
  });

  describe('Array format', () => {
    it('should handle array of order conditions', () => {
      const result = generateOrderBy('t', [{ name: 'asc' }, { age: 'desc' }], fieldConfig);
      expect(result?.sql).toEqual('ORDER BY t."name" ASC, t."age" DESC');
    });

    it('should handle empty array', () => {
      const result = generateOrderBy('t', [], fieldConfig);
      expect(result).toBeNull();
    });

    it('should skip empty objects in array', () => {
      const result = generateOrderBy('t', [{}, { name: 'asc' }, {}], fieldConfig);
      expect(result?.sql).toEqual('ORDER BY t."name" ASC');
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
      expect(result?.sql).toEqual('ORDER BY (t."data"#>>\'{profile,priority}\')::int ASC');
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
      expect(result?.sql).toEqual(
        'ORDER BY t."name" ASC, (\n' +
          "      SELECT MAX((elem#>>'{price}')::int)\n" +
          '      FROM jsonb_array_elements((t."data"#>\'{items}\')::jsonb) AS elem\n' +
          '    ) DESC',
      );
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
      expect(result?.sql).toEqual(
        'ORDER BY users."name" ASC, users."age" DESC, (users."data"#>>\'{profile,rating}\')::float DESC',
      );
    });
  });

  describe('Invalid input handling', () => {
    it('should ignore invalid order directions', () => {
      const result = generateOrderBy(
        't',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        { name: 'invalid' },
        fieldConfig,
      );
      expect(result).toBeNull();
    });

    it('should handle non-JSON field with JSON order syntax', () => {
      const result = generateOrderBy(
        't',
        {
          name: {
            path: ['test'],
            direction: 'asc',
          },
        },
        fieldConfig,
      );
      expect(result).toBeNull();
    });
  });
});
