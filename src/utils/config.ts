import { readFileSync } from 'fs';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  config: Record<string, any>;
}

export function loadDatabaseConfig(path: string): DatabaseConfig {
  try {
    const data = readFileSync(path, 'utf8');
    const config = JSON.parse(data);
    
    return config.database;
  } catch (error) {
    throw new Error(`Failed to load database config from ${path}: ${error}`);
  }
}
