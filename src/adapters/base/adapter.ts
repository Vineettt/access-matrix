export type TransactionHandler<T = void> = () => Promise<T>;

export interface BaseAdapter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
  createTable(): Promise<void>;
  bulkInsertRoutes(routes: RouteData[]): Promise<Array<{id: string; path: string; method: string}>>;
  bulkRemoveRoutes(routeIds: string[]): Promise<void>;
  getRoute(path: string, method: string): Promise<RouteData | null>;
  bulkAddLevels(levels: Array<{level: number; description: string}>): Promise<void>;
  getLevel(level: number): Promise<{id: number, level: number, description: string, updated_at: string} | null>;
  bulkAddRouteLevelMappings(mappings: Array<{routeId: string; levelId: number}>): Promise<void>;
  
  /**
   * Execute operations within a transaction
   * @param handler Function containing operations to execute in transaction
   */
  executeInTransaction<T = void>(handler: TransactionHandler<T>): Promise<T>;
}

export interface RouteData {
  id?: string;
  path: string;
  method: string;
  access?: number;
  description?: string;
  levels?: number[];
}
