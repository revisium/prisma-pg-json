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
| **Wildcard paths** | ❌ Not supported | ✅ `'tags[*].name'` syntax |
| **Path formats** | Array only | ✅ Array `['a', 'b']` or string `'a.b'` |
| **Query method** | ORM methods | `$queryRaw` with generated SQL |

## Installation

```bash
npm install @revisium/prisma-pg-json
```

## Usage

### Core Functions

The library provides two main functions for building WHERE and ORDER BY clauses:

```typescript
import { generateWhere, generateOrderBy, FieldConfig } from '@revisium/prisma-pg-json';
import { PrismaClient, Prisma } from '@prisma/client';

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
      number_gte: 100
    },

    // Negative indices (from end)
    metadata: {
      path: ['history', -1, 'action'],
      equals: 'created'
    },

    // Negative indices with string notation
    metadata: {
      path: 'reviews[-1].rating',
      number_gte: 4
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
  path: ['config', 'enabled'],     // Required: JSON path

  // Value comparisons
  equals: true,                    // Exact match
  not: false,                      // Not equal

  // String operations (on JSON strings)
  string_contains: 'text',         // Contains substring
  string_startsWith: 'prefix',     // Starts with
  string_endsWith: 'suffix',       // Ends with

  // Number operations (on JSON numbers)
  number_gt: 10,                   // Greater than
  number_gte: 10,                  // Greater than or equal
  number_lt: 100,                  // Less than
  number_lte: 100,                 // Less than or equal

  // Array operations
  array_contains: { key: 'value' }, // Array contains object
  array_length: { gte: 5 },        // Array length comparison

  // Existence checks
  path_exists: true,               // Path exists in JSON

  // Array/object membership
  in: ['value1', 'value2'],        // Value in array
  notIn: ['value3', 'value4']      // Value not in array
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

### Universal Design
Works with any table structure - just define your field types and start querying.

## License

MIT
