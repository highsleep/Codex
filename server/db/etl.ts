import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { postgresConnectionManager } from './pool.js';

export interface ETLResult {
  recordsImported: Record<string, number>;
  sourceCounts: Record<string, number>;
  postgresCounts: Record<string, number>;
  importErrorsCount: number;
  fkErrorsCount: number;
  errors: string[];
}

export async function runETL(): Promise<ETLResult> {
  const jsonPath = path.join(process.cwd(), 'data', 'sleepee_db.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Source JSON file not found at ${jsonPath}`);
  }

  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  const dbData = JSON.parse(rawJson);

  const pool = postgresConnectionManager.getPool();
  if (!pool) {
    throw new Error('Database pool unavailable. Please verify DATABASE_URL.');
  }

  const client = await pool.connect();
  const result: ETLResult = {
    recordsImported: {},
    sourceCounts: {},
    postgresCounts: {},
    importErrorsCount: 0,
    fkErrorsCount: 0,
    errors: [],
  };

  try {
    await client.query('BEGIN');
    console.log('[ETL] Transaction started. Importing entities in dependency order...');

    // 1. users
    const users = dbData.users || [];
    result.sourceCounts['users'] = users.length;
    let usersCount = 0;
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, email, role, department, avatar, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4::user_role_enum, $5, $6, $7::user_status_enum, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           role = EXCLUDED.role,
           department = EXCLUDED.department,
           avatar = EXCLUDED.avatar,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at;`,
        [
          u.id,
          u.name,
          u.email,
          u.role,
          u.department || 'Quality',
          u.avatar || null,
          u.status || 'ACTIVE',
          u.created_at ? new Date(u.created_at) : new Date(),
          new Date(),
        ]
      );
      usersCount++;
    }
    result.recordsImported['users'] = usersCount;

    // 2. product_models
    const models = dbData.product_models || [];
    result.sourceCounts['product_models'] = models.length;
    let modelsCount = 0;
    for (const m of models) {
      await client.query(
        `INSERT INTO product_models (
           id, model_id, commercial_model_name, sap_material_code, sap_material_description,
           product_family, warranty_years, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::model_status_enum, $9, $10)
         ON CONFLICT (model_id) DO UPDATE SET
           commercial_model_name = EXCLUDED.commercial_model_name,
           sap_material_code = EXCLUDED.sap_material_code,
           sap_material_description = EXCLUDED.sap_material_description,
           product_family = EXCLUDED.product_family,
           warranty_years = EXCLUDED.warranty_years,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at;`,
        [
          m.id,
          m.model_id,
          m.commercial_model_name,
          m.sap_material_code,
          m.sap_material_description || null,
          m.product_family,
          m.warranty_years,
          m.status || 'Active',
          m.created_at ? new Date(m.created_at) : new Date(),
          new Date(),
        ]
      );
      modelsCount++;
    }
    result.recordsImported['product_models'] = modelsCount;

    // 3. products
    const products = dbData.products || [];
    result.sourceCounts['products'] = products.length;
    let productsCount = 0;
    for (const p of products) {
      await client.query(
        `INSERT INTO products (
           id, serial_number, model, size, warranty_years, production_date, status,
           production_order, batch_no, image_url, production_status, source_system,
           sap_production_order, sap_batch_number, sap_material_code, sap_last_sync,
           production_line, shift, operator, remarks, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::production_status_enum, $12::sync_source_enum, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
         ON CONFLICT (serial_number) DO UPDATE SET
           model = EXCLUDED.model,
           size = EXCLUDED.size,
           warranty_years = EXCLUDED.warranty_years,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at;`,
        [
          p.id,
          p.serial_number,
          p.model,
          p.size,
          p.warranty_years,
          p.production_date,
          p.status || 'جاهز للتسليم',
          p.production_order,
          p.batch_no,
          p.image_url || null,
          p.production_status || 'Produced',
          p.source_system || 'Excel',
          p.sap_production_order || null,
          p.sap_batch_number || null,
          p.sap_material_code || null,
          p.sap_last_sync ? new Date(p.sap_last_sync) : null,
          p.production_line || null,
          p.shift || null,
          p.operator || null,
          p.remarks || null,
          p.created_at ? new Date(p.created_at) : new Date(),
          new Date(),
        ]
      );
      productsCount++;
    }
    result.recordsImported['products'] = productsCount;

    // 4. role_change_logs
    const roleLogs = dbData.role_change_logs || [];
    result.sourceCounts['role_change_logs'] = roleLogs.length;
    let roleLogsCount = 0;
    for (const r of roleLogs) {
      await client.query(
        `INSERT INTO role_change_logs (id, user_id, user_name, old_role, new_role, modified_by, notes, timestamp)
         VALUES ($1, $2, $3, $4::user_role_enum, $5::user_role_enum, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [
          r.id,
          r.user_id,
          r.user_name,
          r.old_role,
          r.new_role,
          r.modified_by,
          r.notes || null,
          r.timestamp ? new Date(r.timestamp) : new Date(),
        ]
      );
      roleLogsCount++;
    }
    result.recordsImported['role_change_logs'] = roleLogsCount;

    // 5. warranty_policy_audit
    const policyAudits = dbData.warranty_policy_audit || [];
    result.sourceCounts['warranty_policy_audit'] = policyAudits.length;
    let policyAuditCount = 0;
    for (const a of policyAudits) {
      await client.query(
        `INSERT INTO warranty_policy_audit (
           id, audit_id, model_id, commercial_model_name, old_warranty_years, new_warranty_years, changed_by, reason, changed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (audit_id) DO NOTHING;`,
        [
          a.id,
          a.audit_id,
          a.model_id,
          a.commercial_model_name || null,
          a.old_warranty_years,
          a.new_warranty_years,
          a.changed_by,
          a.reason,
          a.changed_at ? new Date(a.changed_at) : new Date(),
        ]
      );
      policyAuditCount++;
    }
    result.recordsImported['warranty_policy_audit'] = policyAuditCount;

    // 6. warranty_activations
    const activations = dbData.warranty_activations || [];
    result.sourceCounts['warranty_activations'] = activations.length;
    let activationsCount = 0;
    for (const w of activations) {
      await client.query(
        `INSERT INTO warranty_activations (
           id, warranty_id, serial_number, customer_name, phone, governorate, city,
           invoice_number, purchase_date, activation_date, expiry_date, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (warranty_id) DO NOTHING;`,
        [
          w.id,
          w.warranty_id,
          w.serial_number,
          w.customer_name,
          w.phone,
          w.governorate,
          w.city,
          w.invoice_number,
          w.purchase_date,
          w.activation_date ? new Date(w.activation_date) : new Date(),
          w.expiry_date,
          w.status || 'ساري',
          w.created_at ? new Date(w.created_at) : new Date(),
          new Date(),
        ]
      );
      activationsCount++;
    }
    result.recordsImported['warranty_activations'] = activationsCount;

    // 7. warranty_claims (includes claim_tasks in pending_tasks)
    const claims = dbData.warranty_claims || [];
    result.sourceCounts['warranty_claims'] = claims.length;
    let claimsCount = 0;
    let totalClaimTasks = 0;
    const userIds = new Set(users.map((u: any) => u.id));

    for (const c of claims) {
      const tasks = Array.isArray(c.pending_tasks) ? c.pending_tasks : [];
      totalClaimTasks += tasks.length;
      // Respect FK constraint warranty_claims_assigned_to_fkey -> users(id)
      const assignedToUser = c.assigned_to && userIds.has(c.assigned_to) ? c.assigned_to : null;

      await client.query(
        `INSERT INTO warranty_claims (
           id, claim_id, warranty_id, serial_number, customer_name, phone,
           complaint_type, complaint_description, claim_status, assigned_to,
           inspection_date, inspection_result, resolution, resolution_date,
           images, claim_date, next_follow_up_date, last_action_date,
           target_resolution_days, pending_tasks, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::complaint_type_enum, $8, $9::claim_status_enum, $10, $11, $12, $13, $14, $15::jsonb, $16, $17, $18, $19, $20::jsonb, $21, $22)
         ON CONFLICT (claim_id) DO NOTHING;`,
        [
          c.id,
          c.claim_id,
          c.warranty_id,
          c.serial_number,
          c.customer_name,
          c.phone,
          c.complaint_type,
          c.complaint_description,
          c.claim_status || 'Open',
          assignedToUser,
          c.inspection_date ? new Date(c.inspection_date) : null,
          c.inspection_result || null,
          c.resolution || null,
          c.resolution_date ? new Date(c.resolution_date) : null,
          JSON.stringify(c.images || []),
          c.claim_date || new Date().toISOString().split('T')[0],
          c.next_follow_up_date ? new Date(c.next_follow_up_date) : null,
          c.last_action_date ? new Date(c.last_action_date) : null,
          c.target_resolution_days || 7,
          JSON.stringify(tasks),
          c.created_at ? new Date(c.created_at) : new Date(),
          new Date(),
        ]
      );
      claimsCount++;
    }
    result.recordsImported['warranty_claims'] = claimsCount;
    result.recordsImported['claim_tasks'] = totalClaimTasks;
    result.sourceCounts['claim_tasks'] = totalClaimTasks;

    // 8. replacements
    const replacements = dbData.replacements || [];
    result.sourceCounts['replacements'] = replacements.length;
    let replacementsCount = 0;
    for (const rep of replacements) {
      await client.query(
        `INSERT INTO replacements (
           id, replacement_id, old_serial_number, new_serial_number, old_warranty_id,
           new_warranty_id, replacement_reason, approval_date, approved_by, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (replacement_id) DO NOTHING;`,
        [
          rep.id,
          rep.replacement_id,
          rep.old_serial_number,
          rep.new_serial_number,
          rep.old_warranty_id,
          rep.new_warranty_id || null,
          rep.replacement_reason,
          new Date(rep.approval_date),
          rep.approved_by,
          rep.notes || null,
          rep.created_at ? new Date(rep.created_at) : new Date(),
        ]
      );
      replacementsCount++;
    }
    result.recordsImported['replacements'] = replacementsCount;

    // 9. product_lifecycle
    const lifecycle = dbData.product_lifecycle || [];
    result.sourceCounts['product_lifecycle'] = lifecycle.length;
    let lifecycleCount = 0;
    for (const l of lifecycle) {
      await client.query(
        `INSERT INTO product_lifecycle (
           lifecycle_id, serial_number, event_type, event_date, performed_by, notes, reference_id, created_at
         ) VALUES ($1, $2, $3::lifecycle_event_enum, $4, $5, $6, $7, $8)
         ON CONFLICT (lifecycle_id) DO NOTHING;`,
        [
          l.lifecycle_id,
          l.serial_number,
          l.event_type,
          new Date(l.event_date),
          l.performed_by,
          l.notes || null,
          l.reference_id || null,
          l.created_at ? new Date(l.created_at) : new Date(),
        ]
      );
      lifecycleCount++;
    }
    result.recordsImported['product_lifecycle'] = lifecycleCount;

    // 10. customer_communications
    const comms = dbData.customer_communications || [];
    result.sourceCounts['customer_communications'] = comms.length;
    let commsCount = 0;
    for (const cm of comms) {
      await client.query(
        `INSERT INTO customer_communications (
           id, serial_number, warranty_id, customer_name, customer_phone,
           communication_type, date_time, formatted_date_time, responsible_user,
           details, related_reference, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6::communication_type_enum, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING;`,
        [
          cm.id,
          cm.serial_number,
          cm.warranty_id || null,
          cm.customer_name || null,
          cm.customer_phone || null,
          cm.communication_type,
          new Date(cm.date_time),
          cm.formatted_date_time || null,
          cm.responsible_user,
          cm.details,
          cm.related_reference || null,
          cm.created_at ? new Date(cm.created_at) : new Date(),
        ]
      );
      commsCount++;
    }
    result.recordsImported['customer_communications'] = commsCount;

    // 11. attachments
    const attachments = dbData.attachments || [];
    result.sourceCounts['attachments'] = attachments.length;
    let attachmentsCount = 0;
    for (const a of attachments) {
      await client.query(
        `INSERT INTO attachments (
           id, attachment_id, entity_type, entity_id, file_name, file_type, file_size,
           uploaded_by, uploaded_at, storage_path, download_url, storage_url, description, category, created_at
         ) VALUES ($1, $2, $3::attachment_entity_enum, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (attachment_id) DO NOTHING;`,
        [
          a.id,
          a.attachment_id,
          a.entity_type,
          a.entity_id,
          a.file_name,
          a.file_type,
          a.file_size || 0,
          a.uploaded_by,
          new Date(a.uploaded_at),
          a.storage_path,
          a.download_url,
          a.storage_url,
          a.description || null,
          a.category || null,
          a.created_at ? new Date(a.created_at) : new Date(),
        ]
      );
      attachmentsCount++;
    }
    result.recordsImported['attachments'] = attachmentsCount;

    // 12. production_batches
    const batches = dbData.production_batches || [];
    result.sourceCounts['production_batches'] = batches.length;
    let batchesCount = 0;
    for (const b of batches) {
      await client.query(
        `INSERT INTO production_batches (
           id, batch_id, batch_no, production_order, production_date, total_serials, model_count, source_system, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
         ON CONFLICT (batch_id) DO UPDATE SET
           total_serials = EXCLUDED.total_serials,
           model_count = EXCLUDED.model_count,
           updated_at = EXCLUDED.updated_at;`,
        [
          b.id,
          b.batch_id,
          b.batch_no,
          b.production_order,
          b.production_date,
          b.total_serials || 0,
          JSON.stringify(b.model_count || {}),
          b.source_system || 'System',
          b.created_at ? new Date(b.created_at) : new Date(),
          new Date(),
        ]
      );
      batchesCount++;
    }
    result.recordsImported['production_batches'] = batchesCount;

    // 13. production_sync_state
    const syncState = dbData.production_sync_state || [];
    result.sourceCounts['production_sync_state'] = syncState.length;
    let syncCount = 0;
    for (const s of syncState) {
      await client.query(
        `INSERT INTO production_sync_state (
           id, sync_source, last_sync_time, last_successful_sync, last_file_hash,
           last_row_count, sync_url, target_file_name, connection_status,
           connection_mode, auth_type, api_key_or_token, notes, updated_at
         ) VALUES ($1, $2::sync_source_enum, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (sync_source) DO UPDATE SET
           last_sync_time = EXCLUDED.last_sync_time,
           last_successful_sync = EXCLUDED.last_successful_sync,
           last_file_hash = EXCLUDED.last_file_hash,
           last_row_count = EXCLUDED.last_row_count,
           sync_url = EXCLUDED.sync_url,
           target_file_name = EXCLUDED.target_file_name,
           connection_status = EXCLUDED.connection_status,
           connection_mode = EXCLUDED.connection_mode,
           auth_type = EXCLUDED.auth_type,
           api_key_or_token = EXCLUDED.api_key_or_token,
           notes = EXCLUDED.notes,
           updated_at = EXCLUDED.updated_at;`,
        [
          s.id,
          s.sync_source,
          s.last_sync_time ? new Date(s.last_sync_time) : null,
          s.last_successful_sync ? new Date(s.last_successful_sync) : null,
          s.last_file_hash || null,
          s.last_row_count || 0,
          s.sync_url || null,
          s.target_file_name || null,
          s.connection_status || 'not_configured',
          s.connection_mode || 'simulated_fallback',
          s.auth_type || null,
          s.api_key_or_token || null,
          s.notes || null,
          new Date(),
        ]
      );
      syncCount++;
    }
    result.recordsImported['production_sync_state'] = syncCount;

    // 14. production_import_logs
    const importLogs = dbData.production_import_logs || [];
    result.sourceCounts['production_import_logs'] = importLogs.length;
    let importLogsCount = 0;
    for (const il of importLogs) {
      await client.query(
        `INSERT INTO production_import_logs (
           id, import_id, file_name, source_type, import_date, imported_records,
           skipped_records, failed_records, execution_time, performed_by, status, error_log, batch_no, production_order, created_at
         ) VALUES ($1, $2, $3, $4::sync_source_enum, $5, $6, $7, $8, $9, $10, $11::import_status_enum, $12::jsonb, $13, $14, $15)
         ON CONFLICT (import_id) DO NOTHING;`,
        [
          il.id,
          il.import_id,
          il.file_name,
          il.source_type,
          il.import_date ? new Date(il.import_date) : new Date(),
          il.imported_records || 0,
          il.skipped_records || 0,
          il.failed_records || 0,
          il.execution_time || 0,
          il.performed_by,
          il.status,
          JSON.stringify(il.error_log || []),
          il.batch_no || null,
          il.production_order || null,
          il.created_at ? new Date(il.created_at) : new Date(),
        ]
      );
      importLogsCount++;
    }
    result.recordsImported['production_import_logs'] = importLogsCount;

    // 15. activation_logs
    const actLogs = dbData.activation_logs || [];
    result.sourceCounts['activation_logs'] = actLogs.length;
    let actLogsCount = 0;
    for (const al of actLogs) {
      await client.query(
        `INSERT INTO activation_logs (id, warranty_id, serial_number, action, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING;`,
        [
          al.id,
          al.warranty_id || null,
          al.serial_number,
          al.action,
          al.created_at ? new Date(al.created_at) : new Date(),
        ]
      );
      actLogsCount++;
    }
    result.recordsImported['activation_logs'] = actLogsCount;

    // Reset serial sequences to avoid sequence conflicts on future autoincrements
    const serialTables = [
      'product_models',
      'products',
      'warranty_policy_audit',
      'warranty_activations',
      'warranty_claims',
      'replacements',
      'activation_logs',
      'product_lifecycle',
      'attachments',
      'production_batches',
      'production_sync_state',
      'production_import_logs',
    ];

    for (const table of serialTables) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1));`,
        [table]
      );
    }

    await client.query('COMMIT');
    console.log('[ETL] Transaction successfully committed.');

    // Verify row counts in PostgreSQL
    const tablesToCount = [
      'users',
      'product_models',
      'products',
      'role_change_logs',
      'warranty_policy_audit',
      'warranty_activations',
      'warranty_claims',
      'replacements',
      'product_lifecycle',
      'customer_communications',
      'attachments',
      'production_batches',
      'production_sync_state',
      'production_import_logs',
      'activation_logs',
    ];

    for (const table of tablesToCount) {
      const res = await client.query(`SELECT COUNT(*)::int as count FROM ${table};`);
      result.postgresCounts[table] = res.rows[0].count;
    }

    // Check FK Integrity
    const fkChecks = [
      `SELECT count(*)::int as broken FROM product_lifecycle l LEFT JOIN products p ON l.serial_number = p.serial_number WHERE p.serial_number IS NULL;`,
      `SELECT count(*)::int as broken FROM replacements r LEFT JOIN products p ON r.old_serial_number = p.serial_number WHERE p.serial_number IS NULL;`,
      `SELECT count(*)::int as broken FROM replacements r LEFT JOIN products p ON r.new_serial_number = p.serial_number WHERE p.serial_number IS NULL;`,
      `SELECT count(*)::int as broken FROM replacements r LEFT JOIN warranty_activations w ON r.old_warranty_id = w.warranty_id WHERE w.warranty_id IS NULL;`,
      `SELECT count(*)::int as broken FROM role_change_logs rc LEFT JOIN users u ON rc.user_id = u.id WHERE u.id IS NULL;`,
      `SELECT count(*)::int as broken FROM warranty_activations wa LEFT JOIN products p ON wa.serial_number = p.serial_number WHERE p.serial_number IS NULL;`,
      `SELECT count(*)::int as broken FROM warranty_claims wc LEFT JOIN products p ON wc.serial_number = p.serial_number WHERE p.serial_number IS NULL;`,
      `SELECT count(*)::int as broken FROM warranty_claims wc LEFT JOIN warranty_activations wa ON wc.warranty_id = wa.warranty_id WHERE wa.warranty_id IS NULL;`,
      `SELECT count(*)::int as broken FROM warranty_policy_audit wpa LEFT JOIN product_models pm ON wpa.model_id = pm.model_id WHERE pm.model_id IS NULL;`,
    ];

    let totalBrokenFKs = 0;
    for (const checkQuery of fkChecks) {
      const chkRes = await client.query(checkQuery);
      totalBrokenFKs += chkRes.rows[0].broken;
    }
    result.fkErrorsCount = totalBrokenFKs;

    return result;
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    console.error('[ETL] Transaction rolled back due to error:', err);
    result.importErrorsCount++;
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('etl.ts') || process.argv[1]?.endsWith('etl.js')) {
  runETL()
    .then((res) => {
      console.log('--- ETL RESULT ---');
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.importErrorsCount === 0 && res.fkErrorsCount === 0 ? 0 : 1);
    })
    .catch((err) => {
      console.error('--- ETL CRITICAL FAILURE ---', err);
      process.exit(1);
    });
}
