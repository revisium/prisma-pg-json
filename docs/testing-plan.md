# Query test DSL

The DSL adds result-based regression coverage before architecture changes. It
uses the public `buildQuery` API and preserves consumer signatures. Targeted
behavior fixes found by these tests are included; broad architecture changes are
separate. Existing suites remain in place.

## Writing a scenario

Every scenario contains fixture rows, public query options and independently
specified expected result rows. For example:

```ts
{
  name: 'age gte includes the boundary and excludes younger users',
  rows: [
    { id: 'younger', age: 17 },
    { id: 'boundary', age: 18 },
    { id: 'older', age: 19 },
  ],
  query: {
    tableName: 'users', tableAlias: 'u', fields: ['id'], fieldConfig,
    where: { age: { gte: 18 } }, orderBy: { age: 'asc' },
  },
  expected: { rows: [{ id: 'boundary' }, { id: 'older' }] },
}
```

`expected.sql` is optional: `{ text: 'SELECT ...', parameters: [...] }`.
Only two security scenarios currently specify it. Their SQL is formatted for
comparison, and bound parameters are compared separately in order. Parameters
are never interpolated into executable SQL. Helper tests ensure formatting
normalization still detects changes inside literals and quoted identifiers.

The integration runner executes result scenarios through Prisma on PostgreSQL.
A SELECT-only CTE named `users` shadows any physical table and supplies local
fixture rows via `jsonb_to_recordset`. No inserts, deletes or migrations are
needed. The fixture schema supports id, name, age, isActive, createdAt and data;
the separate consumer-workflow suite supplies its own sub-schema fixture CTEs. Expected rows are
compared in full, including projection and ordering. Multi-row expectations
use explicit ordering; fixtures should include plausible nonmatching rows.

The unit runner selects only cases with an explicit SQL expectation. A
result-only case does not create a passing unit test without an assertion.

## Implemented files and coverage

Paths below are relative to `src/__tests__/`.

| File | Scenarios | Focus |
| --- | ---: | --- |
| `dsl/query.cases.ts` | 5 | Readable introductory examples and two security cases |
| `cases/query-basics.cases.ts` | 5 | Empty input/filter, projection, JSON and timestamp results |
| `cases/scalar-filters.cases.ts` | 22 | Numeric boundaries, strings, boolean false, dates |
| `cases/logical-filters.cases.ts` | 6 | AND/OR/NOT grouping, intersecting and contradictory conditions |
| `cases/json-paths.cases.ts` | 7 | Dot/segment notation, indices, wildcard, missing path |
| `cases/json-comparisons.cases.ts` | 10 | Numeric operators and boolean type distinction |
| `cases/json-null-missing.cases.ts` | 6 | Explicit JSON null, absent keys and missing/null parents |
| `cases/json-arrays.cases.ts` | 6 | Contains/start/end, case handling, same-element object conditions |
| `cases/json-strings-search.cases.ts` | 10 | Literal punctuation, case, four search modes, keys/values |
| `cases/order-by.cases.ts` | 5 | Scalar NULL placement, ties, JSON numeric cast, first/last |
| `cases/offset-pagination.cases.ts` | 5 | Filtering before offset, short/empty pages, zero take |

The original 87 PostgreSQL scenarios remain as readable examples. The registry
now additionally includes:

| File | Focus |
| --- | --- |
| `cases/contract-matrix.cases.ts` | Scalar operators × logical contexts × nullable fixtures; cross-type logical pairs; JSON types/operators × path forms; modes; multi-element wildcard probes |
| `cases/extended-results.cases.ts` | Sort casts × aggregations × directions; search types × scopes × modes; languages; array endpoints; boundary inputs |
| `integration/consumer-workflows.spec.ts` | Complete keyset page traversal, sub-schema query/count workflows and public query fragments |
| `unit/consumer-contract.spec.ts` | Public input/type validation, path/cursor properties and an enforced public-import boundary |
| `integration/numeric-precision.spec.ts` | Adjacent positive/negative fractions across all numeric operators, float/numeric/integer columns and keyset boundaries |

The query registry contains ordinary PostgreSQL result scenarios and 44 explicit
unsupported-operation rejections. Two original scenarios also assert SQL and
bound parameters. Consumer workflows, numeric-precision scenarios and unit contract checks run separately.
All scenarios use ordinary assertions; no expected-failure mode remains.

Detailed axes, exclusions and observed disagreements:

- [Filter and logical matrix](contract-matrix-notes.md).
- [Extended sorting, search and arrays](extended-results-notes.md).
- [Consumer workflows](consumer-workflows-notes.md).

Infrastructure:

- `dsl/query-case.ts`: typed case contract, fixture fields and SQL assertion.
- `dsl/all-cases.ts`: explicit registry shared by both runners.
- `unit/query-cases.spec.ts`: optional SQL assertions.
- `unit/query-case-helper.spec.ts`: assertion regression and DSL type checks.
- `integration/query-cases.spec.ts`: PostgreSQL result runner.

## Running and interpreting the gates

Run from the repository root with a reachable test `DATABASE_URL`:

```sh
npm run test:contract
npm test -- --runTestsByPath src/__tests__/integration/query-cases.spec.ts src/__tests__/integration/consumer-workflows.spec.ts
npm test -- --testPathPattern=unit
npm run tsc
npm run lint:ci
```

`npm run test:contract` selects the query-case, consumer-workflow, numeric-precision
and consumer unit suites. All assertions are ordinary tests: failures block the gate.
Previously discovered defects now have normal regression cases. Ambiguous
extension proposals were resolved by preserving the documented/existing public
behavior and making its semantics explicit in the README. Unsupported root
operators remain rejection cases; they do not impose a new consumer feature.

No repo-local `VERIFICATION.md` is present; verification commands are derived
from package scripts. Existing integration suites may mutate their fixtures;
use a disposable database for the complete suite. SELECT-only guarantees apply
to the new query-case, consumer-workflow and numeric-precision runners. Consumer signatures
remain unchanged. The targeted NOT, cursor, numeric binding and JSON result fixes are separate
from a future architecture refactor.

## Coverage boundary

The new cohort imports the public package index, uses realistic input data and
asserts returned rows/page sequences/counts. Existing implementation-oriented
unit tests and snapshots are retained as additional regression evidence. Do not
regenerate expected rows or snapshots from the current engine to make a refactor
pass.

Supported behavior and rejected inputs are distinct coverage categories.
Regression fixtures protect the corrected ascending keyset NULL traversal,
first/last casts, object array endpoints and Prisma-compatible multi-child NOT.
Compatibility fixtures make wildcard quantification, nested object equality,
wall-clock timestamp ordering and sub-schema path grammar explicit; the linked
notes explain those decisions.

Every public filter property has a compile-time coverage-family entry. Named
matrices cover finite operator/type/path/context equivalence classes and
cross-products. They do not cover infinite values, arbitrary nesting or every
possible simultaneous option combination. Linguistic smoke tests for every
search language are not complete stemming dictionaries. Selected insertion/deletion
schedules, three-column keyset sorts and 24 sub-schema filter cases are covered.
This does not enumerate every concurrent schedule, every mixed sort or the
complete sub-schema/filter product. See the family notes for precise exclusions.

Line coverage complements this inventory; it does not prove consumer behavior.
The retained security suites continue to cover identifier escaping, parameters,
JSONPath injection and input limits beyond the two SQL examples in the DSL.

## Verification

Verification uses the focused consumer-contract gate, the retained complete test
suite on a disposable PostgreSQL database, TypeScript, ESLint and the package
build. Result regressions are run red before the production fix and green after
it. Existing snapshots are changed only when the corresponding intended behavior
changes; the multi-child NOT snapshot records the corrected independent
negations. There are no skipped known defects or expected failures in the new
consumer contract cohort.

Final local verification after the targeted fixes:

| Gate | Result |
| --- | --- |
| `npm run test:contract` | 2,055 passing assertions across four public-contract suites: 1,621 query cases, 353 consumer workflows, 53 numeric-precision scenarios and 28 unit contracts |
| Complete Jest coverage run on a disposable PostgreSQL database | 44 suites, 2,841 tests and 67 snapshots passed |
| TypeScript, global ESLint and package build | Passed |
| Statement / branch / function / line coverage | 94.75% / 89.10% / 95.63% / 94.68% |

The final numeric-precision regressions first produced 42 wrong-result failures
and 11 PostgreSQL integer-parameter conversion errors; all 53 pass after binding
finite fractions as decimal-string parameters cast to numeric. Raw JSONB decimal
fixtures additionally verify that automatic integer aggregate cursors reject
values whose precision was already lost during JSON parsing. The retained NOT
array test now names the independently expected Bob/Diana rows rather than
preserving the old negated-conjunction result. These targeted corrections preserve
consumer signatures and precede the proposed architecture refactor.
