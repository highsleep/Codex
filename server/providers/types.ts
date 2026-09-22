export interface RawProductionRecord {
  serial_number?: string;
  serial?: string;
  model?: string;
  size?: string;
  dimensions?: string;
  warranty_years?: number | string;
  production_date?: string;
  date?: string;
  production_order?: string;
  order_no?: string;
  batch_no?: string;
  batch?: string;
  production_line?: string;
  line?: string;
  shift?: string;
  operator?: string;
  remarks?: string;
  notes?: string;
  status?: string;
  production_status?: string;
  plan_type?: string;
  planned_qty?: number | string;
}

export interface ValidatedProductionRecord {
  serial_number: string;
  model: string;
  size: string;
  warranty_years: number;
  production_date: string;
  production_order: string;
  batch_no: string;
  production_status: 'Produced' | 'Quality Approved' | 'Packed' | 'Shipped' | 'Delivered';
  source_system: 'Excel' | 'CSV' | 'SharePoint' | 'OneDrive' | 'SAP' | 'Manual';
  production_line?: string;
  shift?: string;
  operator?: string;
  remarks?: string;
  sap_material_code?: string;
  sap_production_order?: string;
  sap_batch_number?: string;
}

export interface ValidationResult {
  validRecords: ValidatedProductionRecord[];
  skippedRecords: { row: number; data: any; reason: string }[];
  failedRecords: { row: number; data: any; reason: string }[];
}

export interface ProviderSyncOptions {
  sourceType: 'Excel' | 'CSV' | 'SharePoint' | 'OneDrive' | 'SAP' | 'Manual';
  fileName: string;
  performedBy: string;
  rawRecords?: RawProductionRecord[];
  buffer?: Buffer;
  forceAll?: boolean;
}

export interface SyncExecutionResult {
  importId: string;
  sourceType: string;
  fileName: string;
  totalRead: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  executionTimeMs: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errors: string[];
  sampleImported: ValidatedProductionRecord[];
  sourceOrigin?: string;
  urlUsed?: string;
  syncNote?: string;
}
