const path = require('node:path');

const SOURCE_ROOT = path.resolve(__dirname, '..', 'src');
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
    ? path.resolve(__dirname, '..', source)
    : path.resolve(path.dirname(importer), source);
  if (resolved !== SOURCE_ROOT && !resolved.startsWith(`${SOURCE_ROOT}${path.sep}`)) return null;

  let target = path.relative(SOURCE_ROOT, resolved).split(path.sep).join('/');
  target = target.replace(/\.(?:[cm]?js|ts)$/, '');
  if (!target) return 'index';
  return PUBLIC_FACADES.has(target) || !PUBLIC_FACADES.has(`${target}/index`)
    ? target
    : `${target}/index`;
}

module.exports = {
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
