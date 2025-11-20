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

  describe('setContext', () => {
    it('should set default context when no options provided', () => {
      operator.setContext({
        path: '',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should set language from searchLanguage', () => {
      operator.setContext({
        path: '',
        search: 'test',
        searchLanguage: 'english',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('english', data, '["all"]') @@ plainto_tsquery('english', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should set phrase search type', () => {
      operator.setContext({
        path: '',
        search: 'test',
        searchType: 'phrase',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ phraseto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should set plain search type', () => {
      operator.setContext({
        path: '',
        search: 'test',
        searchType: 'plain',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });
  });

  describe('handleSpecialPath', () => {
    it('should generate SQL for root level search', () => {
      operator.setContext({
        path: '',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use specified language', () => {
      operator.setContext({
        path: '',
        search: 'test',
        searchLanguage: 'russian',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('russian', data, '["all"]') @@ plainto_tsquery('russian', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use phrase search type', () => {
      operator.setContext({
        path: '',
        search: 'exact phrase',
        searchType: 'phrase',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'exact phrase');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ phraseto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['exact phrase']);
    });
  });

  describe('generateCondition', () => {
    it('should generate SQL for specific path', () => {
      operator.setContext({
        path: 'content',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.content', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test']);
    });

    it('should handle nested path', () => {
      operator.setContext({
        path: 'user.profile.bio',
        search: 'developer',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.user.profile.bio', 'developer', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['user', 'profile', 'bio'], 'developer']);
    });

    it('should handle array path', () => {
      operator.setContext({
        path: 'items[0].name',
        search: 'product',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.items[0].name', 'product', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['items', '0', 'name'], 'product']);
    });

    it('should use phrase search type', () => {
      operator.setContext({
        path: 'text',
        search: 'exact phrase',
        searchType: 'phrase',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.text', 'exact phrase', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ phraseto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['text'], 'exact phrase']);
    });

    it('should use specified language', () => {
      operator.setContext({
        path: 'description',
        search: 'test',
        searchLanguage: 'french',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.description', 'test', false);

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
      operator.setContext({
        path: '',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '', 'test', false, true);

      expect(sql).toBeDefined();
      expect(sql.sql).toContain('jsonb_to_tsvector');
    });

    it('should execute with valid input for normal path', () => {
      operator.setContext({
        path: 'content',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.execute(fieldRef, '$.content', 'test', false, false);

      expect(sql).toBeDefined();
      expect(sql.sql).toContain('jsonb_to_tsvector');
    });

    it('should throw error for invalid value', () => {
      operator.setContext({
        path: '',
        search: '',
      });

      const fieldRef = Prisma.sql`data`;
      expect(() => operator.execute(fieldRef, '', '', false, true)).toThrow();
    });

    it('should throw error for non-string value', () => {
      operator.setContext({
        path: '',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      expect(() => operator.execute(fieldRef, '', 123 as unknown as string, false, true)).toThrow(
        'search requires a string value',
      );
    });
  });

  describe('path parsing edge cases', () => {
    it('should handle empty path string', () => {
      operator.setContext({
        path: '',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([[], 'test']);
    });

    it('should handle $ path', () => {
      operator.setContext({
        path: '$',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([[], 'test']);
    });

    it('should handle path with $.prefix', () => {
      operator.setContext({
        path: '$.content',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.content', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test']);
    });

    it('should handle complex nested path', () => {
      operator.setContext({
        path: 'user.profile.settings.theme',
        search: 'dark',
      });

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
      operator.setContext({
        path: 'items[*].name',
        search: 'product',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.items[*].name', 'product', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['items', '*', 'name'], 'product']);
    });

    it('should handle array index path', () => {
      operator.setContext({
        path: 'items[0]',
        search: 'first',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.items[0]', 'first', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['items', '0'], 'first']);
    });

    it('should handle multiple array indices', () => {
      operator.setContext({
        path: 'data[0].nested[1].value',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(
        fieldRef,
        '$.data[0].nested[1].value',
        'test',
        false,
      );

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['data', '0', 'nested', '1', 'value'], 'test']);
    });
  });

  describe('language and search type combinations', () => {
    const languages = ['simple', 'english', 'russian', 'french', 'german', 'spanish'];
    const searchTypes: Array<'plain' | 'phrase'> = ['plain', 'phrase'];

    languages.forEach((language) => {
      searchTypes.forEach((searchType) => {
        it(`should handle ${language} language with ${searchType} search type`, () => {
          operator.setContext({
            path: 'content',
            search: 'test query',
            searchLanguage: language,
            searchType,
          });

          const fieldRef = Prisma.sql`data`;
          const sql = operator.generateCondition(fieldRef, '$.content', 'test query', false);

          const queryFunc = searchType === 'phrase' ? 'phraseto_tsquery' : 'plainto_tsquery';
          expect(sql.sql).toEqual(
            `jsonb_to_tsvector('${language}', data #> ?::text[], '["all"]') @@ ${queryFunc}('${language}', ?)`,
          );
          expect(sql.values).toEqual([['content'], 'test query']);
        });
      });
    });
  });

  describe('context without setContext', () => {
    it('should use defaults when context not set', () => {
      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use defaults in generateCondition when context not set', () => {
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
      operator.setContext({
        path: '',
        search: 'test',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["all"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use values searchIn', () => {
      operator.setContext({
        path: '',
        search: 'test',
        searchIn: 'values',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["string", "numeric", "boolean"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use keys searchIn', () => {
      operator.setContext({
        path: '',
        search: 'test',
        searchIn: 'keys',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["key"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use strings searchIn', () => {
      operator.setContext({
        path: '',
        search: 'test',
        searchIn: 'strings',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'test');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["string"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['test']);
    });

    it('should use numbers searchIn', () => {
      operator.setContext({
        path: '',
        search: '42',
        searchIn: 'numbers',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, '42');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["numeric"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['42']);
    });

    it('should use booleans searchIn', () => {
      operator.setContext({
        path: '',
        search: 'true',
        searchIn: 'booleans',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.handleSpecialPath(fieldRef, 'true');

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data, '["boolean"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual(['true']);
    });

    it('should use searchIn with path-based search', () => {
      operator.setContext({
        path: 'content',
        search: 'test',
        searchIn: 'strings',
      });

      const fieldRef = Prisma.sql`data`;
      const sql = operator.generateCondition(fieldRef, '$.content', 'test', false);

      expect(sql.sql).toEqual(
        `jsonb_to_tsvector('simple', data #> ?::text[], '["string"]') @@ plainto_tsquery('simple', ?)`,
      );
      expect(sql.values).toEqual([['content'], 'test']);
    });
  });
});

