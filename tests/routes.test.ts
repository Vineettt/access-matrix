import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { loadRoutes, getRoutes, findRoute } from '../src/core/routes';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Route Loading Functions', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `access-matrix-routes-test-${Date.now()}`);
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
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadRoutes', () => {
    test('should return empty array for json loading without routes file', async () => {
      const routes = await loadRoutes(configPath);
      expect(routes).toEqual([]);
    });

    test('should handle invalid config gracefully', async () => {
      const routes = await loadRoutes('/invalid/path');
      expect(routes).toEqual([]);
    });
  });

  describe('getRoutes', () => {
    test('should return empty array when no routes loaded', () => {
      const routes = getRoutes();
      expect(routes).toEqual([]);
    });
  });

  describe('findRoute', () => {
    test('should return undefined when no routes loaded', () => {
      const route = findRoute('/test', 'GET');
      expect(route).toBeUndefined();
    });
  });
});
