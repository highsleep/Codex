/**
 * PostgreSQL Application Repository Adapter.
 *
 * Implements IApplicationRepository backed by the PostgreSQL relational database.
 * Executes parameterized SQL statements against the Cloud SQL / Supabase schema
 * and provides write-through durability and direct async query capabilities.
 */

import { postgresConnectionManager } from '../db/pool.js';
import { DatabaseService, db as defaultDbInstance } from '../db/index.js';
import type {
  IApplicationRepository,
  Product,
  ProductModel,
  WarrantyActivation,
  WarrantyClaim,
  Replacement,
  Attachment,
  AttachmentEntityType,
  AppUser,
  UserRole,
  RoleAuditLog,
  WarrantyPolicyAudit,
  ProductionSyncState,
  ProductionImportLog,
  ProductionBatch,
  ZebraLabelData,
  ActivationLog,
  ProductLifecycle,
  CustomerCommunication,
  ClaimTask,
  ClaimStatus,
  ComplaintType,
  UnifiedTimelineEvent,
} from './types.js';

export class PostgresApplicationRepository implements IApplicationRepository {
  private memDb: DatabaseService;
  private isLoadedFromDb = false;

  constructor(baseDbInstance?: DatabaseService) {
    this.memDb = baseDbInstance || defaultDbInstance;
  }

  /**
   * Helper to execute a query against the PostgreSQL pool with error logging.
   */
  private async executeSql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const pool = postgresConnectionManager.getPool();
    if (!pool) {
      console.warn('[PostgresApplicationRepository] Database pool not configured, skipping SQL execution.');
      return [];
    }

    try {
      const res = await pool.query(sql, params);
      return res.rows as T[];
    } catch (err) {
      console.error('[PostgresApplicationRepository] SQL Execution Error:', err, { sql, params });
      throw err;
    }
  }

  /**
   * Asynchronous direct query method for external consumers.
   */
  public async queryAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.executeSql<T>(sql, params);
  }

  /**
   * Hydrates the in-memory cache directly from live PostgreSQL tables.
   */
  public async loadFromPostgres(): Promise<void> {
    const pool = postgresConnectionManager.getPool();
    if (!pool) return;

    try {
      console.log('[PostgresApplicationRepository] Loading data from PostgreSQL tables...');

      const [
        productsRes,
        activationsRes,
        claimsRes,
        replacementsRes,
        usersRes,
        modelsRes,
        batchesRes,
        attachmentsRes,
        lifecycleRes,
        commsRes,
        syncRes,
        importLogsRes,
        auditRes,
      ] = await Promise.all([
        pool.query('SELECT * FROM products ORDER BY id ASC;'),
        pool.query('SELECT * FROM warranty_activations ORDER BY id ASC;'),
        pool.query('SELECT * FROM warranty_claims ORDER BY id ASC;'),
        pool.query('SELECT * FROM replacements ORDER BY id ASC;'),
        pool.query('SELECT * FROM users ORDER BY id ASC;'),
        pool.query('SELECT * FROM product_models ORDER BY id ASC;'),
        pool.query('SELECT * FROM production_batches ORDER BY id ASC;'),
        pool.query('SELECT * FROM attachments ORDER BY id ASC;'),
        pool.query('SELECT * FROM product_lifecycle ORDER BY id ASC;'),
        pool.query('SELECT * FROM customer_communications ORDER BY date_time ASC;'),
        pool.query('SELECT * FROM production_sync_state ORDER BY id ASC;'),
        pool.query('SELECT * FROM production_import_logs ORDER BY id DESC;'),
        pool.query('SELECT * FROM warranty_policy_audit ORDER BY id ASC;'),
      ]);

      if (productsRes.rows.length > 0) {
        this.memDb.data.products = productsRes.rows.map((r) => ({
          id: r.id,
          serial_number: r.serial_number,
          model: r.model,
          size: r.size,
          warranty_years: r.warranty_years,
          production_date: typeof r.production_date === 'string' ? r.production_date : r.production_date?.toISOString?.().split('T')[0] || '',
          status: r.status,
          production_order: r.production_order,
          batch_no: r.batch_no,
          image_url: r.image_url,
          created_at: r.created_at?.toISOString?.() || r.created_at,
          production_status: r.production_status,
          source_system: r.source_system,
          sap_production_order: r.sap_production_order,
          sap_batch_number: r.sap_batch_number,
          sap_material_code: r.sap_material_code,
          sap_last_sync: r.sap_last_sync?.toISOString?.() || r.sap_last_sync,
          production_line: r.production_line,
          shift: r.shift,
          operator: r.operator,
          remarks: r.remarks,
        }));
      }

      if (activationsRes.rows.length > 0) {
        this.memDb.data.warranty_activations = activationsRes.rows.map((r) => ({
          id: r.id,
          warranty_id: r.warranty_id,
          serial_number: r.serial_number,
          customer_name: r.customer_name,
          phone: r.phone,
          governorate: r.governorate,
          city: r.city,
          invoice_number: r.invoice_number,
          purchase_date: typeof r.purchase_date === 'string' ? r.purchase_date : r.purchase_date?.toISOString?.().split('T')[0] || '',
          activation_date: r.activation_date?.toISOString?.() || r.activation_date,
          expiry_date: typeof r.expiry_date === 'string' ? r.expiry_date : r.expiry_date?.toISOString?.().split('T')[0] || '',
          created_at: r.created_at?.toISOString?.() || r.created_at,
        }));
      }

      if (claimsRes.rows.length > 0) {
        this.memDb.data.warranty_claims = claimsRes.rows.map((r) => ({
          id: r.id,
          claim_id: r.claim_id,
          warranty_id: r.warranty_id,
          serial_number: r.serial_number,
          customer_name: r.customer_name,
          phone: r.phone,
          complaint_type: r.complaint_type,
          complaint_description: r.complaint_description,
          claim_status: r.claim_status,
          assigned_to: r.assigned_to,
          inspection_date: r.inspection_date?.toISOString?.() || r.inspection_date,
          inspection_result: r.inspection_result,
          resolution: r.resolution,
          resolution_date: r.resolution_date?.toISOString?.() || r.resolution_date,
          images: Array.isArray(r.images) ? r.images : [],
          created_at: r.created_at?.toISOString?.() || r.created_at,
          claim_date: typeof r.claim_date === 'string' ? r.claim_date : r.claim_date?.toISOString?.().split('T')[0] || '',
          next_follow_up_date: r.next_follow_up_date?.toISOString?.() || r.next_follow_up_date,
          last_action_date: r.last_action_date?.toISOString?.() || r.last_action_date,
          target_resolution_days: r.target_resolution_days,
          pending_tasks: Array.isArray(r.pending_tasks) ? r.pending_tasks : [],
        }));
      }

      if (replacementsRes.rows.length > 0) {
        this.memDb.data.replacements = replacementsRes.rows.map((r) => ({
          id: r.id,
          replacement_id: r.replacement_id,
          old_serial_number: r.old_serial_number,
          new_serial_number: r.new_serial_number,
          old_warranty_id: r.old_warranty_id,
          new_warranty_id: r.new_warranty_id,
          replacement_reason: r.replacement_reason,
          approval_date: typeof r.approval_date === 'string' ? r.approval_date : r.approval_date?.toISOString?.().split('T')[0] || '',
          approved_by: r.approved_by,
          notes: r.notes,
          created_at: r.created_at?.toISOString?.() || r.created_at,
        }));
      }

      if (usersRes.rows.length > 0) {
        this.memDb.data.users = usersRes.rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          department: r.department,
          avatar: r.avatar,
          status: r.status,
          created_at: r.created_at?.toISOString?.() || r.created_at,
        }));
      }

      if (modelsRes.rows.length > 0) {
        this.memDb.data.product_models = modelsRes.rows.map((r) => ({
          id: r.id,
          model_id: r.model_id,
          commercial_model_name: r.commercial_model_name,
          sap_material_code: r.sap_material_code,
          sap_material_description: r.sap_material_description,
          product_family: r.product_family,
          warranty_years: r.warranty_years,
          status: r.status,
          created_at: r.created_at?.toISOString?.() || r.created_at,
          updated_at: r.updated_at?.toISOString?.() || r.updated_at,
        }));
      }

      if (batchesRes.rows.length > 0) {
        this.memDb.data.production_batches = batchesRes.rows.map((r) => ({
          id: r.id,
          batch_id: r.batch_id,
          batch_no: r.batch_no,
          production_order: r.production_order,
          production_date: typeof r.production_date === 'string' ? r.production_date : r.production_date?.toISOString?.().split('T')[0] || '',
          total_serials: r.total_serials,
          model_count: r.model_count || {},
          source_system: r.source_system,
          created_at: r.created_at?.toISOString?.() || r.created_at,
          updated_at: r.updated_at?.toISOString?.() || r.updated_at,
        }));
      }

      if (attachmentsRes.rows.length > 0) {
        this.memDb.data.attachments = attachmentsRes.rows.map((r) => ({
          id: r.id,
          attachment_id: r.attachment_id,
          entity_type: r.entity_type,
          entity_id: r.entity_id,
          file_name: r.file_name,
          file_type: r.file_type,
          file_size: Number(r.file_size || 0),
          uploaded_by: r.uploaded_by,
          uploaded_at: r.uploaded_at?.toISOString?.() || r.uploaded_at,
          storage_path: r.storage_path,
          download_url: r.download_url,
          storage_url: r.storage_url,
          description: r.description,
          category: r.category,
        }));
      }

      if (lifecycleRes.rows.length > 0) {
        this.memDb.data.product_lifecycle = lifecycleRes.rows.map((r) => ({
          id: r.id,
          lifecycle_id: r.lifecycle_id,
          serial_number: r.serial_number,
          event_type: r.event_type,
          event_date: r.event_date?.toISOString?.() || r.event_date,
          performed_by: r.performed_by,
          notes: r.notes,
          reference_id: r.reference_id,
          created_at: r.created_at?.toISOString?.() || r.created_at,
        }));
      }

      if (commsRes.rows.length > 0) {
        this.memDb.data.customer_communications = commsRes.rows.map((r) => ({
          id: r.id,
          serial_number: r.serial_number,
          warranty_id: r.warranty_id,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          communication_type: r.communication_type,
          date_time: r.date_time?.toISOString?.() || r.date_time,
          formatted_date_time: r.formatted_date_time,
          responsible_user: r.responsible_user,
          details: r.details,
          related_reference: r.related_reference,
          created_at: r.created_at?.toISOString?.() || r.created_at,
        }));
      }

      if (syncRes.rows.length > 0) {
        this.memDb.data.production_sync_state = syncRes.rows.map((r) => ({
          id: r.id,
          sync_source: r.sync_source,
          last_sync_time: r.last_sync_time?.toISOString?.() || r.last_sync_time,
          last_successful_sync: r.last_successful_sync?.toISOString?.() || r.last_successful_sync,
          last_file_hash: r.last_file_hash,
          last_row_count: r.last_row_count,
          sync_url: r.sync_url,
          target_file_name: r.target_file_name,
          connection_status: r.connection_status,
          connection_mode: r.connection_mode,
          auth_type: r.auth_type,
          api_key_or_token: r.api_key_or_token,
          notes: r.notes,
        }));
      }

      if (importLogsRes.rows.length > 0) {
        this.memDb.data.production_import_logs = importLogsRes.rows.map((r) => ({
          id: r.id,
          import_id: r.import_id,
          file_name: r.file_name,
          source_type: r.source_type,
          import_date: r.import_date?.toISOString?.() || r.import_date,
          imported_records: r.imported_records,
          skipped_records: r.skipped_records,
          failed_records: r.failed_records,
          execution_time: r.execution_time,
          performed_by: r.performed_by,
          status: r.status,
          error_log: Array.isArray(r.error_log) ? r.error_log : [],
          batch_no: r.batch_no,
          production_order: r.production_order,
        }));
      }

      if (auditRes.rows.length > 0) {
        this.memDb.data.warranty_policy_audit = auditRes.rows.map((r) => ({
          id: r.id,
          audit_id: r.audit_id,
          model_id: r.model_id,
          commercial_model_name: r.commercial_model_name,
          old_warranty_years: r.old_warranty_years,
          new_warranty_years: r.new_warranty_years,
          changed_by: r.changed_by,
          reason: r.reason,
          changed_at: r.changed_at?.toISOString?.() || r.changed_at,
        }));
      }

      this.isLoadedFromDb = true;
      console.log('[PostgresApplicationRepository] Loaded PostgreSQL dataset successfully.');
    } catch (err) {
      console.error('[PostgresApplicationRepository] Error loading from PostgreSQL:', err);
    }
  }

  // ==================== Product Repository ====================

  public getProducts(search?: string) {
    return this.memDb.getProducts(search);
  }

  public getProductBySerial(serial: string) {
    return this.memDb.getProductBySerial(serial);
  }

  public addProduct(productData: Omit<Product, 'id' | 'created_at'>, actingUser?: string) {
    const product = this.memDb.addProduct(productData, actingUser);

    // Asynchronous write-through to PostgreSQL
    this.executeSql(
      `INSERT INTO products (
        serial_number, model, size, warranty_years, production_date, status,
        production_order, batch_no, image_url, production_status, source_system,
        sap_production_order, sap_batch_number, sap_material_code, sap_last_sync,
        production_line, shift, operator, remarks, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (serial_number) DO UPDATE SET
        model = EXCLUDED.model,
        size = EXCLUDED.size,
        warranty_years = EXCLUDED.warranty_years,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;`,
      [
        product.serial_number,
        product.model,
        product.size,
        product.warranty_years,
        product.production_date,
        product.status || 'جاهز للتسليم',
        product.production_order,
        product.batch_no,
        product.image_url || null,
        product.production_status || 'Produced',
        product.source_system || 'Manual',
        product.sap_production_order || null,
        product.sap_batch_number || null,
        product.sap_material_code || null,
        product.sap_last_sync ? new Date(product.sap_last_sync) : null,
        product.production_line || null,
        product.shift || null,
        product.operator || null,
        product.remarks || null,
        new Date(product.created_at),
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error addProduct]', err));

    return product;
  }

  public bulkAddProducts(
    rawProducts: Array<{
      serial_number: string;
      model: string;
      size: string;
      warranty_years?: number | string;
      production_date?: string;
      status?: string;
      production_order?: string;
      batch_no?: string;
    }>,
    actingUser?: string
  ) {
    const result = this.memDb.bulkAddProducts(rawProducts, actingUser);

    if (result.savedProducts && result.savedProducts.length > 0) {
      Promise.all(
        result.savedProducts.map((p) =>
          this.executeSql(
            `INSERT INTO products (
              serial_number, model, size, warranty_years, production_date, status,
              production_order, batch_no, image_url, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (serial_number) DO NOTHING;`,
            [
              p.serial_number,
              p.model,
              p.size,
              p.warranty_years,
              p.production_date,
              p.status || 'جاهز للتسليم',
              p.production_order,
              p.batch_no,
              p.image_url || null,
              new Date(p.created_at),
            ]
          )
        )
      ).catch((err) => console.error('[PostgreSQL write-through error bulkAddProducts]', err));
    }

    return result;
  }

  public updateProduct(
    id: number,
    updates: Partial<Omit<Product, 'id' | 'created_at'>>,
    actingUser?: string
  ) {
    const updated = this.memDb.updateProduct(id, updates, actingUser);
    if (updated) {
      this.executeSql(
        `UPDATE products SET
          model = COALESCE($1, model),
          size = COALESCE($2, size),
          warranty_years = COALESCE($3, warranty_years),
          status = COALESCE($4, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE serial_number = $5;`,
        [updates.model || null, updates.size || null, updates.warranty_years || null, updates.status || null, updated.serial_number]
      ).catch((err) => console.error('[PostgreSQL write-through error updateProduct]', err));
    }
    return updated;
  }

  public deleteProduct(id: number, actingUser?: string) {
    const product = this.memDb.getProducts().find((p) => p.id === id);
    const deleted = this.memDb.deleteProduct(id, actingUser);
    if (deleted && product) {
      this.executeSql('DELETE FROM products WHERE serial_number = $1;', [product.serial_number]).catch(
        (err) => console.error('[PostgreSQL write-through error deleteProduct]', err)
      );
    }
    return deleted;
  }

  public getProductModels() {
    return this.memDb.getProductModels();
  }

  public getProductModelById(modelId: string) {
    return this.memDb.getProductModelById(modelId);
  }

  public addProductModel(modelData: Partial<ProductModel>) {
    const model = this.memDb.addProductModel(modelData);
    this.executeSql(
      `INSERT INTO product_models (
        model_id, commercial_model_name, sap_material_code, sap_material_description,
        product_family, warranty_years, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (model_id) DO NOTHING;`,
      [
        model.model_id,
        model.commercial_model_name,
        model.sap_material_code,
        model.sap_material_description || null,
        model.product_family,
        model.warranty_years,
        model.status || 'Active',
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error addProductModel]', err));
    return model;
  }

  public updateModelWarrantyYears(
    modelId: string,
    newWarrantyYears: number,
    changedBy: string,
    userRole: string,
    reason: string
  ) {
    const result = this.memDb.updateModelWarrantyYears(modelId, newWarrantyYears, changedBy, userRole, reason);
    if (result && result.audit) {
      const audit = result.audit;
      this.executeSql(
        `UPDATE product_models SET warranty_years = $1, updated_at = CURRENT_TIMESTAMP WHERE model_id = $2;`,
        [newWarrantyYears, modelId]
      ).catch((err) => console.error('[PostgreSQL write-through error updateModelWarrantyYears]', err));

      this.executeSql(
        `INSERT INTO warranty_policy_audit (
          audit_id, model_id, commercial_model_name, old_warranty_years, new_warranty_years,
          changed_by, reason, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          audit.audit_id,
          audit.model_id,
          audit.commercial_model_name,
          audit.old_warranty_years,
          audit.new_warranty_years,
          audit.changed_by,
          audit.reason,
          new Date(audit.changed_at),
        ]
      ).catch((err) => console.error('[PostgreSQL write-through error warranty_policy_audit]', err));
    }
    return result;
  }

  public getWarrantyPolicyAudits() {
    return this.memDb.getWarrantyPolicyAudits();
  }

  public getZebraLabelData(serialNumber: string) {
    return this.memDb.getZebraLabelData(serialNumber);
  }

  public exportProductionMasterExcel() {
    return this.memDb.exportProductionMasterExcel();
  }

  public getProductionStats() {
    return this.memDb.getProductionStats();
  }

  // ==================== Warranty Repository ====================

  public getWarranties(search?: string) {
    return this.memDb.getWarranties(search);
  }

  public getWarrantyByIdOrSerial(identifier: string) {
    return this.memDb.getWarrantyByIdOrSerial(identifier);
  }

  public searchWarranties(
    query: string,
    searchType: 'all' | 'serial' | 'warranty_id' | 'mobile' = 'all'
  ) {
    return this.memDb.searchWarranties(query, searchType);
  }

  public activateWarranty(payload: {
    serial_number: string;
    customer_name: string;
    phone: string;
    governorate: string;
    city: string;
    invoice_number: string;
    purchase_date: string;
  }) {
    const res = this.memDb.activateWarranty(payload);
    const activation = res.activation;

    this.executeSql(
      `INSERT INTO warranty_activations (
        warranty_id, serial_number, customer_name, phone, governorate, city,
        invoice_number, purchase_date, activation_date, expiry_date, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ساري', $11)
      ON CONFLICT (warranty_id) DO NOTHING;`,
      [
        activation.warranty_id,
        activation.serial_number,
        activation.customer_name,
        activation.phone,
        activation.governorate,
        activation.city,
        activation.invoice_number,
        activation.purchase_date,
        new Date(activation.activation_date),
        activation.expiry_date,
        new Date(activation.created_at),
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error activateWarranty]', err));

    return res;
  }

  // ==================== Claim Repository ====================

  public getClaims(filters?: { status?: string; search?: string; type?: string }) {
    return this.memDb.getClaims(filters);
  }

  public getClaimById(claimId: string) {
    return this.memDb.getClaimById(claimId);
  }

  public createClaim(
    payload: {
      warranty_id?: string;
      serial_number: string;
      customer_name: string;
      phone: string;
      complaint_type: ComplaintType;
      complaint_description: string;
      images?: string[];
    },
    actingUser?: string
  ) {
    const claim = this.memDb.createClaim(payload, actingUser);

    this.executeSql(
      `INSERT INTO warranty_claims (
        claim_id, warranty_id, serial_number, customer_name, phone,
        complaint_type, complaint_description, claim_status, images,
        claim_date, target_resolution_days, pending_tasks, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb, $13)
      ON CONFLICT (claim_id) DO NOTHING;`,
      [
        claim.claim_id,
        claim.warranty_id,
        claim.serial_number,
        claim.customer_name,
        claim.phone,
        claim.complaint_type,
        claim.complaint_description,
        claim.claim_status,
        JSON.stringify(claim.images || []),
        claim.claim_date,
        claim.target_resolution_days || 7,
        JSON.stringify(claim.pending_tasks || []),
        new Date(claim.created_at),
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error createClaim]', err));

    return claim;
  }

  public updateClaimWorkflow(
    claim_id: string,
    updates: {
      claim_status?: ClaimStatus;
      assigned_to?: string | null;
      inspection_date?: string | null;
      inspection_result?: string | null;
      resolution?: string | null;
    },
    actingUser?: string
  ) {
    const claim = this.memDb.updateClaimWorkflow(claim_id, updates, actingUser);
    if (claim) {
      this.executeSql(
        `UPDATE warranty_claims SET
          claim_status = COALESCE($1, claim_status),
          assigned_to = COALESCE($2, assigned_to),
          inspection_date = COALESCE($3, inspection_date),
          inspection_result = COALESCE($4, inspection_result),
          resolution = COALESCE($5, resolution),
          updated_at = CURRENT_TIMESTAMP
        WHERE claim_id = $6;`,
        [
          updates.claim_status || null,
          updates.assigned_to || null,
          updates.inspection_date ? new Date(updates.inspection_date) : null,
          updates.inspection_result || null,
          updates.resolution || null,
          claim_id,
        ]
      ).catch((err) => console.error('[PostgreSQL write-through error updateClaimWorkflow]', err));
    }
    return claim;
  }

  public updateClaimSLA(
    claim_id: string,
    updates: {
      next_follow_up_date?: string | null;
      last_action_date?: string | null;
      target_resolution_days?: number;
      pending_tasks?: ClaimTask[];
    },
    actingUser?: string
  ) {
    const claim = this.memDb.updateClaimSLA(claim_id, updates, actingUser);
    if (claim) {
      this.executeSql(
        `UPDATE warranty_claims SET
          next_follow_up_date = COALESCE($1, next_follow_up_date),
          last_action_date = COALESCE($2, last_action_date),
          target_resolution_days = COALESCE($3, target_resolution_days),
          pending_tasks = COALESCE($4::jsonb, pending_tasks),
          updated_at = CURRENT_TIMESTAMP
        WHERE claim_id = $5;`,
        [
          updates.next_follow_up_date ? new Date(updates.next_follow_up_date) : null,
          updates.last_action_date ? new Date(updates.last_action_date) : null,
          updates.target_resolution_days || null,
          updates.pending_tasks ? JSON.stringify(updates.pending_tasks) : null,
          claim_id,
        ]
      ).catch((err) => console.error('[PostgreSQL write-through error updateClaimSLA]', err));
    }
    return claim;
  }

  // ==================== Replacement Repository ====================

  public getReplacements(search?: string) {
    return this.memDb.getReplacements(search);
  }

  public getReplacementById(replacementId: string) {
    return this.memDb.getReplacementById(replacementId);
  }

  public createReplacement(
    payload: {
      old_serial_number: string;
      new_serial_number: string;
      old_warranty_id: string;
      replacement_reason: string;
      approved_by: string;
      notes?: string;
    },
    actingUser?: string
  ) {
    const rep = this.memDb.createReplacement(payload, actingUser);

    this.executeSql(
      `INSERT INTO replacements (
        replacement_id, old_serial_number, new_serial_number, old_warranty_id,
        new_warranty_id, replacement_reason, approval_date, approved_by, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (replacement_id) DO NOTHING;`,
      [
        rep.replacement_id,
        rep.old_serial_number,
        rep.new_serial_number,
        rep.old_warranty_id,
        rep.new_warranty_id || null,
        rep.replacement_reason,
        new Date(rep.approval_date),
        rep.approved_by,
        rep.notes || null,
        new Date(rep.created_at),
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error createReplacement]', err));

    return rep;
  }

  // ==================== Attachment Repository ====================

  public getAttachments(filters?: { entity_type?: string; entity_id?: string; category?: string }) {
    return this.memDb.getAttachments(filters);
  }

  public getStorageFolderForEntity(entityType: AttachmentEntityType) {
    return this.memDb.getStorageFolderForEntity(entityType);
  }

  public getAttachmentById(attachmentId: string) {
    return this.memDb.getAttachmentById(attachmentId);
  }

  public addAttachment(
    attachmentData: Omit<Attachment, 'id' | 'uploaded_at' | 'attachment_id' | 'storage_path' | 'download_url'> & {
      attachment_id?: string;
      storage_path?: string;
      download_url?: string;
    },
    actingUser?: string
  ) {
    const att = this.memDb.addAttachment(attachmentData, actingUser);

    this.executeSql(
      `INSERT INTO attachments (
        attachment_id, entity_type, entity_id, file_name, file_type, file_size,
        uploaded_by, uploaded_at, storage_path, download_url, storage_url, description, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (attachment_id) DO NOTHING;`,
      [
        att.attachment_id,
        att.entity_type,
        att.entity_id,
        att.file_name,
        att.file_type,
        att.file_size,
        att.uploaded_by,
        new Date(att.uploaded_at),
        att.storage_path,
        att.download_url,
        att.storage_url,
        att.description || null,
        att.category || null,
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error addAttachment]', err));

    return att;
  }

  public deleteAttachment(attachmentId: string, actingUser?: string) {
    const deleted = this.memDb.deleteAttachment(attachmentId, actingUser);
    if (deleted) {
      this.executeSql('DELETE FROM attachments WHERE attachment_id = $1;', [attachmentId]).catch(
        (err) => console.error('[PostgreSQL write-through error deleteAttachment]', err)
      );
    }
    return deleted;
  }

  public auditAttachmentDownload(attachmentId: string, actingUser?: string) {
    return this.memDb.auditAttachmentDownload(attachmentId, actingUser);
  }

  public migrateAttachments() {
    return this.memDb.migrateAttachments();
  }

  // ==================== User Repository ====================

  public getUsers() {
    return this.memDb.getUsers();
  }

  public getUserByEmail(email: string) {
    return this.memDb.getUserByEmail(email);
  }

  public getRoleChangeLogs() {
    return this.memDb.getRoleChangeLogs();
  }

  public updateUserRole(userId: string, newRole: UserRole, actingUser?: string) {
    const result = this.memDb.updateUserRole(userId, newRole, actingUser);
    if (result && result.user && result.log) {
      this.executeSql(
        `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [newRole, userId]
      ).catch((err) => console.error('[PostgreSQL write-through error updateUserRole]', err));

      const log = result.log;
      this.executeSql(
        `INSERT INTO role_change_logs (
          id, user_id, user_name, old_role, new_role, modified_by, notes, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          log.id,
          log.user_id,
          log.user_name,
          log.old_role,
          log.new_role,
          log.modified_by,
          log.notes || null,
          new Date(log.timestamp),
        ]
      ).catch((err) => console.error('[PostgreSQL write-through error role_change_logs]', err));
    }
    return result;
  }

  public updateUserStatus(
    userId: string,
    newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    actingUser?: string
  ) {
    const result = this.memDb.updateUserStatus(userId, newStatus, actingUser);
    if (result && result.user) {
      this.executeSql(
        `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [newStatus, userId]
      ).catch((err) => console.error('[PostgreSQL write-through error updateUserStatus]', err));
    }
    return result;
  }

  // ==================== Lifecycle Repository ====================

  public getAllLifecycleEvents() {
    return this.memDb.getAllLifecycleEvents();
  }

  public getLifecycleBySerial(serial: string) {
    return this.memDb.getLifecycleBySerial(serial);
  }

  public addLifecycleEvent(
    eventData: Omit<ProductLifecycle, 'id' | 'created_at' | 'lifecycle_id'> & { lifecycle_id?: string }
  ) {
    const ev = this.memDb.addLifecycleEvent(eventData);

    this.executeSql(
      `INSERT INTO product_lifecycle (
        lifecycle_id, serial_number, event_type, event_date, performed_by, notes, reference_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (lifecycle_id) DO NOTHING;`,
      [
        ev.lifecycle_id,
        ev.serial_number,
        ev.event_type,
        new Date(ev.event_date),
        ev.performed_by,
        ev.notes || null,
        ev.reference_id || null,
        new Date(ev.created_at),
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error addLifecycleEvent]', err));

    return ev;
  }

  // ==================== Communication Repository ====================

  public getCommunicationsForCustomer(serial?: string, phone?: string, warrantyId?: string) {
    return this.memDb.getCommunicationsForCustomer(serial, phone, warrantyId);
  }

  public getAllCommunications() {
    return this.memDb.getAllCommunications();
  }

  public addCommunication(
    commData: Omit<CustomerCommunication, 'id' | 'created_at'> & { id?: string }
  ) {
    const comm = this.memDb.addCommunication(commData);

    this.executeSql(
      `INSERT INTO customer_communications (
        id, serial_number, warranty_id, customer_name, customer_phone,
        communication_type, date_time, formatted_date_time, responsible_user,
        details, related_reference, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING;`,
      [
        comm.id,
        comm.serial_number,
        comm.warranty_id || null,
        comm.customer_name || null,
        comm.customer_phone || null,
        comm.communication_type,
        new Date(comm.date_time),
        comm.formatted_date_time || null,
        comm.responsible_user,
        comm.details,
        comm.related_reference || null,
        new Date(comm.created_at),
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error addCommunication]', err));

    return comm;
  }

  public deleteCommunication(id: string) {
    const deleted = this.memDb.deleteCommunication(id);
    if (deleted) {
      this.executeSql('DELETE FROM customer_communications WHERE id = $1;', [id]).catch(
        (err) => console.error('[PostgreSQL write-through error deleteCommunication]', err)
      );
    }
    return deleted;
  }

  // ==================== Sync Repository ====================

  public getSyncStates() {
    return this.memDb.getSyncStates();
  }

  public updateSyncState(stateUpdate: Partial<ProductionSyncState> & { sync_source: any }) {
    const updated = this.memDb.updateSyncState(stateUpdate);
    if (updated) {
      this.executeSql(
        `INSERT INTO production_sync_state (
          sync_source, last_sync_time, last_successful_sync, last_file_hash,
          last_row_count, sync_url, target_file_name, connection_status,
          connection_mode, auth_type, api_key_or_token, notes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
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
          updated_at = CURRENT_TIMESTAMP;`,
        [
          updated.sync_source,
          updated.last_sync_time ? new Date(updated.last_sync_time) : null,
          updated.last_successful_sync ? new Date(updated.last_successful_sync) : null,
          updated.last_file_hash || null,
          updated.last_row_count || 0,
          updated.sync_url || null,
          updated.target_file_name || null,
          updated.connection_status || 'not_configured',
          updated.connection_mode || 'simulated_fallback',
          updated.auth_type || null,
          updated.api_key_or_token || null,
          updated.notes || null,
        ]
      ).catch((err) => console.error('[PostgreSQL write-through error updateSyncState]', err));
    }
    return updated;
  }

  public getImportLogs() {
    return this.memDb.getImportLogs();
  }

  public addImportLog(log: Omit<ProductionImportLog, 'id'>) {
    const saved = this.memDb.addImportLog(log);

    this.executeSql(
      `INSERT INTO production_import_logs (
        import_id, file_name, source_type, import_date, imported_records,
        skipped_records, failed_records, execution_time, performed_by,
        status, error_log, batch_no, production_order, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, CURRENT_TIMESTAMP)
      ON CONFLICT (import_id) DO NOTHING;`,
      [
        saved.import_id,
        saved.file_name,
        saved.source_type,
        new Date(saved.import_date),
        saved.imported_records,
        saved.skipped_records,
        saved.failed_records,
        saved.execution_time,
        saved.performed_by,
        saved.status,
        JSON.stringify(saved.error_log || []),
        saved.batch_no || null,
        saved.production_order || null,
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error addImportLog]', err));

    return saved;
  }

  public getProductionBatches() {
    return this.memDb.getProductionBatches();
  }

  public upsertProductionBatch(params: {
    batch_no: string;
    production_order: string;
    production_date: string;
    source_system: string;
    model: string;
  }) {
    const batch = this.memDb.upsertProductionBatch(params);

    this.executeSql(
      `INSERT INTO production_batches (
        batch_id, batch_no, production_order, production_date,
        total_serials, model_count, source_system, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (batch_id) DO UPDATE SET
        total_serials = EXCLUDED.total_serials,
        model_count = EXCLUDED.model_count,
        updated_at = CURRENT_TIMESTAMP;`,
      [
        batch.batch_id,
        batch.batch_no,
        batch.production_order,
        batch.production_date,
        batch.total_serials,
        JSON.stringify(batch.model_count || {}),
        batch.source_system,
      ]
    ).catch((err) => console.error('[PostgreSQL write-through error upsertProductionBatch]', err));

    return batch;
  }

  // ==================== Audit Repository ====================

  public addLog(warranty_id: string | null, serial_number: string, action: string) {
    this.memDb.addLog(warranty_id, serial_number, action);

    this.executeSql(
      `INSERT INTO activation_logs (warranty_id, serial_number, action, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP);`,
      [warranty_id, serial_number, action]
    ).catch((err) => console.error('[PostgreSQL write-through error addLog]', err));
  }

  public getLogs(limit: number = 100) {
    return this.memDb.getLogs(limit);
  }

  // ==================== Analytics & Operations ====================

  public getStats() {
    return this.memDb.getStats();
  }

  public getQualityStats() {
    return this.memDb.getQualityStats();
  }

  public getExecutiveDashboardData(filters?: any) {
    return this.memDb.getExecutiveDashboardData(filters);
  }

  public getCustomer360(query: string) {
    return this.memDb.getCustomer360(query);
  }

  public buildUnifiedTimeline(
    product: Product,
    activation?: WarrantyActivation,
    claims: WarrantyClaim[] = [],
    replacements: (Replacement & { old_product?: Product; new_product?: Product })[] = []
  ): UnifiedTimelineEvent[] {
    return this.memDb.buildUnifiedTimeline(product, activation, claims, replacements);
  }

  public omniSearch(query: string) {
    return this.memDb.omniSearch(query);
  }

  public exportCSV() {
    return this.memDb.exportCSV();
  }

  public resetToDefault() {
    return this.memDb.resetToDefault();
  }

  public getBackupAndRetentionPolicy() {
    return this.memDb.getBackupAndRetentionPolicy();
  }

  public getPowerBIFeed(baseUrl: string = '') {
    return this.memDb.getPowerBIFeed(baseUrl);
  }

  public getPowerBICSV(table: 'warranties' | 'claims' | 'replacements' | 'products' | 'quality') {
    return this.memDb.getPowerBICSV(table);
  }

  public getPowerBIPBIDS(baseUrl: string) {
    return this.memDb.getPowerBIPBIDS(baseUrl);
  }

  public getPowerBIQueryScript(baseUrl: string) {
    return this.memDb.getPowerBIQueryScript(baseUrl);
  }

  public persist() {
    return this.memDb.persist();
  }
}
