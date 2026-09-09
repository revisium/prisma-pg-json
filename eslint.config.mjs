import js from '@eslint/js';
import globals from 'globals';
import path from 'node:path';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

const SOURCE_ROOT = path.resolve(import.meta.dirname, 'src');
const PUBLIC_FACADES = new Set([
  'index',
  'query-builder',
  'where/string',
  'where/number',
  'where/boolean',
  'where/date',
  'where/json/index',
  'where/json/json-filter',
  'orderBy/index',
  'orderBy/generateOrderBy',
  'orderBy/parseJsonPath',
  'keyset/index',
  'keyset/condition',
  'sub-schema/cte',
  'sub-schema/where',
  'sub-schema/order-by',
  'sub-schema/query',
  'sub-schema/sub-schema-builder',
  'utils/parseJsonPath',
]);

function sourceTarget(importer, source) {
  if (!source.startsWith('.') && !source.startsWith('src/')) return null;

  const resolved = source.startsWith('src/')
    ? path.resolve(import.meta.dirname, source)
    : path.resolve(path.dirname(importer), source);
  if (resolved !== SOURCE_ROOT && !resolved.startsWith(`${SOURCE_ROOT}${path.sep}`)) return null;

  let target = path.relative(SOURCE_ROOT, resolved).split(path.sep).join('/');
  target = target.replace(/\.(?:[cm]?js|ts)$/, '');
  if (!target) return 'index';
  return PUBLIC_FACADES.has(target) || !PUBLIC_FACADES.has(`${target}/index`)
    ? target
    : `${target}/index`;
}

const layerBoundaryPlugin = {
  rules: {
    'layer-boundary': {
      meta: {
        type: 'problem',
        schema: [{ enum: ['pure', 'postgres'] }],
      },
      create(context) {
        const layer = context.options[0];
        const importer = context.getFilename();

        function check(node) {
          if (!node.source || typeof node.source.value !== 'string') return;

          const target = sourceTarget(importer, node.source.value);
          if (!target) return;

          const forbidden = layer === 'pure'
            ? target === 'index' || target.startsWith('postgres/') || PUBLIC_FACADES.has(target)
            : PUBLIC_FACADES.has(target);
          if (!forbidden) return;

          context.report({
            node: node.source,
            message: layer === 'pure'
              ? 'Pure modules cannot depend on adapters, PostgreSQL implementations, or public facades.'
              : 'PostgreSQL modules must call PostgreSQL compilers directly.',
          });
        }

        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
        };
      },
    },
  },
};

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
              regex: '^(\\.|\\.\\.)$',
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
