# Filter contract matrix

`src/__tests__/cases/contract-matrix.cases.ts` defines input fixtures, public
query options and independently specified matching IDs. It imports types through
the package index. No query text, engine classes or private helper determines an
expected result. Generated cases expand named axes; they do not evaluate a copy
of the filtering engine.

## Finite axes

| Family | Axes | Cases |
| --- | --- | ---: |
| Scalar and JSON predicate contexts | 60 explicit predicates × direct, AND guard, OR guard, NOT object, NOT singleton array, double NOT, OR within AND | 420 |
| Nullable scalar contexts | The same 59 scalar predicates × 7 contexts, with an additional all-null row that must remain excluded | 413 |
| Logical pairs | 5 representative scalar/JSON predicates × 5 predicates × AND, OR, NOT(AND), NOT(OR) | 100 |
| JSON operators and paths | 9 numeric + 11 string + 6 boolean predicates × 10 path forms | 260 |
| Case modes | 3 scalar + 3 JSON substring operators × default/insensitive | 12 |
| Multi-element wildcards | 6 positive predicates + 3 existential compatibility predicates × string/segment-array paths | 18 |
| Multi-child NOT | Independent negations, grouped children, object distinction and nested null semantics | 5 |

Total: 1,228 entries: 1,184 ordinary result contracts and 44 unsupported-operation
rejection contracts. No expected-failure scenarios remain. The shared registry
also includes the original examples and extended sorting/search/array cases.

Scalar predicates cover every public operator, including nested `not`, double
`not`, string comparisons/search and date shorthand/operators with both `Date`
and string inputs. Logical fixture expectations combine explicit matching-ID
sets using elementary Boolean set operations; they never call the library to
construct expected results. Null fixture variants prevent a refactor from
accidentally treating UNKNOWN as a matching result under negation.

JSON paths cover `''`, `[]`, member string/array, nested string/array, indexed
string/array and wildcard string/array notation. Indexed fixtures use one
selected element; the separate multi-element wildcard fixtures distinguish
existential matching from element-wise conjunction and negated membership.

`filterContractCoverage` uses exhaustive `Record<keyof PublicFilter, string>`
checks. Adding a public filter property therefore requires assigning its coverage
family before typecheck can pass. These pointers supplement actual scenarios;
they do not prove that every arbitrary combination of properties is covered.

## Compatibility decisions and fixes

Empty paths are documented for recursive search; scalar root equality also works
in the fixture contract. The other 44 root-path/operator combinations reject the
query. Their normal tests assert this rejection; they do not require extending
the consumer API during refactoring. Uniform root-operator support would be a
separate feature. Empty-path search lives in the extended matrix.

Multi-child `NOT` follows the README's Prisma-compatible filtering promise:
negate each child independently and combine with AND. An object-form `NOT`
negates the conjunction of its fields. The new result fixtures distinguish both
forms, grouped OR/AND children, nested negation and SQL NULLs. Before the fix,
four of five focused cases failed; after the minimal fix, all five passed. The
one corresponding SQL snapshot changed from `NOT (a AND b)` to
`NOT (a) AND NOT (b)` after checking the result fixtures.

Wildcard operators retain their existing any-matching-element behavior. Each
predicate independently needs a matching element; multiple predicates do not
promise one shared element. Therefore `[17, 19]` satisfies `gte: 18, lt: 19`,
`not: 19` and `notIn: [19]`. Both path notations have explicit regression vectors
for these cases. Changing this to same-element conjunction or negated membership
would alter compatibility, so no such engine change was made. The README now
states this behavior directly.

All these scenarios run as ordinary assertions. No mode converts a failure into
an expected pass; unsupported combinations remain explicit rejection tests.

Unbounded logical depth, arbitrary JSON shape, collation, every Unicode value,
and the Cartesian product of every option remain infinite input spaces. This
matrix covers declared equivalence classes and systematic interactions, not a
mathematical proof over every possible query.
