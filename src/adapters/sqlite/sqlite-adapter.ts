import { BaseAdapter, RouteData } from '../base/adapter.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class SQLiteAdapter implements BaseAdapter {
  private db: Database.Database;
  private config: {
    mode: 'memory' | 'file';
    file_name: string;
    verbose?: boolean;
  };

  constructor(config: Record<string, any> = {}) {
    this.config = {
      mode: config.mode || 'memory',
      file_name: config.file_name || config.fileName || 'access-matrix.db',
      verbose: config.verbose || false
    };

    const dbPath = this.resolveDbPath();
    this.db = new Database(dbPath);
    
    if (this.config.verbose) {
      const modeInfo = this.config.mode === 'memory' 
        ? 'in-memory database' 
        : `file: ${path.resolve(dbPath)}`;
      console.log(`SQLite adapter created with ${modeInfo}`);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }


  private resolveDbPath(): string {
    if (this.config.mode === 'memory') {
      return ':memory:';
    }

    const dbPath = path.join('data', this.config.file_name);
    
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      if (this.config.verbose) {
        console.log(`Created directory: ${path.resolve(dataDir)}`);
      }
    }

    return path.resolve(dbPath);
  }

  async initialize(): Promise<void> {
    console.log('SQLite adapter initialized');
    await this.createTable();
  }

  async close(): Promise<void> {
    console.log('SQLite adapter closed');
    this.db.close();
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    if (this.config.verbose) {
      console.log('Executing query:', sql, params);
    }
    
    const stmt = this.db.prepare(sql);
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    
    try {
      return isSelect ? stmt.all(...params) : stmt.run(...params);
    } catch (error) {
      console.error('Query error:', { sql, params, error });
      throw error;
    }
  }

  async createTable(): Promise<void> {
    const routesSql = `
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        method TEXT NOT NULL,
        access INTEGER NOT NULL DEFAULT -1,  -- -1=not set, 0=public, 1=private
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(path, method)
      )
    `;
    await this.query(routesSql);
    
    const levelsSql = `
      CREATE TABLE IF NOT EXISTS levels (
        id INTEGER PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.query(levelsSql);
    
    const mappingSql = `
      CREATE TABLE IF NOT EXISTS route_level_mapping (
        id TEXT PRIMARY KEY,
        route_fk_id TEXT NOT NULL,
        level_fk_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_fk_id) REFERENCES routes (id) ON DELETE CASCADE,
        FOREIGN KEY (level_fk_id) REFERENCES levels (id) ON DELETE CASCADE,
        UNIQUE(route_fk_id, level_fk_id)
      )
    `;
    await this.query(mappingSql);
    
    console.log('Database tables created (routes, levels, route_level_mapping)');
  }

  async bulkInsertRoutes(routes: RouteData[]): Promise<Array<{id: string; path: string; method: string}>> {
    if (routes.length === 0) return [];
    
    const placeholders: string[] = [];
    const values: any[] = [];
    const insertedRoutes: Array<{id: string; path: string; method: string}> = [];
    
    for (const route of routes) {
      const routeId = route.id || this.generateId();
      const access = route.access ?? -1;
      
      placeholders.push('(?, ?, ?, ?, ?)');
      values.push(routeId, route.path, route.method, access, route.description || null);
      insertedRoutes.push({ id: routeId, path: route.path, method: route.method });
      
      if (this.config.verbose) {
        console.log('Preparing route:', { routeId, path: route.path, method: route.method, access });
      }
    }
    
    const sql = `
      INSERT OR REPLACE INTO routes (id, path, method, access, description)
      VALUES ${placeholders.join(', ')}
    `;
    
    await this.executeSqlInTransaction(sql, values);
    
    if (this.config.verbose) {
      console.log(`Bulk inserted ${routes.length} routes`);
    }
    
    return insertedRoutes;
  }

 async getRoute(path: string, method: string): Promise<RouteData | null> {
    const sql = `
      SELECT 
        r.id, 
        r.path, 
        r.method, 
        r.access, 
        r.description,
        GROUP_CONCAT(DISTINCT l.level) as level_ids
      FROM routes r
      LEFT JOIN route_level_mapping rlm ON r.id = rlm.route_fk_id
      LEFT JOIN levels l ON rlm.level_fk_id = l.id
      WHERE r.path = ? AND r.method = ?
      GROUP BY r.id
    `;
    
    const stmt = this.db.prepare(sql);
    const row = stmt.get(path, method) as {
      id: string;
      path: string;
      method: string;
      access: number;
      description: string | null;
      level_ids: string | null;
      route_level_ids: string | null;
    } | undefined;

    if (!row) return null;

    const levels = row.level_ids ? row.level_ids.split(',').filter(Boolean).map(Number) : [];

    return {
      id: row.id,
      path: row.path,
      method: row.method,
      access: row.access,
      description: row.description || undefined,
      levels
    };
}



  async bulkAddLevels(levels: Array<{level: number; description: string}>): Promise<void> {
    if (levels.length === 0) return;

    const placeholders: string[] = [];
    const values: any[] = [];
    
    for (const { level, description } of levels) {
      placeholders.push('(?, ?, CURRENT_TIMESTAMP)');
      values.push(level, description);
      
      if (this.config.verbose) {
        console.log('Preparing level:', { level, description });
      }
    }
    
    const sql = `
      INSERT INTO levels (level, description, updated_at)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT(level) DO UPDATE SET
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.executeSqlInTransaction(sql, values);
    
    if (this.config.verbose) {
      console.log(`Bulk inserted/updated ${levels.length} levels`);
    }
  }

  async getLevel(level: number): Promise<{id: number, level: number, description: string, updated_at: string} | null> {
    const sql = 'SELECT id, level, description, updated_at FROM levels WHERE level = ?';
    const stmt = this.db.prepare(sql);
    const row = stmt.get(level) as { id: number, level: number, description: string, updated_at: string } | undefined;
    return row || null;
  }

  async bulkAddRouteLevelMappings(mappings: Array<{routeId: string; levelId: number}>): Promise<void> {
    if (mappings.length === 0) return;

    const placeholders: string[] = [];
    const values: any[] = [];
    
    for (const { routeId, levelId } of mappings) {
      const mappingId = this.generateId();
      placeholders.push('(?, ?, ?)');
      values.push(mappingId, routeId, levelId);
      
      if (this.config.verbose) {
        console.log('Preparing route-level mapping:', { mappingId, routeId, levelId });
      }
    }
    
    const sql = `
      INSERT OR REPLACE INTO route_level_mapping (id, route_fk_id, level_fk_id)
      VALUES ${placeholders.join(', ')}
    `;
    
    await this.executeSqlInTransaction(sql, values);
    
    if (this.config.verbose) {
      console.log(`Bulk inserted ${mappings.length} route-level mappings`);
    }
  }

  async bulkRemoveRoutes(routeIds: string[]): Promise<void> {
    if (routeIds.length === 0) return;
    
    const placeholders = routeIds.map(() => '?').join(',');
    const sql = `DELETE FROM routes WHERE id IN (${placeholders})`;
    
    await this.executeSqlInTransaction(sql, routeIds);
    
    if (this.config.verbose) {
      console.log(`Removed ${routeIds.length} routes`);
    }
  }

  async executeInTransaction<T = void>(handler: () => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(() => {
      return handler();
    });
    
    try {
      return transaction();
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  private async executeSqlInTransaction(sql: string, params: any[] = []): Promise<Database.RunResult> {
    return this.executeInTransaction(async () => {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    });
  }
}
