import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export interface DatabaseHealthResult {
  ok: boolean;
  configured: boolean;
  database: 'postgres';
  timestamp: string;
  error?: string;
  latencyMs?: number;
  serverVersion?: string;
}

export class PostgresConnectionManager {
  private static instance: PostgresConnectionManager;
  private poolInstance: pg.Pool | null = null;

  private constructor() {}

  public static getInstance(): PostgresConnectionManager {
    if (!PostgresConnectionManager.instance) {
      PostgresConnectionManager.instance = new PostgresConnectionManager();
    }
    return PostgresConnectionManager.instance;
  }

  public getPool(): pg.Pool | null {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return null;
    }

    if (!this.poolInstance) {
      this.poolInstance = new Pool({
        connectionString: databaseUrl,
        ssl:
          !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1')
            ? { rejectUnauthorized: false }
            : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      this.poolInstance.on('error', (err: Error) => {
        console.error('[PostgreSQL Pool Error]', err);
      });
    }

    return this.poolInstance;
  }

  public async checkDatabaseConnection(): Promise<DatabaseHealthResult> {
    const timestamp = new Date().toISOString();
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return {
        ok: false,
        configured: false,
        database: 'postgres',
        error: 'DATABASE_URL is not configured in environment',
        timestamp,
      };
    }

    const activePool = this.getPool();
    if (!activePool) {
      return {
        ok: false,
        configured: false,
        database: 'postgres',
        error: 'Failed to initialize PostgreSQL pool',
        timestamp,
      };
    }

    const startTime = Date.now();
    try {
      const client = await activePool.connect();
      try {
        const result = await client.query('SELECT version(), current_database() AS db_name;');
        const latencyMs = Date.now() - startTime;
        return {
          ok: true,
          configured: true,
          database: 'postgres',
          latencyMs,
          serverVersion: result.rows[0]?.version,
          timestamp,
        };
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        configured: true,
        database: 'postgres',
        latencyMs: Date.now() - startTime,
        error: errorMsg,
        timestamp,
      };
    }
  }

  public async close(): Promise<void> {
    if (this.poolInstance) {
      try {
        await this.poolInstance.end();
        console.log('[PostgreSQL] Connection pool gracefully closed.');
      } catch (err) {
        console.error('[PostgreSQL] Error closing pool:', err);
      } finally {
        this.poolInstance = null;
      }
    }
  }
}

export const postgresConnectionManager = PostgresConnectionManager.getInstance();

/**
 * Exported Pool instance proxy.
 * Resolves to the underlying pg.Pool when DATABASE_URL is configured.
 */
export const pool = new Proxy({} as pg.Pool, {
  get(target, prop, receiver) {
    const activePool = postgresConnectionManager.getPool();
    if (!activePool) {
      throw new Error('PostgreSQL pool accessed but DATABASE_URL is not configured in environment.');
    }
    const val = Reflect.get(activePool, prop, receiver);
    return typeof val === 'function' ? val.bind(activePool) : val;
  },
});

export const checkDatabaseConnection = () => postgresConnectionManager.checkDatabaseConnection();
export const closePool = () => postgresConnectionManager.close();

// Graceful process shutdown handling
process.on('SIGTERM', async () => {
  await closePool();
});

process.on('SIGINT', async () => {
  await closePool();
});
