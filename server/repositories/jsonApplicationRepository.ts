/**
 * JSON Application Repository Adapter.
 *
 * Implements IApplicationRepository by encapsulating the JSON-backed DatabaseService.
 * Keeps data/sleepee_db.json as the active source of truth while ensuring the
 * application boundary interacts strictly through repository abstractions.
 */

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
} from './types.js';

export class JsonApplicationRepository implements IApplicationRepository {
  private db: DatabaseService;

  constructor(dbInstance: DatabaseService = defaultDbInstance) {
    this.db = dbInstance;
  }

  // ==================== Product Repository ====================

  public getProducts(search?: string) {
    return this.db.getProducts(search);
  }

  public getProductBySerial(serial: string) {
    return this.db.getProductBySerial(serial);
  }

  public addProduct(productData: Omit<Product, 'id' | 'created_at'>, actingUser?: string) {
    return this.db.addProduct(productData, actingUser);
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
    return this.db.bulkAddProducts(rawProducts, actingUser);
  }

  public updateProduct(
    id: number,
    updates: Partial<Omit<Product, 'id' | 'created_at'>>,
    actingUser?: string
  ) {
    return this.db.updateProduct(id, updates, actingUser);
  }

  public deleteProduct(id: number, actingUser?: string) {
    return this.db.deleteProduct(id, actingUser);
  }

  public getProductModels() {
    return this.db.getProductModels();
  }

  public getProductModelById(modelId: string) {
    return this.db.getProductModelById(modelId);
  }

  public addProductModel(modelData: Partial<ProductModel>) {
    return this.db.addProductModel(modelData);
  }

  public updateModelWarrantyYears(
    modelId: string,
    newWarrantyYears: number,
    changedBy: string,
    userRole: string,
    reason: string
  ) {
    return this.db.updateModelWarrantyYears(modelId, newWarrantyYears, changedBy, userRole, reason);
  }

  public getWarrantyPolicyAudits() {
    return this.db.getWarrantyPolicyAudits();
  }

  public getZebraLabelData(serialNumber: string) {
    return this.db.getZebraLabelData(serialNumber);
  }

  public exportProductionMasterExcel() {
    return this.db.exportProductionMasterExcel();
  }

  public getProductionStats() {
    return this.db.getProductionStats();
  }

  // ==================== Warranty Repository ====================

  public getWarranties(search?: string) {
    return this.db.getWarranties(search);
  }

  public getWarrantyByIdOrSerial(identifier: string) {
    return this.db.getWarrantyByIdOrSerial(identifier);
  }

  public searchWarranties(
    query: string,
    searchType: 'all' | 'serial' | 'warranty_id' | 'mobile' = 'all'
  ) {
    return this.db.searchWarranties(query, searchType);
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
    return this.db.activateWarranty(payload);
  }

  // ==================== Claim Repository ====================

  public getClaims(filters?: { status?: string; search?: string; type?: string }) {
    return this.db.getClaims(filters);
  }

  public getClaimById(claimId: string) {
    return this.db.getClaimById(claimId);
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
    return this.db.createClaim(payload, actingUser);
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
    return this.db.updateClaimWorkflow(claim_id, updates, actingUser);
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
    return this.db.updateClaimSLA(claim_id, updates, actingUser);
  }

  // ==================== Replacement Repository ====================

  public getReplacements(search?: string) {
    return this.db.getReplacements(search);
  }

  public getReplacementById(replacementId: string) {
    return this.db.getReplacementById(replacementId);
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
    return this.db.createReplacement(payload, actingUser);
  }

  // ==================== Attachment Repository ====================

  public getAttachments(filters?: { entity_type?: string; entity_id?: string; category?: string }) {
    return this.db.getAttachments(filters);
  }

  public getStorageFolderForEntity(entityType: AttachmentEntityType) {
    return this.db.getStorageFolderForEntity(entityType);
  }

  public getAttachmentById(attachmentId: string) {
    return this.db.getAttachmentById(attachmentId);
  }

  public addAttachment(
    attachmentData: Omit<Attachment, 'id' | 'uploaded_at' | 'attachment_id' | 'storage_path' | 'download_url'> & {
      attachment_id?: string;
      storage_path?: string;
      download_url?: string;
    },
    actingUser?: string
  ) {
    return this.db.addAttachment(attachmentData, actingUser);
  }

  public deleteAttachment(attachmentId: string, actingUser?: string) {
    return this.db.deleteAttachment(attachmentId, actingUser);
  }

  public auditAttachmentDownload(attachmentId: string, actingUser?: string) {
    return this.db.auditAttachmentDownload(attachmentId, actingUser);
  }

  public migrateAttachments() {
    return this.db.migrateAttachments();
  }

  // ==================== User Repository ====================

  public getUsers() {
    return this.db.getUsers();
  }

  public getUserByEmail(email: string) {
    return this.db.getUserByEmail(email);
  }

  public getRoleChangeLogs() {
    return this.db.getRoleChangeLogs();
  }

  public updateUserRole(userId: string, newRole: UserRole, actingUser?: string) {
    return this.db.updateUserRole(userId, newRole, actingUser);
  }

  public updateUserStatus(
    userId: string,
    newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    actingUser?: string
  ) {
    return this.db.updateUserStatus(userId, newStatus, actingUser);
  }

  // ==================== Lifecycle Repository ====================

  public getAllLifecycleEvents() {
    return this.db.getAllLifecycleEvents();
  }

  public getLifecycleBySerial(serial: string) {
    return this.db.getLifecycleBySerial(serial);
  }

  public addLifecycleEvent(
    eventData: Omit<ProductLifecycle, 'id' | 'created_at' | 'lifecycle_id'> & { lifecycle_id?: string }
  ) {
    return this.db.addLifecycleEvent(eventData);
  }

  // ==================== Communication Repository ====================

  public getCommunicationsForCustomer(serial?: string, phone?: string, warrantyId?: string) {
    return this.db.getCommunicationsForCustomer(serial, phone, warrantyId);
  }

  public getAllCommunications() {
    return this.db.getAllCommunications();
  }

  public addCommunication(
    commData: Omit<CustomerCommunication, 'id' | 'created_at'> & { id?: string }
  ) {
    return this.db.addCommunication(commData);
  }

  public deleteCommunication(id: string) {
    return this.db.deleteCommunication(id);
  }

  // ==================== Sync Repository ====================

  public getSyncStates() {
    return this.db.getSyncStates();
  }

  public updateSyncState(stateUpdate: Partial<ProductionSyncState> & { sync_source: any }) {
    return this.db.updateSyncState(stateUpdate);
  }

  public getImportLogs() {
    return this.db.getImportLogs();
  }

  public addImportLog(log: Omit<ProductionImportLog, 'id'>) {
    return this.db.addImportLog(log);
  }

  public getProductionBatches() {
    return this.db.getProductionBatches();
  }

  public upsertProductionBatch(params: {
    batch_no: string;
    production_order: string;
    production_date: string;
    source_system: string;
    model: string;
  }) {
    return this.db.upsertProductionBatch(params);
  }

  // ==================== Audit Repository ====================

  public addLog(warranty_id: string | null, serial_number: string, action: string) {
    return this.db.addLog(warranty_id, serial_number, action);
  }

  public getLogs(limit: number = 100) {
    return this.db.getLogs(limit);
  }

  // ==================== Analytics & Operations ====================

  public getStats() {
    return this.db.getStats();
  }

  public getQualityStats() {
    return this.db.getQualityStats();
  }

  public getExecutiveDashboardData(filters?: any) {
    return this.db.getExecutiveDashboardData(filters);
  }

  public getCustomer360(query: string) {
    return this.db.getCustomer360(query);
  }

  public buildUnifiedTimeline(
    product: Product,
    activation?: WarrantyActivation,
    claims: WarrantyClaim[] = [],
    replacements: (Replacement & { old_product?: Product; new_product?: Product })[] = []
  ) {
    return this.db.buildUnifiedTimeline(product, activation, claims, replacements);
  }

  public omniSearch(query: string) {
    return this.db.omniSearch(query);
  }

  public exportCSV() {
    return this.db.exportCSV();
  }

  public resetToDefault() {
    return this.db.resetToDefault();
  }

  public getBackupAndRetentionPolicy() {
    return this.db.getBackupAndRetentionPolicy();
  }

  public getPowerBIFeed(baseUrl: string = '') {
    return this.db.getPowerBIFeed(baseUrl);
  }

  public getPowerBICSV(table: 'warranties' | 'claims' | 'replacements' | 'products' | 'quality') {
    return this.db.getPowerBICSV(table);
  }

  public getPowerBIPBIDS(baseUrl: string) {
    return this.db.getPowerBIPBIDS(baseUrl);
  }

  public getPowerBIQueryScript(baseUrl: string) {
    return this.db.getPowerBIQueryScript(baseUrl);
  }

  public persist() {
    return this.db.persist();
  }
}
