import { SearchOperator } from '../../where/json/operators/search-operator';
import { Prisma } from '@prisma/client';
import { configurePrisma } from '../../prisma-adapter';

describe('SearchOperator', () => {
  let operator: SearchOperator;

  beforeAll(() => {
    configurePrisma(Prisma);
  });

  beforeEach(() => {
    operator = new SearchOperator();
  });

  describe('key', () => {
    it('should have correct key', () => {
      expect(operator.key).toBe('search');
    });
  });

  describe('validate', () => {
    it('should validate non-empty string', () => {
      expect(operator.validate('test')).toBe(true);
      expect(operator.validate('a')).toBe(true);
      expect(operator.validate('multiple words')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(operator.validate('')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(operator.validate(123 as unknown as string)).toBe(false);
      expect(operator.validate(null as unknown as string)).toBe(false);
      expect(operator.validate(undefined as unknown as string)).toBe(false);
      expect(operator.validate({} as unknown as string)).toBe(false);
      expect(operator.validate([] as unknown as string)).toBe(false);
    });
  });

  describe('preprocessValue', () => {
    it('should return string value', () => {
      expect(operator.preprocessValue('test')).toBe('test');
    });

    it('should throw error for non-string value', () => {
      expect(() => operator.preprocessValue(123)).toThrow('search requires a string value');
      expect(() => operator.preprocessValue(null)).toThrow('search requires a string value');
      expect(() => operator.preprocessValue(undefined)).toThrow('search requires a string value');
      expect(() => operator.preprocessValue({})).toThrow('search requires a string value');
      expect(() => operator.preprocessValue([])).toThrow('search requires a string value');
    });
  });

  describe('supportsSpecialPath', () => {
    it('should support special path (root search)', () => {
      expect(operator.supportsSpecialPath()).toBe(true);
    });
  });

  describe('execute with filter context', () => {
    it('should use default context when no filter options provided', () => {
      const filter = { path: '', search: 'test' };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should set language from searchLanguage', () => {
      const filter = { path: '', search: 'test', searchLanguage: 'english' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('english', data, '["all"]') @@ plainto_tsquery('english', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should set phrase search type', () => {
      const filter = { path: '', search: 'test', searchType: 'phrase' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ phraseto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should set plain search type', () => {
      const filter = { path: '', search: 'test', searchType: 'plain' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should set prefix search type', () => {
      const filter = { path: '', search: 'test query', searchType: 'prefix' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test query', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ to_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test:* & query:*']);
    });

    it('should set tsquery search type', () => {
      const filter = { path: '', search: 'test:* & query:*', searchType: 'tsquery' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test:* & query:*', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ to_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test:* & query:*']);
    });
  });

  describe('handleSpecialPath', () => {
    it('should generate SQL for root level search', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use specified language via execute', () => {
      const filter = { path: '', search: 'test', searchLanguage: 'russian' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('russian', data, '["all"]') @@ plainto_tsquery('russian', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use phrase search type via execute', () => {
      const filter = { path: '', search: 'exact phrase', searchType: 'phrase' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'exact phrase', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ phraseto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['exact phrase']);
    });
  });

  describe('generateCondition', () => {
    it('should generate SQL for specific path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.content', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test']);
    });

    it('should handle nested path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.user.profile.bio', 'developer', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['user', 'profile', 'bio'], 'developer']);
    });

    it('should handle array path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.items[0].name', 'product', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['items', '0', 'name'], 'product']);
    });

    it('should use phrase search type via execute', () => {
      const filter = { path: 'text', search: 'exact phrase', searchType: 'phrase' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$.text', 'exact phrase', false, false, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ phraseto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['text'], 'exact phrase']);
    });

    it('should use specified language via execute', () => {
      const filter = {
        path: 'description',
        search: 'test',
        searchLanguage: 'french' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$.description', 'test', false, false, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('french', data #> ?::text[], '["all"]') @@ plainto_tsquery('french', ?)`,
      );
      expect(sql.values).toEqual([['description'], 'test']);
    });
  });

  describe('validatePath', () => {
    it('should validate any path', () => {
      expect(operator.validatePath('')).toBe(true);
      expect(operator.validatePath('test')).toBe(true);
      expect(operator.validatePath('nested.path')).toBe(true);
      expect(operator.validatePath(['array', 'path'])).toBe(true);
      expect(operator.validatePath([])).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('should return validation error message', () => {
      const message = operator.getErrorMessage('validation failed');
      expect(message).toContain('search requires a non-empty string value');
    });

    it('should return default error message for unknown context', () => {
      const message = operator.getErrorMessage('unknown');
      expect(message).toContain('Error in search operator');
    });
  });

  describe('execute', () => {
    it('should execute with valid input for special path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true);

      expect(sql).toBeDefined();
      expect(sql.sql).toContain('jsonb_to_tsvector');
    });

    it('should execute with valid input for normal path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$.content', 'test', false, false);

      expect(sql).toBeDefined();
      expect(sql.sql).toContain('jsonb_to_tsvector');
    });

    it('should throw error for invalid value', () => {
      const fieldRef = Prisma.sql`data`;
      expect(() => operator.execute(fieldRef, '$', '', false, true)).toThrow();
    });

    it('should throw error for non-string value', () => {
      const fieldRef = Prisma.sql`data`;
      expect(() => operator.execute(fieldRef, '$', 123 as unknown as string, false, true)).toThrow(
        'search requires a string value',
      );
    });
  });

  describe('path parsing edge cases', () => {
    it('should handle empty path string', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([[], 'test']);
    });

    it('should handle $ path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([[], 'test']);
    });

    it('should handle path with $.prefix', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.content', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test']);
    });

    it('should handle complex nested path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(
        fieldRef,
        '$.user.profile.settings.theme',
        'dark',
        false,
      );

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['user', 'profile', 'settings', 'theme'], 'dark']);
    });

    it('should handle path with wildcards', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.items[*].name', 'product', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['items', '*', 'name'], 'product']);
    });

    it('should handle array index path', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.items[0]', 'first', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['items', '0'], 'first']);
    });

    it('should handle multiple array indices', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.data[0].nested[1].value', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['data', '0', 'nested', '1', 'value'], 'test']);
    });
  });

  describe('language and search type combinations', () => {
    const languages = ['simple', 'english', 'russian', 'french', 'german', 'spanish'] as const;
    const searchTypes = ['plain', 'phrase'] as const;

    languages.forEach((language) => {
      searchTypes.forEach((searchType) => {
        it(`should handle ${language} language with ${searchType} search type`, () => {
          const filter = {
            path: 'content',
            search: 'test query',
            searchLanguage: language,
            searchType,
          };
          const fieldRef = Prisma.sql`data`;
          const sql = operator.execute(fieldRef, '$.content', 'test query', false, false, filter);

          const queryFunc = searchType === 'phrase' ? 'phraseto_tsquery' : 'plainto_tsquery';
          expect(sql.sql).toEqual(
            `jsonb_to_tsvector('${language}', data #> ?::text[], '["all"]') @@ ${queryFunc}('${language}', ?)`,
          );
          expect(sql.values).toEqual([['content'], 'test query']);
        });
      });
    });
  });

  describe('prefix search type', () => {
    it('should convert single word to prefix query', () => {
      const filter = { path: '', search: 'test', searchType: 'prefix' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ to_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test:*']);
    });

    it('should convert multiple words to prefix query with AND', () => {
      const filter = { path: '', search: 'hello world', searchType: 'prefix' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello world', false, true, filter);

      expect(sql.values).toEqual(['hello:* & world:*']);
    });

    it('should handle multiple spaces between words', () => {
      const filter = { path: '', search: 'hello   world', searchType: 'prefix' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello   world', false, true, filter);

      expect(sql.values).toEqual(['hello:* & world:*']);
    });

    it('should handle leading and trailing spaces', () => {
      const filter = { path: '', search: '  hello world  ', searchType: 'prefix' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', '  hello world  ', false, true, filter);

      expect(sql.values).toEqual(['hello:* & world:*']);
    });

    it('should escape special tsquery characters', () => {
      const filter = {
        path: '',
        search: 'hello & world | test',
        searchType: 'prefix' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello & world | test', false, true, filter);

      expect(sql.values).toEqual(['hello:* & world:* & test:*']);
    });

    it('should work with specified language', () => {
      const filter = {
        path: '',
        search: 'hello world',
        searchType: 'prefix' as const,
        searchLanguage: 'russian' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello world', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('russian', data, '["all"]') @@ to_tsquery('russian', ?)`,
      );
      expect(sql.values).toEqual(['hello:* & world:*']);
    });

    it('should work with path-based search', () => {
      const filter = {
        path: 'content',
        search: 'test query',
        searchType: 'prefix' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$.content', 'test query', false, false, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ to_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test:* & query:*']);
    });
  });

  describe('tsquery search type', () => {
    it('should pass query directly to to_tsquery', () => {
      const filter = {
        path: '',
        search: 'hello:* & world:*',
        searchType: 'tsquery' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello:* & world:*', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ to_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['hello:* & world:*']);
    });

    it('should support OR operator', () => {
      const filter = {
        path: '',
        search: 'hello | world',
        searchType: 'tsquery' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello | world', false, true, filter);

      expect(sql.values).toEqual(['hello | world']);
    });

    it('should support NOT operator', () => {
      const filter = {
        path: '',
        search: 'hello & !world',
        searchType: 'tsquery' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello & !world', false, true, filter);

      expect(sql.values).toEqual(['hello & !world']);
    });

    it('should support phrase operator', () => {
      const filter = {
        path: '',
        search: 'hello <-> world',
        searchType: 'tsquery' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'hello <-> world', false, true, filter);

      expect(sql.values).toEqual(['hello <-> world']);
    });

    it('should support complex expressions', () => {
      const filter = {
        path: '',
        search: '(hello:* | world:*) & !test:*',
        searchType: 'tsquery' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(
        fieldRef,
        '$',
        '(hello:* | world:*) & !test:*',
        false,
        true,
        filter,
      );

      expect(sql.values).toEqual(['(hello:* | world:*) & !test:*']);
    });

    it('should work with specified language', () => {
      const filter = {
        path: '',
        search: 'привет:* & мир:*',
        searchType: 'tsquery' as const,
        searchLanguage: 'russian' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'привет:* & мир:*', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('russian', data, '["all"]') @@ to_tsquery('russian', ?)`,
      );
      expect(sql.values).toEqual(['привет:* & мир:*']);
    });

    it('should work with path-based search', () => {
      const filter = {
        path: 'content',
        search: 'test:* & query:*',
        searchType: 'tsquery' as const,
      };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$.content', 'test:* & query:*', false, false, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ to_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test:* & query:*']);
    });
  });

  describe('context without filter', () => {
    it('should use defaults when no filter provided', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use defaults in generateCondition when no filter provided', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.content', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test']);
    });
  });

  describe('searchIn parameter', () => {
    it('should use all by default', () => {
      const filter = { path: '', search: 'test' };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use values searchIn', () => {
      const filter = { path: '', search: 'test', searchIn: 'values' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["string", "numeric", "boolean"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use keys searchIn', () => {
      const filter = { path: '', search: 'test', searchIn: 'keys' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["key"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use strings searchIn', () => {
      const filter = { path: '', search: 'test', searchIn: 'strings' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'test', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["string"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use numbers searchIn', () => {
      const filter = { path: '', search: '42', searchIn: 'numbers' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', '42', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["numeric"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['42']);
    });

    it('should use booleans searchIn', () => {
      const filter = { path: '', search: 'true', searchIn: 'booleans' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$', 'true', false, true, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["boolean"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['true']);
    });

    it('should use searchIn with path-based search', () => {
      const filter = { path: 'content', search: 'test', searchIn: 'strings' as const };
      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$.content', 'test', false, false, filter);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["string"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test']);
    });
  });
});
