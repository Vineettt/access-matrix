# Access Matrix

A lightweight, type-safe access control library for Node.js with SQLite and PostgreSQL support.

## Features

- 🔒 Role-based and permission-based access control
- 🛠️ Extensible adapter architecture
- 🚀 Built with TypeScript for better developer experience
- ⚡ Simple and intuitive API
- 🗄️ Database Support:
  - ✅ SQLite (built-in)
  - ✅ PostgreSQL
  - 📅 Auto-loading routes from source code

## Installation

```bash
npm install access-matrix
# or
yarn add access-matrix
```

## Quick Start

### TypeScript

```typescript
import AccessControl, { RouteData } from 'access-matrix';

interface AppRoute extends RouteData {
  requiresAuth?: boolean;
}

const ac = await AccessControl.create<AppRoute>({
  type: 'sqlite',
  database: './access.db'
});
```

## Auto-Loading Routes

The access-matrix library can automatically detect and load routes from your source files.

### Configuration

Create `config/database.json`:

```json
{
  "database": {
    "type": "sqlite",
    "config": {
      "sqlite": {
        "mode": "file",
        "file_name": "access-matrix.db"
      }
    }
  },
  "route": {
    "loading": "auto",
    "auto": {
      "directories": ["src/routes", "api", "controllers"],
      "patterns": ["**/*.ts", "**/*.js"],
      "recursive": true,
      "exclude": ["node_modules", "*.test.*"]
    }
  }
}
```

### Usage

```typescript
import { AccessControl, loadRoutes } from 'access-matrix';

async function setupAccessControl() {
  const configPath = './config/database.json';
  const accessControl = await AccessControl.create(configPath);
  
  // Auto-load routes from configured directories
  const routes = await loadRoutes(configPath);
  
  console.log(`Found ${routes.length} routes:`);
  routes.forEach((route, index) => {
    console.log(`${index + 1}. ${route.method} ${route.path}`);
  });
  
  // Sync routes to database
  const syncResult = await accessControl.syncRoutes(routes);
  console.log(`Synced: ${syncResult.added} added, ${syncResult.removed} removed`);
  
  return accessControl;
}
```

### Supported Frameworks

- **Express.js** - `router.get()`, `router.post()`, etc.
- **Fastify** - `fastify.get()`, `fastify.post()`, etc.
- **NestJS** - `@Get()`, `@Post()`, `@Put()` decorators
- **Koa.js** - `router.get()`, `router.post()`, etc.

See [Route Patterns Documentation](docs/ROUTE_PATTERNS.md) for detailed examples.

## Documentation

- [API Reference](docs/API.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Route Patterns](docs/ROUTE_PATTERNS.md)
- [Examples](examples/)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run examples
npm run example
npm run example:postgres
npm run example:autoload
```

## License

MIT
