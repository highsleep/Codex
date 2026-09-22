export type ProductionStatus =
  | 'Produced'
  | 'Quality Approved'
  | 'Packed'
  | 'Shipped'
  | 'Delivered';

export type SourceSystem =
  | 'Excel'
  | 'CSV'
  | 'SharePoint'
  | 'OneDrive'
  | 'SAP'
  | 'Manual';

export interface Product {
  id: number | string;
  serial_number: string;
  model: string;
  size: string;
  warranty_years: number;
  production_date: string;
  status?: string;
  production_order?: string;
  batch_no?: string;
  image_url?: string;
  created_at?: string;
  is_activated?: boolean;
  warranty_id?: string;
  activation?: WarrantyActivation;
  // Extended Production Fields
  production_status?: ProductionStatus;
  source_system?: SourceSystem;
  sap_production_order?: string;
  sap_batch_number?: string;
  sap_material_code?: string;
  sap_last_sync?: string;
  production_line?: string;
  shift?: string;
  operator?: string;
  remarks?: string;
}

export interface ProductModel {
  id?: number | string;
  model_id: string;
  commercial_model_name: string;
  sap_material_code: string;
  sap_material_description: string;
  product_family: string;
  warranty_years: number; // 3, 5, 7, 10
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface WarrantyPolicyAudit {
  id?: number | string;
  audit_id: string;
  model_id: string;
  commercial_model_name?: string;
  old_warranty_years: number;
  new_warranty_years: number;
  changed_by: string;
  changed_at: string;
  reason: string;
}

export interface ProductionSyncState {
  id?: number | string;
  sync_source: 'SharePoint' | 'OneDrive' | 'Excel' | 'CSV' | 'SAP';
  last_sync_time: string;
  last_successful_sync: string;
  last_file_hash: string;
  last_row_count: number;
  sync_url?: string;
  target_file_name?: string;
  connection_status?: 'connected' | 'simulated' | 'not_configured' | 'error';
  connection_mode?: 'live_url' | 'simulated_fallback';
  auth_type?: 'anonymous_link' | 'graph_api' | 'basic_auth' | 'bearer_token';
  api_key_or_token?: string;
  notes?: string;
}

export interface ProductionImportLog {
  id?: number | string;
  import_id: string;
  file_name: string;
  source_type: SourceSystem;
  import_date: string;
  imported_records: number;
  skipped_records: number;
  failed_records: number;
  execution_time: number;
  performed_by: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  error_log?: string[];
  batch_no?: string;
  production_order?: string;
}

export interface ProductionBatch {
  id?: number | string;
  batch_id: string;
  batch_no: string;
  production_order: string;
  production_date: string;
  total_serials: number;
  model_count: Record<string, number> | number;
  source_system: string;
  created_at: string;
}

export interface ZebraLabelData {
  label_template_id: string;
  serial_number: string;
  barcode_value: string;
  qr_value: string;
  model: string;
  size: string;
  warranty_years: number;
  production_date: string;
  production_order: string;
  batch_no: string;
  print_status: 'Ready' | 'Printed' | 'Pending';
  print_date?: string;
  printed_by?: string;
  zpl_code: string;
}

export interface WarrantyActivation {
  id?: number | string;
  warranty_id: string;
  serial_number: string;
  customer_name: string;
  phone: string;
  governorate: string;
  city: string;
  invoice_number: string;
  purchase_date: string;
  activation_date: string;
  expiry_date: string;
  status?: string;
  created_at: string;
  product?: Product;
  is_valid?: boolean;
}

export interface ActivationLog {
  id?: number | string;
  warranty_id: string | null;
  serial_number: string;
  action: string;
  created_at: string;
}

export type ComplaintType =
  | 'Spring Collapse'
  | 'Foam Collapse'
  | 'Fabric Defect'
  | 'Noise'
  | 'Manufacturing Defect'
  | 'Other';

export type ClaimStatus =
  | 'Open'
  | 'Under Inspection'
  | 'Approved'
  | 'Rejected'
  | 'Closed';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'QUALITY_MANAGER'
  | 'PLANT_MANAGER'
  | 'PRODUCTION'
  | 'CUSTOMER_SERVICE'
  | 'VIEWER';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
  created_at?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface RoleAuditLog {
  id: string;
  user_id: string;
  user_name: string;
  old_role: UserRole;
  new_role: UserRole;
  modified_by: string;
  timestamp: string;
  notes?: string;
}

export interface ClaimTask {
  id: string;
  title: string;
  due_date?: string;
  is_completed: boolean;
  assigned_to?: string;
  completed_at?: string;
}

export type SLAStatus = 'WITHIN_SLA' | 'NEARING_DUE' | 'BREACHED';

export interface WarrantyClaim {
  id?: number | string;
  claim_id: string;
  warranty_id: string;
  serial_number: string;
  customer_name: string;
  phone: string;
  complaint_type: ComplaintType;
  complaint_description: string;
  claim_status: ClaimStatus;
  assigned_to: string | null;
  inspection_date: string | null;
  inspection_result: string | null;
  resolution: string | null;
  resolution_date: string | null;
  images: string[];
  created_at: string;
  claim_date?: string;
  next_follow_up_date?: string | null;
  last_action_date?: string | null;
  target_resolution_days?: number;
  pending_tasks?: ClaimTask[];
}

export interface Replacement {
  id?: number | string;
  replacement_id: string;
  old_serial_number: string;
  new_serial_number: string;
  old_warranty_id: string;
  new_warranty_id?: string;
  replacement_reason: string;
  approval_date: string;
  approved_by: string;
  notes: string;
  created_at: string;
  old_product?: Product;
  new_product?: Product;
}

export type LifecycleEventType =
  | 'Produced'
  | 'Quality Approved'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Sold'
  | 'Warranty Activated'
  | 'Claim Opened'
  | 'Inspection Scheduled'
  | 'Inspection Completed'
  | 'Repair Approved'
  | 'Repair Completed'
  | 'Replacement Approved'
  | 'Replacement Completed'
  | 'Warranty Expired'
  | 'Archived';

export interface ProductLifecycle {
  id?: number | string;
  lifecycle_id: string;
  serial_number: string;
  event_type: LifecycleEventType;
  event_date: string;
  performed_by: string;
  notes: string;
  reference_id?: string | null;
  created_at: string;
}

export type AttachmentEntityType =
  | 'Product'
  | 'Warranty'
  | 'Claim'
  | 'Replacement'
  | 'ServiceVisit';

export type AttachmentCategory =
  | 'Defect Photos'
  | 'Inspection Photos'
  | 'After Photos'
  | 'Technical Reports'
  | 'Invoices'
  | 'Warranty Documents'
  | 'Replacement Forms'
  | 'Delivery Confirmations'
  | 'Customer Acceptance Form'
  | 'Quality Certificate'
  | 'Other';

export interface Attachment {
  id?: number | string;
  attachment_id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  storage_path?: string;
  download_url?: string;
  storage_url: string;
  description: string;
  category?: AttachmentCategory | string;
}

export interface AdminStats {
  totalProducts: number;
  totalActivated: number;
  totalWarranties?: number;
  activatedToday?: number;
  expiringWarranties?: number;
  unactivatedProducts: number;
  activeWarranties: number;
  expiredWarranties: number;
  activationRate: number;
  governorateDistribution: Record<string, number>;
  modelDistribution: Record<string, number>;
  recentActivations: WarrantyActivation[];
}

export interface QualityDashboardStats {
  total_warranties: number;
  total_claims: number;
  open_claims: number;
  defect_rate_percentage: number;
  total_replacements: number;
  claims_with_attachments: number;
  claims_without_inspection_photos: number;
  avg_inspection_time_hours: number;
  avg_replacement_time_days: number;
  warranty_expiration_forecast: {
    period: string;
    label: string;
    count: number;
    percentage: number;
  }[];
  lifecycle_distribution: {
    event_type: LifecycleEventType;
    count: number;
  }[];
  defects_by_type: { type: ComplaintType; count: number }[];
  problematic_models: { model: string; defects_count: number; total_sold: number; defect_rate: number }[];
  monthly_trends: { month: string; claims_count: number }[];
}

export type UnifiedEventType =
  | 'الإنتاج'
  | 'الشحن'
  | 'البيع'
  | 'تفعيل الضمان'
  | 'فتح شكوى'
  | 'المعاينة'
  | 'الإصلاح'
  | 'الاستبدال'
  | 'إغلاق الطلب';

export interface UnifiedTimelineEvent {
  id: string;
  event_type: UnifiedEventType;
  date: string;
  formatted_date: string;
  short_description: string;
  reference_id?: string | null;
  performed_by?: string | null;
  status_badge?: string;
  badge_color?: string;
  metadata?: Record<string, any>;
}

export interface CustomerService360 {
  product: Product;
  activation?: WarrantyActivation;
  claims: WarrantyClaim[];
  replacements: Replacement[];
  logs: ActivationLog[];
  lifecycle: ProductLifecycle[];
  attachments: Attachment[];
  documents: Attachment[];
  replacement_received_for?: Replacement;
  unified_timeline?: UnifiedTimelineEvent[];
  communications?: CustomerCommunication[];
}

export type CustomerCommunicationType =
  | 'مكالمة هاتفية'
  | 'واتساب'
  | 'بريد إلكتروني'
  | 'زيارة'
  | 'ملاحظة داخلية';

export interface CustomerCommunication {
  id: string;
  serial_number: string;
  warranty_id?: string;
  customer_name?: string;
  customer_phone?: string;
  communication_type: CustomerCommunicationType;
  date_time: string;
  formatted_date_time?: string;
  responsible_user: string;
  details: string;
  related_reference?: string | null;
  created_at?: string;
}

export interface OmniSearchResult {
  type: 'product' | 'warranty' | 'claim' | 'replacement';
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  serial_number: string;
  data: any;
}

export interface VerificationResult {
  status: 'VALID' | 'EXPIRED' | 'UNACTIVATED' | 'NOT_FOUND';
  message: string;
  activation?: WarrantyActivation;
  product?: Product;
  days_remaining?: number;
}
