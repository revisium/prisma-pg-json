import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import layerBoundaryPlugin from './eslint-rules/layer-boundary.cjs';

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
              group: ['**/prisma-adapter', '**/prisma-adapter.ts', '**/prisma-adapter.js'],
              importNames: ['Prisma', 'configurePrisma', 'getPrismaAdapter', 'prismaConfig'],
              message: 'Facade modules may only use PrismaSql types from the adapter.',
            },
            {
              group: ['@prisma/client'],
              message: 'Production modules must use the configured Prisma adapter.',
            },
            {
              group: ['**/index', '**/index.ts', '**/index.js'],
              importNames: ['Prisma', 'configurePrisma', 'getPrismaAdapter', 'prismaConfig'],
              message: 'Production modules cannot bypass the configured Prisma adapter through a barrel.',
            },
            {
              regex: String.raw`^(\.|\.\.)$`,
              importNames: ['Prisma', 'configurePrisma', 'getPrismaAdapter', 'prismaConfig'],
              message: 'Production modules cannot bypass the configured Prisma adapter through a root barrel.',
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
    plugins: { architecture: layerBoundaryPlugin },
    rules: {
      'architecture/layer-boundary': ['error', 'pure'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/prisma-adapter', '**/prisma-adapter.ts', '**/prisma-adapter.js', '@prisma/client'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/postgres/**/*.ts'],
    plugins: { architecture: layerBoundaryPlugin },
    rules: {
      'architecture/layer-boundary': ['error', 'postgres'],
    },
  },
];
