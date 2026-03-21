# Access Control API Reference

## AccessControl Class

### `static create(configPath: string): Promise<AccessControl>`
Creates a new AccessControl instance.

```typescript
const accessControl = await AccessControl.create('./config/database.json');
```

### `addRoute(path: string, method: string, accessLevel: number, description?: string): Promise<{id: string; path: string; method: string} | null>`
Adds a single route.

```typescript
const route = await accessControl.addRoute('/api/users', 'GET', 1, 'List users');
```

### `bulkInsertRoutes(routes: RouteData[]): Promise<Array<{id: string; path: string; method: string}>>`
Inserts multiple routes at once.

```typescript
const routes = await accessControl.bulkInsertRoutes([
  { path: '/api/users', method: 'GET', access: 1, levels: [1, 2, 3] },
  { path: '/api/users', method: 'POST', access: 2, levels: [1, 2] }
]);
```

### `getRoute(path: string, method: string): Promise<RouteData | null>`
Gets a route by path and method.

```typescript
const route = await accessControl.getRoute('/api/users', 'GET');
```

### `getAccessLevel(path: string, method: string): Promise<number>`
Gets the access level for a route.

```typescript
const level = await accessControl.getAccessLevel('/api/users', 'GET');
```

### `setRouteLevels(routeId: string, levelIds: number[]): Promise<void>`
Sets which levels can access a route.

```typescript
await accessControl.setRouteLevels('route-id-1', [1, 2, 3]);
```

### `bulkDeleteRoutes(routeIds: string[]): Promise<void>`
Deletes multiple routes by their IDs.

```typescript
await accessControl.bulkDeleteRoutes(['route-id-1', 'route-id-2']);
```

### `syncRoutes(routes: Array<{method: string, path: string}>): Promise<{added: number, removed: number}>`
Synchronizes the database with the provided routes.

```typescript
const result = await accessControl.syncRoutes([
  { method: 'GET', path: '/api/users' },
  { method: 'POST', path: '/api/users' }
]);
```

### `close(): Promise<void>`
Closes the database connection.

```typescript
await accessControl.close();
```

## Types

### `RouteData`
```typescript
interface RouteData {
  id?: string;
  path: string;
  method: string;
  access?: number;
  description?: string;
  levels?: number[];
}
```

## Route Loading Functions

### `loadRoutes(configPath?: string): Promise<Route[]>`
Loads routes from configuration file.

```typescript
import { loadRoutes } from 'access-matrix';
const routes = await loadRoutes('./config/database.json');
```

### `getRoutes(): Route[]`
Gets all loaded routes.

```typescript
import { getRoutes } from 'access-matrix';
const routes = getRoutes();
```

### `findRoute(path: string, method: string): Route | undefined`
Finds a specific route.

```typescript
import { findRoute } from 'access-matrix';
const route = findRoute('/api/users', 'GET');
```
