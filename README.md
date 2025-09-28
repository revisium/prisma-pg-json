<div align="center">

# prisma-pg-json

[![codecov](https://codecov.io/gh/revisium/prisma-pg-json/graph/badge.svg?token=Q798833A3W)](https://codecov.io/gh/revisium/prisma-pg-json)
[![GitHub License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/revisium/prisma-pg-json/blob/master/LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/revisium/prisma-pg-json)](https://github.com/revisium/prisma-pg-json/releases)

**Type-safe PostgreSQL JSON query builder for Prisma**

</div>

## Overview

A universal query builder that generates parameterized SQL queries for PostgreSQL through Prisma, with special focus on JSON/JSONB operations that go beyond standard Prisma capabilities.

## Features

- 🎯 **Type-safe** - Full TypeScript support with configurable field types
- 🔍 **JSON Path queries** - Access nested data with `['key', 'nested']` or wildcard patterns
- 🌟 **Wildcard support** - Query arrays with `*`, array indices `[0]`, `[-1]`
- 🚀 **Advanced JSON sorting** - Order by nested JSON fields with type casting
- 🔧 **Complex filters** - String, number, boolean, date, and JSON filters
- 🎨 **Logical operators** - AND, OR, NOT combinations
- 📦 **Prisma native** - Uses `Prisma.Sql` for safe parameterized queries
- ⚡ **Universal** - Works with any table structure

## Installation

```bash
npm install @revisium/prisma-pg-json
```

## Usage

### Core Functions

The library provides two main functions for building WHERE and ORDER BY clauses:

```typescript
import { generateWhere, generateOrderBy } from '@revisium/prisma-pg-json';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Define your field types
const fieldConfig = {
  id: 'string',
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

#### String Filters
```typescript
name: {
  contains: 'john',
  mode: 'insensitive'  // Case-insensitive
}
email: { startsWith: 'admin@' }
status: { in: ['active', 'pending'] }
```

#### Number Filters
```typescript
age: { gte: 18, lte: 65 }
price: { gt: 100 }
quantity: { in: [1, 5, 10] }
```

#### Date Filters
```typescript
createdAt: {
  gte: new Date('2024-01-01'),
  lt: new Date('2025-01-01')
}
```

#### Boolean Filters
```typescript
isActive: true
isDeleted: { not: true }
```

#### JSON Filters
```typescript
metadata: {
  path: ['config', 'enabled'],
  equals: true
}

metadata: {
  path: ['tags', '*'],
  string_contains: 'urgent'
}

metadata: {
  path: ['items'],
  array_length: { gte: 5 }
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
