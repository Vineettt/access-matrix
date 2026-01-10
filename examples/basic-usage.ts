import { AccessControl } from '../src/core';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import path from 'path';
import { dirname } from 'path';

// Helper function to check access level
async function checkAccess(accessControl: AccessControl, path: string, method: string, level: number): Promise<boolean> {
  const route = await accessControl.getRoute(path, method);
  if (!route) return false;
  if (route.access === 0) return true; // Public route
  if (level === 1) return true; // Admin has access to everything
  return route.levels?.includes(level) || false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadDatabaseConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'database.json');
  const config = JSON.parse(await readFile(configPath, 'utf-8'));
  return config;
}

async function runExample() {
  let accessControl: AccessControl | null = null;

  try {
    console.log('🚀 Starting Access Control Example');
    
    const config = await loadDatabaseConfig();
    accessControl = await AccessControl.create(path.join(__dirname, '..', 'config', 'database.json'));

    console.log('\n🔧 Creating access levels...');
    // First, create the access levels
    const accessLevels = [
      { level: 1, description: 'Admin - Full access' },
      { level: 2, description: 'Editor - Can create and edit' },
      { level: 3, description: 'Viewer - Read only access' },
    ];

    // Add the access levels using the adapter directly since bulkAddLevels isn't exposed
    const adapter = (accessControl as any).adapter;
    if (adapter && typeof adapter.bulkAddLevels === 'function') {
      await adapter.bulkAddLevels(accessLevels);
      console.log('✅ Access levels created');
    } else {
      throw new Error('Could not access adapter or bulkAddLevels method');
    }

    console.log('\n🛣️  Adding routes...');
    const routes = [
      { path: '/api/users', method: 'GET', access: 1, description: 'List users', levels: [1, 2, 3] },
      { path: '/api/users', method: 'POST', access: 2, description: 'Create user', levels: [1, 2] },
      { path: '/api/users/:id', method: 'GET', access: 1, description: 'Get user by ID', levels: [1, 2, 3] },
      { path: '/api/users/:id', method: 'PUT', access: 2, description: 'Update user', levels: [1, 2] },
      { path: '/api/users/:id', method: 'DELETE', access: 3, description: 'Delete user', levels: [1] },
    ];
    
    const insertedRoutes = await accessControl.bulkInsertRoutes(routes);
    console.log('\n✅ Inserted routes:', insertedRoutes);

    console.log('\n🔗 Route access is automatically set via the levels array in bulkInsertRoutes');

    console.log('\n🔄 Syncing routes...');
    const syncResult = await accessControl.syncRoutes([
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/dashboard' },
      { method: 'GET', path: '/content' },
      { method: 'POST', path: '/content' },
      { method: 'GET', path: '/new-route' },
      { method: 'GET', path: '/another-route' }
    ]);

    console.log(`✅ Synced routes: ${syncResult.added} added, ${syncResult.removed} removed`);

    console.log('\n🔍 Testing access control...');
    const testCases = [
      { path: '/api/users', method: 'GET', userLevels: [1, 2, 3] },
      { path: '/api/users', method: 'POST', userLevels: [1, 2] },
      { path: '/api/users/123', method: 'GET', userLevels: [1, 2, 3] },
      { path: '/api/users/123', method: 'PUT', userLevels: [1, 2] },
      { path: '/api/users/123', method: 'DELETE', userLevels: [1] },
      { path: '/non-existent', method: 'GET', userLevels: [] }
    ];

    for (const test of testCases) {
      console.log(`\n🔍 Testing ${test.method} ${test.path}:`);
      const route = await accessControl.getRoute(test.path, test.method);
      
      for (const level of [1, 2, 3, 4]) { // Levels 1-4 as defined in the routes
        const hasAccess = await checkAccess(accessControl, test.path, test.method, level);
        const shouldHaveAccess = test.userLevels.includes(level) || level === 1; // Level 1 is admin
        const status = hasAccess === shouldHaveAccess ? '✓' : '✗';
        const icon = hasAccess ? '✅' : '❌';
        const role = level === 1 ? '(Admin)' : '';
        
        console.log(`  Level ${level}: ${icon} ${status} ${role}`);
      }
    }

    console.log('\n🧹 Cleaning up...');
    // Get all routes to clean up
    const routesToDelete = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users', method: 'POST' },
      { path: '/api/users/:id', method: 'GET' },
      { path: '/api/users/:id', method: 'PUT' },
      { path: '/api/users/:id', method: 'DELETE' }
    ];

    // Find and collect route IDs that exist
    const routeIds: string[] = [];
    for (const { path, method } of routesToDelete) {
      const route = await accessControl.getRoute(path, method);
      if (route?.id) {
        routeIds.push(route.id);
      }
    }

    // Delete the routes if any were found
    if (routeIds.length > 0) {
      await accessControl.bulkDeleteRoutes(routeIds);
      console.log(`\n🗑️  Deleted ${routeIds.length} routes`);
    }

    console.log('\n✅ Example completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (accessControl) {
      try {
        await accessControl.close();
        console.log('\n🔌 Database connection closed');
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }
    }
  }
}

runExample().catch(error => {
  console.error('❌ Unhandled error in example:', error);
  process.exit(1);
});