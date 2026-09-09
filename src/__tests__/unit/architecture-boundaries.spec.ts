import { spawnSync } from 'node:child_process';

interface BoundaryFixture {
  id: string;
  filePath: string;
  source: string;
}

const forbiddenFixtures: BoundaryFixture[] = [
  ['pure-postgres', 'src/query-description.ts', "import { compileWhere } from './postgres/where'; export { compileWhere };"],
  ['pure-postgres-extension', 'src/query-description.ts', "import { compileWhere } from './postgres/where.ts'; export { compileWhere };"],
  ['pure-compatibility-barrel', 'src/query-description.ts', "import { parseJsonPath } from './utils/parseJsonPath'; export { parseJsonPath };"],
  ['pure-sub-schema-wrapper', 'src/query-description.ts', "import { buildSubSchemaQuery } from './sub-schema/query'; export { buildSubSchemaQuery };"],
  ['pure-json-facade', 'src/query-description.ts', "import { generateJsonFilter } from './where/json/json-filter'; export { generateJsonFilter };"],
  ['pure-json-directory-barrel', 'src/query-description.ts', "import { generateJsonFilter } from './where/json'; export { generateJsonFilter };"],
  ['pure-order-directory-barrel', 'src/query-description.ts', "import { generateOrderBy } from './orderBy'; export { generateOrderBy };"],
  ['pure-keyset-directory-barrel', 'src/query-description.ts', "import { buildKeysetCondition } from './keyset'; export { buildKeysetCondition };"],
  ['pure-root-barrel', 'src/query-description.ts', "import { buildQuery } from '.'; export { buildQuery };"],
  ['pure-export-postgres', 'src/query-description.ts', "export * from './postgres/where';"],
  ['pure-base-url-facade', 'src/query-description.ts', "import { buildQuery } from 'src/query-builder'; export { buildQuery };"],
  ['pure-prisma-client', 'src/query-description.ts', "import { Prisma } from '@prisma/client'; export { Prisma };"],
  ['postgres-public-facade', 'src/postgres/query.ts', "import { generateWhere } from '../query-builder'; export { generateWhere };"],
  ['postgres-public-facade-extension', 'src/postgres/query.ts', "import { generateWhere } from '../query-builder.ts'; export { generateWhere };"],
  ['postgres-root-barrel', 'src/postgres/query.ts', "import { buildQuery } from '..'; export { buildQuery };"],
  ['postgres-export-facade', 'src/postgres/query.ts', "export { buildQuery } from '../query-builder';"],
  ['facade-prisma-config', 'src/query-builder.ts', "import { prismaConfig } from './prisma-adapter'; export { prismaConfig };"],
  ['facade-prisma-config-extension', 'src/query-builder.ts', "import { prismaConfig } from './prisma-adapter.ts'; export { prismaConfig };"],
  ['facade-prisma-barrel', 'src/query-builder.ts', "import { Prisma } from './index.ts'; export { Prisma };"],
  ['facade-prisma-client', 'src/query-builder.ts', "import { Prisma } from '@prisma/client'; export { Prisma };"],
].map(([id, filePath, source]) => ({ id, filePath, source }));

const allowedFixtures: BoundaryFixture[] = [
  ['postgres-description', 'src/postgres/query.ts', "import { describeFilter } from '../where/filter-description'; export { describeFilter };"],
  ['postgres-local-sub-schema-where', 'src/postgres/query.ts', "export * from './sub-schema/where';"],
  ['postgres-local-sub-schema-query', 'src/postgres/query.ts', "export * from './sub-schema/query';"],
  ['facade-prisma-sql-type', 'src/query-builder.ts', "import type { PrismaSql } from './prisma-adapter'; export type Sql = PrismaSql;"],
].map(([id, filePath, source]) => ({ id, filePath, source }));

function lintFixtures(fixtures: BoundaryFixture[]): Map<string, string[]> {
  const script = `
    import path from 'node:path';
    import { ESLint } from 'eslint';
    const fixtures = JSON.parse(process.env.BOUNDARY_FIXTURES);
    const eslint = new ESLint({ overrideConfigFile: path.resolve(process.cwd(), 'eslint.config.mjs') });
    const messages = {};
    for (const fixture of fixtures) {
      const [result] = await eslint.lintText(fixture.source, {
        filePath: path.resolve(process.cwd(), fixture.filePath),
      });
      messages[fixture.id] = result.messages
        .filter(({ ruleId }) => ruleId === 'no-restricted-imports' || ruleId === 'architecture/layer-boundary')
        .map(({ message }) => message);
    }
    process.stdout.write(JSON.stringify(messages));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, BOUNDARY_FIXTURES: JSON.stringify(fixtures) },
  });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(result.stderr || 'ESLint fixture process failed');
  }
  return new Map(Object.entries(JSON.parse(result.stdout) as Record<string, string[]>));
}

describe('architecture import boundaries', () => {
  let messages: Map<string, string[]>;

  beforeAll(() => {
    messages = lintFixtures([...forbiddenFixtures, ...allowedFixtures]);
  });

  it.each(forbiddenFixtures.map((fixture) => [fixture.id, fixture] as const))('rejects forbidden import %s', (_id, fixture) => {
    expect(messages.get(fixture.id)).toHaveLength(1);
  });

  it.each(allowedFixtures.map((fixture) => [fixture.id, fixture] as const))('allows intended boundary import %s', (_id, fixture) => {
    expect(messages.get(fixture.id)).toEqual([]);
  });
});
