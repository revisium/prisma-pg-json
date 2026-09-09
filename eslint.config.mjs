import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/__tests__/**', 'src/generated/**', 'src/index.ts', 'src/prisma-adapter.ts', 'src/postgres/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/prisma-adapter'],
              importNames: ['Prisma', 'getPrismaAdapter'],
              message: 'Facade modules may only use PrismaSql types from the adapter.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/**/*-description.ts',
      'src/paths/**/*.ts',
      'src/utils/field-config.ts',
      'src/sub-schema/path.ts',
      'src/sub-schema/validation.ts',
      'src/utils/query-validation.ts',
      'src/keyset/cursor.ts',
    ],
    ignores: ['src/__tests__/**', 'src/generated/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/prisma-adapter', '**/postgres/**'],
              message: 'Pure modules cannot depend on adapter or PostgreSQL implementations.',
            },
          ],
        },
      ],
    },
  },
];
