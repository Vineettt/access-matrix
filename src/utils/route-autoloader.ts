import * as fs from 'node:fs';
import * as path from 'node:path';
import { Route } from '../core/routes.js';

export interface RoutePattern {
  name: string;
  description: string;
  patterns: {
    route: RegExp;
    method?: RegExp;
    exclude?: RegExp[];
  };
  examples: string[];
  frameworks: string[];
}

export interface AutoLoadConfig {
  directories: string[];
  patterns: string[];
  recursive: boolean;
  exclude: string[];
  customPatterns?: RoutePattern[];
}

export const FRAMEWORK_PATTERNS: Record<string, RoutePattern> = {
  express: {
    name: 'Express.js',
    description: 'Standard Express.js route patterns',
    patterns: {
      route: /(?:app|router)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      method: /(?:app|router)\.(get|post|put|delete|patch|all)\s*\(/gi,
      exclude: [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm]
    },
    examples: [
      "app.get('/users', handler)",
      "router.post('/api/users', middleware, handler)",
      "app.all('/webhook/*', handler)"
    ],
    frameworks: ['express', 'express.js']
  },
  fastify: {
    name: 'Fastify',
    description: 'Fastify route registration patterns',
    patterns: {
      route: /(?:fastify|app)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      method: /(?:fastify|app)\.(get|post|put|delete|patch|all)\s*\(/gi,
      exclude: [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm]
    },
    examples: [
      "fastify.get('/users', handler)",
      "app.post('/api/users', options, handler)",
      "fastify.all('/webhook/*', handler)"
    ],
    frameworks: ['fastify']
  },
  koa: {
    name: 'Koa.js',
    description: 'Koa.js route patterns',
    patterns: {
      route: /router\.(?:get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      method: /router\.(get|post|put|delete|patch|all)\s*\(/gi,
      exclude: [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm]
    },
    examples: [
      "router.get('/users', handler)",
      "router.post('/api/users', handler)",
      "router.all('/webhook/*', handler)"
    ],
    frameworks: ['koa', 'koa.js']
  },
  nestjs: {
    name: 'NestJS',
    description: 'NestJS controller decorator patterns',
    patterns: {
      route: /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      method: /@(Get|Post|Put|Delete|Patch)\s*\(/gi,
      exclude: [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm]
    },
    examples: [
      "@Get('/users')",
      "@Post('/api/users')",
      "@Delete('/users/:id')"
    ],
    frameworks: ['nestjs', 'nest.js']
  },
  custom: {
    name: 'Custom Patterns',
    description: 'User-defined regex patterns',
    patterns: {
      route: /ROUTE\s*\(\s*['"`]([^'"`]+)['"`]/g,
      method: /ROUTE\s*\(\s*(GET|POST|PUT|DELETE|PATCH)/gi,
      exclude: [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm]
    },
    examples: [
      "ROUTE('/users', GET)",
      "ROUTE('/api/users', POST)",
      "ROUTE('/users/:id', DELETE)"
    ],
    frameworks: ['custom']
  }
};

export class RouteAutoLoader {
  private config: AutoLoadConfig;
  private patterns: RoutePattern[];

  constructor(config: AutoLoadConfig) {
    this.config = config;
    this.patterns = this.buildPatterns();
  }

  private buildPatterns(): RoutePattern[] {
    const patterns: RoutePattern[] = [];
    
    // Add framework patterns based on file extensions and content
    for (const [key, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
      if (key !== 'custom') {
        patterns.push(pattern);
      }
    }
    
    // Add custom patterns if provided
    if (this.config.customPatterns) {
      patterns.push(...this.config.customPatterns);
    }
    
    return patterns;
  }

  async loadRoutes(): Promise<Route[]> {
    const allRoutes: Route[] = [];
    
    for (const directory of this.config.directories) {
      const routes = await this.scanDirectory(directory);
      allRoutes.push(...routes);
    }
    
    // Remove duplicates
    const uniqueRoutes = this.deduplicateRoutes(allRoutes);
    return uniqueRoutes;
  }

  private async scanDirectory(dir: string): Promise<Route[]> {
    const routes: Route[] = [];
    const resolvedPath = path.resolve(dir);
    
    console.log(`🔍 Scanning directory: ${resolvedPath}`);
    
    if (!fs.existsSync(resolvedPath)) {
      console.warn(`Directory not found: ${resolvedPath}`);
      return routes;
    }

    const entries = this.config.recursive 
      ? this.getAllFiles(resolvedPath)
      : this.getFilesInDirectory(resolvedPath);

    console.log(`📁 Found ${entries.length} files:`, entries);

    for (const entry of entries) {
      console.log(`🔍 Checking file: ${entry}`);
      if (this.shouldProcessFile(entry)) {
        console.log(`✅ Processing file: ${entry}`);
        const fileRoutes = await this.extractRoutesFromFile(entry);
        console.log(`📋 Found ${fileRoutes.length} routes in ${entry}`);
        routes.push(...fileRoutes);
      } else {
        console.log(`❌ Skipping file: ${entry}`);
      }
    }

    return routes;
  }

  private getAllFiles(dir: string): string[] {
    const files: string[] = [];
    
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!this.isExcluded(fullPath)) {
          files.push(...this.getAllFiles(fullPath));
        }
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private getFilesInDirectory(dir: string): string[] {
    return fs.readdirSync(dir)
      .filter(file => !this.isExcluded(path.join(dir, file)))
      .map(file => path.join(dir, file));
  }

  private shouldProcessFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Simple extension check
    const allowedExtensions = ['ts', 'js'];
    const matchesPattern = extension ? allowedExtensions.includes(extension) : false;
    
    console.log(`📋 File ${fileName}: extension=${extension}, allowed=${matchesPattern}`);
    
    const isExcluded = this.isExcluded(filePath);
    console.log(`   excluded=${isExcluded}`);
    
    return matchesPattern && !isExcluded;
  }

  private isExcluded(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return this.config.exclude.some(exclude => {
      const regex = new RegExp(exclude.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(fileName) || regex.test(filePath);
    });
  }

  private async extractRoutesFromFile(filePath: string): Promise<Route[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const routes: Route[] = [];

      for (const pattern of this.patterns) {
        const fileRoutes = this.extractRoutesWithPattern(content, pattern);
        routes.push(...fileRoutes);
      }

      return routes;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  private extractRoutesWithPattern(content: string, pattern: RoutePattern): Route[] {
    const routes: Route[] = [];
    
    // Remove comments
    let cleanContent = content;
    for (const excludeRegex of pattern.patterns.exclude || []) {
      cleanContent = cleanContent.replace(excludeRegex, '');
    }

    // Reset regex lastIndex
    pattern.patterns.route.lastIndex = 0;
    
    let match;
    while ((match = pattern.patterns.route.exec(cleanContent)) !== null) {
      const routePath = match[1];
      const methodMatch = pattern.patterns.method?.exec(match[0]);
      
      if (methodMatch) {
        const method = this.normalizeMethod(methodMatch[1]);
        routes.push({
          path: this.normalizePath(routePath),
          method
        });
      }
    }

    return routes;
  }

  private normalizeMethod(method: string): string {
    const methodMap: Record<string, string> = {
      'get': 'GET',
      'post': 'POST', 
      'put': 'PUT',
      'delete': 'DELETE',
      'patch': 'PATCH',
      'all': 'ALL',
      'Get': 'GET',
      'Post': 'POST',
      'Put': 'PUT',
      'Delete': 'DELETE',
      'Patch': 'PATCH'
    };
    
    return methodMap[method] || method.toUpperCase();
  }

  private normalizePath(path: string): string {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Remove trailing slash unless it's just /
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    return path;
  }

  private deduplicateRoutes(routes: Route[]): Route[] {
    const seen = new Set<string>();
    return routes.filter(route => {
      const key = `${route.method}:${route.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  getPatternDocumentation(): string {
    let doc = '# Route Pattern Documentation\n\n';
    
    for (const pattern of Object.values(FRAMEWORK_PATTERNS)) {
      doc += `## ${pattern.name}\n\n`;
      doc += `**Frameworks:** ${pattern.frameworks.join(', ')}\n\n`;
      doc += `**Description:** ${pattern.description}\n\n`;
      doc += `**Examples:**\n`;
      pattern.examples.forEach(example => {
        doc += `- \`${example}\`\n`;
      });
      doc += `\n**Regex Patterns:**\n`;
      doc += `- Route: \`${pattern.patterns.route.source}\`\n`;
      if (pattern.patterns.method) {
        doc += `- Method: \`${pattern.patterns.method.source}\`\n`;
      }
      doc += `\n---\n\n`;
    }
    
    return doc;
  }
}
