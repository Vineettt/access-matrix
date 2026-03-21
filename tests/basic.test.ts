import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { AccessControl } from '../src/core/index';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('AccessControl Basic Tests', () => {
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

  test('AccessControl can be created', async () => {
    const accessControl = await AccessControl.create(configPath);
    expect(accessControl).toBeInstanceOf(AccessControl);
    await accessControl.close();
  });

  test('AccessControl basic operations', async () => {
    const accessControl = await AccessControl.create(configPath);
    
    // Test adding a route
    const route = await accessControl.addRoute('/test', 'GET', 1, 'Test route');
    expect(route).not.toBeNull();
    expect(route?.path).toBe('/test');
    expect(route?.method).toBe('GET');
    
    // Test getting a route
    const foundRoute = await accessControl.getRoute('/test', 'GET');
    expect(foundRoute).not.toBeNull();
    expect(foundRoute?.path).toBe('/test');
    expect(foundRoute?.method).toBe('GET');
    
    // Test bulk insert
    const routes = await accessControl.bulkInsertRoutes([
      { path: '/api/users', method: 'GET', access: 1 },
      { path: '/api/users', method: 'POST', access: 2 }
    ]);
    expect(routes).toHaveLength(2);
    
    await accessControl.close();
  });
});
