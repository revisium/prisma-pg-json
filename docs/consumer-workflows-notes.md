# Public consumer workflow coverage

`src/__tests__/integration/consumer-workflows.spec.ts` imports the public package
index and Prisma client/adapter. Every database query uses SELECT-only fixture
CTEs. No engine functions are mocked and no SQL snapshot determines expected
rows. Source identities, filtering, ordering and pagination have independently
specified expected results.

Covered workflows:

- Complete scalar and JSON keyset traversal in both directions, ties, mixed
  directions, dates and booleans, NULL/missing values, both tiebreaker directions,
  and page sizes smaller/larger than the dataset.
- All five array aggregations across both directions, three path shapes (array,
  wildcard and wildcard with member), empty/missing arrays, ties and three page
  sizes. Cast tests cover negative-half integer rounding, numeric strings,
  booleans, NULL elements and exclusion of NULL from numeric aggregates.
- Precision-sensitive fractional cursor boundaries, malformed cursor decoding,
  value roundtrips, sort-change detection, insertion before/after the cursor and
  deletion after the cursor.
- SQL-projected cursors for text/timestamp aggregates and fractional averages,
  complete traversal with NULLs, ties and multiple page sizes. Projections use
  `expression::text` to preserve database numeric/date representation.
- Sub-schema object paths, array and nested wildcards, absent paths, row/table
  isolation and identity; filters, logical groups, ordered offset pages and
  matching counts; composed fragments, custom aliases/CTEs, creation-date joins,
  explicit JSON NULL placement and all public string filters.
- Public string, number, boolean, date and JSON filter fragments and both order
  fragment APIs composed into real queries.

Every assertion is an ordinary test. No expected-failure or strict-mode switch
remains. The earlier ASC NULL omissions and five aggregate extraction failures
are fixed and covered by passing contracts.

## Automatic cursor extraction has explicit limits

`extractCursorValues` can calculate scalar array endpoints and numeric min/max.
Automatic integer endpoints require integral numbers or integer strings. Fractional
JSON-number endpoints use SQL projection to preserve PostgreSQL's rounding: raw
JSONB decimal `2.4999999999999999` parses as JavaScript `2.5`, so rounding the parsed
number would invent the wrong cursor. Positive and negative raw-decimal traversal
regressions preserve database lexemes instead of constructing fixtures through
`JSON.stringify`. Text endpoints accept strings/booleans; converting JSON numbers or
objects to database text requires projection because parsing JSON can lose their
original numeric representation. Timestamp endpoint strings are passed through
for the same database cast used by ordering.

AVG extraction requires safe integer inputs and intermediate sums and an exactly
binary-representable average. Text/timestamp min/max depend on database collation
or timestamp interpretation. Fractional averages can depend on database
arithmetic. These unsupported automatic calculations throw an actionable error,
not a fabricated NULL cursor. Non-array aggregate inputs also require SQL projection. Automatic extraction
rejects ambiguous literal path segments and multiple wildcards. Nested-wildcard
aggregate ordering itself is unsupported, so projection cannot repair that SQL
ordering. Indexed paths using `0` and `-1` before or after a single wildcard have
full traversal tests in both string and segment-array forms; `-2` remains rejected.
Scalar Prisma `Decimal` values also need SQL projection rather than automatic
object conversion.

Consumers can use the existing public `generateOrderByParts` result to project
`(part.expression)::text` and pass the resulting string/NULL to `encodeCursor`.
This computes the cursor in the same database as ordering, without new public
options or APIs. The workflow tests demonstrate complete page traversal this way.
A PostgreSQL/Prisma probe showed numeric parameter `0.15000000000000002` arriving
as `0.15`, whereas its string representation preserved every digit. Keyset
conditions and scalar numeric filters now bind finite fractional numbers as
parameterized decimal strings with an explicit `::numeric` cast. This preserves
precision and keeps fractional comparisons against integer columns valid.

## Path compatibility and remaining scope

Sub-schema paths retain README's dot-notation and `[*]` grammar. `quoted.key`
selects nested members; it does not select the literal sibling key `"quoted.key"`.
Quoted literal-member syntax was never documented and is not introduced by this
change. A positive compatibility vector tests the nested member alongside a
literal dotted sibling. Literal dotted-member addressing needs a separate API
proposal rather than an invented expected-failure contract.

These finite fixtures do not prove every operator/value/nesting cross product,
arbitrary database collation, all timestamp input formats, or concurrent
transaction/isolation guarantees. Existing regression suites remain in place.
Verification uses package scripts (focused PostgreSQL Jest, TypeScript, ESLint)
because this repository has no local VERIFICATION.md contract.
