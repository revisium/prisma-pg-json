<div align="center">

# prisma-pg-json

[![codecov](https://codecov.io/gh/revisium/prisma-pg-json/graph/badge.svg?token=Q798833A3W)](https://codecov.io/gh/revisium/prisma-pg-json)
[![GitHub License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/revisium/prisma-pg-json/blob/master/LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/revisium/prisma-pg-json)](https://github.com/revisium/prisma-pg-json/releases)

**Type-safe PostgreSQL JSON query builder for Prisma**

</div>

## Overview

A universal query builder that extends Prisma's capabilities while preserving familiar WHERE and ORDER BY API. Generate parameterized SQL queries for PostgreSQL through `$queryRaw` with advanced JSON/JSONB operations that standard Prisma doesn't support.

**Goal**: Replicate Prisma's query interface using `$queryRaw` while adding powerful JSON functionality.

## Features

- 🎯 **Prisma-compatible API** - Familiar `where` and `orderBy` syntax from Prisma
- 🔍 **JSON Path queries** - Access nested data with `['key', 'nested']` or wildcard patterns
- 🌟 **Wildcard support** - Query arrays with `*`, array indices `[0]`, `[-1]`
- 🚀 **JSON sorting** - Order by nested JSON fields with type casting and aggregations
- 🔧 **Extended filters** - All Prisma filters plus advanced JSON operations
- 🔎 **Full-text search** - PostgreSQL FTS in JSON with language support and phrase matching
- 🎨 **Logical operators** - AND, OR, NOT combinations just like Prisma
- 📦 **Prisma native** - Uses `Prisma.Sql` for safe parameterized queries
- ⚡ **Universal** - Works with any table structure, not schema-dependent

## Prisma vs prisma-pg-json

| Feature | Standard Prisma | This Library |
|---------|----------------|--------------|
| **Basic filters** | `contains`, `gt`, `gte`, `in`, etc. | ✅ Same API |
| **Logical operators** | `AND`, `OR`, `NOT` | ✅ Same API |
| **JSON field access** | `metadata: { path: ['key'], equals: 'value' }` | ✅ Same + wildcards |
| **JSON array queries** | Limited | ✅ `path: ['tags', '*', 'name']` |
| **Array indices** | ❌ Not supported | ✅ `path: ['items', 0]` or `'items[0]'` |
| **Negative indices** | ❌ Not supported | ✅ `path: ['items', -1]` or `'items[-1]'` |
| **JSON sorting** | ❌ Not supported | ✅ With type casting and aggregations |
| **Full-text search** | ❌ Not in JSON | ✅ PostgreSQL FTS with language support |
| **Wildcard paths** | ❌ Not supported | ✅ `'tags[*].name'` syntax |
| **Path formats** | Array only | ✅ Array `['a', 'b']` or string `'a.b'` |
| **Query method** | ORM methods | `$queryRaw` with generated SQL |

## Installation

```bash
npm install @revisium/prisma-pg-json
```

## Usage

### Setup

Before using the library, you must configure it with your Prisma client:

```typescript
import { configurePrisma } from '@revisium/prisma-pg-json';
import { Prisma } from '@prisma/client';

// Configure once at application startup
configurePrisma(Prisma);
```

> **Important**: Call `configurePrisma()` before using any query building functions. This allows the library to work with any Prisma client version and custom import paths.

### buildQuery — Complete Query Builder

For simple cases, `buildQuery()` assembles a complete `SELECT ... WHERE ... ORDER BY ... LIMIT ... OFFSET` query in one call:

```typescript
import { buildQuery, configurePrisma } from '@revisium/prisma-pg-json';
import { Prisma, PrismaClient } from '@prisma/client';

configurePrisma(Prisma);
const prisma = new PrismaClient();

const sql = buildQuery({
  tableName: 'users',
  tableAlias: 'u',                // optional, defaults to first char of tableName
  fields: ['id', 'name', 'age'],  // optional, defaults to ['*']
  fieldConfig: {
    name: 'string',
    age: 'number',
    isActive: 'boolean',
    metadata: 'json',
  },
  where: {
    name: { contains: 'john', mode: 'insensitive' },
    age: { gte: 18 },
    metadata: { path: 'role', equals: 'admin' },
  },
  orderBy: [
    { age: 'desc' },
    { metadata: { path: 'score', type: 'int', direction: 'asc' } },
  ],
  take: 20,   // default: 50
  skip: 0,    // default: 0
});

const results = await prisma.$queryRaw(sql);
```

### Core Functions — generateWhere & generateOrderBy

For more control (JOINs, CTEs, keyset pagination), use the individual functions to build SQL fragments:

```typescript
import { generateWhere, generateOrderBy, FieldConfig } from '@revisium/prisma-pg-json';
import { PrismaClient, Prisma } from '@prisma/client';
import { configurePrisma } from '@revisium/prisma-pg-json';

// Configure the library
configurePrisma(Prisma);

const prisma = new PrismaClient();

// Define your field types (FieldConfig maps field names to types)
const fieldConfig: FieldConfig = {
  id: 'string',        // FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json'
  name: 'string',
  age: 'number',
  isActive: 'boolean',
  createdAt: 'date',
  metadata: 'json',
};

// Generate WHERE clause
const whereClause = generateWhere({
  where: {
    name: { contains: 'john', mode: 'insensitive' },
    age: { gte: 18 },
  },
  fieldConfig,
  tableAlias: 'u',
});

// Generate ORDER BY clause
const orderByClause = generateOrderBy({
  orderBy: [
    { name: 'asc' },
    { createdAt: 'desc' }
  ],
  fieldConfig,
  tableAlias: 'u',
});

// Use in raw SQL query
const query = Prisma.sql`
  SELECT * FROM users u
  WHERE ${whereClause}
  ${orderByClause}
`;

const results = await prisma.$queryRaw(query);
```

### JSON Path Queries

Access nested JSON data with flexible path syntax - use string or array notation:

```typescript
const whereClause = generateWhere({
  where: {
    // Path as array (recommended for complex paths)
    metadata: {
      path: ['settings', 'theme'],
      equals: 'dark'
    },

    // Path as string with dot notation
    metadata: {
      path: 'user.preferences.language',
      equals: 'en'
    },

    // Array wildcard - matches any array element
    metadata: {
      path: ['tags', '*', 'name'],
      string_contains: 'important'
    },

    // String path with wildcards
    metadata: {
      path: 'items[*].status',
      equals: 'active'
    },

    // Array indices with array notation
    metadata: {
      path: ['items', 0, 'status'],
      equals: 'active'
    },

    // Array indices with string notation
    metadata: {
      path: 'items[0].price',
      gte: 100
    },

    // Negative indices (from end)
    metadata: {
      path: ['history', -1, 'action'],
      equals: 'created'
    },

    // Negative indices with string notation
    metadata: {
      path: 'reviews[-1].rating',
      gte: 4
    },

    // Array contains object
    metadata: {
      path: ['reviews'],
      array_contains: { rating: 5, verified: true }
    }
  },
  fieldConfig: { metadata: 'json' },
  tableAlias: 't'
});
```

### JSON Sorting

Sort by nested JSON fields with type casting and aggregations. When sorting by JSON arrays, use aggregations to determine sort value:

**Supported types**: `text`, `int`, `float`, `boolean`, `timestamp`
**Supported aggregations** (for JSON arrays): `min`, `max`, `avg`, `first`, `last`

```typescript
const orderByClause = generateOrderBy({
  orderBy: [
    // Sort by nested JSON number (array path)
    {
      metadata: {
        path: ['stats', 'score'],
        direction: 'desc',
        type: 'float'
      }
    },

    // Sort by nested JSON date (string path)
    {
      metadata: {
        path: 'timestamps.lastActivity',
        direction: 'desc',
        type: 'timestamp'
      }
    },

    // Sort by array element (array notation)
    {
      metadata: {
        path: ['priorities', 0],
        direction: 'asc',
        type: 'int'
      }
    },

    // Sort by array element (string notation)
    {
      metadata: {
        path: 'ratings[0].value',
        direction: 'desc',
        type: 'float'
      }
    },

    // Sort by array aggregation - average
    {
      metadata: {
        path: 'scores',
        direction: 'desc',
        type: 'float',
        aggregation: 'avg'
      }
    },

    // Sort by array aggregation - max value
    {
      metadata: {
        path: ['reviews', '*', 'rating'],
        direction: 'desc',
        type: 'int',
        aggregation: 'max'
      }
    },

    // Sort by first element
    {
      metadata: {
        path: 'tags',
        direction: 'desc',
        aggregation: 'first'
      }
    },

    // Sort by last element
    {
      metadata: {
        path: ['history', '*', 'timestamp'],
        direction: 'desc',
        type: 'timestamp',
        aggregation: 'last'
      }
    }
  ],
  fieldConfig: { metadata: 'json' },
  tableAlias: 't'
});
```

### Filter Types

Complete list of available filters for each field type:

#### String Filters
```typescript
name: {
  equals: 'john',              // Exact match
  not: 'admin',                // Not equal
  contains: 'john',            // Contains substring
  startsWith: 'mr',            // Starts with
  endsWith: 'gmail.com',       // Ends with
  in: ['active', 'pending'],   // In array
  notIn: ['deleted', 'banned'], // Not in array
  mode: 'insensitive'          // Case-insensitive (works with contains, startsWith, endsWith)
}
```

#### Number Filters
```typescript
age: {
  equals: 25,                  // Exact match
  not: 0,                      // Not equal
  gt: 18,                      // Greater than
  gte: 18,                     // Greater than or equal
  lt: 65,                      // Less than
  lte: 65,                     // Less than or equal
  in: [18, 25, 30],           // In array
  notIn: [0, 999]             // Not in array
}
```

#### Boolean Filters
```typescript
isActive: true,                // Direct boolean value
isDeleted: {
  equals: false,               // Explicit equals
  not: true                    // Not equal
}
```

#### Date Filters
```typescript
createdAt: {
  equals: new Date('2024-01-01'),  // Exact date
  not: new Date('2024-01-01'),     // Not equal
  gt: new Date('2024-01-01'),      // After date
  gte: new Date('2024-01-01'),     // After or equal
  lt: new Date('2025-01-01'),      // Before date
  lte: new Date('2025-01-01'),     // Before or equal
  in: [date1, date2],              // In array
  notIn: [date3, date4]            // Not in array
}
```

#### JSON Filters
```typescript
metadata: {
  path: ['config', 'enabled'],     // Required: JSON path (string | string[])

  // Value comparisons
  equals: true,                    // Exact match
  not: false,                      // Not equal

  // String operations (on JSON strings)
  string_contains: 'text',         // Contains substring
  string_starts_with: 'prefix',   // Starts with
  string_ends_with: 'suffix',     // Ends with

  // Full-text search (PostgreSQL FTS)
  search: 'database performance',  // Full-text search with stemming
  searchLanguage: 'english',       // Language config ('simple', 'english', 'russian', etc.)
  searchType: 'plain',             // 'plain' (AND) or 'phrase' (exact phrase)
  searchIn: 'values',              // 'all' (default), 'values', 'keys', 'strings', 'numbers', 'booleans'

  // Number/Date operations (on JSON numbers/dates)
  gt: 10,                          // Greater than
  gte: 10,                         // Greater than or equal
  lt: 100,                         // Less than
  lte: 100,                        // Less than or equal

  // Array operations (for JSON arrays)
  array_contains: ['value1', 'value2'],    // Array contains ALL specified elements (always array)
  array_starts_with: 'first_value',       // First array element equals value
  array_ends_with: 'last_value',          // Last array element equals value

  // Array/object membership
  in: ['value1', 'value2'],        // Value in array
  notIn: ['value3', 'value4'],     // Value not in array

  // Case sensitivity (works with string operations)
  mode: 'insensitive'              // Case-insensitive matching
}
```

### Full-Text Search in JSON

PostgreSQL full-text search (FTS) with support for different languages, search types, and recursive path searching:

```typescript
const whereClause = generateWhere({
  where: {
    // Search across entire JSON document (root level)
    metadata: {
      path: '',  // or path: []
      search: 'postgresql database',
    },

    // Search in specific field
    metadata: {
      path: 'content',
      search: 'machine learning',
    },

    // Search in nested field
    metadata: {
      path: 'article.body',
      search: 'artificial intelligence',
    },

    // Search in array (searches all elements recursively)
    metadata: {
      path: 'tags',
      search: 'javascript',
    },

    // Search with specific language (better stemming)
    metadata: {
      path: 'description',
      search: 'running quickly',
      searchLanguage: 'english',  // 'simple', 'english', 'russian', 'french', etc.
    },

    // Phrase search (exact phrase match)
    metadata: {
      path: 'text',
      search: 'full-text search',
      searchType: 'phrase',  // words must appear in this exact order
    },

    // Plain search (default - all words must be present, AND logic)
    metadata: {
      path: 'content',
      search: 'database performance',
      searchType: 'plain',  // both 'database' AND 'performance' must be present
    },

    // Search only in values (exclude JSON keys from search)
    metadata: {
      path: '',
      search: 'Anton',
      searchIn: 'values',  // searches only values, not field names
    },

    // Search only in JSON keys (field names)
    metadata: {
      path: '',
      search: 'username',
      searchIn: 'keys',  // searches only field names
    },

    // Search only in string values
    metadata: {
      path: 'data',
      search: 'text',
      searchIn: 'strings',  // only string values
    },

    // Search only in numeric values
    metadata: {
      path: 'stats',
      search: '42',
      searchIn: 'numbers',  // only numeric values
    },

    // Search only in boolean values
    metadata: {
      path: 'flags',
      search: 'true',
      searchIn: 'booleans',  // only boolean values
    },
  },
  fieldConfig: { metadata: 'json' },
  tableAlias: 't'
});
```

#### Search Behavior

**Search Types:**
- `plain` (default): Uses `plainto_tsquery` - all words must be present (AND logic)
  - `'database performance'` → finds docs with both "database" AND "performance"
- `phrase`: Uses `phraseto_tsquery` - exact phrase in order
  - `'full text search'` → finds only exact phrase "full text search"

**Search Languages:**
- `'simple'` (default): No stemming, works with any language (UTF-8)
- `'english'`: English stemming (running → run)
- `'russian'`: Russian stemming
- `'french'`, `'german'`, `'spanish'`, etc.: Language-specific stemming

**Search Scope (`searchIn`):**
- `'all'` (default): Searches in JSON keys + all values (strings, numbers, booleans)
- `'values'`: Searches only in values (strings + numbers + booleans), excludes field names
- `'keys'`: Searches only in JSON field names, excludes values
- `'strings'`: Searches only in string values
- `'numbers'`: Searches only in numeric values
- `'booleans'`: Searches only in boolean values (`true`/`false`)

**Note:** `null` values are not indexed by PostgreSQL FTS and cannot be searched.

**Path Behavior:**
- Searches are always **recursive** - searches the specified path and all nested levels
- Empty path `''` or `[]`: searches entire JSON document
- Specific path `'content'`: searches in that field and all nested structures
- Array path `'tags'`: searches across all array elements recursively

#### Examples

```typescript
// Find documents about "PostgreSQL" OR "MySQL" - use OR operator
{
  OR: [
    { metadata: { path: '', search: 'PostgreSQL' } },
    { metadata: { path: '', search: 'MySQL' } }
  ]
}

// Find documents with "database" in title AND "performance" in content
{
  AND: [
    { metadata: { path: 'title', search: 'database' } },
    { metadata: { path: 'content', search: 'performance' } }
  ]
}

// Combine FTS with other filters
{
  AND: [
    { metadata: { path: '', search: 'javascript' } },
    { metadata: { path: 'published', equals: true } },
    { metadata: { path: 'rating', gte: 4 } }
  ]
}
```

### Logical Operators

Combine filters with AND, OR, NOT:

```typescript
const whereClause = generateWhere({
  where: {
    AND: [
      { age: { gte: 18 } },
      {
        OR: [
          { status: 'active' },
          { priority: { gte: 5 } }
        ]
      }
    ],
    NOT: {
      email: { contains: 'spam' }
    }
  },
  fieldConfig,
  tableAlias: 'u'
});
```

## Advantages over Standard Prisma

### JSON Path Operations
Standard Prisma only supports simple JSON access. This library provides:

- **Wildcard queries**: `tags[*].name` to search all array elements
- **Array indices**: `items[0]`, `items[-1]` for specific positions
- **Deep nesting**: Complex paths like `['user', 'settings', 'preferences', 'theme']`
- **Array operations**: Check if arrays contain specific objects

### JSON Sorting
Prisma doesn't support sorting by JSON fields. This library enables:

- Sort by nested JSON values with proper type casting
- Multiple JSON sorts with different types (numeric, text, date)
- Array element sorting

### Keyset Pagination

Standard OFFSET-based pagination loses rows when data has duplicate sort values or when rows are inserted/deleted between pages. Keyset (cursor-based) pagination solves this by using the last seen row's values to determine the starting point for the next page.

The library provides utilities for building keyset pagination with multi-column sort support:

#### Cursor Encoding / Decoding

```typescript
import {
  Prisma,
  encodeCursor,
  decodeCursor,
  computeSortHash,
  extractCursorValues,
  OrderByPart,
} from '@revisium/prisma-pg-json';

// OrderByPart describes each sort column
const parts: OrderByPart[] = [
  {
    expression: Prisma.sql`r."createdAt"`,
    direction: 'DESC',
    fieldName: 'createdAt',
    isJson: false,
  },
];

// Compute a hash of the sort configuration (detects sort changes between pages)
const sortHash = computeSortHash(parts);

// Extract cursor values from a row
const row = { createdAt: new Date('2025-01-01'), versionId: 'v-123' };
const values = extractCursorValues(row, parts);
// → ['2025-01-01T00:00:00.000Z']

// Encode into an opaque cursor string
const cursor = encodeCursor(values, 'v-123', sortHash);

// Decode back
const decoded = decodeCursor(cursor);
// → { values: ['2025-01-01T00:00:00.000Z'], tiebreaker: 'v-123', sortHash: '...' }
```

#### Building the WHERE Condition

`buildKeysetCondition` generates a multi-column WHERE clause that skips past the cursor position. It handles mixed ASC/DESC directions and NULL values:

```typescript
import { buildKeysetCondition } from '@revisium/prisma-pg-json';

const condition = buildKeysetCondition(
  parts,                              // OrderByPart[] — sort columns
  decoded.values,                     // cursor values from decodeCursor
  decoded.tiebreaker,                 // tiebreaker value (e.g., row ID)
  Prisma.sql`r."versionId"`,          // tiebreaker SQL expression
);

// Use in your query
const query = Prisma.sql`
  SELECT * FROM rows r
  WHERE r."tableVersionId" = ${tableVersionId}
    AND ${condition}
  ORDER BY r."createdAt" DESC, r."versionId" DESC
  LIMIT ${take + 1}
`;
```

#### Using with generateOrderByParts

`generateOrderByParts` (from the ORDER BY module) produces the `OrderByPart[]` array needed by the keyset utilities:

```typescript
import { generateOrderByParts } from '@revisium/prisma-pg-json';

const parts = generateOrderByParts({
  tableAlias: 'r',
  orderBy: [{ createdAt: 'desc' }, { data: { path: 'priority', type: 'int', direction: 'asc' } }],
  fieldConfig: { createdAt: 'date', data: 'json' },
});

const sortHash = computeSortHash(parts);
const cursorValues = extractCursorValues(lastRow, parts);
const cursor = encodeCursor(cursorValues, lastRow.id, sortHash);
```

### Universal Design
Works with any table structure - just define your field types and start querying.

### Sub-Schema Queries

Query nested JSON structures across multiple tables using CTE-based SQL with wildcard array support. Designed for schemas where JSONB fields contain `$ref`-style references to other data.

```typescript
import {
  buildSubSchemaCte,
  buildSubSchemaWhere,
  buildSubSchemaOrderBy,
  buildSubSchemaQuery,
  buildSubSchemaCountQuery,
  parsePath,
  MAX_TAKE,
  MAX_SKIP,
} from '@revisium/prisma-pg-json';
```

#### Composable Functions

Build CTE, WHERE, and ORDER BY separately for full control:

```typescript
// 1. Build the CTE that extracts sub-schema items
const cte = buildSubSchemaCte({
  tables: [
    {
      tableId: 'characters',
      tableVersionId: 'ver_123',
      paths: [
        { path: 'avatar' },          // simple field
        { path: 'gallery[*]' },      // array with wildcard
        { path: 'items[*].image' },  // nested in array
      ],
    },
  ],
});

// 2. Build WHERE clause
const whereClause = buildSubSchemaWhere({
  where: {
    tableId: 'characters',
    data: { path: 'status', equals: 'uploaded' },
  },
  tableAlias: 's',  // optional, for JOINed queries
});

// 3. Build ORDER BY clause
const orderByClause = buildSubSchemaOrderBy({
  orderBy: [{ rowId: 'asc' }, { fieldPath: 'asc' }],
  tableAlias: 's',
});

// 4. Compose the final query
const query = Prisma.sql`
  ${cte}
  SELECT s.* FROM sub_schema_items s
  ${whereClause}
  ${orderByClause}
  LIMIT 50 OFFSET 0
`;
```

#### All-in-One Functions

For simple cases, `buildSubSchemaQuery` and `buildSubSchemaCountQuery` combine everything:

```typescript
const query = buildSubSchemaQuery({
  tables: [{ tableId: 'characters', tableVersionId: 'ver_123', paths: [{ path: 'avatar' }] }],
  where: { data: { path: 'type', equals: 'image' } },
  orderBy: [{ rowId: 'asc' }],
  take: 50,
  skip: 0,
});

const countQuery = buildSubSchemaCountQuery({
  tables: [{ tableId: 'characters', tableVersionId: 'ver_123', paths: [{ path: 'avatar' }] }],
  where: { data: { path: 'type', equals: 'image' } },
});
```

#### Path Format

The `path` field uses dot-notation for nested objects and `[*]` for arrays:

| Path | Description | Generated SQL |
|------|-------------|---------------|
| `'avatar'` | Top-level field | `data->'avatar'` |
| `'profile.photo'` | Nested object | `data->'profile'->'photo'` |
| `'gallery[*]'` | Array elements | `jsonb_array_elements(data->'gallery')` |
| `'items[*].image'` | Field inside array | CROSS JOIN LATERAL with element access |

#### Pagination Limits

- `MAX_TAKE = 10000` — maximum rows per page
- `MAX_SKIP = 1000000` — maximum offset

### Path Utilities

Parse, convert, and validate JSON path strings:

```typescript
import { parseJsonPath, arrayToJsonPath, validateJsonPath } from '@revisium/prisma-pg-json';

// Parse string path to array of segments
parseJsonPath('user.profile.name')     // ['user', 'profile', 'name']
parseJsonPath('items[0].price')        // ['items', '0', 'price']
parseJsonPath('tags[*].name')          // ['tags', '*', 'name']
parseJsonPath('items[-1]')             // ['items', 'last']

// Convert array back to string path
arrayToJsonPath(['user', 'name'])        // 'user.name'
arrayToJsonPath(['items', '0', 'price']) // 'items[0].price'
arrayToJsonPath(['tags', '*', 'name'])   // 'tags[*].name'

// Validate path syntax
validateJsonPath('user.email')    // { isValid: true }
validateJsonPath('items[')        // { isValid: false, error: 'Unclosed bracket in JSON path' }
validateJsonPath('')              // { isValid: false, error: 'JSON path cannot be empty' }
```

`parseJsonPath` accepts both string and array input — if passed an array, it returns it unchanged.

## Architecture

```
src/
├── index.ts                  # Public exports
├── prisma-adapter.ts         # Proxy pattern — no direct @prisma/client dependency
├── query-builder.ts          # buildQuery() — complete SELECT builder
├── types.ts                  # Filter, OrderBy, FieldConfig types
│
├── where/                    # WHERE clause generation
│   ├── string.ts             # String filters (equals, contains, startsWith, ...)
│   ├── number.ts             # Number filters (gt, gte, lt, lte, in, ...)
│   ├── boolean.ts            # Boolean filters (equals, not)
│   ├── date.ts               # Date filters (gt, gte, lt, lte, in, ...)
│   └── json/                 # JSON/JSONB filters — strategy pattern
│       ├── json-filter.ts    # Entry point, path validation
│       ├── operator-manager.ts  # Operator registry and routing
│       ├── operators/        # 14 operator classes (equals, gt, search, ...)
│       │   └── base-operator.ts # Abstract base class
│       └── jsonpath/         # PostgreSQL jsonpath SQL helpers
│
├── orderBy/                  # ORDER BY clause generation
│   └── generateOrderBy.ts    # generateOrderBy, generateOrderByClauses, generateOrderByParts
│
├── keyset/                   # Cursor-based pagination
│   ├── cursor.ts             # encodeCursor, decodeCursor, computeSortHash, extractCursorValues
│   └── condition.ts          # buildKeysetCondition — multi-column WHERE
│
├── sub-schema/               # CTE queries for nested JSON schemas
│   ├── sub-schema-builder.ts # buildSubSchemaCte, buildSubSchemaWhere, buildSubSchemaOrderBy, ...
│   └── types.ts              # SubSchemaTableConfig, SubSchemaWhereInput, ...
│
└── utils/
    ├── parseJsonPath.ts      # parseJsonPath, arrayToJsonPath, validateJsonPath
    └── sql-jsonpath.ts       # jsonb_path_exists SQL helpers
```

### Data Flow

```
buildQuery(options)
  ├── generateWhere(where, fieldConfig, tableAlias)
  │     ├── generateStringFilter(fieldRef, filter)
  │     ├── generateNumberFilter(fieldRef, filter)
  │     ├── generateBooleanFilter(fieldRef, filter)
  │     ├── generateDateFilter(fieldRef, filter)
  │     └── generateJsonFilter(fieldRef, filter)
  │           └── OperatorManager → BaseOperator subclasses
  │
  ├── generateOrderBy(orderBy, fieldConfig, tableAlias)
  │     └── processJsonOrder → type casting + aggregation subqueries
  │
  └── Prisma.sql`SELECT ... WHERE ... ORDER BY ... LIMIT ... OFFSET ...`
```

### Security Model

- All user values parameterized via `Prisma.sql` tagged templates
- `Prisma.raw()` only for trusted identifiers — validated at runtime against whitelists (`VALID_DIRECTIONS`, `VALID_TYPES`, `VALID_AGGREGATIONS`, `SEARCH_LANGUAGES`)
- Path traversal (`..`) rejected in JSON path validation
- 40+ SQL injection attack test scenarios

## License

MIT
