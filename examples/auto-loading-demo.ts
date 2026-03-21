import { AccessControl } from '../src/core';
import { loadRoutes } from '../src/core/routes.js';
import path from 'path';

async function demonstrateAutoLoading() {
  console.log('🚀 Demonstrating Route Auto-Loading');
  
  try {
    const configPath = path.join(process.cwd(), 'config', 'database.auto.sqlite.json');
    console.log('📁 Config path:', configPath);
    
    const accessControl = await AccessControl.create(configPath);
    
    const routes = await loadRoutes(configPath);
    
    console.log(`\n📁 Found ${routes.length} routes:`);
    routes.forEach((route, index) => {
      console.log(`${index + 1}. ${route.method} ${route.path}`);
    });
    
    if (routes.length > 0) {
      const syncResult = await accessControl.syncRoutes(routes);
      console.log(`\n✅ Synced routes: ${syncResult.added} added, ${syncResult.removed} removed`);
    }
    
    await accessControl.close();
    console.log('\n🎉 Auto-loading demonstration completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function demonstrateCustomPatterns() {
  console.log('\n🔧 Demonstrating Custom Patterns');
  
  const customConfig = {
    directories: ['src/examples'],
    patterns: ['**/*.ts'],
    recursive: true,
    exclude: ['node_modules', '*.test.*'],
    customPatterns: [
      {
        name: 'MyFramework',
        description: 'Custom framework patterns',
        patterns: {
          route: /myRoute\s*\(\s*['"`]([^'"`]+)['"`]/g,
          method: /myRoute\s*\(\s*(GET|POST|PUT|DELETE|PATCH)/gi,
          exclude: [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm]
        },
        examples: [
          "myRoute('/users', GET)",
          "myRoute('/api/users', POST)",
          "myRoute('/users/:id', DELETE)"
        ],
        frameworks: ['myframework']
      }
    ]
  };
  
  console.log('Custom pattern configuration:', JSON.stringify(customConfig, null, 2));
  process.exit(0);
}

async function main() {
  await demonstrateAutoLoading();
  await demonstrateCustomPatterns();
}

main().catch(console.error);
