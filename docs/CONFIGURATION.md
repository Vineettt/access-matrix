# Configuration Guide

## Database Setup

Create `config/database.json`:

### SQLite
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
    "loading": "json"
  }
}
```

### PostgreSQL
```json
{
  "database": {
    "type": "postgres",
    "config": {
      "postgres": {
        "host": "localhost",
        "port": 5432,
        "database": "access_matrix",
        "user": "postgres",
        "password": "password"
      }
    }
  },
  "route": {
    "loading": "json"
  }
}
```

## Route Loading

### JSON Routes
```json
{
  "route": {
    "loading": "json"
  }
}
```

Create `config/routes.json`:
```json
[
  {
    "path": "/api/users",
    "method": "GET",
    "access": 1,
    "levels": [1, 2, 3]
  },
  {
    "path": "/api/users",
    "method": "POST",
    "access": 2,
    "levels": [1, 2]
  }
]
```

### Auto-Loading Routes
```json
{
  "route": {
    "loading": "auto",
    "auto": {
      "directories": ["src/routes", "api"],
      "patterns": ["**/*.ts", "**/*.js"],
      "recursive": true,
      "exclude": ["node_modules", "*.test.*"]
    }
  }
}
```

## Access Levels

Define access levels (lower numbers = higher privileges):

```typescript
const accessLevels = [
  { level: 1, description: 'Admin' },
  { level: 2, description: 'Editor' },
  { level: 3, description: 'Viewer' }
];
```

## Environment Variables

Use environment variables in configuration:

```json
{
  "database": {
    "type": "postgres",
    "config": {
      "postgres": {
        "host": "${DB_HOST || localhost}",
        "port": "${DB_PORT || 5432}",
        "database": "${DB_NAME || access_matrix}",
        "user": "${DB_USER || postgres}",
        "password": "${DB_PASSWORD || password}"
      }
    }
  }
}
```
