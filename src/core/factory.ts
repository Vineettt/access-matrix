import { BaseAdapter } from '../adapters/base/adapter.ts';
import { SQLiteAdapter } from '../adapters/sqlite/sqlite-adapter.ts';
import { DatabaseConfig, loadDatabaseConfig } from '../utils/config.ts';

export class AdapterFactory {
  private static adapters = new Map<string, new (config: any) => BaseAdapter>();

  static {
    this.adapters.set('sqlite', SQLiteAdapter);
    // this.adapters.set('postgres', PostgresAdapter);
    // this.adapters.set('mysql', MySQLAdapter);
  }

  static create(config: DatabaseConfig): BaseAdapter {
    const AdapterClass = this.adapters.get(config.type);
    
    if (!AdapterClass) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }
    
    return new AdapterClass(config.config);
  }

  static register(type: string, adapterClass: new (config: any) => BaseAdapter): void {
    this.adapters.set(type, adapterClass);
  }

  static fromConfigFile(configPath: string): BaseAdapter {
    const config = loadDatabaseConfig(configPath);
    return this.create(config);
  }
}
