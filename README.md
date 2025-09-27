# @revisium/prisma-pg-json

Advanced PostgreSQL JSON query builder for Prisma with support for JSON paths, wildcards, and complex filters.

## Features

- 🎯 **Type-safe** - Full TypeScript support with generated types
- 🔍 **JSON Path queries** - Access nested JSON data with dot notation or array syntax
- 🌟 **Wildcard support** - Query arrays of objects with `*` wildcards
- 🔧 **Complex filters** - String, number, boolean, date, and JSON filters
- 🎨 **Logical operators** - AND, OR, NOT combinations
- 📦 **Prisma native** - Uses `Prisma.Sql` for type-safe parameterized queries
- ⚡ **Performance** - Optimized SQL generation for PostgreSQL

## Installation

```bash
npm install @revisium/prisma-pg-json
```

## Quick Start

```typescript
import { PrismaClient } from '@prisma/client';
import { buildQuery } from '@revisium/prisma-pg-json';

const prisma = new PrismaClient();

const query = buildQuery({
  tableName: 'users',
  where: {
    name: { contains: 'John', mode: 'insensitive' },
    age: { gte: 18 },
  },
  take: 10,
  skip: 0,
});

const results = await prisma.$queryRaw(query);
```

## Development

### Prerequisites

- Node.js 22.11.0 (see `.nvmrc`)
- Docker & Docker Compose
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/revisium/prisma-pg-json.git
cd prisma-pg-json

# Install dependencies
npm install

# Start PostgreSQL and apply migrations
npm run docker:up

# Generate Prisma Client
npm run prisma:generate

# Run tests
npm test
```

### Available Scripts

```bash
npm run build          # Build the library
npm run dev            # Build in watch mode
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run lint           # Lint and fix code
npm run format         # Format code with Prettier
npm run tsc            # Type check
npm run docker:up      # Start PostgreSQL container
npm run docker:down    # Stop PostgreSQL container
```

## License

MIT