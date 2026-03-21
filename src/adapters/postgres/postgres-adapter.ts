import { BaseAdapter, RouteData } from '../base/adapter.js';
import { Pool, PoolClient } from 'pg';

export interface PostgresConfig {
  postgres?: {
    connection_string?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    verbose?: boolean;
  };
  connection_string?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  verbose?: boolean;
}

export class PostgresAdapter implements BaseAdapter {
  private pool: Pool;
  private config: PostgresConfig;

  constructor(config: PostgresConfig = {}) {
    // Handle nested config structure: {postgres: {...}} or direct config {...}
    const actualConfig = config.postgres || config;
    
    this.config = {
      connection_string: actualConfig.connection_string,
      host: actualConfig.host || 'localhost',
      port: actualConfig.port || 5432,
      database: actualConfig.database || 'access_matrix',
      user: actualConfig.user || 'postgres',
      password: actualConfig.password || '',
      ssl: actualConfig.ssl || false,
      max: actualConfig.max || 10,
      idleTimeoutMillis: actualConfig.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: actualConfig.connectionTimeoutMillis || 2000,
      verbose: actualConfig.verbose || false
    };

    // Use connection_string if provided, otherwise build from individual params
    const poolConfig = this.config.connection_string 
      ? { 
          connectionString: this.config.connection_string,
          ssl: this.config.ssl,
          max: this.config.max,
          idleTimeoutMillis: this.config.idleTimeoutMillis,
          connectionTimeoutMillis: this.config.connectionTimeoutMillis
        }
      : {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: this.config.ssl,
          max: this.config.max,
          idleTimeoutMillis: this.config.idleTimeoutMillis,
          connectionTimeoutMillis: this.config.connectionTimeoutMillis
        };

    this.pool = new Pool(poolConfig);

    if (this.config.verbose) {
      const connectionInfo = this.config.connection_string 
        ? `connection string: ${this.config.connection_string.replace(/\/\/.*@/, '//***@')}` 
        : `${this.config.host}:${this.config.port}/${this.config.database}`;
      console.log(`PostgreSQL adapter created for ${connectionInfo}`);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async initialize(): Promise<void> {
    try {
      await this.pool.connect();
      await this.createTable();
    } catch (error: any) {
      if (error.code === '3D000' || error.message.includes('database') && error.message.includes('does not exist')) {
        console.log(`Database "${this.config.database}" does not exist. Creating it...`);
        await this.createDatabase();
        await this.pool.connect();
        await this.createTable();
      } else {
        console.error('Failed to initialize PostgreSQL adapter:', error);
        throw error;
      }
    }
  }

  private async createDatabase(): Promise<void> {
    const defaultConfig = { ...this.config, database: 'postgres' };
    const tempPool = new Pool({
      host: defaultConfig.host,
      port: defaultConfig.port,
      database: 'postgres',
      user: defaultConfig.user,
      password: defaultConfig.password,
      ssl: defaultConfig.ssl,
      max: 1,
      connectionTimeoutMillis: defaultConfig.connectionTimeoutMillis
    });

    const client = await tempPool.connect();
    try {
      await client.query(`CREATE DATABASE "${this.config.database}"`);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    } finally {
      client.release();
      await tempPool.end();
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
    } catch (error) {
      console.error('Error closing PostgreSQL adapter:', error);
      throw error;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    if (this.config.verbose) {
      console.log('Executing query:', sql, params);
    }
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Query error:', { sql, params, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async createTable(): Promise<void> {
    const routesSql = `
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        method TEXT NOT NULL,
        access INTEGER NOT NULL DEFAULT -1,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(path, method)
      )
    `;
    await this.query(routesSql);
    
    const levelsSql = `
      CREATE TABLE IF NOT EXISTS levels (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.query(levelsSql);
    
    const mappingSql = `
      CREATE TABLE IF NOT EXISTS route_level_mapping (
        id TEXT PRIMARY KEY,
        route_fk_id TEXT NOT NULL,
        level_fk_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_fk_id) REFERENCES routes (id) ON DELETE CASCADE,
        FOREIGN KEY (level_fk_id) REFERENCES levels (id) ON DELETE CASCADE,
        UNIQUE(route_fk_id, level_fk_id)
      )
    `;
    await this.query(mappingSql);
  }

  async bulkInsertRoutes(routes: RouteData[]): Promise<Array<{id: string; path: string; method: string}>> {
    if (routes.length === 0) return [];
    
    const insertedRoutes: Array<{id: string; path: string; method: string}> = [];
    
    await this.executeInTransaction(async (client) => {
      for (const route of routes) {
        const routeId = route.id || this.generateId();
        const access = route.access ?? -1;
        
        const sql = `
          INSERT INTO routes (id, path, method, access, description)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (path, method) DO UPDATE SET
            access = EXCLUDED.access,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        `;
        
        await client.query(sql, [routeId, route.path, route.method, access, route.description || null]);
        insertedRoutes.push({ id: routeId, path: route.path, method: route.method });
      }
    });
    
    return insertedRoutes;
  }

  async bulkRemoveRoutes(routeIds: string[]): Promise<void> {
    if (routeIds.length === 0) return;
    
    const placeholders = routeIds.map((_, index) => `$${index + 1}`).join(',');
    const sql = `DELETE FROM routes WHERE id IN (${placeholders})`;
    
    await this.query(sql, routeIds);
  }

  async getRoute(path: string, method: string): Promise<RouteData | null> {
    const sql = `
      SELECT 
        r.id, 
        r.path, 
        r.method, 
        r.access, 
        r.description,
        ARRAY_AGG(DISTINCT l.level) as level_ids
      FROM routes r
      LEFT JOIN route_level_mapping rlm ON r.id = rlm.route_fk_id
      LEFT JOIN levels l ON rlm.level_fk_id = l.id
      WHERE r.path = $1 AND r.method = $2
      GROUP BY r.id
    `;
    
    const rows = await this.query(sql, [path, method]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    const levels = row.level_ids ? row.level_ids.filter((level: any) => level !== null).map(Number) : [];

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

    await this.executeInTransaction(async (client) => {
      for (const { level, description } of levels) {
        const sql = `
          INSERT INTO levels (level, description, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (level) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        `;
        
        await client.query(sql, [level, description]);
      }
    });
  }

  async getLevel(level: number): Promise<{id: number, level: number, description: string, updated_at: string} | null> {
    const sql = 'SELECT id, level, description, updated_at FROM levels WHERE level = $1';
    const rows = await this.query(sql, [level]);
    return rows.length > 0 ? rows[0] : null;
  }

  async bulkAddRouteLevelMappings(mappings: Array<{routeId: string; levelId: number}>): Promise<void> {
    if (mappings.length === 0) return;

    await this.executeInTransaction(async (client) => {
      for (const { routeId, levelId } of mappings) {
        const routeExists = await client.query('SELECT 1 FROM routes WHERE id = $1 LIMIT 1', [routeId]);
        if (routeExists.rows.length === 0) {
          throw new Error(`Route with ID '${routeId}' does not exist`);
        }
        
        const levelExists = await client.query('SELECT 1 FROM levels WHERE id = $1 LIMIT 1', [levelId]);
        if (levelExists.rows.length === 0) {
          throw new Error(`Level with ID '${levelId}' does not exist`);
        }
        
        const mappingId = this.generateId();
        const sql = `
          INSERT INTO route_level_mapping (id, route_fk_id, level_fk_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (route_fk_id, level_fk_id) DO NOTHING
        `;
        
        await client.query(sql, [mappingId, routeId, levelId]);
      }
    });
  }

  async executeInTransaction<T = void>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
