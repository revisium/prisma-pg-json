import { parsePath } from '../../sub-schema/sub-schema-builder';

describe('parsePath', () => {
  describe('single paths (no arrays)', () => {
    it('should parse simple field path', () => {
      const result = parsePath('avatar');

      expect(result).toEqual({
        isArray: false,
        segments: [{ path: 'avatar', isArray: false }],
      });
    });

    it('should parse nested object path', () => {
      const result = parsePath('profile.photo');

      expect(result).toEqual({
        isArray: false,
        segments: [{ path: 'profile.photo', isArray: false }],
      });
    });

    it('should parse deeply nested path', () => {
      const result = parsePath('settings.images.logo');

      expect(result).toEqual({
        isArray: false,
        segments: [{ path: 'settings.images.logo', isArray: false }],
      });
    });
  });

  describe('array paths (single [*])', () => {
    it('should parse simple array path', () => {
      const result = parsePath('gallery[*]');

      expect(result).toEqual({
        isArray: true,
        segments: [{ path: 'gallery', isArray: true }],
      });
    });

    it('should parse nested object with array', () => {
      const result = parsePath('value.files[*]');

      expect(result).toEqual({
        isArray: true,
        segments: [{ path: 'value.files', isArray: true }],
      });
    });

    it('should parse array with trailing path', () => {
      const result = parsePath('attachments[*].file');

      expect(result).toEqual({
        isArray: true,
        segments: [
          { path: 'attachments', isArray: true },
          { path: 'file', isArray: false },
        ],
      });
    });

    it('should parse array with deeply nested trailing path', () => {
      const result = parsePath('tasks[*].metadata.attachment');

      expect(result).toEqual({
        isArray: true,
        segments: [
          { path: 'tasks', isArray: true },
          { path: 'metadata.attachment', isArray: false },
        ],
      });
    });

    it('should parse nested object array with trailing path', () => {
      const result = parsePath('value.files[*].file');

      expect(result).toEqual({
        isArray: true,
        segments: [
          { path: 'value.files', isArray: true },
          { path: 'file', isArray: false },
        ],
      });
    });
  });

  describe('nested arrays (multiple [*])', () => {
    it('should parse two-level nested arrays with trailing path', () => {
      const result = parsePath('items[*].variants[*].image');

      expect(result).toEqual({
        isArray: true,
        segments: [
          { path: 'items', isArray: true },
          { path: 'variants', isArray: true },
          { path: 'image', isArray: false },
        ],
      });
    });

    it('should parse two-level nested arrays without trailing path', () => {
      const result = parsePath('sections[*].photos[*]');

      expect(result).toEqual({
        isArray: true,
        segments: [
          { path: 'sections', isArray: true },
          { path: 'photos', isArray: true },
        ],
      });
    });

    it('should parse three-level nested arrays', () => {
      const result = parsePath('a[*].b[*].c[*].d');

      expect(result).toEqual({
        isArray: true,
        segments: [
          { path: 'a', isArray: true },
          { path: 'b', isArray: true },
          { path: 'c', isArray: true },
          { path: 'd', isArray: false },
        ],
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = parsePath('');

      expect(result).toEqual({
        isArray: false,
        segments: [{ path: '', isArray: false }],
      });
    });

    it('should handle path with only [*]', () => {
      const result = parsePath('[*]');

      expect(result).toEqual({
        isArray: true,
        segments: [],
      });
    });

    it('should handle consecutive [*][*]', () => {
      const result = parsePath('items[*][*]');

      expect(result).toEqual({
        isArray: true,
        segments: [{ path: 'items', isArray: true }],
      });
    });
  });
});
