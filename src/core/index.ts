import { RouteSynchronizer } from '@/utils/route-sync.ts';
import { BaseAdapter } from '../adapters/base/adapter.ts';
import { AdapterFactory } from './factory.ts';
import { loadRoutes, getRoutes, findRoute } from './routes.ts';
import type { Route } from './routes.ts';

export type { BaseAdapter, Route };
export { loadRoutes, getRoutes, findRoute };

export interface RouteData {
  id?: string;
  path: string;
  method: string;
  access?: number;
  description?: string;
  levels?: number[];
}

export class AccessControl {
  private adapter: BaseAdapter;

  constructor(adapter: BaseAdapter) {
    this.adapter = adapter;
  }

  static async create(configPath: string): Promise<AccessControl> {
    const adapter = AdapterFactory.fromConfigFile(configPath);
    await adapter.initialize();
    return new AccessControl(adapter);
  }

  async addRoute(path: string, method: string, accessLevel: number, description?: string): Promise<{id: string; path: string; method: string} | null> {
    const [result] = await this.bulkInsertRoutes([{
      path,
      method,
      access: accessLevel,
      description
    }]);
    return result || null;
  }

  async bulkInsertRoutes(routes: RouteData[]): Promise<Array<{id: string; path: string; method: string}>> {
    // First, insert the routes
    const processedRoutes = routes.map(route => ({
      path: route.path,
      method: route.method,
      access: route.access ?? -1,  // Default to -1 if not provided
      description: route.description
    }));
    
    // Insert routes and get their IDs
    const insertedRoutes = await this.adapter.bulkInsertRoutes(processedRoutes);
    
    // Handle route levels if provided
    const routeLevelPromises = routes.map(async (route, index) => {
      const insertedRoute = insertedRoutes[index];
      if (route.levels && route.levels.length > 0 && insertedRoute?.id) {
        await this.setRouteLevels(insertedRoute.id, route.levels);
      }
      return {
        id: insertedRoute.id,
        path: route.path,
        method: route.method
      };
    });
    
    return Promise.all(routeLevelPromises);
  }

  async getRoute(path: string, method: string): Promise<RouteData | null> {
    return this.adapter.getRoute(path, method);
  }

  async getAccessLevel(path: string, method: string): Promise<number> {
    const route = await this.getRoute(path, method);
    return route?.access ?? -1;
  }

  /**
   * Set which levels can access a route
   * @param routeId The ID of the route
   * @param levelIds Array of level IDs that should have access
   */
  async setRouteLevels(routeId: string, levelIds: number[]): Promise<void> {
    const mappings = levelIds.map(levelId => ({ routeId, levelId }));
    await this.adapter.bulkAddRouteLevelMappings(mappings);
  }

   /**
   * Deletes routes by their IDs
   * @param routeIds Array of route IDs to delete
   */
  async bulkDeleteRoutes(routeIds: string[]): Promise<void> {
    if (!routeIds.length) return;
    await this.adapter.bulkRemoveRoutes(routeIds);
  }
  /**
   * Synchronizes routes by adding new ones and removing those not in the source
   * @param routes Array of route definitions to sync
   * @returns Object containing counts of added and removed routes
   */
  async syncRoutes(routes: Array<{ path: string; method: string }>): Promise<{ added: number; removed: number }> {
    const synchronizer = new RouteSynchronizer(this, {
      defaultAccessLevel: -1,
      preserveExistingAccessLevels: true
    });
    return synchronizer.syncRoutes(routes);
  }

  async close(): Promise<void> {
    await this.adapter.close();
  }
}

export default AccessControl;
