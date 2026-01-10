# Configuration Guide

## Database Setup

Create `config/database.json`:

```json
{
  "client": "sqlite3",
  "connection": {
    "filename": "./data/access-control.db"
  },
  "useNullAsDefault": true
}
```

### Database Support

Currently, only SQLite is supported. Support for other databases is planned for future releases:
- PostgreSQL (planned)
- MySQL (planned)
- MSSQL (planned)

## Access Levels

Define access levels (lower numbers = higher privileges):

```typescript
const accessLevels = [
  { level: 1, description: 'Admin' },
  { level: 2, description: 'Editor' },
  { level: 3, description: 'Viewer' }
];
```

## Routes

Define route access rules:

```typescript
const routes = [
  {
    path: '/api/users',
    method: 'GET',
    access: 1,
    levels: 3
  },
  {
    path: '/api/users',
    method: 'POST',
    access: 2,
    levels: 2
  }
];
```

## Environment Variables

Use environment variables in `database.json` for SQLite configuration:

```json
{
  "client": "sqlite3",
  "connection": {
    "filename": "${DB_PATH || './data/access-control.db'}"
  },
  "useNullAsDefault": true
}
```

## Initialization Example

```typescript
import { AccessControl } from 'access-matrix';

// Define your access levels and routes
const accessLevels = [
  { level: 1, description: 'Admin' },
  { level: 2, description: 'Editor' },
  { level: 3, description: 'Viewer' }
];

const routes = [
  {
    path: '/api/users',
    method: 'GET',
    access: 1,
    levels: 3
  }
];

async function initializeAccessControl() {
  // Initialize with your database config
  const accessControl = await AccessControl.create('./config/database.json');
  
  // Add access levels and routes
  const adapter = (accessControl as any).adapter;
  await adapter.bulkAddLevels(accessLevels);
  await accessControl.bulkInsertRoutes(routes);
  
  return accessControl;
}
```
