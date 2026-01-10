import { AccessControl, type RouteData } from '../core/index.js';

export interface RouteSyncOptions {
  defaultAccessLevel?: number;
  preserveExistingAccessLevels?: boolean;
}

export class RouteSynchronizer {
  constructor(
    private accessControl: AccessControl,
    private options: RouteSyncOptions = {}
  ) {
    this.options = {
      defaultAccessLevel: -1,
      preserveExistingAccessLevels: true,
      ...options
    };
  }

  async syncRoutes(
    sourceRoutes: Array<{ method: string; path: string }>
  ): Promise<{ added: number; removed: number }> {
    const normalizedSource = this.normalizeRoutes(sourceRoutes);
    const dbRoutes = await this.getDatabaseRoutes();
    const { toAdd, toRemove } = this.findDifferences(normalizedSource, dbRoutes);
    
    await this.applyChanges(toAdd, toRemove);
    
    return {
      added: toAdd.length,
      removed: toRemove.length
    };
  }

  private normalizeRoutes(routes: Array<{ method: string; path: string }>): Map<string, { method: string; path: string }> {
    const normalized = new Map<string, { method: string; path: string }>();
    
    for (const route of routes) {
      const method = route.method.toUpperCase();
      const path = route.path.startsWith('/') ? route.path : `/${route.path}`;
      const key = this.getRouteKey(method, path);
      
      normalized.set(key, { method, path });
    }
    
    return normalized;
  }

  private getRouteKey(method: string, path: string): string {
    return `${method}:${path}`.toLowerCase();
  }

  private async getDatabaseRoutes(): Promise<Map<string, { id: string; method: string; path: string }>> {
    const routes = new Map<string, { id: string; method: string; path: string }>();
    
    const allRoutes = await this.accessControl['adapter'].query('SELECT id, method, path FROM routes');
    
    for (const row of allRoutes.rows || []) {
      const key = this.getRouteKey(row.method, row.path);
      routes.set(key, row);
    }
    
    return routes;
  }

  private findDifferences(
    sourceRoutes: Map<string, { method: string; path: string }>,
    dbRoutes: Map<string, { id: string; method: string; path: string }>
  ): {
    toAdd: RouteData[];
    toRemove: string[];
  } {
    const toAdd: RouteData[] = [];
    const toRemove: string[] = [];

    for (const [key, sourceRoute] of sourceRoutes.entries()) {
      if (!dbRoutes.has(key)) {
        toAdd.push({
          method: sourceRoute.method,
          path: sourceRoute.path,
          access: this.options.defaultAccessLevel ?? -1,
          description: `Route: ${sourceRoute.method} ${sourceRoute.path}`
        });
      }
    }

    for (const [key, dbRoute] of dbRoutes.entries()) {
      if (!sourceRoutes.has(key)) {
        toRemove.push(dbRoute.id);
      }
    }

    return { toAdd, toRemove };
  }

  private async applyChanges(
    toAdd: RouteData[],
    toRemove: string[]
  ): Promise<void> {
    if (toAdd.length > 0) {
      await this.accessControl.bulkInsertRoutes(toAdd);
    }
    
    if (toRemove.length > 0) {
      await this.accessControl.bulkDeleteRoutes(toRemove);
    }
  }
}
