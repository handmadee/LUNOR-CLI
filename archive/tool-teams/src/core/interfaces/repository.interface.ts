/**
 * Base Repository Interface
 * 
 * Generic interface following Repository Pattern.
 * Provides abstraction over data persistence layer.
 */

/**
 * Base repository interface for CRUD operations
 */
export interface IRepository<T, ID = string> {
  findById(id: ID): T | null;
  findAll(): T[];
  save(entity: T): T;
  update(id: ID, data: Partial<T>): boolean;
  delete(id: ID): boolean;
  exists(id: ID): boolean;
}

/**
 * Query options for list operations
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
