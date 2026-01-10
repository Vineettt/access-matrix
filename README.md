# Access Matrix

A lightweight, type-safe access control library for Node.js with SQLite support.

## Features

- 🔒 Role-based and permission-based access control
- 🛠️ Extensible adapter architecture
- 🚀 Built with TypeScript for better developer experience
- ⚡ Simple and intuitive API
- 🗄️ Database Support:
  - ✅ SQLite (built-in)
  - 📅 Coming soon: PostgreSQL, MySQL, MongoDB

## Installation

```bash
npm install access-matrix
# or
yarn add access-matrix
```

## Quick Start

### JavaScript

```javascript
import AccessControl from 'access-matrix';

const ac = await AccessControl.create({
  type: 'sqlite',
  database: './access.db'
});

// Define roles and permissions
await ac.defineRole('admin', ['read', 'write', 'delete']);
await ac.defineRole('user', ['read']);

// Check access
const canRead = await ac.can('user', 'read'); // true
const canWrite = await ac.can('user', 'write'); // false
```

### TypeScript

```typescript
import AccessControl, { Route } from 'access-matrix';

interface AppRoute extends Route {
  // Extend with custom properties
  requiresAuth?: boolean;
}

const ac = await AccessControl.create<AppRoute>({
  type: 'sqlite',
  database: './access.db'
});
```

## Documentation

- [API Reference](docs/API.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Examples](examples/)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## License

MIT
