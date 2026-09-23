/**
 * Sleepee Warranty Application Repository.
 *
 * Exposes the formal data-access boundary (IApplicationRepository).
 * Active implementation: JsonApplicationRepository (backed by JSON file storage).
 *
 * All application route handlers, providers, and automation jobs interact
 * through this contract, ensuring complete storage engine decoupling.
 */

import { db } from '../db/index.js';
import { JsonApplicationRepository } from './jsonApplicationRepository.js';
import { PostgresApplicationRepository } from './postgresApplicationRepository.js';
import type { IApplicationRepository } from './types.js';

export * from './types.js';
export { JsonApplicationRepository } from './jsonApplicationRepository.js';
export { PostgresApplicationRepository } from './postgresApplicationRepository.js';

export type DatabaseDriver = 'json' | 'postgres';

export const DATABASE_DRIVER: DatabaseDriver =
  (process.env.DATABASE_DRIVER as DatabaseDriver) === 'postgres' ? 'postgres' : 'json';

export function createApplicationRepository(
  driver: DatabaseDriver = DATABASE_DRIVER
): IApplicationRepository {
  if (driver === 'postgres') {
    return new PostgresApplicationRepository();
  }
  return new JsonApplicationRepository(db);
}

export const repository: IApplicationRepository = createApplicationRepository();

if (DATABASE_DRIVER === 'postgres') {
  (repository as PostgresApplicationRepository).loadFromPostgres();
}
