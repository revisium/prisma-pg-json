import './setup';
import { generateOrderBy, generateOrderByClauses } from '../../query-builder';
import { generateOrderByParts } from '../../orderBy/generateOrderBy';

describe('generateOrderBy function', () => {
  const fieldConfig = {
    name: 'string',
    age: 'number',
    data: 'json',
  } as const;

  describe('Basic functionality', () => {
    it('should return null for undefined orderBy', () => {
      const result = generateOrderBy({ tableAlias: 't', orderBy: undefined, fieldConfig });
      expect(result).toBeNull();
    });

    it('should return null for empty orderBy object', () => {
      const result = generateOrderBy({ tableAlias: 't', orderBy: {}, fieldConfig });
      expect(result).toBeNull();
    });

    it('should generate ORDER BY for single field ascending', () => {
      const result = generateOrderBy({ tableAlias: 't', orderBy: { name: 'asc' }, fieldConfig });
      expect(result?.sql).toEqual('ORDER BY t."name" ASC');
    });

    it('should generate ORDER BY for single field descending', () => {
      const result = generateOrderBy({ tableAlias: 't', orderBy: { name: 'desc' }, fieldConfig });
      expect(result?.sql).toEqual('ORDER BY t."name" DESC');
    });
  });

  describe('Array format', () => {
    it('should handle array of order conditions', () => {
      const result = generateOrderBy({
        tableAlias: 't',
        orderBy: [{ name: 'asc' }, { age: 'desc' }],
        fieldConfig,
      });
      expect(result?.sql).toEqual('ORDER BY t."name" ASC, t."age" DESC');
    });

    it('should handle empty array', () => {
      const result = generateOrderBy({ tableAlias: 't', orderBy: [], fieldConfig });
      expect(result).toBeNull();
    });

    it('should skip empty objects in array', () => {
      const result = generateOrderBy({
        tableAlias: 't',
        orderBy: [{}, { name: 'asc' }, {}],
        fieldConfig,
      });
      expect(result?.sql).toEqual('ORDER BY t."name" ASC');
    });
  });

  describe('JSON field ordering', () => {
    it('should generate ORDER BY for JSON path', () => {
      const result = generateOrderBy({
        tableAlias: 't',
        orderBy: {
          data: {
            path: ['profile', 'priority'],
            direction: 'asc',
            type: 'int',
          },
        },
        fieldConfig,
      });
      expect(result?.sql).toEqual('ORDER BY (t."data"#>>\'{profile,priority}\')::int ASC');
    });

    it('should handle JSON aggregation in array', () => {
      const result = generateOrderBy({
        tableAlias: 't',
        orderBy: [
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
      });
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
      const result = generateOrderBy({
        tableAlias: 'users',
        orderBy: [
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
      });
      expect(result?.sql).toEqual(
        'ORDER BY users."name" ASC, users."age" DESC, (users."data"#>>\'{profile,rating}\')::float DESC',
      );
    });
  });

  describe('Invalid input handling', () => {
    it('should ignore invalid order directions', () => {
      const result = generateOrderBy({
        tableAlias: 't',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        orderBy: { name: 'invalid' },
        fieldConfig,
      });
      expect(result).toBeNull();
    });

    it('should handle non-JSON field with JSON order syntax', () => {
      const result = generateOrderBy({
        tableAlias: 't',
        // @ts-expect-error - testing invalid usage
        orderBy: {
          name: {
            path: ['test'],
            direction: 'asc',
          },
        },
        fieldConfig,
      });
      expect(result).toBeNull();
    });
  });
});

describe('generateOrderByParts function', () => {
  const fieldConfig = {
    name: 'string',
    age: 'number',
    data: 'json',
  } as const;

  describe('empty input', () => {
    it('should return empty array for undefined orderBy', () => {
      const result = generateOrderByParts({ tableAlias: 't', orderBy: undefined, fieldConfig });
      expect(result).toEqual([]);
    });

    it('should return empty array for empty object', () => {
      const result = generateOrderByParts({ tableAlias: 't', orderBy: {}, fieldConfig });
      expect(result).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      const result = generateOrderByParts({ tableAlias: 't', orderBy: [], fieldConfig });
      expect(result).toEqual([]);
    });
  });

  describe('regular fields', () => {
    it('should return one part for single field asc', () => {
      const parts = generateOrderByParts({ tableAlias: 't', orderBy: { name: 'asc' }, fieldConfig });

      expect(parts).toHaveLength(1);
      expect(parts[0].direction).toBe('ASC');
      expect(parts[0].fieldName).toBe('name');
      expect(parts[0].isJson).toBe(false);
      expect(parts[0].jsonConfig).toBeUndefined();
    });

    it('should return one part for single field desc', () => {
      const parts = generateOrderByParts({ tableAlias: 't', orderBy: { name: 'desc' }, fieldConfig });

      expect(parts).toHaveLength(1);
      expect(parts[0].direction).toBe('DESC');
      expect(parts[0].fieldName).toBe('name');
      expect(parts[0].isJson).toBe(false);
    });

    it('should return multiple parts for array input', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: [{ name: 'asc' }, { age: 'desc' }],
        fieldConfig,
      });

      expect(parts).toHaveLength(2);
      expect(parts[0].fieldName).toBe('name');
      expect(parts[0].direction).toBe('ASC');
      expect(parts[1].fieldName).toBe('age');
      expect(parts[1].direction).toBe('DESC');
    });

    it('should skip empty objects in array', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: [{}, { name: 'asc' }, {}],
        fieldConfig,
      });

      expect(parts).toHaveLength(1);
      expect(parts[0].fieldName).toBe('name');
    });
  });

  describe('JSON fields', () => {
    it('should return part with isJson=true and jsonConfig', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: {
          data: {
            path: ['profile', 'priority'],
            direction: 'asc',
            type: 'int',
          },
        },
        fieldConfig,
      });

      expect(parts).toHaveLength(1);
      expect(parts[0].direction).toBe('ASC');
      expect(parts[0].fieldName).toBe('data');
      expect(parts[0].isJson).toBe(true);
      expect(parts[0].jsonConfig).toEqual({
        path: ['profile', 'priority'],
        direction: 'asc',
        type: 'int',
      });
    });

    it('should handle string path', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: {
          data: {
            path: 'priority',
            direction: 'desc',
            type: 'int',
          },
        },
        fieldConfig,
      });

      expect(parts).toHaveLength(1);
      expect(parts[0].direction).toBe('DESC');
      expect(parts[0].isJson).toBe(true);
      expect(parts[0].jsonConfig?.path).toBe('priority');
    });

    it('should default direction to ASC when not specified', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: {
          data: {
            path: 'priority',
            type: 'int',
          },
        },
        fieldConfig,
      });

      expect(parts).toHaveLength(1);
      expect(parts[0].direction).toBe('ASC');
    });

    it('should preserve aggregation in jsonConfig', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        orderBy: {
          data: {
            path: ['items', '*', 'price'],
            direction: 'desc',
            type: 'int',
            aggregation: 'max',
          },
        },
        fieldConfig,
      });

      expect(parts).toHaveLength(1);
      expect(parts[0].isJson).toBe(true);
      expect(parts[0].jsonConfig?.aggregation).toBe('max');
    });
  });

  describe('mixed fields', () => {
    it('should return parts for both regular and JSON fields', () => {
      const parts = generateOrderByParts({
        tableAlias: 'users',
        orderBy: [
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
      });

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatchObject({ fieldName: 'name', direction: 'ASC', isJson: false });
      expect(parts[1]).toMatchObject({ fieldName: 'age', direction: 'DESC', isJson: false });
      expect(parts[2]).toMatchObject({ fieldName: 'data', direction: 'DESC', isJson: true });
    });
  });

  describe('invalid input', () => {
    it('should skip invalid order directions', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        // @ts-expect-error - testing invalid usage
        orderBy: { name: 'invalid' },
        fieldConfig,
      });

      expect(parts).toEqual([]);
    });

    it('should skip non-JSON field with JSON order syntax', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        // @ts-expect-error - testing invalid usage
        orderBy: {
          name: {
            path: ['test'],
            direction: 'asc',
          },
        },
        fieldConfig,
      });

      expect(parts).toEqual([]);
    });

    it('should skip JSON field with invalid direction', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        // @ts-expect-error - testing invalid usage
        orderBy: { data: { path: ['x'], direction: 'invalid' } },
        fieldConfig,
      });

      expect(parts).toEqual([]);
    });

    it('should skip JSON field with invalid aggregation', () => {
      const parts = generateOrderByParts({
        tableAlias: 't',
        // @ts-expect-error - testing invalid usage
        orderBy: { data: { path: ['x'], direction: 'asc', aggregation: 'bad' } },
        fieldConfig,
      });

      expect(parts).toEqual([]);
    });
  });

  describe('consistency with generateOrderByClauses', () => {
    it('should produce parts that match clauses output', () => {
      const orderBy = [
        { name: 'asc' as const },
        {
          data: {
            path: ['score'],
            direction: 'desc' as const,
            type: 'int' as const,
          },
        },
      ];

      const parts = generateOrderByParts({ tableAlias: 't', orderBy, fieldConfig });
      const clauses = generateOrderByClauses({ tableAlias: 't', orderBy, fieldConfig });

      expect(parts).toHaveLength(2);
      expect(clauses).not.toBeNull();
      expect(clauses?.sql).toContain('t."name" ASC');
      expect(clauses?.sql).toContain('DESC');
    });

    it('should return empty parts when clauses returns null', () => {
      const parts = generateOrderByParts({ tableAlias: 't', orderBy: {}, fieldConfig });
      const clauses = generateOrderByClauses({ tableAlias: 't', orderBy: {}, fieldConfig });

      expect(parts).toEqual([]);
      expect(clauses).toBeNull();
    });
  });
});

describe('generateOrderByClauses function', () => {
  const fieldConfig = {
    name: 'string',
    age: 'number',
    data: 'json',
  } as const;

  describe('Basic functionality', () => {
    it('should return null for undefined orderBy', () => {
      const result = generateOrderByClauses({ tableAlias: 't', orderBy: undefined, fieldConfig });
      expect(result).toBeNull();
    });

    it('should return null for empty orderBy object', () => {
      const result = generateOrderByClauses({ tableAlias: 't', orderBy: {}, fieldConfig });
      expect(result).toBeNull();
    });

    it('should generate clauses for single field ascending', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        orderBy: { name: 'asc' },
        fieldConfig,
      });
      expect(result?.sql).toEqual('t."name" ASC');
    });

    it('should generate clauses for single field descending', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        orderBy: { name: 'desc' },
        fieldConfig,
      });
      expect(result?.sql).toEqual('t."name" DESC');
    });
  });

  describe('Array format', () => {
    it('should handle array of order conditions', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        orderBy: [{ name: 'asc' }, { age: 'desc' }],
        fieldConfig,
      });
      expect(result?.sql).toEqual('t."name" ASC, t."age" DESC');
    });

    it('should handle empty array', () => {
      const result = generateOrderByClauses({ tableAlias: 't', orderBy: [], fieldConfig });
      expect(result).toBeNull();
    });

    it('should skip empty objects in array', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        orderBy: [{}, { name: 'asc' }, {}],
        fieldConfig,
      });
      expect(result?.sql).toEqual('t."name" ASC');
    });
  });

  describe('JSON field ordering', () => {
    it('should generate clauses for JSON path', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        orderBy: {
          data: {
            path: ['profile', 'priority'],
            direction: 'asc',
            type: 'int',
          },
        },
        fieldConfig,
      });
      expect(result?.sql).toEqual('(t."data"#>>\'{profile,priority}\')::int ASC');
    });

    it('should handle JSON aggregation in array', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        orderBy: [
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
      });
      expect(result?.sql).toEqual(
        't."name" ASC, (\n' +
          "      SELECT MAX((elem#>>'{price}')::int)\n" +
          '      FROM jsonb_array_elements((t."data"#>\'{items}\')::jsonb) AS elem\n' +
          '    ) DESC',
      );
    });
  });

  describe('Mixed ordering', () => {
    it('should combine regular and JSON field ordering', () => {
      const result = generateOrderByClauses({
        tableAlias: 'users',
        orderBy: [
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
      });
      expect(result?.sql).toEqual(
        'users."name" ASC, users."age" DESC, (users."data"#>>\'{profile,rating}\')::float DESC',
      );
    });
  });

  describe('Invalid input handling', () => {
    it('should ignore invalid order directions', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        orderBy: { name: 'invalid' },
        fieldConfig,
      });
      expect(result).toBeNull();
    });

    it('should handle non-JSON field with JSON order syntax', () => {
      const result = generateOrderByClauses({
        tableAlias: 't',
        // @ts-expect-error - testing invalid usage
        orderBy: {
          name: {
            path: ['test'],
            direction: 'asc',
          },
        },
        fieldConfig,
      });
      expect(result).toBeNull();
    });
  });
});
