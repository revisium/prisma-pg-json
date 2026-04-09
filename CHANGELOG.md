# Changelog

All notable changes to this project will be documented in this file.

## [1.5.1] - 2026-04-07

### Fixed

- Support quoted/hyphenated keys in sub-schema path access (#29)

## [1.5.0] - 2026-02-26

### Added

- Keyset (cursor-based) pagination module (#27)
  - `encodeCursor` / `decodeCursor` for opaque cursor strings
  - `computeSortHash` for sort order change detection
  - `extractCursorValues` for cursor value extraction from result rows
  - `buildKeysetCondition` for multi-column WHERE conditions
- `generateOrderByParts` returns structured `OrderByPart[]` for keyset integration

## [1.4.1] - 2026-02-25

### Fixed

- Import paths for new modules (#26)

## [1.4.0] - 2026-01-15

### Added

- ORDER BY support for `createdAt` and other non-JSON columns (#25)

## [1.3.1] - 2026-01-14

### Fixed

- Table version ID handling in sub-schema queries (#24)

## [1.3.0] - 2026-01-13

### Changed

- Refactored sub-schema SQL generation into composable functions (#23)
  - `buildSubSchemaCte` — CTE generation
  - `buildSubSchemaWhere` — WHERE clause
  - `buildSubSchemaOrderBy` — ORDER BY clause

## [1.2.0] - 2026-01-13

### Added

- Sub-schema query builder for nested JSON schemas with wildcard array support (#22)
  - `buildSubSchemaQuery` / `buildSubSchemaCountQuery` — complete queries
  - `parsePath` — path parsing with `[*]` wildcard detection
  - CTE-based queries with `jsonb_array_elements()` and CROSS JOIN LATERAL

## [1.1.0] - 2025-12-23

### Added

- `searchType` option for full-text search: `plain`, `phrase`, `prefix`, `tsquery` (#21)

## [1.0.3] - 2025-12-19

### Changed

- npm publish configuration updates (#20)

## [1.0.2] - 2025-12-19

### Added

- Export `SEARCH_LANGUAGES` array and `SearchLanguage` type (#19)

## [1.0.1] - 2025-11-20

### Fixed

- npm publish setup (#18)

## [1.0.0] - 2025-11-20

### Changed

- **Breaking:** Updated to Prisma 7 (#17)
- Peer dependency now supports `@prisma/client` ^5.0.0, ^6.0.0, or ^7.0.0

## [0.7.0] - 2025-10-12

### Added

- `searchIn` option for full-text search scope: `all`, `values`, `keys`, `strings`, `numbers`, `booleans` (#16)

## [0.6.0] - 2025-10-11

### Added

- Full-text search on JSON fields using PostgreSQL `tsvector`/`tsquery` (#15)
- `search` operator with language support (`simple`, `english`, `russian`, etc.)

## [0.5.0] - 2025-09-29

### Changed

- Improved types and naming conventions (#14)
- Refactored JSON filter module into strategy pattern with operator classes (#13)

## [0.4.1] - 2025-09-28

### Fixed

- `array_contains` operator for partial array matching (#6)

## [0.4.0] - 2025-09-28

### Added

- Generic TypeScript types for `FieldConfig`, `WhereConditionsTyped`, `OrderByConditionsTyped` (#5)
- Updated `generateWhere` and `generateOrderBy` signatures with generics (#4)

## [0.3.0] - 2025-09-28

### Added

- ORDER BY support for JSON array aggregation: `min`, `max`, `avg`, `first`, `last` (#3)

## [0.2.0] - 2025-09-28

### Added

- Initial query builder with WHERE and ORDER BY generation
- String, number, boolean, date, and JSON filter types
- JSON path queries with dot notation, bracket notation, wildcards, and negative indices
- Prisma adapter pattern (no direct `@prisma/client` dependency)
- Logical operators: AND, OR, NOT
