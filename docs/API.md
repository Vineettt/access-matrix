# Access Control API Reference

## AccessControl Class

### `static create(configPath: string): Promise<AccessControl>`
Creates a new AccessControl instance.

```typescript
const accessControl = await AccessControl.create('./config/database.json');
```

### `getRoute(path: string, method: string): Promise<Route | null>`
Gets a route by path and method.

```typescript
const route = await accessControl.getRoute('/api/users', 'GET');
```

### `bulkInsertRoutes(routes: RouteInput[]): Promise<Route[]>`
Inserts multiple routes at once.

```typescript
const routes = [
  { path: '/api/users', method: 'GET', access: 1, levels: 3 },
  { path: '/api/users', method: 'POST', access: 2, levels: 2 }
];
const insertedRoutes = await accessControl.bulkInsertRoutes(routes);
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

## Adapter Methods

### `bulkAddLevels(levels: AccessLevel[]): Promise<void>`
Adds multiple access levels at once.

```typescript
const adapter = (accessControl as any).adapter;
await adapter.bulkAddLevels([
  { level: 1, description: 'Admin' },
  { level: 2, description: 'Editor' }
]);
```
