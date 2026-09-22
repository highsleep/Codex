/**
 * Current application data-access boundary.
 *
 * CURRENT: delegates to the JSON-backed DatabaseService.
 * TARGET: replace this adapter with a PostgreSQL implementation after an
 * explicit, validated cutover. Consumers must not write to JSON files directly.
 */
import { db } from '../db/index.js';

export type ApplicationRepository = typeof db;

export const repository: ApplicationRepository = db;
