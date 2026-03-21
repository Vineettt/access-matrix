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

async function runPostgresExample() {
  let accessControl: AccessControl | null = null;

  try {
    console.log('🚀 Starting PostgreSQL Access Control Example');
    
    // Use PostgreSQL configuration
    const configPath = path.join(__dirname, '..', 'config', 'database.postgres.json');
    accessControl = await AccessControl.create(configPath);

    console.log('\n🔧 Creating access levels...');
    // First, create the access levels
    const accessLevels = [
      { level: 1, description: 'Admin - Full access' },
      { level: 2, description: 'Editor - Can create and edit' },
      { level: 3, description: 'Viewer - Read only access' },
    ];

    // Add the access levels using the adapter directly
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

    console.log('\n✅ PostgreSQL example completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (accessControl) {
      try {
        await accessControl.close();
        console.log('\n🔌 PostgreSQL connection closed');
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }
    }
  }
}

async function runNeonExample() {
  let accessControl: AccessControl | null = null;

  try {
    console.log('🚀 Starting Neon (Serverless PostgreSQL) Access Control Example');
    
    // Use Neon configuration
    const configPath = path.join(__dirname, '..', 'config', 'database.neon.json');
    accessControl = await AccessControl.create(configPath);

    console.log('\n🔧 Creating access levels...');
    const accessLevels = [
      { level: 1, description: 'Admin - Full access' },
      { level: 2, description: 'Editor - Can create and edit' },
      { level: 3, description: 'Viewer - Read only access' },
    ];

    const adapter = (accessControl as any).adapter;
    if (adapter && typeof adapter.bulkAddLevels === 'function') {
      await adapter.bulkAddLevels(accessLevels);
      console.log('✅ Access levels created in Neon');
    }

    console.log('\n🛣️  Adding routes to Neon...');
    const routes = [
      { path: '/api/public', method: 'GET', access: 0, description: 'Public endpoint', levels: [] },
      { path: '/api/users', method: 'GET', access: 1, description: 'List users', levels: [1, 2, 3] },
      { path: '/api/admin', method: 'POST', access: 2, description: 'Admin only', levels: [1] },
    ];
    
    const insertedRoutes = await accessControl.bulkInsertRoutes(routes);
    console.log('\n✅ Inserted routes in Neon:', insertedRoutes);

    console.log('\n🔍 Testing Neon access control...');
    const route = await accessControl.getRoute('/api/public', 'GET');
    console.log('Public route access:', route?.access === 0 ? '✅ Public' : '❌ Restricted');

    console.log('\n✅ Neon example completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Neon Error:', error);
  } finally {
    if (accessControl) {
      try {
        await accessControl.close();
        console.log('\n🔌 Neon connection closed');
      } catch (error) {
        console.error('❌ Error closing Neon connection:', error);
      }
    }
  }
}

// Run examples based on available configuration
async function main() {
  const args = process.argv.slice(2);
  const exampleType = args[0] || 'postgres';

  if (exampleType === 'neon') {
    await runNeonExample();
  } else {
    await runPostgresExample();
  }
}

main().catch(error => {
  console.error('❌ Unhandled error in example:', error);
  process.exit(1);
});
