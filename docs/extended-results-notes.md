# Extended result contracts

The fixtures and expected rows are written from the public README, exported types and documented consumer behavior. The tests never inspect query text, parameter order, expression classes or private functions. Numeric casts use values that differ from lexical ordering. Aggregation fixtures distinguish first/last/min/max/average. Case generation expands declared semantic axes; expected row IDs are independent fixtures, not produced by the library.

Covered axes:

- JSON sort casts `int`, `float`, `text`, `boolean`, `timestamp`, both directions, ties and null/missing values.
- Aggregations `first`, `last`, `min`, `max`, `avg`, both directions, discriminating numeric arrays. Cast interactions cover numeric types with all five, text/timestamp with first/last/min/max and boolean with first/last. Missing and empty arrays have explicit expectations.
- Indexed aggregate paths cover indices `0` and `-1` before/after one wildcard and without a wildcard, both path forms, `min`/`max`/`avg`, both directions, empty and missing values. Ordinary scalar sorting also covers `-1`. PostgreSQL text-array paths use parsed index segments; `last` is translated to PostgreSQL's `-1` index.
- Search types plain/phrase/prefix/tsquery × six search scopes × default/insensitive modes, distinguishing keys, numeric/string/boolean values and null. Each exported language is exercised with a numeric token; English/simple additionally distinguish stemming. The numeric smoke tests do not claim linguistic conformance for every language.
- Array membership with mixed primitives, duplicate requirements, same-element object matching and separate object requirements. A nested array requirement matches one complete array element, preserving element order; separate top-level requirements can match separate elements in any order. Array endpoints cover strings, numbers, booleans, null, objects and nested arrays, both path forms.
- Literal quotes, SQL-looking input, regex punctuation, Unicode, newline and empty strings for scalar and JSON equality.
- Default limit on 52 rows, omitted aliases/config/projection, empty config, projection multiplicity and offset pages with tied primary sort values.
- Consumer unit contracts cover cursor/path round trips, invalid inputs, field-specific types and a static import boundary for the black-box test cohort.

## Regression fixes and compatibility decisions

The result suite now treats all these cases as ordinary passing contracts; there are no expected failures in this cohort.

- **Object and nested-array endpoints** compare the complete JSON object. First/last position, extra-property negatives and literal SQL-looking object keys and values are covered. Nested-array equality distinguishes element order, extra elements, subsets and scalar values.
- **First/last sort casts** accept numeric strings and timestamps consistently with other JSON sort casts. JSON numbers cast to `int` retain PostgreSQL's existing rounding (including negative halves); they are not converted to integer text first. Paths with and without wildcards, empty arrays and missing arrays have explicit cases.
- **Nested object and array members in array_contains** use exact JSON member equality, while allowing extra top-level fields in the matching array element. All required fields must match one element. Recursive partial containment is an extension, not the current contract: an extra property inside the nested object prevents equality. Nested arrays require the same elements in the same order, including nulls; subsets, extra elements, reversed sequences and scalar values do not match. Literal SQL-looking keys and values remain bound data.
- **Timestamp offsets** preserve wall-clock ordering, consistent with the exported `timestamp` cast. They do not imply `timestamptz` or instant ordering. Both directions are explicit regression cases.

The initial strict run reproduced 16 failing cast/object-endpoint cases before production changes. Additional exact nested member tests also failed before their implementation. Expected IDs come from declared equality and ordering rules rather than SQL output.

Boolean min/max and nonnumeric average have no assumed semantics. Collation-specific text ordering, arbitrary language stemming corpora, unbounded JSON nesting and all possible filter expressions cannot be exhaustively enumerated by a finite fixture set.

Root-array sorting paths (`[]` or `["*"]`) are not covered as a supported contract: empty paths are rejected and a standalone wildcard currently produces an invalid PostgreSQL path. Named-array paths with and without wildcards are covered; root-array sort support requires a separate contract and fix.

Aggregation paths with more than one wildcard are not a supported compiler contract; the indexed-path fix covers zero or one wildcard. No claim is made that every accepted path string has valid aggregation semantics.

An empty object as a direct `array_contains` requirement (`[{}]`) has no supported matching semantics in this contract and remains an excluded input combination; it currently produces an invalid predicate. This fix does not define it as “any object”. Negative indices below `-1` retain their existing rejection.
