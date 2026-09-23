import 'dotenv/config';
import { migrator } from './migrator.js';
import { postgresConnectionManager } from './pool.js';

export interface SchemaValidationReport {
  tables: string[];
  enums: string[];
  indexes: string[];
  foreignKeys: Array<{
    constraint_name: string;
    table_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
  }>;
  triggers: Array<{
    trigger_name: string;
    event_object_table: string;
  }>;
}

export async function deploySchema(): Promise<{
  migrationResult: any;
  validation: SchemaValidationReport;
}> {
  console.log('[Deploy] Starting schema migration deployment...');
  const migrationResult = await migrator.runPendingMigrations();
  if (!migrationResult.success) {
    throw new Error(`Migration failed: ${migrationResult.error}`);
  }

  const pool = postgresConnectionManager.getPool();
  if (!pool) {
    throw new Error('Database pool unavailable');
  }

  // 1. Fetch all public tables
  const tablesRes = await pool.query<{ table_name: string }>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC;
  `);

  // 2. Fetch all user-defined enums
  const enumsRes = await pool.query<{ typname: string }>(`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e' AND n.nspname = 'public'
    ORDER BY t.typname ASC;
  `);

  // 3. Fetch all indexes in public schema
  const indexesRes = await pool.query<{ indexname: string; tablename: string }>(`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname ASC;
  `);

  // 4. Fetch all foreign keys
  const fksRes = await pool.query<{
    constraint_name: string;
    table_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
  }>(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `);

  // 5. Fetch triggers
  const triggersRes = await pool.query<{
    trigger_name: string;
    event_object_table: string;
  }>(`
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);

  const validation: SchemaValidationReport = {
    tables: tablesRes.rows.map((r) => r.table_name),
    enums: enumsRes.rows.map((r) => r.typname),
    indexes: indexesRes.rows.map((r) => `${r.tablename}.${r.indexname}`),
    foreignKeys: fksRes.rows,
    triggers: triggersRes.rows,
  };

  return { migrationResult, validation };
}

// Allow direct execution
if (process.argv[1]?.endsWith('deploySchema.ts') || process.argv[1]?.endsWith('deploySchema.js')) {
  deploySchema()
    .then((res) => {
      console.log('--- DEPLOYMENT SUCCESS ---');
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('--- DEPLOYMENT FAILED ---', err);
      process.exit(1);
    });
}
