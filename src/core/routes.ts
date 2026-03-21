import * as path from 'node:path';
import * as fs from 'node:fs';
import { AccessControl } from './index.js';
import { RouteAutoLoader, AutoLoadConfig } from '../utils/route-autoloader.js';

const HTTP_METHODS = new Set([
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'
]);

export interface Route {
  path: string;
  method: string;
}

interface DatabaseConfig {
  route?: {
    loading?: 'json' | 'auto';
    auto?: AutoLoadConfig;
  };
}

function isValidRoute(route: unknown): route is Route {
  return (
    typeof route === 'object' &&
    route !== null &&
    'path' in route &&
    'method' in route &&
    typeof (route as Route).path === 'string' &&
    typeof (route as Route).method === 'string'
  );
}

let routes: Route[] = [];
let isInitialized = false;

function loadDatabaseConfig(configPath: string): DatabaseConfig {
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Could not load database config at ${configPath}:`, error);
    return {};
  }
}

export async function loadRoutes(
  configPath: string = path.join(process.cwd(), 'config', 'database.json')
): Promise<Route[]> {
  if (isInitialized) {
    console.warn('Routes already loaded. Loading again will replace existing routes.');
  }
  
  try {
    const config = loadDatabaseConfig(configPath);
    const loadingMode = config.route?.loading || 'auto';
    
    if (loadingMode === 'json') {
      const routesPath = path.join(path.dirname(configPath), 'routes.json');
      const data = fs.readFileSync(routesPath, 'utf-8');
      let parsedRoutes: unknown;
      
      try {
        parsedRoutes = JSON.parse(data);
      } catch (parseError) {
        throw new Error('Invalid JSON in routes configuration file');
      }
      
      if (!Array.isArray(parsedRoutes)) {
        throw new Error('Routes configuration must be an array');
      }

      const validatedRoutes = parsedRoutes.map((route, index) => {
        if (!isValidRoute(route)) {
          throw new Error(`Route at index ${index} is not a valid route object`);
        }

        const { path: routePath, method } = route;
        
        if (typeof routePath !== 'string' || routePath.trim() === '') {
          throw new Error(`Route at index ${index} has an empty or invalid 'path'`);
        }
        
        if (!routePath.startsWith('/')) {
          throw new Error(`Route at index ${index} path must start with a forward slash (/)`);
        }
        
        const methodUpper = method.toUpperCase();
        if (typeof method !== 'string' || !HTTP_METHODS.has(methodUpper)) {
          throw new Error(
            `Route at index ${index} has an invalid HTTP method '${method}'. ` +
            `Must be one of: ${Array.from(HTTP_METHODS).join(', ')}`
          );
        }
        
        return {
          path: routePath,
          method: methodUpper
        };
      });

      routes = validatedRoutes;
      isInitialized = true;
      return routes;
      
    } else if (loadingMode === 'auto') {
      const autoConfig = config.route?.auto;
      if (!autoConfig) {
        console.warn('Auto-loading mode requires auto configuration. Using empty routes.');
        routes = [];
        isInitialized = true;
        return routes;
      }
      
      const autoLoader = new RouteAutoLoader(autoConfig);
      routes = await autoLoader.loadRoutes();
      isInitialized = true;
      return routes;
    } else {
      throw new Error(`Invalid loading mode: ${loadingMode}. Must be 'json' or 'auto'`);
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.warn(`Routes configuration file not found at ${configPath}. Using empty routes.`);
    } else if (error instanceof Error) {
      console.error('Error loading routes:', error.message);
    } else {
      console.error('Unknown error occurred while loading routes');
    }
    return [];
  }
}

/**
 * Synchronizes routes with the database using AccessControl
 * @param sourceRoutes Array of route definitions to sync
 * @param accessControl Instance of AccessControl
 * @param options Configuration options
 * @returns Object containing counts of added and removed routes
 */
export async function syncRoutes(
  sourceRoutes: Array<{ method: string; path: string }>,
  accessControl: AccessControl
): Promise<{ added: number; removed: number }> {
  return accessControl.syncRoutes(sourceRoutes);
}

/**
 * Load routes from config + file system, then synchronize with the database.
 *
 * This will:
 *  - read routes from `config/database.json` (or given path)
 *  - load route definitions from files (auto or json mode)
 *  - insert missing routes into the database
 *  - delete routes in the database that are not found on disk
 */
export async function syncRoutesFromConfig(
  configPath: string = path.join(process.cwd(), 'config', 'database.json')
): Promise<{ added: number; removed: number }> {
  const routes = await loadRoutes(configPath);
  const accessControl = await AccessControl.create(configPath);

  try {
    return await accessControl.syncRoutes(routes);
  } finally {
    await accessControl.close();
  }
}

export function getRoutes(): Route[] {
  if (!isInitialized) {
    console.warn('Routes not loaded. Call loadRoutes() first.');
    return [];
  }
  return routes;
}

export function findRoute(path: string, method: string): Route | undefined {
  const normalizedMethod = method.toUpperCase();
  return routes.find(route => 
    route.path === path && route.method === normalizedMethod
  );
}

