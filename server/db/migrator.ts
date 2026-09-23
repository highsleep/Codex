import fs from 'fs';
import path from 'path';
import { postgresConnectionManager } from './pool.js';

export interface MigrationRecord {
  version: string;
  name: string;
  applied_at: string;
}

export interface MigrationResult {
  success: boolean;
  appliedCount: number;
  appliedMigrations: string[];
  alreadyApplied: string[];
  error?: string;
}

export class PostgresMigrator {
  private migrationsDir: string;

  constructor(migrationsDir?: string) {
    this.migrationsDir = migrationsDir || path.join(process.cwd(), 'server', 'db', 'migrations');
  }

  public async ensureMigrationsTable(): Promise<void> {
    const pool = postgresConnectionManager.getPool();
    if (!pool) {
      throw new Error('Database pool not initialized. DATABASE_URL must be configured.');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable();
    const pool = postgresConnectionManager.getPool();
    if (!pool) return [];

    const res = await pool.query<MigrationRecord>(
      'SELECT version, name, applied_at::text FROM schema_migrations ORDER BY version ASC;'
    );
    return res.rows;
  }

  public async runPendingMigrations(): Promise<MigrationResult> {
    await this.ensureMigrationsTable();
    const pool = postgresConnectionManager.getPool();
    if (!pool) {
      throw new Error('Database pool not initialized.');
    }

    if (!fs.existsSync(this.migrationsDir)) {
      throw new Error(`Migrations directory not found: ${this.migrationsDir}`);
    }

    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const appliedMigrations: string[] = [];
    const client = await pool.connect();

    try {
      for (const file of files) {
        const version = file.split('_')[0] || file;
        if (appliedVersions.has(version)) {
          continue;
        }

        console.log(`[Migrator] Applying migration: ${file}...`);
        const filePath = path.join(this.migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, CURRENT_TIMESTAMP);',
            [version, file]
          );
          await client.query('COMMIT');
          appliedMigrations.push(file);
          console.log(`[Migrator] Successfully applied migration: ${file}`);
        } catch (migrationErr) {
          await client.query('ROLLBACK');
          console.error(`[Migrator] Error applying migration ${file}:`, migrationErr);
          throw migrationErr;
        }
      }

      return {
        success: true,
        appliedCount: appliedMigrations.length,
        appliedMigrations,
        alreadyApplied: applied.map((m) => m.name),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        appliedCount: appliedMigrations.length,
        appliedMigrations,
        alreadyApplied: applied.map((m) => m.name),
        error: errorMsg,
      };
    } finally {
      client.release();
    }
  }
}

export const migrator = new PostgresMigrator();
