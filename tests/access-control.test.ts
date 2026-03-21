import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { AccessControl } from '../src/core/index';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('AccessControl', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create a temporary config file for each test
    tempDir = join(tmpdir(), `access-matrix-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    configPath = join(tempDir, 'test-config.json');
    
    const config = {
      database: {
        type: 'sqlite',
        config: {
          sqlite: {
            mode: 'memory',
            verbose: false
          }
        }
      },
      route: {
        loading: 'json'
      }
    };
    
    writeFileSync(configPath, JSON.stringify(config));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Creation', () => {
    test('should create AccessControl instance', async () => {
      const accessControl = await AccessControl.create(configPath);
      expect(accessControl).toBeInstanceOf(AccessControl);
      await accessControl.close();
    });

    test('should throw with invalid config path', async () => {
      await expect(AccessControl.create('/invalid/path')).rejects.toThrow();
    });
  });

  describe('Route Management', () => {
    let accessControl: AccessControl;

    beforeEach(async () => {
      accessControl = await AccessControl.create(configPath);
    });

    afterEach(async () => {
      await accessControl.close();
    });

    test('should add a single route', async () => {
      const route = await accessControl.addRoute('/test', 'GET', 1, 'Test route');
      expect(route).not.toBeNull();
      expect(route?.path).toBe('/test');
      expect(route?.method).toBe('GET');
    });

    test('should get a route', async () => {
      await accessControl.addRoute('/test', 'GET', 1, 'Test route');
      const foundRoute = await accessControl.getRoute('/test', 'GET');
      expect(foundRoute).not.toBeNull();
      expect(foundRoute?.path).toBe('/test');
      expect(foundRoute?.method).toBe('GET');
    });

    test('should return null for non-existent route', async () => {
      const foundRoute = await accessControl.getRoute('/nonexistent', 'GET');
      expect(foundRoute).toBeNull();
    });

    test('should bulk insert routes', async () => {
      const routes = await accessControl.bulkInsertRoutes([
        { path: '/api/users', method: 'GET', access: 1 },
        { path: '/api/users', method: 'POST', access: 2 }
      ]);
      expect(routes).toHaveLength(2);
      expect(routes[0].path).toBe('/api/users');
      expect(routes[0].method).toBe('GET');
      expect(routes[1].method).toBe('POST');
    });

    test('should get access level for route', async () => {
      await accessControl.addRoute('/test', 'GET', 3, 'Test route');
      const level = await accessControl.getAccessLevel('/test', 'GET');
      expect(level).toBe(3);
    });

    test('should return -1 for non-existent route access level', async () => {
      const level = await accessControl.getAccessLevel('/nonexistent', 'GET');
      expect(level).toBe(-1);
    });

    test('should set route levels', async () => {
      const route = await accessControl.addRoute('/test', 'GET', 1, 'Test route');
      expect(route).not.toBeNull();
      
      if (route?.id) {
        // First add the access levels
        const adapter = (accessControl as any).adapter;
        await adapter.bulkAddLevels([
          { level: 1, description: 'Admin' },
          { level: 2, description: 'Editor' },
          { level: 3, description: 'Viewer' }
        ]);
        
        // Then set route levels
        await accessControl.setRouteLevels(route.id, [1, 2, 3]);
        const foundRoute = await accessControl.getRoute('/test', 'GET');
        expect(foundRoute?.levels).toEqual([1, 2, 3]);
      }
    });

    test('should bulk delete routes', async () => {
      const routes = await accessControl.bulkInsertRoutes([
        { path: '/api/users', method: 'GET', access: 1 },
        { path: '/api/posts', method: 'GET', access: 1 }
      ]);
      
      const routeIds = routes.map(r => r.id).filter(Boolean) as string[];
      await accessControl.bulkDeleteRoutes(routeIds);
      
      const foundRoute1 = await accessControl.getRoute('/api/users', 'GET');
      const foundRoute2 = await accessControl.getRoute('/api/posts', 'GET');
      expect(foundRoute1).toBeNull();
      expect(foundRoute2).toBeNull();
    });
  });

  describe('Sync Routes', () => {
    let accessControl: AccessControl;

    beforeEach(async () => {
      accessControl = await AccessControl.create(configPath);
    });

    afterEach(async () => {
      await accessControl.close();
    });

    test('should sync routes', async () => {
      // Add some initial routes
      await accessControl.bulkInsertRoutes([
        { path: '/api/users', method: 'GET', access: 1 },
        { path: '/api/posts', method: 'GET', access: 1 }
      ]);

      // Sync with new routes
      const result = await accessControl.syncRoutes([
        { method: 'GET', path: '/api/users' },
        { method: 'POST', path: '/api/users' },
        { method: 'GET', path: '/api/comments' }
      ]);

      expect(result.added).toBe(3); // All 3 routes are processed as additions
      expect(result.removed).toBe(0); // No routes removed in current sync behavior
    });
  });
});
