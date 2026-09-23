/**
 * Core Domain & Repository Interfaces for Sleepee Mattress Warranty System.
 * Establishes formal boundary decoupling application handlers and background
 * jobs from underlying storage mechanisms.
 */

import type {
  ComplaintType,
  ClaimStatus,
  UserRole,
  AppUser,
  RoleAuditLog,
  Product,
  ProductModel,
  WarrantyPolicyAudit,
  ProductionSyncState,
  ProductionImportLog,
  ProductionBatch,
  ZebraLabelData,
  WarrantyActivation,
  WarrantyClaim,
  ClaimTask,
  Replacement,
  ActivationLog,
  LifecycleEventType,
  ProductLifecycle,
  UnifiedEventType,
  UnifiedTimelineEvent,
  AttachmentEntityType,
  Attachment,
  CustomerCommunicationType,
  CustomerCommunication,
  SLAStatus,
  DatabaseService,
  AnalyticsFilterParams,
  ProductionAnalyticsData,
  QualityAnalyticsData,
  WarrantyAnalyticsData,
  CustomerServiceAnalyticsData,
  ExecutiveAnalyticsData,
  AnalyticsSnapshot,
} from '../db/index.js';

// Re-export domain types for consumers of the repository boundary
export type {
  ComplaintType,
  ClaimStatus,
  UserRole,
  AppUser,
  RoleAuditLog,
  Product,
  ProductModel,
  WarrantyPolicyAudit,
  ProductionSyncState,
  ProductionImportLog,
  ProductionBatch,
  ZebraLabelData,
  WarrantyActivation,
  WarrantyClaim,
  ClaimTask,
  Replacement,
  ActivationLog,
  LifecycleEventType,
  ProductLifecycle,
  UnifiedEventType,
  UnifiedTimelineEvent,
  AttachmentEntityType,
  Attachment,
  CustomerCommunicationType,
  CustomerCommunication,
  SLAStatus,
  AnalyticsFilterParams,
  ProductionAnalyticsData,
  QualityAnalyticsData,
  WarrantyAnalyticsData,
  CustomerServiceAnalyticsData,
  ExecutiveAnalyticsData,
  AnalyticsSnapshot,
};

/**
 * Composite Application Repository Interface.
 * Every application boundary consumer interacts through this contract.
 * Explicitly omits internal database fields (like raw `.data` JSON root).
 */
export type IApplicationRepository = Omit<DatabaseService, 'data'>;

export type IProductRepository = Pick<
  IApplicationRepository,
  | 'getProducts'
  | 'getProductBySerial'
  | 'addProduct'
  | 'bulkAddProducts'
  | 'updateProduct'
  | 'deleteProduct'
  | 'getProductModels'
  | 'getProductModelById'
  | 'addProductModel'
  | 'updateModelWarrantyYears'
  | 'getWarrantyPolicyAudits'
  | 'getZebraLabelData'
  | 'exportProductionMasterExcel'
  | 'getProductionStats'
>;

export type IWarrantyRepository = Pick<
  IApplicationRepository,
  'getWarranties' | 'getWarrantyByIdOrSerial' | 'searchWarranties' | 'activateWarranty'
>;

export type IClaimRepository = Pick<
  IApplicationRepository,
  'getClaims' | 'getClaimById' | 'createClaim' | 'updateClaimWorkflow' | 'updateClaimSLA'
>;

export type IReplacementRepository = Pick<
  IApplicationRepository,
  'getReplacements' | 'getReplacementById' | 'createReplacement'
>;

export type IAttachmentRepository = Pick<
  IApplicationRepository,
  | 'getAttachments'
  | 'getStorageFolderForEntity'
  | 'getAttachmentById'
  | 'addAttachment'
  | 'deleteAttachment'
  | 'auditAttachmentDownload'
  | 'migrateAttachments'
>;

export type IUserRepository = Pick<
  IApplicationRepository,
  'getUsers' | 'getUserByEmail' | 'getRoleChangeLogs' | 'updateUserRole' | 'updateUserStatus'
>;

export type ILifecycleRepository = Pick<
  IApplicationRepository,
  'getAllLifecycleEvents' | 'getLifecycleBySerial' | 'addLifecycleEvent'
>;

export type ICommunicationRepository = Pick<
  IApplicationRepository,
  'getAllCommunications' | 'getCommunicationsForCustomer' | 'addCommunication' | 'deleteCommunication'
>;

export type ISyncRepository = Pick<
  IApplicationRepository,
  | 'getSyncStates'
  | 'updateSyncState'
  | 'getImportLogs'
  | 'addImportLog'
  | 'getProductionBatches'
  | 'upsertProductionBatch'
>;

export type IAuditRepository = Pick<IApplicationRepository, 'getLogs' | 'addLog'>;

export type IAnalyticsRepository = Pick<
  IApplicationRepository,
  | 'getStats'
  | 'getQualityStats'
  | 'getCustomer360'
  | 'buildUnifiedTimeline'
  | 'omniSearch'
  | 'exportCSV'
  | 'resetToDefault'
  | 'getBackupAndRetentionPolicy'
  | 'getPowerBIFeed'
  | 'getPowerBICSV'
  | 'getPowerBIPBIDS'
  | 'getPowerBIQueryScript'
  | 'getProductionAnalytics'
  | 'getQualityAnalytics'
  | 'getWarrantyAnalytics'
  | 'getCustomerServiceAnalytics'
  | 'getExecutiveAnalytics'
  | 'getDrillDownAnalytics'
  | 'persist'
>;
