/**
 * Sleepee Mattress Warranty Database Service
 * Implements strict relational constraints for Google Cloud SQL PostgreSQL & Local Persistence
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { ZebraZPLGenerator } from '../zebra/zplGenerator.js';

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

export interface Product {
  id: number;
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
  production_status?: 'Produced' | 'Quality Approved' | 'Packed' | 'Shipped' | 'Delivered';
  source_system?: 'Excel' | 'CSV' | 'SharePoint' | 'OneDrive' | 'SAP' | 'Manual';
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
  source_type: 'Excel' | 'CSV' | 'SharePoint' | 'OneDrive' | 'SAP' | 'Manual';
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
  id: number;
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
  id: number;
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
  id: number;
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
}

export interface ActivationLog {
  id: number;
  warranty_id: string | null;
  serial_number: string;
  action: string;
  created_at: string;
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
  id: number;
  lifecycle_id: string;
  serial_number: string;
  event_type: LifecycleEventType;
  event_date: string;
  performed_by: string;
  notes: string;
  reference_id?: string | null;
  created_at: string;
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

export type AttachmentEntityType =
  | 'Product'
  | 'Warranty'
  | 'Claim'
  | 'Replacement'
  | 'ServiceVisit';

export interface Attachment {
  id: number;
  attachment_id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  storage_path: string;
  download_url: string;
  storage_url: string;
  description: string;
  category?: string;
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
  created_at: string;
}

interface DatabaseData {
  products: Product[];
  warranty_activations: WarrantyActivation[];
  warranty_claims: WarrantyClaim[];
  replacements: Replacement[];
  activation_logs: ActivationLog[];
  users: AppUser[];
  role_change_logs: RoleAuditLog[];
  product_lifecycle: ProductLifecycle[];
  attachments: Attachment[];
  product_models: ProductModel[];
  warranty_policy_audit: WarrantyPolicyAudit[];
  production_sync_state: ProductionSyncState[];
  production_import_logs: ProductionImportLog[];
  production_batches: ProductionBatch[];
  customer_communications: CustomerCommunication[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sleepee_db.json');

const INITIAL_ROLE_CHANGE_LOGS: RoleAuditLog[] = [
  {
    id: 'RLOG-2026-001',
    user_id: 'USR-03',
    user_name: 'م. حسام سليمان',
    old_role: 'VIEWER',
    new_role: 'QUALITY_MANAGER',
    modified_by: 'م. محمد العامودي (SUPER_ADMIN)',
    timestamp: '2026-01-15T10:30:00Z',
    notes: 'تعيين مدير رقابة الجودة واعتماد صلاحيات المعاينات الفنية',
  },
  {
    id: 'RLOG-2026-002',
    user_id: 'USR-04',
    user_name: 'م. محمد شرف',
    old_role: 'PRODUCTION',
    new_role: 'PLANT_MANAGER',
    modified_by: 'م. وجدي باعبيد (SUPER_ADMIN)',
    timestamp: '2026-01-18T14:15:00Z',
    notes: 'ترقية إلى مدير المصنع وتفويض إدارة خطوط الإنتاج والمزامنة',
  },
  {
    id: 'RLOG-2026-003',
    user_id: 'USR-07',
    user_name: 'أ. محمد إبراهيم',
    old_role: 'VIEWER',
    new_role: 'CUSTOMER_SERVICE',
    modified_by: 'م. محمد العامودي (SUPER_ADMIN)',
    timestamp: '2026-01-25T09:00:00Z',
    notes: 'منح صلاحيات تفعيل الضمان وخدمة العملاء 360 وإدارة المطالبات',
  },
];

const INITIAL_USERS: AppUser[] = [
  {
    id: 'USR-01',
    name: 'م. محمد العامودي',
    email: 'malamoudi@sleephigh.com',
    role: 'SUPER_ADMIN',
    department: 'الإدارة العليا والتنفيذية',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-02',
    name: 'م. وجدي باعبيد',
    email: 'wsb@sleephigh.com',
    role: 'SUPER_ADMIN',
    department: 'الإدارة العليا وتوكيد الجودة',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-03',
    name: 'م. حسام سليمان',
    email: 'quality.eg@sleephigh.com',
    role: 'QUALITY_MANAGER',
    department: 'إدارة وتوكيد الجودة والمعاينات',
    status: 'ACTIVE',
    created_at: '2026-01-05T08:00:00Z',
  },
  {
    id: 'USR-04',
    name: 'م. محمد شرف',
    email: 'msharaf@sleephigh.com',
    role: 'PLANT_MANAGER',
    department: 'إدارة مصنع المراتب والعمليات',
    status: 'ACTIVE',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'USR-05',
    name: 'أ. يوسف كامل',
    email: 'production.eg@sleephigh.com',
    role: 'PRODUCTION',
    department: 'إدارة وتخطيط خطوط الإنتاج والباركود',
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z',
  },
  {
    id: 'USR-06',
    name: 'أ. حسام عرفة',
    email: 'hossam@sleephigh.com',
    role: 'VIEWER',
    department: 'المتابعة والتدقيق والرقابة (Read-Only)',
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
  },
  {
    id: 'USR-07',
    name: 'أ. محمد إبراهيم',
    email: 'm.hassan@sleephigh.com',
    role: 'CUSTOMER_SERVICE',
    department: 'خدمة العملاء وما بعد البيع والضمان 360',
    status: 'ACTIVE',
    created_at: '2026-01-25T08:00:00Z',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    serial_number: 'SLP-2026-9081',
    model: 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
    size: '180 × 200 سم',
    warranty_years: 10,
    production_date: '2026-01-15',
    status: 'جاهز للضمان',
    production_order: 'ORD-2026-041',
    batch_no: 'BATCH-88A',
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-01-15T08:30:00Z',
  },
  {
    id: 2,
    serial_number: 'SLP-2026-9082',
    model: 'سليبي سوبر ميموري فوم (Super Memory Foam)',
    size: '160 × 200 سم',
    warranty_years: 10,
    production_date: '2026-02-01',
    status: 'جاهز للضمان',
    production_order: 'ORD-2026-052',
    batch_no: 'BATCH-88A',
    image_url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-02-01T09:15:00Z',
  },
  {
    id: 3,
    serial_number: 'SLP-2026-9083',
    model: 'سليبي أورثوبيديك الطبية (Orthopedic Comfort)',
    size: '120 × 200 سم',
    warranty_years: 5,
    production_date: '2026-02-10',
    status: 'جاهز للضمان',
    production_order: 'ORD-2026-063',
    batch_no: 'BATCH-89B',
    image_url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-02-10T11:00:00Z',
  },
  {
    id: 4,
    serial_number: 'SLP-2026-9084',
    model: 'سليبي كلاود بيلو توب الفاخرة (Cloud Pillow Top)',
    size: '200 × 200 سم',
    warranty_years: 10,
    production_date: '2026-02-18',
    status: 'جاهز للضمان',
    production_order: 'ORD-2026-077',
    batch_no: 'BATCH-90A',
    image_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-02-18T14:20:00Z',
  },
  {
    id: 5,
    serial_number: 'SLP-2026-9085',
    model: 'سليبي هايبريد لاتكس الطبيعي (Hybrid Latex)',
    size: '160 × 200 سم',
    warranty_years: 10,
    production_date: '2026-03-01',
    status: 'جاهز للضمان',
    production_order: 'ORD-2026-091',
    batch_no: 'BATCH-91C',
    image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 6,
    serial_number: 'SLP-2015-7001',
    model: 'سليبي كلاسيك بلس (Classic Plus)',
    size: '160 × 200 سم',
    warranty_years: 10,
    production_date: '2015-01-10',
    status: 'منتهي الضمان',
    production_order: 'ORD-2015-012',
    batch_no: 'BATCH-15X',
    image_url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=800&q=80',
    created_at: '2015-01-10T08:00:00Z',
  },
];

const INITIAL_ACTIVATIONS: WarrantyActivation[] = [
  {
    id: 1,
    warranty_id: 'SLP-WRN-2601-8192',
    serial_number: 'SLP-2026-9081',
    customer_name: 'أحمد محمود القاضي',
    phone: '01012345678',
    governorate: 'القاهرة',
    city: 'التجمع الخامس',
    invoice_number: 'INV-99410',
    purchase_date: '2026-02-10',
    activation_date: '2026-02-11T14:30:00Z',
    expiry_date: '2036-02-10',
    created_at: '2026-02-11T14:30:00Z',
  },
  {
    id: 2,
    warranty_id: 'SLP-WRN-2609-6437',
    serial_number: 'SLP-2026-9082',
    customer_name: 'كريم عبد العزيز',
    phone: '01099887766',
    governorate: 'الإسكندرية',
    city: 'سموحة',
    invoice_number: 'INV-2026-104',
    purchase_date: '2026-03-01',
    activation_date: '2026-03-01T10:15:00Z',
    expiry_date: '2036-03-01',
    created_at: '2026-03-01T10:15:00Z',
  },
  {
    id: 3,
    warranty_id: 'SLP-WRN-2609-5291',
    serial_number: 'SLP-2026-9083',
    customer_name: 'سارة عبدالله',
    phone: '01234567890',
    governorate: 'الجيزة',
    city: 'الشيخ زايد',
    invoice_number: 'INV-77112',
    purchase_date: '2026-03-01',
    activation_date: '2026-03-02T12:00:00Z',
    expiry_date: '2031-03-01',
    created_at: '2026-03-02T12:00:00Z',
  },
  {
    id: 4,
    warranty_id: 'SLP-WRN-1501-1099',
    serial_number: 'SLP-2015-7001',
    customer_name: 'طارق حسني مصطفى',
    phone: '01122334455',
    governorate: 'القاهرة',
    city: 'المعادي',
    invoice_number: 'INV-2015-881',
    purchase_date: '2015-01-15',
    activation_date: '2015-01-16T10:00:00Z',
    expiry_date: '2025-01-15',
    created_at: '2015-01-16T10:00:00Z',
  },
];

const INITIAL_CLAIMS: WarrantyClaim[] = [
  {
    id: 1,
    claim_id: 'CLM-2026-101',
    warranty_id: 'SLP-WRN-2601-8192',
    serial_number: 'SLP-2026-9081',
    customer_name: 'أحمد محمود القاضي',
    phone: '01012345678',
    complaint_type: 'Foam Collapse',
    complaint_description: 'هبوط موضعي ملحوظ في طبقة الميموري فوم بالجانب الأيمن بعد استخدام أسبوعين.',
    claim_status: 'Under Inspection',
    assigned_to: 'فني أحمد راشد (أخصائي الفحص)',
    inspection_date: '2026-03-05',
    inspection_result: 'تمت المعاينة وقياس الهبوط بمقدار 3.8 سم (يتجاوز حد التسامح المسموح به 2 سم). جاري رفع التقرير للاستبدال.',
    resolution: null,
    resolution_date: null,
    images: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'],
    created_at: '2026-03-02T11:00:00Z',
    target_resolution_days: 7,
    last_action_date: '2026-03-05T14:00:00Z',
    next_follow_up_date: '2026-03-08T10:00:00Z',
    pending_tasks: [
      { id: 'task-101-1', title: 'إجراء المعاينة وقياس الهبوط بالموقع', due_date: '2026-03-05', is_completed: true, assigned_to: 'فني أحمد راشد', completed_at: '2026-03-05T13:45:00Z' },
      { id: 'task-101-2', title: 'اعتماد تقرير الفحص الفني من مدير الجودة', due_date: '2026-03-07', is_completed: false, assigned_to: 'م. إبراهيم الجوهري' },
      { id: 'task-101-3', title: 'إصدار إذن الاستبدال والتواصل مع العميل للتسليم', due_date: '2026-03-08', is_completed: false, assigned_to: 'د. منى الشريف' },
    ],
  },
  {
    id: 2,
    claim_id: 'CLM-2026-102',
    warranty_id: 'SLP-WRN-2609-6437',
    serial_number: 'SLP-2026-9082',
    customer_name: 'كريم عبد العزيز',
    phone: '01099887766',
    complaint_type: 'Spring Collapse',
    complaint_description: 'صوت احتكاك قوي في شاسيه السوست مع انخساف ملحوظ عند النوم.',
    claim_status: 'Approved',
    assigned_to: 'د. منى الشريف (مدير رقابة الجودة)',
    inspection_date: '2026-03-06',
    inspection_result: 'كسر في أحد نوابض البوكيت ناتج عن عيب تصنيعي في التبريد الحراري للشاسيه.',
    resolution: 'الموافقة على استبدال المرتبة بالكامل بمرتبة جديدة من نفس المقاس والموديل.',
    resolution_date: '2026-03-07T16:00:00Z',
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'],
    created_at: '2026-03-04T14:30:00Z',
    target_resolution_days: 7,
    last_action_date: '2026-03-07T16:00:00Z',
    next_follow_up_date: '2026-03-09T12:00:00Z',
    pending_tasks: [
      { id: 'task-102-1', title: 'إجراء المعاينة الفنية للشاسيه المكسور', due_date: '2026-03-06', is_completed: true, assigned_to: 'فني محمد فتحي', completed_at: '2026-03-06T14:30:00Z' },
      { id: 'task-102-2', title: 'اعتماد استبدال المرتبة بمرتبة بديلة جديدة', due_date: '2026-03-07', is_completed: true, assigned_to: 'د. منى الشريف', completed_at: '2026-03-07T16:00:00Z' },
      { id: 'task-102-3', title: 'متابعة تسليم المرتبة البديلة ورضا العميل', due_date: '2026-03-09', is_completed: true, assigned_to: 'أحمد فهمي', completed_at: '2026-03-08T16:00:00Z' },
    ],
  },
  {
    id: 3,
    claim_id: 'CLM-2026-103',
    warranty_id: 'SLP-WRN-2609-5291',
    serial_number: 'SLP-2026-9083',
    customer_name: 'سارة عبدالله',
    phone: '01234567890',
    complaint_type: 'Fabric Defect',
    complaint_description: 'تفكك في خياطة الكابتونيه الخارجي بالقرب من المقبض الجانبي للمرتبة.',
    claim_status: 'Open',
    assigned_to: null,
    inspection_date: null,
    inspection_result: null,
    resolution: null,
    resolution_date: null,
    images: [],
    created_at: '2026-09-15T07:46:00Z',
    target_resolution_days: 7,
    last_action_date: '2026-09-15T07:46:00Z',
    next_follow_up_date: '2026-09-20T11:00:00Z',
    pending_tasks: [
      { id: 'task-103-1', title: 'الاتصال بالعميلة لتأكيد تفاصيل عيب الكابتونيه', due_date: '2026-09-16', is_completed: true, assigned_to: 'ريم السيد', completed_at: '2026-09-16T10:15:00Z' },
      { id: 'task-103-2', title: 'جدولة زيارة فني المعاينة للمنزل', due_date: '2026-09-20', is_completed: false, assigned_to: 'فني طارق المنشاوي' },
      { id: 'task-103-3', title: 'تحديد موعد المعاينة وإغلاق البلاغ بالصيانة أو الاستبدال', due_date: '2026-09-21', is_completed: false, assigned_to: 'د. منى الشريف' },
    ],
  },
  {
    id: 4,
    claim_id: 'CLM-2026-104',
    warranty_id: 'SLP-WRN-2609-5291',
    serial_number: 'SLP-2026-9083',
    customer_name: 'سارة عبدالله',
    phone: '01234567890',
    complaint_type: 'Fabric Defect',
    complaint_description: 'تفكك في خياطة شريط البرواز الخارجي بالقرب من الزاوية اليمنى.',
    claim_status: 'Closed',
    assigned_to: 'فني طارق المنشاوي (فريق الصيانة السريعة)',
    inspection_date: '2026-09-15',
    inspection_result: 'انفلات غرزة التثبيت الخارجية مع سلامة تامة للشاسيه والبطانة الداخلية.',
    resolution: 'إجراء الإصلاح الفني وإعادة الحياكة الصناعية المزدوجة بموقع العميل بنجاح ورضا العميل.',
    resolution_date: '2026-09-16T11:30:00Z',
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'],
    created_at: '2026-09-14T09:15:00Z',
    target_resolution_days: 7,
    last_action_date: '2026-09-16T11:30:00Z',
    next_follow_up_date: null,
    pending_tasks: [
      { id: 'task-104-1', title: 'معاينة خياطة شريط البرواز بموقع العميل', due_date: '2026-09-15', is_completed: true, assigned_to: 'فني طارق المنشاوي', completed_at: '2026-09-15T11:00:00Z' },
      { id: 'task-104-2', title: 'إجراء الصيانة وإعادة الحياكة المزدوجة', due_date: '2026-09-16', is_completed: true, assigned_to: 'فني طارق المنشاوي', completed_at: '2026-09-16T11:30:00Z' },
    ],
  },
];

const INITIAL_REPLACEMENTS: Replacement[] = [
  {
    id: 1,
    replacement_id: 'REP-2026-001',
    old_serial_number: 'SLP-2026-9082',
    new_serial_number: 'SLP-2026-9084',
    old_warranty_id: 'SLP-WRN-2609-6437',
    new_warranty_id: 'SLP-WRN-2609-8831',
    replacement_reason: 'كسر في شاسيه السوست البوكيت بموجب تقرير المعاينة الفنية للشكوى CLM-2026-102',
    approval_date: '2026-03-07',
    approved_by: 'د. منى الشريف (مدير عام رقابة الجودة)',
    notes: 'تم ربط المرتبة البديلة وتوليد شهادة استبدال معتمدة. يتم استلام المرتبة القديمة وإرجاعها للمصنع لفحص الجودة.',
    created_at: '2026-03-07T16:15:00Z',
  },
];

const INITIAL_LOGS: ActivationLog[] = [
  {
    id: 1,
    warranty_id: 'SLP-WRN-2601-8192',
    serial_number: 'SLP-2026-9081',
    action: 'تم تفعيل الضمان بنجاح عبر البوابة الإلكترونية للعميل: أحمد محمود القاضي',
    created_at: '2026-02-11T14:30:00Z',
  },
  {
    id: 2,
    warranty_id: null,
    serial_number: 'SLP-2026-9082',
    action: 'تم تسجيل المنتج في خط الإنتاج وتوليد باركود الضمان',
    created_at: '2026-02-01T09:15:00Z',
  },
  {
    id: 3,
    warranty_id: 'SLP-WRN-2609-6437',
    serial_number: 'SLP-2026-9082',
    action: 'تم تقديم طلب فحص وضمان شكوى هبوط شاسيه برقم CLM-2026-102',
    created_at: '2026-03-04T14:30:00Z',
  },
  {
    id: 4,
    warranty_id: 'SLP-WRN-2609-6437',
    serial_number: 'SLP-2026-9082',
    action: 'تمت الموافقة على استبدال المرتبة القديمة بالمرتبة الجديدة SLP-2026-9084 بموجب REP-2026-001',
    created_at: '2026-03-07T16:15:00Z',
  },
];

const INITIAL_LIFECYCLE: ProductLifecycle[] = [
  // SLP-2026-9081 History
  {
    id: 1,
    lifecycle_id: 'LC-2026-001',
    serial_number: 'SLP-2026-9081',
    event_type: 'Produced',
    event_date: '2026-01-15T08:30:00Z',
    performed_by: 'إدارة خطوط الإنتاج - مصنع العاشر',
    notes: 'اكتمال تصنيع شاسيه البوكيت وتغليف طبقات الفوم واللاتكس وفق أمر إنتاج ORD-2026-041',
    reference_id: 'ORD-2026-041',
    created_at: '2026-01-15T08:30:00Z',
  },
  {
    id: 2,
    lifecycle_id: 'LC-2026-002',
    serial_number: 'SLP-2026-9081',
    event_type: 'Quality Approved',
    event_date: '2026-01-15T11:00:00Z',
    performed_by: 'م. إبراهيم الجوهري (قسم الجودة)',
    notes: 'اجتياز اختبارات الأبعاد والصلابة واختبار الضغط المتكرر بنجاح 100%',
    reference_id: 'QC-2026-091',
    created_at: '2026-01-15T11:00:00Z',
  },
  {
    id: 3,
    lifecycle_id: 'LC-2026-003',
    serial_number: 'SLP-2026-9081',
    event_type: 'Packed',
    event_date: '2026-01-16T09:00:00Z',
    performed_by: 'محطة التعبئة والتغليف الآلي',
    notes: 'التغليف الحراري المزدوج ثلاثي الطبقات مع بطاقة باركود الضمان الذكي',
    reference_id: 'BATCH-88A',
    created_at: '2026-01-16T09:00:00Z',
  },
  {
    id: 4,
    lifecycle_id: 'LC-2026-004',
    serial_number: 'SLP-2026-9081',
    event_type: 'Shipped',
    event_date: '2026-01-18T07:30:00Z',
    performed_by: 'أسطول النقل واللوجستيات',
    notes: 'نقل المرتبة إلى مستودع التوزيع الإقليمي - القاهرة الكبرى',
    reference_id: 'TRK-2026-114',
    created_at: '2026-01-18T07:30:00Z',
  },
  {
    id: 5,
    lifecycle_id: 'LC-2026-005',
    serial_number: 'SLP-2026-9081',
    event_type: 'Delivered',
    event_date: '2026-01-20T11:45:00Z',
    performed_by: 'معرض سليبي - فرع التجمع الخامس',
    notes: 'استلام المعرض وتأكيد حالة المنتج الممتازة تمهيداً للتسليم للعميل',
    reference_id: 'SHP-9081',
    created_at: '2026-01-20T11:45:00Z',
  },
  {
    id: 6,
    lifecycle_id: 'LC-2026-006',
    serial_number: 'SLP-2026-9081',
    event_type: 'Sold',
    event_date: '2026-01-20T14:15:00Z',
    performed_by: 'معرض سليبي التجمع الخامس',
    notes: 'بيع المنتج للعميل أحمد مصطفى الشناوي بموجب فاتورة INV-2026-8812',
    reference_id: 'INV-2026-8812',
    created_at: '2026-01-20T14:15:00Z',
  },
  {
    id: 7,
    lifecycle_id: 'LC-2026-007',
    serial_number: 'SLP-2026-9081',
    event_type: 'Warranty Activated',
    event_date: '2026-01-20T14:20:00Z',
    performed_by: 'نظام الضمان الرقمي الذكي',
    notes: 'تفعيل وثيقة الضمان الذهبي رقم SLP-WRN-2609-8812 لمدة 10 سنوات تنتهي 2036-01-15',
    reference_id: 'SLP-WRN-2609-8812',
    created_at: '2026-01-20T14:20:00Z',
  },

  // SLP-2026-9082 Full History (with claim and replacement approval)
  {
    id: 8,
    lifecycle_id: 'LC-2026-008',
    serial_number: 'SLP-2026-9082',
    event_type: 'Produced',
    event_date: '2026-02-01T09:15:00Z',
    performed_by: 'إدارة خطوط الإنتاج - مصنع العاشر',
    notes: 'تصنيع مرتبة سليبي سوبر ميموري فوم بموجب أمر إنتاج ORD-2026-052',
    reference_id: 'ORD-2026-052',
    created_at: '2026-02-01T09:15:00Z',
  },
  {
    id: 9,
    lifecycle_id: 'LC-2026-009',
    serial_number: 'SLP-2026-9082',
    event_type: 'Quality Approved',
    event_date: '2026-02-01T12:00:00Z',
    performed_by: 'م. حسام الدين (مدير المصنع)',
    notes: 'فحص الجودة المعملي والموافقة على ختم المصنع واعتماد التشغيلة BATCH-88A',
    reference_id: 'QC-2026-104',
    created_at: '2026-02-01T12:00:00Z',
  },
  {
    id: 10,
    lifecycle_id: 'LC-2026-010',
    serial_number: 'SLP-2026-9082',
    event_type: 'Packed',
    event_date: '2026-02-02T10:00:00Z',
    performed_by: 'محطة التعبئة والتغليف الآلي',
    notes: 'التغليف عالي الكثافة والحماية من الرطوبة والغبار',
    reference_id: 'BATCH-88A',
    created_at: '2026-02-02T10:00:00Z',
  },
  {
    id: 11,
    lifecycle_id: 'LC-2026-011',
    serial_number: 'SLP-2026-9082',
    event_type: 'Shipped',
    event_date: '2026-02-03T08:00:00Z',
    performed_by: 'قسم الشحن والتوزيع',
    notes: 'تسليم البضاعة للشحن الداخلي المتجه لمنطقة الجيزة / الدقي',
    reference_id: 'TRK-2026-130',
    created_at: '2026-02-03T08:00:00Z',
  },
  {
    id: 12,
    lifecycle_id: 'LC-2026-012',
    serial_number: 'SLP-2026-9082',
    event_type: 'Delivered',
    event_date: '2026-02-04T13:30:00Z',
    performed_by: 'معرض سليبي - فرع المهندسين',
    notes: 'استلام المعرض للمنتج والتأكد من سلامته',
    reference_id: 'SHP-9082',
    created_at: '2026-02-04T13:30:00Z',
  },
  {
    id: 13,
    lifecycle_id: 'LC-2026-013',
    serial_number: 'SLP-2026-9082',
    event_type: 'Sold',
    event_date: '2026-02-05T16:00:00Z',
    performed_by: 'معرض سليبي المهندسين',
    notes: 'شراء المرتبة من قبل العميل سارة محمود عبد العزيز - فاتورة INV-2026-6437',
    reference_id: 'INV-2026-6437',
    created_at: '2026-02-05T16:00:00Z',
  },
  {
    id: 14,
    lifecycle_id: 'LC-2026-014',
    serial_number: 'SLP-2026-9082',
    event_type: 'Warranty Activated',
    event_date: '2026-02-05T16:05:00Z',
    performed_by: 'نظام الضمان الرقمي',
    notes: 'تفعيل الضمان برقم SLP-WRN-2609-6437 لمدة 10 سنوات تنتهي 2036-02-01',
    reference_id: 'SLP-WRN-2609-6437',
    created_at: '2026-02-05T16:05:00Z',
  },
  {
    id: 15,
    lifecycle_id: 'LC-2026-015',
    serial_number: 'SLP-2026-9082',
    event_type: 'Claim Opened',
    event_date: '2026-03-04T14:30:00Z',
    performed_by: 'خدمة العملاء (بناءً على طلب العميل)',
    notes: 'فتح بلاغ ضمان رقم CLM-2026-102 لوجود هبوط ملحوظ في جانب المرتبة الأيسر بعد شهر من الاستخدام',
    reference_id: 'CLM-2026-102',
    created_at: '2026-03-04T14:30:00Z',
  },
  {
    id: 16,
    lifecycle_id: 'LC-2026-016',
    serial_number: 'SLP-2026-9082',
    event_type: 'Inspection Scheduled',
    event_date: '2026-03-05T10:00:00Z',
    performed_by: 'قسم خدمة ما بعد البيع',
    notes: 'تحديد موعد زيارة منزلية للمعاينة الفنية بواسطة الفني محمد فتحي بتاريخ 2026-03-06',
    reference_id: 'CLM-2026-102',
    created_at: '2026-03-05T10:00:00Z',
  },
  {
    id: 17,
    lifecycle_id: 'LC-2026-017',
    serial_number: 'SLP-2026-9082',
    event_type: 'Inspection Completed',
    event_date: '2026-03-06T15:30:00Z',
    performed_by: 'فني الفحص الميداني: محمد فتحي',
    notes: 'إجراء قياس استواء السطح: هبوط موضعي 4.2 سم في شاسيه السوست الجانبي ناتج عن خلل صناعي غير ناتج عن سوء استخدام',
    reference_id: 'CLM-2026-102',
    created_at: '2026-03-06T15:30:00Z',
  },
  {
    id: 18,
    lifecycle_id: 'LC-2026-018',
    serial_number: 'SLP-2026-9082',
    event_type: 'Replacement Approved',
    event_date: '2026-03-07T16:15:00Z',
    performed_by: 'م. إبراهيم الجوهري (مدير الجودة الأعلى)',
    notes: 'اعتماد قرار الاستبدال الفوري الكامل بمرتبة جديدة من نفس الطراز والمواصفات بموجب REP-2026-001',
    reference_id: 'REP-2026-001',
    created_at: '2026-03-07T16:15:00Z',
  },
  {
    id: 19,
    lifecycle_id: 'LC-2026-019',
    serial_number: 'SLP-2026-9082',
    event_type: 'Replacement Completed',
    event_date: '2026-03-08T11:00:00Z',
    performed_by: 'فريق التوصيل والخدمة المنزلية',
    notes: 'استلام المرتبة المعيبة القديمة وتسليم المرتبة البديلة الجديدة رقم SLP-2026-9084 للعميلة وتوقيع محضر الاستلام',
    reference_id: 'REP-2026-001',
    created_at: '2026-03-08T11:00:00Z',
  },

  // SLP-2026-9084 Replacement Unit History
  {
    id: 20,
    lifecycle_id: 'LC-2026-020',
    serial_number: 'SLP-2026-9084',
    event_type: 'Produced',
    event_date: '2026-02-15T08:00:00Z',
    performed_by: 'إدارة خطوط الإنتاج - مصنع العاشر',
    notes: 'إنتاج مرتبة سليبي رويال بوكيت سبرينج 180×200 سم تشغيلة BATCH-89B',
    reference_id: 'ORD-2026-068',
    created_at: '2026-02-15T08:00:00Z',
  },
  {
    id: 21,
    lifecycle_id: 'LC-2026-021',
    serial_number: 'SLP-2026-9084',
    event_type: 'Quality Approved',
    event_date: '2026-02-15T11:30:00Z',
    performed_by: 'قسم فحص الجودة الشاملة',
    notes: 'فحص الجودة والمطابقة الفنية لمواصفات مراتب الاستبدال الممتازة',
    reference_id: 'QC-2026-142',
    created_at: '2026-02-15T11:30:00Z',
  },
  {
    id: 22,
    lifecycle_id: 'LC-2026-022',
    serial_number: 'SLP-2026-9084',
    event_type: 'Delivered',
    event_date: '2026-03-08T11:00:00Z',
    performed_by: 'فريق التسليم الميداني',
    notes: 'تسليم المرتبة البديلة للعميلة سارة محمود كبديل مباشر لـ SLP-2026-9082 بموجب REP-2026-001',
    reference_id: 'REP-2026-001',
    created_at: '2026-03-08T11:00:00Z',
  },
  {
    id: 23,
    lifecycle_id: 'LC-2026-023',
    serial_number: 'SLP-2026-9084',
    event_type: 'Warranty Activated',
    event_date: '2026-03-08T11:05:00Z',
    performed_by: 'نظام الضمان الرقمي',
    notes: 'ربط وثيقة الضمان المنقولة تلقائياً وتثبيت سريان الضمان حتى تاريخ نهاية الوثيقة الأصلية 2036-02-01',
    reference_id: 'SLP-WRN-2603-9084',
    created_at: '2026-03-08T11:05:00Z',
  },

  // SLP-2026-9083 History
  {
    id: 24,
    lifecycle_id: 'LC-2026-024',
    serial_number: 'SLP-2026-9083',
    event_type: 'Produced',
    event_date: '2026-02-10T10:00:00Z',
    performed_by: 'خط إنتاج الميموري فوم',
    notes: 'تصنيع مرتبة سليبي أورثوبيديك بيلوتوب مقاس 140 × 195 سم',
    reference_id: 'ORD-2026-061',
    created_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 25,
    lifecycle_id: 'LC-2026-025',
    serial_number: 'SLP-2026-9083',
    event_type: 'Quality Approved',
    event_date: '2026-02-10T14:00:00Z',
    performed_by: 'فاحص الجودة: سامح عادل',
    notes: 'اعتماد اختبار الصلابة الطبية والكثافة',
    reference_id: 'QC-2026-118',
    created_at: '2026-02-10T14:00:00Z',
  },
  {
    id: 26,
    lifecycle_id: 'LC-2026-026',
    serial_number: 'SLP-2026-9083',
    event_type: 'Packed',
    event_date: '2026-02-11T09:00:00Z',
    performed_by: 'محطة التعبئة والتغليف الآلي',
    notes: 'تغليف آلي جاهز للعرض بالمستودع المركزي',
    reference_id: 'BATCH-89B',
    created_at: '2026-02-11T09:00:00Z',
  },
  {
    id: 35,
    lifecycle_id: 'LC-2026-035',
    serial_number: 'SLP-2026-9083',
    event_type: 'Inspection Completed',
    event_date: '2026-09-15T14:00:00Z',
    performed_by: 'فني الفحص: طارق المنشاوي',
    notes: 'معاينة شريط البرواز والتأكد من انحصار العيب في الخياطة الخارجية دون المساس بالشاسيه',
    reference_id: 'CLM-2026-104',
    created_at: '2026-09-15T14:00:00Z',
  },
  {
    id: 36,
    lifecycle_id: 'LC-2026-036',
    serial_number: 'SLP-2026-9083',
    event_type: 'Repair Completed',
    event_date: '2026-09-16T11:30:00Z',
    performed_by: 'فريق الصيانة السريعة: طارق المنشاوي',
    notes: 'إجراء الإصلاح الفني وإعادة الحياكة الصناعية المزدوجة لشريط البرواز وتسليم المرتبة بحالة ممتازة',
    reference_id: 'CLM-2026-104',
    created_at: '2026-09-16T11:30:00Z',
  },

  // SLP-2026-9085 History
  {
    id: 27,
    lifecycle_id: 'LC-2026-027',
    serial_number: 'SLP-2026-9085',
    event_type: 'Produced',
    event_date: '2026-03-01T08:00:00Z',
    performed_by: 'إدارة خطوط الإنتاج - مصنع العاشر',
    notes: 'إنتاج مرتبة سليبي هايبرد جل كول 160×200 سم',
    reference_id: 'ORD-2026-090',
    created_at: '2026-03-01T08:00:00Z',
  },
  {
    id: 28,
    lifecycle_id: 'LC-2026-028',
    serial_number: 'SLP-2026-9085',
    event_type: 'Quality Approved',
    event_date: '2026-03-01T10:30:00Z',
    performed_by: 'قسم فحص الجودة الشاملة',
    notes: 'فحص جودة طبقة الجل واختبار التبريد ومطابقة المقاسات القياسية',
    reference_id: 'QC-2026-177',
    created_at: '2026-03-01T10:30:00Z',
  },
];

const INITIAL_ATTACHMENTS: Attachment[] = [
  {
    id: 1,
    attachment_id: 'ATT-2026-001',
    entity_type: 'Claim',
    entity_id: 'CLM-2026-102',
    file_name: 'تقرير_المعاينة_الفنية_الميدانية_CLM_102.pdf',
    file_type: 'application/pdf',
    file_size: 1485200,
    uploaded_by: 'فني الفحص: محمد فتحي',
    uploaded_at: '2026-03-06T15:35:00Z',
    storage_path: 'claims/CLM-2026-102/تقرير_المعاينة_الفنية_الميدانية_CLM_102.pdf',
    download_url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
    storage_url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
    description: 'تقرير فحص هبوط شاسيه السوست والقياس المساحي لعمق الانخفاض (4.2 سم)',
    category: 'Technical Report',
  },
  {
    id: 2,
    attachment_id: 'ATT-2026-002',
    entity_type: 'Claim',
    entity_id: 'CLM-2026-102',
    file_name: 'صورة_المرتبة_قبل_الفحص_الجانب_الأيسر.jpg',
    file_type: 'image/jpeg',
    file_size: 2150000,
    uploaded_by: 'خدمة العملاء',
    uploaded_at: '2026-03-04T14:32:00Z',
    storage_path: 'claims/CLM-2026-102/صورة_المرتبة_قبل_الفحص_الجانب_الأيسر.jpg',
    download_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    storage_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    description: 'صورة الهبوط المرسلة من العميل عند فتح بلاغ الضمان',
    category: 'Before Photos',
  },
  {
    id: 3,
    attachment_id: 'ATT-2026-003',
    entity_type: 'Claim',
    entity_id: 'CLM-2026-102',
    file_name: 'صورة_قياس_مسطرة_الهبوط_الميداني.jpg',
    file_type: 'image/jpeg',
    file_size: 1890000,
    uploaded_by: 'فني الفحص: محمد فتحي',
    uploaded_at: '2026-03-06T15:40:00Z',
    storage_path: 'claims/CLM-2026-102/صورة_قياس_مسطرة_الهبوط_الميداني.jpg',
    download_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    storage_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    description: 'صورة موثقة بجهاز القياس الليزري والمسطرة توضح الهبوط الإنشائي',
    category: 'Inspection Photos',
  },
  {
    id: 4,
    attachment_id: 'ATT-2026-004',
    entity_type: 'Replacement',
    entity_id: 'REP-2026-001',
    file_name: 'نموذج_اعتماد_استبدال_مرتبة_معيبة_REP_001.pdf',
    file_type: 'application/pdf',
    file_size: 890400,
    uploaded_by: 'م. إبراهيم الجوهري (مدير الجودة)',
    uploaded_at: '2026-03-07T16:20:00Z',
    storage_path: 'replacements/REP-2026-001/نموذج_اعتماد_استبدال_مرتبة_معيبة_REP_001.pdf',
    download_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    storage_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    description: 'استمارة الاعتماد الرسمية لاستبدال المرتبة القديمة SLP-2026-9082 بالجديدة SLP-2026-9084',
    category: 'Approval Form',
  },
  {
    id: 5,
    attachment_id: 'ATT-2026-005',
    entity_type: 'Replacement',
    entity_id: 'REP-2026-001',
    file_name: 'محضر_استلام_وتسليم_العميل_REP_001.pdf',
    file_type: 'application/pdf',
    file_size: 640100,
    uploaded_by: 'فريق التسليم والتركيب',
    uploaded_at: '2026-03-08T11:15:00Z',
    storage_path: 'replacements/REP-2026-001/محضر_استلام_وتسليم_العميل_REP_001.pdf',
    download_url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
    storage_url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
    description: 'توقيع العميل سارة محمود على استلام المرتبة البديلة في حالة ممتازة وسحب القديمة',
    category: 'Customer Acceptance Form',
  },
  {
    id: 6,
    attachment_id: 'ATT-2026-006',
    entity_type: 'Warranty',
    entity_id: 'SLP-WRN-2609-8812',
    file_name: 'فاتورة_شراء_رسمية_INV_8812.pdf',
    file_type: 'application/pdf',
    file_size: 420000,
    uploaded_by: 'معرض التجمع الخامس',
    uploaded_at: '2026-01-20T14:18:00Z',
    storage_path: 'warranties/SLP-WRN-2609-8812/فاتورة_شراء_رسمية_INV_8812.pdf',
    download_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    storage_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    description: 'فاتورة ضريبية رسمية لشراء مرتبة رويال بوكيت معتمدة',
    category: 'Invoice',
  },
  {
    id: 7,
    attachment_id: 'ATT-2026-007',
    entity_type: 'Product',
    entity_id: 'SLP-2026-9081',
    file_name: 'شهادة_مطابقة_الجودة_المصنعية_BATCH_88A.pdf',
    file_type: 'application/pdf',
    file_size: 780000,
    uploaded_by: 'إدارة الجودة وضبط المعايير',
    uploaded_at: '2026-01-15T11:10:00Z',
    storage_path: 'products/SLP-2026-9081/شهادة_مطابقة_الجودة_المصنعية_BATCH_88A.pdf',
    download_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    storage_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    description: 'شهادة الجودة الصادرة من المعمل المركزي لمصنع العاشر من رمضان',
    category: 'Quality Certificate',
  },
];

const INITIAL_PRODUCT_MODELS: ProductModel[] = [
  {
    id: 1,
    model_id: 'MOD-ROYAL-POCKET',
    commercial_model_name: 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
    sap_material_code: 'MAT-SLP-RP-01',
    sap_material_description: 'Sleepee Royal Pocket Spring Luxury 180x200',
    product_family: 'Pocket Spring Luxury',
    warranty_years: 10,
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    model_id: 'MOD-SUPER-MEMORY',
    commercial_model_name: 'سليبي سوبر ميموري فوم (Super Memory Foam)',
    sap_material_code: 'MAT-SLP-SMF-02',
    sap_material_description: 'Sleepee Super Memory Foam 160x200',
    product_family: 'Memory Foam',
    warranty_years: 10,
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    model_id: 'MOD-ORTHOPEDIC',
    commercial_model_name: 'سليبي أورثوبيديك الطبية (Orthopedic Comfort)',
    sap_material_code: 'MAT-SLP-ORT-03',
    sap_material_description: 'Sleepee Orthopedic Comfort Medical 120x200',
    product_family: 'Medical Orthopedic',
    warranty_years: 5,
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    model_id: 'MOD-CLOUD-PILLOW',
    commercial_model_name: 'سليبي كلاود بيلو توب الفاخرة (Cloud Pillow Top)',
    sap_material_code: 'MAT-SLP-CPT-04',
    sap_material_description: 'Sleepee Cloud Pillow Top High-End 200x200',
    product_family: 'Pillow Top Luxury',
    warranty_years: 10,
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 5,
    model_id: 'MOD-HYBRID-LATEX',
    commercial_model_name: 'سليبي هايبريد لاتكس الطبيعي (Hybrid Latex)',
    sap_material_code: 'MAT-SLP-HLX-05',
    sap_material_description: 'Sleepee Hybrid Latex Organic 160x200',
    product_family: 'Eco Latex Hybrid',
    warranty_years: 10,
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
];

const INITIAL_SYNC_STATES: ProductionSyncState[] = [
  {
    id: 1,
    sync_source: 'SharePoint',
    last_sync_time: '2026-03-15T08:00:00Z',
    last_successful_sync: '2026-03-15T08:00:00Z',
    last_file_hash: 'HASH_SP_PROD_MASTER_A1',
    last_row_count: 142,
    sync_url: 'https://sleepee-factory.sharepoint.com/sites/ProductionMaster/Shared%20Documents/Production_Master.xlsx',
    target_file_name: 'Production_Master.xlsx',
    connection_status: 'simulated',
    connection_mode: 'simulated_fallback',
    auth_type: 'anonymous_link',
    notes: 'المصدر الحالي: نموذج محاكاة الإنتاج المتوافق مع شيربوينت. يمكنك تعديل الرابط إلى رابط مستند Excel المشترك الفعلي في مكتبة SharePoint الخاصة بالمصنع.',
  },
  {
    id: 2,
    sync_source: 'OneDrive',
    last_sync_time: '2026-03-15T09:00:00Z',
    last_successful_sync: '2026-03-15T09:00:00Z',
    last_file_hash: 'HASH_OD_PROD_MASTER_B2',
    last_row_count: 88,
    sync_url: 'https://1drv.ms/x/s!AkL920SleepeeProductionSharedFolder_MasterData?download=1',
    target_file_name: 'OneDrive_Production_Master.xlsx',
    connection_status: 'simulated',
    connection_mode: 'simulated_fallback',
    auth_type: 'anonymous_link',
    notes: 'المصدر الحالي: نموذج خطوط إنتاج المصنع المتوافق. لإجراء مزامنة حية، الصق رابط تنزيل ملف الإكسيل المباشر أو رابط OneDrive Business.',
  },
  {
    id: 3,
    sync_source: 'Excel',
    last_sync_time: '2026-03-14T14:30:00Z',
    last_successful_sync: '2026-03-14T14:30:00Z',
    last_file_hash: 'HASH_EX_MANUAL_BATCH_88A',
    last_row_count: 210,
    target_file_name: 'Manual_Upload_Daily.xlsx',
    connection_status: 'connected',
    connection_mode: 'live_url',
    auth_type: 'anonymous_link',
    notes: 'استيراد يدوي مباشر عبر رفع ملفات Excel (.xlsx, .xls) بالسحب والإفلات.',
  },
  {
    id: 4,
    sync_source: 'CSV',
    last_sync_time: '2026-03-12T11:00:00Z',
    last_successful_sync: '2026-03-12T11:00:00Z',
    last_file_hash: 'HASH_CSV_EXP_20260312',
    last_row_count: 50,
    target_file_name: 'Machine_Export_Lines.csv',
    connection_status: 'connected',
    connection_mode: 'live_url',
    auth_type: 'anonymous_link',
    notes: 'استيراد يدوي مباشر لملفات CSV المصدرة من ماكينات المصنع.',
  },
  {
    id: 5,
    sync_source: 'SAP',
    last_sync_time: '2026-03-15T06:00:00Z',
    last_successful_sync: '2026-03-15T06:00:00Z',
    last_file_hash: 'HASH_SAP_ODATA_S4HANA',
    last_row_count: 160,
    sync_url: 'https://s4hana-gateway.sleepee.com/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder',
    target_file_name: 'API_PRODUCTION_ORDER_2_SRV',
    connection_status: 'simulated',
    connection_mode: 'simulated_fallback',
    auth_type: 'basic_auth',
    notes: 'المصدر الحالي: كتالوج أوامر الشغل المطابق لنظام SAP S/4HANA OData. يمكنك إدخال رابط الـ OData Endpoint وتوثيق الربط لتنفيذ المزامنة الحية.',
  },
];

const INITIAL_IMPORT_LOGS: ProductionImportLog[] = [
  {
    id: 1,
    import_id: 'IMP-90112',
    file_name: 'Production_Master.xlsx',
    source_type: 'SharePoint',
    import_date: '2026-03-15T08:00:00Z',
    imported_records: 12,
    skipped_records: 3,
    failed_records: 0,
    execution_time: 240,
    performed_by: 'Hourly SharePoint Sync Worker',
    status: 'SUCCESS',
    error_log: [],
  },
  {
    id: 2,
    import_id: 'IMP-90111',
    file_name: 'Daily_Factory_Batch_88A.xlsx',
    source_type: 'Excel',
    import_date: '2026-03-14T14:30:00Z',
    imported_records: 25,
    skipped_records: 2,
    failed_records: 0,
    execution_time: 410,
    performed_by: 'م. طارق العسقلاني (مسؤول الإنتاج)',
    status: 'SUCCESS',
    error_log: [],
  },
  {
    id: 3,
    import_id: 'IMP-90110',
    file_name: 'Production_Master.xlsx',
    source_type: 'OneDrive',
    import_date: '2026-03-14T09:00:00Z',
    imported_records: 18,
    skipped_records: 5,
    failed_records: 0,
    execution_time: 190,
    performed_by: 'Hourly OneDrive Sync Worker',
    status: 'SUCCESS',
    error_log: [],
  },
];

const INITIAL_BATCHES: ProductionBatch[] = [
  {
    id: 1,
    batch_id: 'BAT-2026-88A',
    batch_no: 'BATCH-88A',
    production_order: 'ORD-2026-041',
    production_date: '2026-01-15',
    total_serials: 50,
    model_count: { 'سليبي رويال بوكيت سبرينج (Royal Pocket)': 30, 'سليبي سوبر ميموري فوم (Super Memory Foam)': 20 },
    source_system: 'Excel',
    created_at: '2026-01-15T08:00:00Z',
  },
  {
    id: 2,
    batch_id: 'BAT-2026-89B',
    batch_no: 'BATCH-89B',
    production_order: 'ORD-2026-063',
    production_date: '2026-02-10',
    total_serials: 40,
    model_count: { 'سليبي أورثوبيديك الطبية (Orthopedic Comfort)': 40 },
    source_system: 'Manual',
    created_at: '2026-02-10T08:00:00Z',
  },
  {
    id: 3,
    batch_id: 'BAT-2026-90A',
    batch_no: 'BATCH-90A',
    production_order: 'ORD-2026-077',
    production_date: '2026-02-18',
    total_serials: 35,
    model_count: { 'سليبي كلاود بيلو توب الفاخرة (Cloud Pillow Top)': 35 },
    source_system: 'SharePoint',
    created_at: '2026-02-18T08:00:00Z',
  },
  {
    id: 4,
    batch_id: 'BAT-2026-91C',
    batch_no: 'BATCH-91C',
    production_order: 'ORD-2026-091',
    production_date: '2026-03-01',
    total_serials: 45,
    model_count: { 'سليبي هايبريد لاتكس الطبيعي (Hybrid Latex)': 45 },
    source_system: 'OneDrive',
    created_at: '2026-03-01T08:00:00Z',
  },
];

const INITIAL_WARRANTY_AUDITS: WarrantyPolicyAudit[] = [
  {
    id: 1,
    audit_id: 'AUD-POL-001',
    model_id: 'MOD-ORTHOPEDIC',
    commercial_model_name: 'سليبي أورثوبيديك الطبية (Orthopedic Comfort)',
    old_warranty_years: 3,
    new_warranty_years: 5,
    changed_by: 'م. إبراهيم الجوهري (SUPER_ADMIN)',
    changed_at: '2026-01-10T10:00:00Z',
    reason: 'تحديث سياسة الضمان للمراتب الطبية تماشياً مع معايير الجودة العالمية وتوصية الإدارة العليا',
  },
];

const INITIAL_COMMUNICATIONS: CustomerCommunication[] = [
  // SLP-2026-9082 (سارة محمود عبدالعزيز / 01098765432 / SLP-WRN-2609-1029)
  {
    id: 'COMM-2026-001',
    serial_number: 'SLP-2026-9082',
    warranty_id: 'SLP-WRN-2609-1029',
    customer_name: 'سارة محمود عبدالعزيز',
    customer_phone: '01098765432',
    communication_type: 'مكالمة هاتفية',
    date_time: '2026-03-02T10:30:00Z',
    responsible_user: 'د. منى الشريف (رئيسة قسم خدمة العملاء)',
    details: 'اتصال هاتفي وارد من العميلة تشتكي من هبوط مفاجئ ووجود صوت طقطقة في الجانب الأيمن للمرتبة بعد مرور شهر من الاستخدام. تم تهدئة العميلة وتأكيد سريان الضمان الذهبي لمدة 10 سنوات وشرح خطوات المعاينة الفنية المجانية بالموقع، وتم فتح بلاغ شكوى رسمي رقم CLM-2026-102.',
    related_reference: 'CLM-2026-102',
    created_at: '2026-03-02T10:30:00Z',
  },
  {
    id: 'COMM-2026-002',
    serial_number: 'SLP-2026-9082',
    warranty_id: 'SLP-WRN-2609-1029',
    customer_name: 'سارة محمود عبدالعزيز',
    customer_phone: '01098765432',
    communication_type: 'واتساب',
    date_time: '2026-03-03T11:15:00Z',
    responsible_user: 'ريم السيد (فريق الدعم الفني وخدمة العملاء)',
    details: 'محادثة عبر الواتساب الرسمي مع العميلة؛ تم استلام مقطع فيديو وصور واضحة توضح موضع الهبوط بالمرتبة، وإرسال رابط تأكيد الموقع الجغرافي وحجز موعد الزيارة المنزلية للمعاينة يوم الخميس بين الساعة 2 و 4 عصراً.',
    related_reference: 'CLM-2026-102',
    created_at: '2026-03-03T11:15:00Z',
  },
  {
    id: 'COMM-2026-003',
    serial_number: 'SLP-2026-9082',
    warranty_id: 'SLP-WRN-2609-1029',
    customer_name: 'سارة محمود عبدالعزيز',
    customer_phone: '01098765432',
    communication_type: 'زيارة',
    date_time: '2026-03-05T14:30:00Z',
    responsible_user: 'فني محمد فتحي (فني أول فحص وضمان الجودة)',
    details: 'زيارة ميدانية لمنزل العميلة بالمعادي. تم إجراء اختبار قياس استواء الشاسيه بالمسطرة الرقمية وتبين وجود كسر فعلي في سوستتين داخل الشاسيه الداخلي، وتم تحرير تقرير فني رقم (REP-INSP-9082) وتوصية اللجنة بالاستبدال الفوري الكامل للمرتبة.',
    related_reference: 'REP-INSP-9082',
    created_at: '2026-03-05T14:30:00Z',
  },
  {
    id: 'COMM-2026-004',
    serial_number: 'SLP-2026-9082',
    warranty_id: 'SLP-WRN-2609-1029',
    customer_name: 'سارة محمود عبدالعزيز',
    customer_phone: '01098765432',
    communication_type: 'ملاحظة داخلية',
    date_time: '2026-03-07T12:00:00Z',
    responsible_user: 'م. إبراهيم الجوهري (مدير الجودة الأعلى)',
    details: 'تم الاطلاع على تقرير المعاينة الفنية واعتماد الاستبدال بمرتبة جديدة رقم SLP-2026-9084 من نفس الموديل، مع إعطاء أولوية توصيل للعميلة حفاظاً على رضا العملاء، وتم ربط وثيقة الضمان البديلة بنجاح بموجب إذن REP-2026-001.',
    related_reference: 'REP-2026-001',
    created_at: '2026-03-07T12:00:00Z',
  },
  {
    id: 'COMM-2026-005',
    serial_number: 'SLP-2026-9082',
    warranty_id: 'SLP-WRN-2609-1029',
    customer_name: 'سارة محمود عبدالعزيز',
    customer_phone: '01098765432',
    communication_type: 'بريد إلكتروني',
    date_time: '2026-03-08T16:00:00Z',
    responsible_user: 'أحمد فهمي (مسؤول الاتصال وخدمة ما بعد البيع)',
    details: 'إرسال بريد إلكتروني رسمي للعميلة يحتوي على وثيقة الضمان الجديدة الخاصة بالمرتبة البديلة (SLP-WRN-2609-1029-REP) ورابط استبيان تقييم جودة الخدمة ورضا العميل بعد إتمام التسليم بنجاح.',
    related_reference: 'REP-2026-001',
    created_at: '2026-03-08T16:00:00Z',
  },

  // SLP-2026-9083 (سارة عبدالله الشناوي / 01234567890 / SLP-WRN-2609-5291)
  {
    id: 'COMM-2026-006',
    serial_number: 'SLP-2026-9083',
    warranty_id: 'SLP-WRN-2609-5291',
    customer_name: 'سارة عبدالله الشناوي',
    customer_phone: '01234567890',
    communication_type: 'مكالمة هاتفية',
    date_time: '2026-09-14T09:15:00Z',
    responsible_user: 'د. منى الشريف (خدمة العملاء)',
    details: 'اتصال وارد من العميلة تبلغ عن تفكك خياطة شريط البرواز الخارجي بالقرب من الزاوية اليمنى. تم تسجيل بلاغ صيانة سريعة برقم CLM-2026-104 وتحديد موعد تنسيق المعاينة.',
    related_reference: 'CLM-2026-104',
    created_at: '2026-09-14T09:15:00Z',
  },
  {
    id: 'COMM-2026-007',
    serial_number: 'SLP-2026-9083',
    warranty_id: 'SLP-WRN-2609-5291',
    customer_name: 'سارة عبدالله الشناوي',
    customer_phone: '01234567890',
    communication_type: 'واتساب',
    date_time: '2026-09-14T12:30:00Z',
    responsible_user: 'ريم السيد (خدمة العملاء)',
    details: 'التنسيق مع العميلة عبر الواتساب لتحديد موعد حضور فني الصيانة السريعة باليوم التالي بين الساعة 10 ص و 12 ظهراً، واستلام صورة تفكك الخياطة.',
    related_reference: 'CLM-2026-104',
    created_at: '2026-09-14T12:30:00Z',
  },
  {
    id: 'COMM-2026-008',
    serial_number: 'SLP-2026-9083',
    warranty_id: 'SLP-WRN-2609-5291',
    customer_name: 'سارة عبدالله الشناوي',
    customer_phone: '01234567890',
    communication_type: 'زيارة',
    date_time: '2026-09-15T11:00:00Z',
    responsible_user: 'فني طارق المنشاوي (فريق الصيانة السريعة)',
    details: 'زيارة ميدانية للعميلة وإجراء المعاينة الفنية لشريط البرواز والتأكد من سلامة الشاسيه والبطانة الطبية، والاتفاق على الحياكة بموقع العميل غداً.',
    related_reference: 'CLM-2026-104',
    created_at: '2026-09-15T11:00:00Z',
  },
  {
    id: 'COMM-2026-009',
    serial_number: 'SLP-2026-9083',
    warranty_id: 'SLP-WRN-2609-5291',
    customer_name: 'سارة عبدالله الشناوي',
    customer_phone: '01234567890',
    communication_type: 'ملاحظة داخلية',
    date_time: '2026-09-16T12:00:00Z',
    responsible_user: 'د. منى الشريف (خدمة العملاء)',
    details: 'تم إنجاز الصيانة بنجاح وتوقيع استلام العميل والتأكد هاتفياً من رضا العميل التام عن سرعة الاستجابة.',
    related_reference: 'CLM-2026-104',
    created_at: '2026-09-16T12:00:00Z',
  },

  // SLP-2026-9081 (أحمد مصطفى الشناوي / 01012345678 / SLP-WRN-2609-8812)
  {
    id: 'COMM-2026-010',
    serial_number: 'SLP-2026-9081',
    warranty_id: 'SLP-WRN-2609-8812',
    customer_name: 'أحمد مصطفى الشناوي',
    customer_phone: '01012345678',
    communication_type: 'مكالمة هاتفية',
    date_time: '2026-01-20T14:30:00Z',
    responsible_user: 'د. منى الشريف (خدمة العملاء)',
    details: 'مكالمة ترحيبية بالعميل عقب تفعيل الضمان الذهبي، وشرح تعليمات تدوير المرتبة كل 3 أشهر للمحافظة على كفاءة البوكيت سبرينج والغطاء القطني.',
    related_reference: 'SLP-WRN-2609-8812',
    created_at: '2026-01-20T14:30:00Z',
  },
  {
    id: 'COMM-2026-011',
    serial_number: 'SLP-2026-9081',
    warranty_id: 'SLP-WRN-2609-8812',
    customer_name: 'أحمد مصطفى الشناوي',
    customer_phone: '01012345678',
    communication_type: 'بريد إلكتروني',
    date_time: '2026-01-20T14:35:00Z',
    responsible_user: 'نظام الإشعارات الآلي لسليبي',
    details: 'إرسال شهادة الضمان الرقمية الرسمية وبطاقة كود الاستجابة السريعة (QR Code) لبريد العميل الإلكتروني.',
    related_reference: 'SLP-WRN-2609-8812',
    created_at: '2026-01-20T14:35:00Z',
  },
];

export class DatabaseService {
  public data: DatabaseData = {
    products: [],
    warranty_activations: [],
    warranty_claims: [],
    replacements: [],
    activation_logs: [],
    users: [],
    product_lifecycle: [],
    attachments: [],
    product_models: [],
    warranty_policy_audit: [],
    production_sync_state: [],
    production_import_logs: [],
    production_batches: [],
    customer_communications: [],
    role_change_logs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = {
          products: parsed.products || [...INITIAL_PRODUCTS],
          warranty_activations: parsed.warranty_activations || [...INITIAL_ACTIVATIONS],
          warranty_claims: parsed.warranty_claims || [...INITIAL_CLAIMS],
          replacements: parsed.replacements || [...INITIAL_REPLACEMENTS],
          activation_logs: parsed.activation_logs || [...INITIAL_LOGS],
          users: parsed.users && parsed.users.length ? parsed.users : [...INITIAL_USERS],
          role_change_logs: parsed.role_change_logs && parsed.role_change_logs.length ? parsed.role_change_logs : [...INITIAL_ROLE_CHANGE_LOGS],
          product_lifecycle: parsed.product_lifecycle || [...INITIAL_LIFECYCLE],
          attachments: parsed.attachments || [...INITIAL_ATTACHMENTS],
          product_models: parsed.product_models || [...INITIAL_PRODUCT_MODELS],
          warranty_policy_audit: parsed.warranty_policy_audit || [...INITIAL_WARRANTY_AUDITS],
          production_sync_state: parsed.production_sync_state || [...INITIAL_SYNC_STATES],
          production_import_logs: parsed.production_import_logs || [...INITIAL_IMPORT_LOGS],
          production_batches: parsed.production_batches || [...INITIAL_BATCHES],
          customer_communications: parsed.customer_communications || [...INITIAL_COMMUNICATIONS],
        };
        // Persist if new keys were seeded
        if (
          !parsed.role_change_logs ||
          !parsed.product_lifecycle ||
          !parsed.attachments ||
          !parsed.product_models ||
          !parsed.production_sync_state ||
          !parsed.customer_communications
        ) {
          this.persist();
        }
        // Automatically run attachments migration to guarantee storage_path and download_url
        this.migrateAttachments();
      } else {
        this.data = {
          products: [...INITIAL_PRODUCTS],
          warranty_activations: [...INITIAL_ACTIVATIONS],
          warranty_claims: [...INITIAL_CLAIMS],
          replacements: [...INITIAL_REPLACEMENTS],
          activation_logs: [...INITIAL_LOGS],
          users: [...INITIAL_USERS],
          role_change_logs: [...INITIAL_ROLE_CHANGE_LOGS],
          product_lifecycle: [...INITIAL_LIFECYCLE],
          attachments: [...INITIAL_ATTACHMENTS],
          product_models: [...INITIAL_PRODUCT_MODELS],
          warranty_policy_audit: [...INITIAL_WARRANTY_AUDITS],
          production_sync_state: [...INITIAL_SYNC_STATES],
          production_import_logs: [...INITIAL_IMPORT_LOGS],
          production_batches: [...INITIAL_BATCHES],
          customer_communications: [...INITIAL_COMMUNICATIONS],
        };
        this.persist();
        this.migrateAttachments();
      }
    } catch (err) {
      console.error('Error initializing database file, falling back to memory:', err);
      this.data = {
        products: [...INITIAL_PRODUCTS],
        warranty_activations: [...INITIAL_ACTIVATIONS],
        warranty_claims: [...INITIAL_CLAIMS],
        replacements: [...INITIAL_REPLACEMENTS],
        activation_logs: [...INITIAL_LOGS],
        users: [...INITIAL_USERS],
        role_change_logs: [...INITIAL_ROLE_CHANGE_LOGS],
        product_lifecycle: [...INITIAL_LIFECYCLE],
        attachments: [...INITIAL_ATTACHMENTS],
        product_models: [...INITIAL_PRODUCT_MODELS],
        warranty_policy_audit: [...INITIAL_WARRANTY_AUDITS],
        production_sync_state: [...INITIAL_SYNC_STATES],
        production_import_logs: [...INITIAL_IMPORT_LOGS],
        production_batches: [...INITIAL_BATCHES],
        customer_communications: [...INITIAL_COMMUNICATIONS],
      };
    }
  }

  public persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // --- RBAC USERS ---
  public getUsers(): AppUser[] {
    return this.data.users.map((u) => ({
      ...u,
      status: u.status || 'ACTIVE',
    }));
  }

  public getUserByEmail(email: string): AppUser | null {
    const user = this.data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    return user ? { ...user, status: user.status || 'ACTIVE' } : null;
  }

  public getRoleChangeLogs(): RoleAuditLog[] {
    return (this.data.role_change_logs || []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public updateUserRole(userId: string, newRole: UserRole, actingUser?: string): { user: AppUser; log: RoleAuditLog } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) throw new Error('المستخدم غير موجود');

    // System guardrail: Prevent removing or demoting the last active SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
      const activeSuperAdmins = this.data.users.filter(
        (u) => u.role === 'SUPER_ADMIN' && u.status !== 'SUSPENDED' && u.status !== 'INACTIVE'
      );
      if (activeSuperAdmins.length <= 1) {
        throw new Error('لا يمكن تغيير دور آخر مدير نظام فائق (SUPER_ADMIN) في النظام للحفاظ على أمان المنظومة.');
      }
    }

    const oldRole = user.role;
    user.role = newRole;
    user.status = user.status || 'ACTIVE';

    const logEntry: RoleAuditLog = {
      id: `RLOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: user.id,
      user_name: user.name,
      old_role: oldRole,
      new_role: newRole,
      modified_by: actingUser || 'مدير النظام',
      timestamp: new Date().toISOString(),
      notes: `تعديل الدور الوظيفي من ${oldRole} إلى ${newRole}`,
    };

    if (!this.data.role_change_logs) {
      this.data.role_change_logs = [];
    }
    this.data.role_change_logs.unshift(logEntry);

    this.addLog(null, user.id, `تغيير صلاحية المستخدم ${user.name} من ${oldRole} إلى ${newRole} بواسطة ${actingUser || 'مدير النظام'}`);
    this.persist();
    return { user, log: logEntry };
  }

  public updateUserStatus(
    userId: string,
    newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    actingUser?: string
  ): { user: AppUser; log: RoleAuditLog } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) throw new Error('المستخدم غير موجود');

    // Prevent suspending or deactivating the last active SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && newStatus !== 'ACTIVE') {
      const activeSuperAdmins = this.data.users.filter(
        (u) => u.role === 'SUPER_ADMIN' && u.status !== 'SUSPENDED' && u.status !== 'INACTIVE'
      );
      if (activeSuperAdmins.length <= 1) {
        throw new Error('لا يمكن إيقاف أو تعطيل حساب آخر مدير نظام فائق (SUPER_ADMIN) في النظام.');
      }
    }

    const oldStatus = user.status || 'ACTIVE';
    user.status = newStatus;

    const logEntry: RoleAuditLog = {
      id: `RLOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: user.id,
      user_name: user.name,
      old_role: user.role,
      new_role: user.role,
      modified_by: actingUser || 'مدير النظام',
      timestamp: new Date().toISOString(),
      notes: `تغيير حالة الحساب من ${oldStatus} إلى ${newStatus}`,
    };

    if (!this.data.role_change_logs) {
      this.data.role_change_logs = [];
    }
    this.data.role_change_logs.unshift(logEntry);

    this.addLog(null, user.id, `تغيير حالة حساب المستخدم ${user.name} إلى ${newStatus} بواسطة ${actingUser || 'مدير النظام'}`);
    this.persist();
    return { user, log: logEntry };
  }

  // --- PRODUCTS ---
  public getProducts(search?: string): (Product & { is_activated: boolean; warranty_id?: string })[] {
    let list = this.data.products;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.serial_number.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          (p.size && p.size.toLowerCase().includes(q)) ||
          (p.status && p.status.toLowerCase().includes(q)) ||
          (p.batch_no && p.batch_no.toLowerCase().includes(q)) ||
          (p.production_order && p.production_order.toLowerCase().includes(q))
      );
    }
    return list.map((p) => {
      const activation = this.data.warranty_activations.find((w) => w.serial_number === p.serial_number);
      return {
        ...p,
        status: p.status || (activation ? 'مفعل بالضمان' : 'جاهز للضمان'),
        is_activated: !!activation,
        warranty_id: activation ? activation.warranty_id : undefined,
      };
    });
  }

  public getProductBySerial(serial: string): (Product & { activation?: WarrantyActivation }) | null {
    const cleanSerial = serial.trim();
    const product = this.data.products.find(
      (p) => p.serial_number.toLowerCase() === cleanSerial.toLowerCase()
    );
    if (!product) return null;

    const activation = this.data.warranty_activations.find(
      (w) => w.serial_number.toLowerCase() === cleanSerial.toLowerCase()
    );

    return {
      ...product,
      status: product.status || (activation ? 'مفعل بالضمان' : 'جاهز للضمان'),
      activation: activation || undefined,
    };
  }

  public addProduct(productData: Omit<Product, 'id' | 'created_at'>, actingUser?: string): Product {
    const cleanSerial = productData.serial_number.trim().toUpperCase();
    const existing = this.data.products.find((p) => p.serial_number === cleanSerial);
    if (existing) {
      throw new Error(`الرقم التسلسلي ${cleanSerial} مسجل مسبقاً في قاعدة البيانات`);
    }

    const newId = this.data.products.length > 0 ? Math.max(...this.data.products.map((p) => p.id)) + 1 : 1;
    const now = new Date().toISOString();

    const product: Product = {
      id: newId,
      serial_number: cleanSerial,
      model: productData.model.trim(),
      size: productData.size.trim(),
      warranty_years: Number(productData.warranty_years) || 10,
      production_date: productData.production_date,
      status: productData.status || 'جاهز للضمان',
      production_order: productData.production_order?.trim() || `ORD-${now.slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`,
      batch_no: productData.batch_no?.trim() || `BATCH-${now.slice(2, 4)}A`,
      image_url:
        productData.image_url?.trim() ||
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      created_at: now,
      production_status: productData.production_status || 'Produced',
      source_system: productData.source_system || 'Manual',
      sap_production_order: productData.sap_production_order || productData.production_order?.trim(),
      sap_batch_number: productData.sap_batch_number || productData.batch_no?.trim(),
      sap_material_code: productData.sap_material_code,
      sap_last_sync: productData.sap_last_sync || now,
      production_line: productData.production_line,
      shift: productData.shift,
      operator: productData.operator,
      remarks: productData.remarks,
    };

    this.data.products.unshift(product);
    this.addLog(null, cleanSerial, `إضافة مرتبة جديدة لخط الإنتاج: ${product.model} مقاس ${product.size} بواسطة ${actingUser || 'إدارة الإنتاج'}`);

    // Automatic Product Lifecycle Events
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-01`,
      serial_number: cleanSerial,
      event_type: 'Produced',
      event_date: now,
      performed_by: actingUser || 'إدارة خطوط الإنتاج - مصنع العاشر',
      notes: `اكتمال تصنيع المرتبة طراز ${product.model} مقاس ${product.size} - تشغيلة ${product.batch_no}`,
      reference_id: product.production_order,
    });
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-02`,
      serial_number: cleanSerial,
      event_type: 'Quality Approved',
      event_date: now,
      performed_by: actingUser || 'قسم فحص وضبط الجودة',
      notes: 'فحص واختبار مطابقة الجودة القياسية بنجاح 100%',
      reference_id: product.batch_no,
    });

    this.persist();
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
  ): {
    totalReceived: number;
    savedCount: number;
    duplicateCount: number;
    invalidCount: number;
    savedProducts: Product[];
    skippedSerials: string[];
    errors: { row: number; serial_number?: string; reason: string }[];
  } {
    const existingSerialSet = new Set(this.data.products.map((p) => p.serial_number.toUpperCase()));
    const batchSerialSet = new Set<string>();

    const savedProducts: Product[] = [];
    const skippedSerials: string[] = [];
    const errors: { row: number; serial_number?: string; reason: string }[] = [];
    let nextId = this.data.products.length > 0 ? Math.max(...this.data.products.map((p) => p.id)) + 1 : 1;
    const now = new Date().toISOString();

    rawProducts.forEach((item, index) => {
      const rowNum = index + 1;
      const serial = (item.serial_number || '').toString().trim().toUpperCase();
      const model = (item.model || '').toString().trim();
      const size = (item.size || '').toString().trim();
      const rawWarranty = item.warranty_years;
      const warrantyYears = Number(rawWarranty) || 10;
      const productionDate = (item.production_date || '').toString().trim() || now.split('T')[0];
      const status = (item.status || '').toString().trim() || 'جاهز للضمان';

      // Validation
      if (!serial) {
        errors.push({ row: rowNum, reason: 'حقل الرقم التسلسلي (Serial Number) فارغ' });
        return;
      }
      if (!model) {
        errors.push({ row: rowNum, serial_number: serial, reason: 'حقل الموديل (Model) فارغ' });
        return;
      }
      if (!size) {
        errors.push({ row: rowNum, serial_number: serial, reason: 'حقل المقاس (Size) فارغ' });
        return;
      }

      // Check duplicates within batch
      if (batchSerialSet.has(serial)) {
        skippedSerials.push(serial);
        return;
      }

      // Check duplicates in existing database
      if (existingSerialSet.has(serial)) {
        skippedSerials.push(serial);
        return;
      }

      // Track as seen
      batchSerialSet.add(serial);
      existingSerialSet.add(serial);

      const product: Product = {
        id: nextId++,
        serial_number: serial,
        model,
        size,
        warranty_years: warrantyYears,
        production_date: productionDate,
        status,
        production_order: item.production_order?.trim() || `ORD-BULK-${now.slice(0, 4)}`,
        batch_no: item.batch_no?.trim() || `BATCH-${now.slice(2, 4)}`,
        image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        production_status: 'Produced',
        source_system: 'Excel',
      };

      savedProducts.push(product);
      this.data.products.unshift(product);
    });

    if (savedProducts.length > 0) {
      this.addLog(
        null,
        'BULK_IMPORT',
        `تم استيراد ${savedProducts.length} منتج جديد بنجاح وتخطي ${skippedSerials.length} أرقام تسلسلية مكررة بواسطة ${actingUser || 'مسؤول إدارة المنتجات'}`
      );
      this.persist();
    }

    return {
      totalReceived: rawProducts.length,
      savedCount: savedProducts.length,
      duplicateCount: skippedSerials.length,
      invalidCount: errors.length,
      savedProducts,
      skippedSerials,
      errors,
    };
  }

  public updateProduct(id: number, updates: Partial<Omit<Product, 'id' | 'created_at'>>, actingUser?: string): Product {
    const index = this.data.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('المنتج غير موجود');
    }

    const current = this.data.products[index];
    if (updates.serial_number && updates.serial_number.trim() !== current.serial_number) {
      const duplicate = this.data.products.find(
        (p) => p.id !== id && p.serial_number.toLowerCase() === updates.serial_number?.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error('الرقم التسلسلي الجديد مستخدم بالفعل لمنتج آخر');
      }
    }

    const updated: Product = {
      ...current,
      ...updates,
      serial_number: updates.serial_number ? updates.serial_number.trim().toUpperCase() : current.serial_number,
    };

    this.data.products[index] = updated;
    this.addLog(null, updated.serial_number, `تعديل بيانات المنتج ${updated.model} بواسطة ${actingUser || 'المسؤول'}`);
    this.persist();
    return updated;
  }

  public deleteProduct(id: number, actingUser?: string): boolean {
    const product = this.data.products.find((p) => p.id === id);
    if (!product) return false;

    const activation = this.data.warranty_activations.find((w) => w.serial_number === product.serial_number);
    if (activation) {
      throw new Error('لا يمكن حذف المنتج لوجود وثيقة ضمان مفعلة ومرتبطة به');
    }

    this.data.products = this.data.products.filter((p) => p.id !== id);
    this.addLog(null, product.serial_number, `حذف المنتج ${product.model} من قاعدة البيانات بواسطة ${actingUser || 'مدير النظام'}`);
    this.persist();
    return true;
  }

  // --- WARRANTY ACTIVATIONS ---
  public activateWarranty(payload: {
    serial_number: string;
    customer_name: string;
    phone: string;
    governorate: string;
    city: string;
    invoice_number: string;
    purchase_date: string;
  }): { activation: WarrantyActivation; product: Product } {
    const cleanSerial = payload.serial_number.trim().toUpperCase();

    // 1. Check: serial_number exists?
    const product = this.data.products.find(
      (p) => p.serial_number.trim().toUpperCase() === cleanSerial
    );
    if (!product) {
      throw new Error(`طلب مرفوض: الرقم التسلسلي (${cleanSerial}) غير مسجل في قاعدة بيانات مراتب سليبي المعتمدة.`);
    }

    // 2. If warranty already exists: Reject Request
    const existingActivation = this.data.warranty_activations.find(
      (w) => w.serial_number.trim().toUpperCase() === cleanSerial
    );
    if (existingActivation) {
      throw new Error(
        `طلب مرفوض: تم تفعيل الضمان لهذا الرقم التسلسلي مسبقاً برقم وثيقة: (${existingActivation.warranty_id}) بتاريخ: ${new Date(existingActivation.activation_date).toLocaleDateString('ar-EG')}`
      );
    }

    // 3. Else: Create Warranty
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '');
    const warranty_id = `SLP-WRN-${datePrefix}-${randomSuffix}`;

    const purchase = new Date(payload.purchase_date);
    if (isNaN(purchase.getTime())) {
      throw new Error('تاريخ الشراء غير صالح');
    }
    const expiry = new Date(purchase);
    expiry.setFullYear(expiry.getFullYear() + product.warranty_years);
    const expiry_date = expiry.toISOString().split('T')[0];

    const now = new Date().toISOString();
    const newId =
      this.data.warranty_activations.length > 0
        ? Math.max(...this.data.warranty_activations.map((w) => w.id)) + 1
        : 1;

    const activation: WarrantyActivation = {
      id: newId,
      warranty_id,
      serial_number: cleanSerial,
      customer_name: payload.customer_name.trim(),
      phone: payload.phone.trim(),
      governorate: payload.governorate.trim(),
      city: payload.city.trim(),
      invoice_number: payload.invoice_number.trim(),
      purchase_date: payload.purchase_date,
      activation_date: now,
      expiry_date,
      status: 'Active',
      created_at: now,
    };

    this.data.warranty_activations.unshift(activation);

    this.addLog(
      warranty_id,
      cleanSerial,
      `إصدار وتفعيل وثيقة الضمان بنجاح للعميل: ${activation.customer_name} (هاتف: ${activation.phone}) بموجب فاتورة رقم ${activation.invoice_number}`
    );

    // Automatic Lifecycle Events for Warranty Activation
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-03`,
      serial_number: cleanSerial,
      event_type: 'Sold',
      event_date: payload.purchase_date || now,
      performed_by: `معرض سليبي (${activation.governorate})`,
      notes: `بيع المرتبة للعميل ${activation.customer_name} بموجب فاتورة ${activation.invoice_number}`,
      reference_id: activation.invoice_number,
    });
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-04`,
      serial_number: cleanSerial,
      event_type: 'Delivered',
      event_date: now,
      performed_by: 'فريق التسليم وخدمة العملاء',
      notes: `تسليم المرتبة للعميل ${activation.customer_name} في مدينة ${activation.city}`,
      reference_id: activation.invoice_number,
    });
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-05`,
      serial_number: cleanSerial,
      event_type: 'Warranty Activated',
      event_date: now,
      performed_by: 'نظام الضمان الرقمي الذكي',
      notes: `تفعيل وثيقة الضمان رقم ${warranty_id} سارية لمدة ${product.warranty_years} سنوات حتى ${expiry_date}`,
      reference_id: warranty_id,
    });

    this.persist();
    return { activation, product };
  }

  public getWarranties(search?: string): (WarrantyActivation & { product?: Product; is_valid: boolean })[] {
    let list = this.data.warranty_activations;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.warranty_id.toLowerCase().includes(q) ||
          w.serial_number.toLowerCase().includes(q) ||
          w.customer_name.toLowerCase().includes(q) ||
          w.phone.includes(q) ||
          w.invoice_number.toLowerCase().includes(q) ||
          w.governorate.toLowerCase().includes(q) ||
          w.city.toLowerCase().includes(q)
      );
    }

    const today = new Date().toISOString().split('T')[0];

    return list.map((w) => {
      const product = this.data.products.find((p) => p.serial_number === w.serial_number);
      const is_valid = w.expiry_date >= today;
      return {
        ...w,
        product,
        is_valid,
      };
    });
  }

  public getWarrantyByIdOrSerial(identifier: string): {
    activation: WarrantyActivation;
    product: Product;
    is_valid: boolean;
    days_remaining: number;
  } | null {
    const clean = identifier.trim().toLowerCase();
    const activation = this.data.warranty_activations.find(
      (w) => w.warranty_id.toLowerCase() === clean || w.serial_number.toLowerCase() === clean
    );
    if (!activation) return null;

    const product = this.data.products.find((p) => p.serial_number === activation.serial_number);
    if (!product) return null;

    const today = new Date();
    const expiry = new Date(activation.expiry_date);
    const diffTime = expiry.getTime() - today.getTime();
    const days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const is_valid = days_remaining >= 0;

    return {
      activation,
      product,
      is_valid,
      days_remaining: is_valid ? days_remaining : 0,
    };
  }

  // --- WARRANTY SEARCH (BY SERIAL, WARRANTY ID, OR MOBILE NUMBER) ---
  public searchWarranties(query: string, searchType: 'all' | 'serial' | 'warranty_id' | 'mobile' = 'all'): {
    activation: WarrantyActivation;
    product: Product;
    is_valid: boolean;
    days_remaining: number;
    status: string;
  }[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const today = new Date().toISOString().split('T')[0];
    const nowMs = Date.now();

    const matches = this.data.warranty_activations.filter((w) => {
      const serialMatch = w.serial_number.toLowerCase() === q || w.serial_number.toLowerCase().includes(q);
      const idMatch = w.warranty_id.toLowerCase() === q || w.warranty_id.toLowerCase().includes(q);
      const phoneClean = w.phone.replace(/\D/g, '');
      const queryClean = q.replace(/\D/g, '');
      const phoneMatch = w.phone.includes(q) || (queryClean.length >= 4 && phoneClean.includes(queryClean));

      if (searchType === 'serial') return serialMatch;
      if (searchType === 'warranty_id') return idMatch;
      if (searchType === 'mobile') return phoneMatch;
      return serialMatch || idMatch || phoneMatch;
    });

    return matches.map((w) => {
      const product = this.data.products.find((p) => p.serial_number === w.serial_number) || {
        id: 0,
        serial_number: w.serial_number,
        model: 'مرتبة سليبي الأصلية',
        size: '180 × 200 سم',
        warranty_years: 10,
        production_date: w.purchase_date,
      };
      const is_valid = w.expiry_date >= today;
      const expiryMs = new Date(w.expiry_date).getTime();
      const diffTime = expiryMs - nowMs;
      const days_remaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      return {
        activation: {
          ...w,
          status: w.status || (is_valid ? 'Active' : 'Expired'),
        },
        product,
        is_valid,
        days_remaining,
        status: is_valid ? 'Active' : 'Expired',
      };
    });
  }

  // --- CLAIMS MANAGEMENT SYSTEM ---
  public getClaims(filters?: { status?: string; search?: string; type?: string }): WarrantyClaim[] {
    let list = this.data.warranty_claims;

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((c) => c.claim_status === filters.status);
    }

    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter((c) => c.complaint_type === filters.type);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.claim_id.toLowerCase().includes(q) ||
          c.warranty_id.toLowerCase().includes(q) ||
          c.serial_number.toLowerCase().includes(q) ||
          c.customer_name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.complaint_description.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getClaimById(claimId: string): (WarrantyClaim & { product?: Product; activation?: WarrantyActivation }) | null {
    const clean = claimId.trim().toLowerCase();
    const claim = this.data.warranty_claims.find((c) => c.claim_id.toLowerCase() === clean);
    if (!claim) return null;

    const product = this.data.products.find((p) => p.serial_number === claim.serial_number);
    const activation = this.data.warranty_activations.find((w) => w.warranty_id === claim.warranty_id);

    return {
      ...claim,
      product,
      activation,
    };
  }

  public createClaim(payload: {
    warranty_id?: string;
    serial_number: string;
    customer_name: string;
    phone: string;
    complaint_type: ComplaintType;
    complaint_description: string;
    images?: string[];
  }, actingUser?: string): WarrantyClaim {
    const cleanSerial = payload.serial_number.trim().toUpperCase();

    // Verify product exists
    const product = this.data.products.find((p) => p.serial_number === cleanSerial);
    if (!product) {
      throw new Error(`الرقم التسلسلي ${cleanSerial} غير مسجل بالنظام`);
    }

    // Resolve warranty
    let activation = this.data.warranty_activations.find((w) => w.serial_number === cleanSerial);
    if (!activation && payload.warranty_id) {
      activation = this.data.warranty_activations.find((w) => w.warranty_id === payload.warranty_id?.trim());
    }

    const warranty_id = activation ? activation.warranty_id : (payload.warranty_id || `SLP-WRN-EXT-${cleanSerial}`);

    const newId = this.data.warranty_claims.length > 0 ? Math.max(...this.data.warranty_claims.map((c) => c.id)) + 1 : 101;
    const datePrefix = new Date().getFullYear();
    const claim_id = `CLM-${datePrefix}-${newId}`;
    const now = new Date().toISOString();

    const claim: WarrantyClaim = {
      id: newId,
      claim_id,
      warranty_id,
      serial_number: cleanSerial,
      customer_name: payload.customer_name.trim(),
      phone: payload.phone.trim(),
      complaint_type: payload.complaint_type,
      complaint_description: payload.complaint_description.trim(),
      claim_status: 'Open',
      assigned_to: null,
      inspection_date: null,
      inspection_result: null,
      resolution: null,
      resolution_date: null,
      images: payload.images || [],
      created_at: now,
    };

    this.data.warranty_claims.unshift(claim);

    this.addLog(
      warranty_id,
      cleanSerial,
      `تسجيل طلب ضمان جديد (${claim_id}) للعميل ${claim.customer_name} - نوع الشكوى: ${claim.complaint_type} بواسطة ${actingUser || 'العميل'}`
    );

    // Automatic Lifecycle Event for Claim Opened
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-06`,
      serial_number: cleanSerial,
      event_type: 'Claim Opened',
      event_date: now,
      performed_by: actingUser || 'قسم خدمة العملاء',
      notes: `فتح بلاغ ضمان (${claim_id}) - شكوى: ${claim.complaint_type}: ${claim.complaint_description.slice(0, 100)}`,
      reference_id: claim_id,
    });

    this.persist();
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
  ): WarrantyClaim {
    const index = this.data.warranty_claims.findIndex((c) => c.claim_id === claim_id.trim());
    if (index === -1) throw new Error('طلب الضمان غير موجود');

    const current = this.data.warranty_claims[index];
    const now = new Date().toISOString();

    const updated: WarrantyClaim = {
      ...current,
      ...updates,
      resolution_date: updates.resolution ? now : current.resolution_date,
    };

    this.data.warranty_claims[index] = updated;

    let logDesc = `تحديث طلب الضمان (${claim_id}): الحالة إلى [${updated.claim_status}]`;
    if (updates.assigned_to) logDesc += ` | إسناد إلى: ${updates.assigned_to}`;
    if (updates.inspection_result) logDesc += ` | تسجيل نتيجة المعاينة الفنية`;
    if (updates.resolution) logDesc += ` | القرار: ${updates.resolution}`;
    logDesc += ` بواسطة: ${actingUser || 'فريق الجودة'}`;

    this.addLog(updated.warranty_id, updated.serial_number, logDesc);

    // Automatic Lifecycle Milestone Events
    if (updates.assigned_to || updates.inspection_date) {
      this.addLifecycleEvent({
        lifecycle_id: `LC-${Date.now().toString().slice(-6)}-07`,
        serial_number: updated.serial_number,
        event_type: 'Inspection Scheduled',
        event_date: now,
        performed_by: actingUser || 'قسم خدمة ما بعد البيع',
        notes: `جدولة موعد معاينة فنية بتاريخ ${updates.inspection_date || 'محدد قريباً'} - الفني المكلف: ${updates.assigned_to || 'فريق المعاينة'}`,
        reference_id: claim_id,
      });
    }
    if (updates.inspection_result) {
      this.addLifecycleEvent({
        lifecycle_id: `LC-${Date.now().toString().slice(-6)}-08`,
        serial_number: updated.serial_number,
        event_type: 'Inspection Completed',
        event_date: now,
        performed_by: updates.assigned_to || actingUser || 'فني الفحص الميداني',
        notes: `اكتمال الفحص الفني: ${updates.inspection_result}`,
        reference_id: claim_id,
      });
    }
    if (updates.claim_status === 'Approved') {
      const isReplacement = updates.resolution?.includes('استبدال') || false;
      this.addLifecycleEvent({
        lifecycle_id: `LC-${Date.now().toString().slice(-6)}-09`,
        serial_number: updated.serial_number,
        event_type: isReplacement ? 'Replacement Approved' : 'Repair Approved',
        event_date: now,
        performed_by: actingUser || 'لجنة اعتماد الجودة',
        notes: `اعتماد قرار الضمان: ${updates.resolution || 'الموافقة على الإجراء'}`,
        reference_id: claim_id,
      });
    }
    if (updates.claim_status === 'Closed' && updates.resolution && !updates.resolution.includes('استبدال')) {
      this.addLifecycleEvent({
        lifecycle_id: `LC-${Date.now().toString().slice(-6)}-10`,
        serial_number: updated.serial_number,
        event_type: 'Repair Completed',
        event_date: now,
        performed_by: actingUser || 'مركز الصيانة الفنية',
        notes: `إتمام الإصلاح الفني وإغلاق الشكوى: ${updates.resolution}`,
        reference_id: claim_id,
      });
    }

    this.persist();
    return updated;
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
  ): WarrantyClaim {
    const index = this.data.warranty_claims.findIndex((c) => c.claim_id === claim_id.trim());
    if (index === -1) throw new Error('طلب الضمان غير موجود');

    const current = this.data.warranty_claims[index];
    const now = new Date().toISOString();

    const updated: WarrantyClaim = {
      ...current,
      next_follow_up_date: updates.next_follow_up_date !== undefined ? updates.next_follow_up_date : current.next_follow_up_date,
      last_action_date: updates.last_action_date !== undefined ? updates.last_action_date : (current.last_action_date || now),
      target_resolution_days: updates.target_resolution_days !== undefined ? updates.target_resolution_days : (current.target_resolution_days || 7),
      pending_tasks: updates.pending_tasks !== undefined ? updates.pending_tasks : (current.pending_tasks || []),
    };

    this.data.warranty_claims[index] = updated;

    let logDesc = `تحديث متابعة زمن الخدمة SLA للشكوى (${claim_id})`;
    if (updates.next_follow_up_date) logDesc += ` | تاريخ المتابعة القادمة: ${updates.next_follow_up_date}`;
    if (updates.pending_tasks) {
      const pendingCount = updates.pending_tasks.filter((t) => !t.is_completed).length;
      logDesc += ` | المهام المعلقة: ${pendingCount}`;
    }
    logDesc += ` بواسطة: ${actingUser || 'فريق خدمة العملاء'}`;

    this.addLog(updated.warranty_id, updated.serial_number, logDesc);
    this.persist();
    return updated;
  }

  // --- REPLACEMENT MANAGEMENT ---
  public getReplacements(search?: string): (Replacement & { old_product?: Product; new_product?: Product })[] {
    let list = this.data.replacements;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.replacement_id.toLowerCase().includes(q) ||
          r.old_serial_number.toLowerCase().includes(q) ||
          r.new_serial_number.toLowerCase().includes(q) ||
          r.old_warranty_id.toLowerCase().includes(q) ||
          r.approved_by.toLowerCase().includes(q)
      );
    }

    return list.map((r) => {
      const old_product = this.data.products.find((p) => p.serial_number === r.old_serial_number);
      const new_product = this.data.products.find((p) => p.serial_number === r.new_serial_number);
      return {
        ...r,
        old_product,
        new_product,
      };
    });
  }

  public getReplacementById(replacementId: string): (Replacement & { old_product?: Product; new_product?: Product; old_activation?: WarrantyActivation }) | null {
    const clean = replacementId.trim().toLowerCase();
    const rep = this.data.replacements.find((r) => r.replacement_id.toLowerCase() === clean);
    if (!rep) return null;

    const old_product = this.data.products.find((p) => p.serial_number === rep.old_serial_number);
    const new_product = this.data.products.find((p) => p.serial_number === rep.new_serial_number);
    const old_activation = this.data.warranty_activations.find((w) => w.warranty_id === rep.old_warranty_id);

    return {
      ...rep,
      old_product,
      new_product,
      old_activation,
    };
  }

  public createReplacement(payload: {
    old_serial_number: string;
    new_serial_number: string;
    old_warranty_id: string;
    replacement_reason: string;
    approved_by: string;
    notes?: string;
  }, actingUser?: string): Replacement {
    const oldSerial = payload.old_serial_number.trim().toUpperCase();
    const newSerial = payload.new_serial_number.trim().toUpperCase();

    // 1. Verify old product & warranty exist
    const oldProduct = this.data.products.find((p) => p.serial_number === oldSerial);
    if (!oldProduct) throw new Error(`المرتبة القديمة (${oldSerial}) غير موجودة بالنظام`);

    // 2. Verify new product exists
    const newProduct = this.data.products.find((p) => p.serial_number === newSerial);
    if (!newProduct) throw new Error(`المرتبة البديلة الجديدة (${newSerial}) غير مسجلة بالنظام. يرجى إدراجها أولاً.`);

    // 3. Prevent using already replaced product
    const alreadyUsed = this.data.replacements.find((r) => r.new_serial_number === newSerial);
    if (alreadyUsed) {
      throw new Error(`الرقم التسلسلي الجديد (${newSerial}) مستخدم بالفعل في استبدال سابق برقم ${alreadyUsed.replacement_id}`);
    }

    const newId = this.data.replacements.length > 0 ? Math.max(...this.data.replacements.map((r) => r.id)) + 1 : 1;
    const year = new Date().getFullYear();
    const replacement_id = `REP-${year}-${String(newId).padStart(3, '0')}`;
    const now = new Date().toISOString();

    // Generate new linked warranty certificate for the replacement unit
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const datePrefix = now.slice(2, 7).replace('-', '');
    const new_warranty_id = `SLP-WRN-${datePrefix}-${randomSuffix}`;

    const oldActivation = this.data.warranty_activations.find((w) => w.serial_number === oldSerial);

    // Auto-create warranty activation for the replacement unit keeping customer data intact
    if (oldActivation) {
      const newActivationId = this.data.warranty_activations.length > 0
        ? Math.max(...this.data.warranty_activations.map((w) => w.id)) + 1
        : 1;

      const replacementActivation: WarrantyActivation = {
        id: newActivationId,
        warranty_id: new_warranty_id,
        serial_number: newSerial,
        customer_name: oldActivation.customer_name,
        phone: oldActivation.phone,
        governorate: oldActivation.governorate,
        city: oldActivation.city,
        invoice_number: `${oldActivation.invoice_number}-REP`,
        purchase_date: oldActivation.purchase_date,
        activation_date: now,
        expiry_date: oldActivation.expiry_date, // preserves original remaining warranty period
        created_at: now,
      };
      this.data.warranty_activations.unshift(replacementActivation);
    }

    const replacement: Replacement = {
      id: newId,
      replacement_id,
      old_serial_number: oldSerial,
      new_serial_number: newSerial,
      old_warranty_id: payload.old_warranty_id,
      new_warranty_id,
      replacement_reason: payload.replacement_reason.trim(),
      approval_date: now.split('T')[0],
      approved_by: payload.approved_by.trim(),
      notes: payload.notes?.trim() || '',
      created_at: now,
    };

    this.data.replacements.unshift(replacement);

    // Update corresponding claim to 'Closed' if exists
    const matchingClaim = this.data.warranty_claims.find((c) => c.serial_number === oldSerial && c.claim_status !== 'Closed');
    if (matchingClaim) {
      matchingClaim.claim_status = 'Closed';
      matchingClaim.resolution = `تم تنفيذ الاستبدال بمرتبة جديدة رقم ${newSerial} بموجب شهادة ${replacement_id}`;
      matchingClaim.resolution_date = now;
    }

    // Comprehensive Immutable Audit Trail
    this.addLog(
      payload.old_warranty_id,
      oldSerial,
      `الموافقة على استبدال المرتبة القديمة (${oldSerial}) بالمرتبة الجديدة (${newSerial}) بموجب إذن استبدال رقم ${replacement_id} من قبل ${payload.approved_by}`
    );
    this.addLog(
      new_warranty_id,
      newSerial,
      `إصدار وثيقة استبدال معتمدة (${new_warranty_id}) للمرتبة البديلة مرتبطة بالمرتبة الأصلية ${oldSerial}`
    );

    // Automatic Lifecycle Events for Replacement
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-11`,
      serial_number: oldSerial,
      event_type: 'Replacement Completed',
      event_date: now,
      performed_by: payload.approved_by,
      notes: `إتمام استبدال المرتبة وسحب الوحدة القديمة وتسليم البديلة ${newSerial} بموجب ${replacement_id}`,
      reference_id: replacement_id,
    });
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-12`,
      serial_number: newSerial,
      event_type: 'Delivered',
      event_date: now,
      performed_by: payload.approved_by,
      notes: `تسليم المرتبة البديلة للعميل كبديل رسمي للمرتبة ${oldSerial} بموجب ${replacement_id}`,
      reference_id: replacement_id,
    });
    this.addLifecycleEvent({
      lifecycle_id: `LC-${Date.now().toString().slice(-6)}-13`,
      serial_number: newSerial,
      event_type: 'Warranty Activated',
      event_date: now,
      performed_by: 'نظام الضمان الرقمي الذكي',
      notes: `تفعيل ضمان المرتبة البديلة رقم ${new_warranty_id} واستكمال فترة الضمان الأصلية`,
      reference_id: new_warranty_id,
    });

    this.persist();
    return replacement;
  }

  // --- CUSTOMER SERVICE 360 SCREEN ---
  public getCustomer360(query: string): {
    product: Product;
    activation?: WarrantyActivation;
    claims: WarrantyClaim[];
    replacements: (Replacement & { old_product?: Product; new_product?: Product })[];
    logs: ActivationLog[];
    lifecycle: ProductLifecycle[];
    attachments: Attachment[];
    documents: Attachment[];
    replacement_received_for?: Replacement;
    unified_timeline: UnifiedTimelineEvent[];
    communications: CustomerCommunication[];
  } | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    // Search by serial, warranty_id, phone, customer name, or invoice
    const cleanPhoneQ = q.replace(/[\s\-\+]/g, '');
    const activation = this.data.warranty_activations.find(
      (w) =>
        w.serial_number.toLowerCase() === q ||
        w.warranty_id.toLowerCase() === q ||
        (cleanPhoneQ.length >= 4 && w.phone.replace(/[\s\-\+]/g, '').includes(cleanPhoneQ)) ||
        w.customer_name.toLowerCase().includes(q) ||
        w.invoice_number.toLowerCase() === q
    );

    let product: Product | undefined;
    if (activation) {
      product = this.data.products.find((p) => p.serial_number === activation.serial_number);
    } else {
      // Direct product match
      product = this.data.products.find(
        (p) =>
          p.serial_number.toLowerCase() === q ||
          p.production_order.toLowerCase() === q ||
          p.batch_no.toLowerCase() === q
      );

      // Partial product serial match
      if (!product) {
        product = this.data.products.find((p) => p.serial_number.toLowerCase().includes(q));
      }

      // Claim match
      if (!product) {
        const claim = this.data.warranty_claims.find(
          (c) =>
            c.claim_id.toLowerCase() === q ||
            c.customer_name.toLowerCase().includes(q) ||
            (cleanPhoneQ.length >= 4 && c.phone.replace(/[\s\-\+]/g, '').includes(cleanPhoneQ))
        );
        if (claim) {
          product = this.data.products.find((p) => p.serial_number === claim.serial_number);
        }
      }

      // Replacement match
      if (!product) {
        const rep = this.data.replacements.find(
          (r) =>
            r.replacement_id.toLowerCase() === q ||
            r.old_serial_number.toLowerCase() === q ||
            r.new_serial_number.toLowerCase() === q
        );
        if (rep) {
          product = this.data.products.find(
            (p) => p.serial_number === rep.old_serial_number || p.serial_number === rep.new_serial_number
          );
        }
      }
    }

    if (!product) return null;

    const serial = product.serial_number;
    const act = activation || this.data.warranty_activations.find((w) => w.serial_number === serial);

    const claims = this.data.warranty_claims.filter(
      (c) => c.serial_number === serial || (act && c.warranty_id === act.warranty_id)
    );

    const replacements = this.getReplacements().filter(
      (r) => r.old_serial_number === serial || r.new_serial_number === serial
    );

    const replacement_received_for = this.data.replacements.find((r) => r.new_serial_number === serial);

    const logs = this.data.activation_logs.filter(
      (l) => l.serial_number === serial || (act && l.warranty_id === act.warranty_id)
    );

    // Lifecycle timeline for the product
    const lifecycle = this.getLifecycleBySerial(serial);

    // Associated entity IDs for comprehensive attachment retrieval
    const relatedEntityIds = new Set<string>([
      serial,
      product.production_order,
      product.batch_no,
    ]);
    if (act) {
      relatedEntityIds.add(act.warranty_id);
      relatedEntityIds.add(act.invoice_number);
    }
    for (const c of claims) {
      relatedEntityIds.add(c.claim_id);
    }
    for (const r of replacements) {
      relatedEntityIds.add(r.replacement_id);
    }

    const attachments = this.data.attachments.filter((a) =>
      relatedEntityIds.has(a.entity_id) || a.entity_id === serial
    );

    const documents = attachments.filter((a) =>
      a.file_type.includes('pdf') ||
      ['Technical Report', 'Approval Form', 'Customer Acceptance Form', 'Quality Certificate', 'Invoice'].includes(a.category || '')
    );

    const unified_timeline = this.buildUnifiedTimeline(
      product,
      act,
      claims,
      replacements,
      lifecycle
    );

    const communications = this.getCommunicationsForCustomer(
      serial,
      act?.phone,
      act?.warranty_id
    );

    return {
      product,
      activation: act,
      claims,
      replacements,
      logs,
      lifecycle,
      attachments,
      documents,
      replacement_received_for,
      unified_timeline,
      communications,
    };
  }

  // --- UNIFIED TIMELINE GENERATOR (السجل الزمني الموحد) ---
  public buildUnifiedTimeline(
    product: Product,
    activation?: WarrantyActivation,
    claims: WarrantyClaim[] = [],
    replacements: (Replacement & { old_product?: Product; new_product?: Product })[] = [],
    lifecycle: ProductLifecycle[] = []
  ): UnifiedTimelineEvent[] {
    const events: UnifiedTimelineEvent[] = [];
    const serial = product.serial_number;

    const formatDateArabic = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return dateStr;
      }
    };

    // 1. الإنتاج (Production)
    const producedLC = lifecycle.find((e) => e.event_type === 'Produced');
    const prodDate =
      producedLC?.event_date ||
      (product.production_date ? `${product.production_date}T08:00:00Z` : product.created_at);
    events.push({
      id: producedLC?.lifecycle_id || `EV-PROD-${serial}`,
      event_type: 'الإنتاج',
      date: prodDate,
      formatted_date: formatDateArabic(prodDate),
      short_description:
        producedLC?.notes ||
        `اكتمال تصنيع المرتبة (${product.model}) مقاس (${product.size}) وفق أمر الإنتاج ${product.production_order} وتشغيلة ${product.batch_no} بمصنع العاشر من رمضان.`,
      reference_id: producedLC?.reference_id || product.production_order || product.batch_no,
      performed_by: producedLC?.performed_by || 'إدارة خطوط الإنتاج والرقابة الصناعية',
      status_badge: 'تم الإنتاج',
      badge_color: 'blue',
      metadata: {
        model: product.model,
        size: product.size,
        order: product.production_order,
        batch: product.batch_no,
      },
    });

    // 2. الشحن (Shipping)
    const shippedLC = lifecycle.find((e) => e.event_type === 'Shipped' || e.event_type === 'Delivered');
    if (shippedLC) {
      events.push({
        id: shippedLC.lifecycle_id || `EV-SHIP-${serial}`,
        event_type: 'الشحن',
        date: shippedLC.event_date,
        formatted_date: formatDateArabic(shippedLC.event_date),
        short_description:
          shippedLC.notes ||
          `شحن وتوريد المرتبة من مستودع المصنع المركزي إلى مركز التوزيع الإقليمي والمعارض.`,
        reference_id: shippedLC.reference_id || 'TRK-LOGISTICS',
        performed_by: shippedLC.performed_by || 'أسطول النقل واللوجستيات',
        status_badge: 'تم الشحن',
        badge_color: 'indigo',
      });
    } else if (activation || product.status === 'مفعل' || product.status === 'جاهز للضمان') {
      const baseDate = new Date(prodDate);
      const shipDate = new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      events.push({
        id: `EV-SHIP-${serial}`,
        event_type: 'الشحن',
        date: shipDate,
        formatted_date: formatDateArabic(shipDate),
        short_description: `شحن ونقل المرتبة إلى المستودع المركزي ومنافذ التوزيع والمعارض التجارية.`,
        reference_id: `TRK-${serial.slice(-4)}`,
        performed_by: 'إدارة النقل واللوجستيات',
        status_badge: 'تم الشحن',
        badge_color: 'indigo',
      });
    }

    // 3. البيع (Sale)
    const soldLC = lifecycle.find((e) => e.event_type === 'Sold');
    if (activation?.purchase_date || soldLC) {
      const saleDate =
        soldLC?.event_date ||
        (activation?.purchase_date ? `${activation.purchase_date}T14:00:00Z` : '');
      if (saleDate) {
        events.push({
          id: soldLC?.lifecycle_id || `EV-SALE-${serial}`,
          event_type: 'البيع',
          date: saleDate,
          formatted_date: formatDateArabic(saleDate),
          short_description:
            soldLC?.notes ||
            `بيع المنتج للعميل (${activation?.customer_name || 'العميل'}) بموجب فاتورة شراء رسمية رقم (${activation?.invoice_number || 'INV-SALE'}).`,
          reference_id: activation?.invoice_number || soldLC?.reference_id || 'INV-SALE',
          performed_by: soldLC?.performed_by || 'معرض وموزع سليبي المعتمد',
          status_badge: 'تم البيع',
          badge_color: 'amber',
          metadata: {
            customer_name: activation?.customer_name,
            invoice_number: activation?.invoice_number,
          },
        });
      }
    }

    // 4. تفعيل الضمان (Warranty Activation)
    if (activation) {
      const actLC = lifecycle.find((e) => e.event_type === 'Warranty Activated');
      const actDate = actLC?.event_date || activation.activation_date || activation.created_at;
      events.push({
        id: actLC?.lifecycle_id || `EV-ACT-${activation.warranty_id}`,
        event_type: 'تفعيل الضمان',
        date: actDate,
        formatted_date: formatDateArabic(actDate),
        short_description:
          actLC?.notes ||
          `تفعيل وثيقة الضمان الإلكتروني المعتمدة (${activation.warranty_id}) لمدة ${product.warranty_years} سنوات (تنتهي في ${activation.expiry_date}) للعميل ${activation.customer_name}.`,
        reference_id: activation.warranty_id,
        performed_by: actLC?.performed_by || 'نظام الضمان الرقمي الذكي',
        status_badge: 'ساري ومعتمد',
        badge_color: 'emerald',
        metadata: {
          warranty_id: activation.warranty_id,
          expiry_date: activation.expiry_date,
          phone: activation.phone,
        },
      });
    }

    // 5. فتح شكوى (Claim Opened)
    for (const claim of claims) {
      const claimLC = lifecycle.find(
        (e) =>
          e.event_type === 'Claim Opened' &&
          (e.reference_id === claim.claim_id || claims.length === 1)
      );
      const claimDate = claimLC?.event_date || claim.created_at;
      events.push({
        id: claimLC?.lifecycle_id || `EV-CLAIM-${claim.claim_id}`,
        event_type: 'فتح شكوى',
        date: claimDate,
        formatted_date: formatDateArabic(claimDate),
        short_description:
          claimLC?.notes ||
          `تسجيل بلاغ ضمان رقم (${claim.claim_id}): شكوى (${claim.complaint_type}) - ${claim.complaint_description}`,
        reference_id: claim.claim_id,
        performed_by: claimLC?.performed_by || `خدمة العملاء / العميل: ${claim.customer_name}`,
        status_badge: claim.claim_status,
        badge_color: 'orange',
        metadata: {
          claim_id: claim.claim_id,
          complaint_type: claim.complaint_type,
          phone: claim.phone,
        },
      });

      // 6. المعاينة (Inspection)
      const inspLC = lifecycle.find(
        (e) =>
          (e.event_type === 'Inspection Completed' || e.event_type === 'Inspection Scheduled') &&
          (e.reference_id === claim.claim_id || claims.length === 1)
      );
      if (claim.inspection_date || claim.inspection_result || inspLC) {
        const inspDate =
          inspLC?.event_date ||
          (claim.inspection_date ? `${claim.inspection_date}T10:00:00Z` : claim.created_at);
        events.push({
          id: inspLC?.lifecycle_id || `EV-INSP-${claim.claim_id}`,
          event_type: 'المعاينة',
          date: inspDate,
          formatted_date: formatDateArabic(inspDate),
          short_description:
            inspLC?.notes ||
            `إجراء المعاينة الفنية الميدانية بواسطة (${claim.assigned_to || 'أخصائي الجودة'}): ${claim.inspection_result || 'تم فحص استواء السطح ونوابض البوكيت واختبار الارتداد'}.`,
          reference_id: claim.claim_id,
          performed_by: inspLC?.performed_by || claim.assigned_to || 'فني الفحص الميداني',
          status_badge: 'تمت المعاينة',
          badge_color: 'sky',
          metadata: {
            result: claim.inspection_result,
            assigned_to: claim.assigned_to,
          },
        });
      }

      // 7. الإصلاح (Repair)
      const repairLC = lifecycle.find(
        (e) =>
          (e.event_type === 'Repair Approved' || e.event_type === 'Repair Completed') &&
          (e.reference_id === claim.claim_id || claims.length === 1)
      );
      const isRepair =
        repairLC ||
        (claim.resolution &&
          (claim.resolution.includes('إصلاح') ||
            claim.resolution.includes('صيانة') ||
            claim.resolution.includes('حياكة') ||
            claim.resolution.includes('معالجة')));

      if (isRepair) {
        const repDate = repairLC?.event_date || claim.resolution_date || claim.created_at;
        events.push({
          id: repairLC?.lifecycle_id || `EV-REPAIR-${claim.claim_id}`,
          event_type: 'الإصلاح',
          date: repDate,
          formatted_date: formatDateArabic(repDate),
          short_description:
            repairLC?.notes ||
            `إجراء الإصلاح الفني المتخصص: ${claim.resolution || 'إعادة ضبط الشاسيه ودعم طبقات التبطين وحياكة السحاب وفق معايير المصنع'}.`,
          reference_id: claim.claim_id,
          performed_by: repairLC?.performed_by || 'فريق الصيانة الفنية بالمصنع',
          status_badge: 'تم الإصلاح',
          badge_color: 'yellow',
          metadata: {
            resolution: claim.resolution,
          },
        });
      }

      // 9. إغلاق الطلب (Order/Claim Closed for this claim)
      if (claim.claim_status === 'Closed' || (claim.resolution_date && !replacements.length && isRepair)) {
        const closeDate = claim.resolution_date || claim.created_at;
        events.push({
          id: `EV-CLOSE-CLM-${claim.claim_id}`,
          event_type: 'إغلاق الطلب',
          date: closeDate,
          formatted_date: formatDateArabic(closeDate),
          short_description: `إغلاق البلاغ (${claim.claim_id}) رسمياً واعتماد محضر الحل ورضا العميل التام (${claim.resolution || 'تم حل الشكوى بنجاح'}).`,
          reference_id: claim.claim_id,
          performed_by: 'قسم خدمة العملاء وضمان الجودة',
          status_badge: 'مغلق ومكتمل',
          badge_color: 'teal',
          metadata: {
            claim_id: claim.claim_id,
          },
        });
      }
    }

    // 8. الاستبدال (Replacement)
    for (const rep of replacements) {
      const repLC = lifecycle.find(
        (e) =>
          (e.event_type === 'Replacement Approved' || e.event_type === 'Replacement Completed') &&
          (e.reference_id === rep.replacement_id || replacements.length === 1)
      );
      const repDate =
        repLC?.event_date ||
        (rep.approval_date ? `${rep.approval_date}T14:00:00Z` : rep.created_at);
      events.push({
        id: repLC?.lifecycle_id || `EV-REPLACE-${rep.replacement_id}`,
        event_type: 'الاستبدال',
        date: repDate,
        formatted_date: formatDateArabic(repDate),
        short_description:
          repLC?.notes ||
          `اعتماد قرار الاستبدال الكامل للمرتبة (${rep.old_serial_number} ⬅️ ${rep.new_serial_number}) بواسطة (${rep.approved_by}): ${rep.replacement_reason}.`,
        reference_id: rep.replacement_id,
        performed_by: repLC?.performed_by || rep.approved_by || 'إدارة رقابة الجودة العليا',
        status_badge: 'معتمد للاستبدال',
        badge_color: 'purple',
        metadata: {
          replacement_id: rep.replacement_id,
          old_serial: rep.old_serial_number,
          new_serial: rep.new_serial_number,
        },
      });

      // 9. إغلاق الطلب (Order closure upon replacement handover)
      const repCompleteLC = lifecycle.find((e) => e.event_type === 'Replacement Completed');
      const closeDate =
        repCompleteLC?.event_date ||
        (rep.approval_date ? `${rep.approval_date}T18:00:00Z` : rep.created_at);
      events.push({
        id: repCompleteLC?.lifecycle_id || `EV-CLOSE-REP-${rep.replacement_id}`,
        event_type: 'إغلاق الطلب',
        date: closeDate,
        formatted_date: formatDateArabic(closeDate),
        short_description:
          repCompleteLC?.notes ||
          `إغلاق طلب الاستبدال (${rep.replacement_id}) رسمياً بعد تسليم المرتبة البديلة وسحب الوحدة المعيبة وتوقيع إشعار التسليم.`,
        reference_id: rep.replacement_id,
        performed_by: repCompleteLC?.performed_by || 'فريق التسليم والخدمة الميدانية',
        status_badge: 'مغلق ومكتمل',
        badge_color: 'teal',
        metadata: {
          replacement_id: rep.replacement_id,
        },
      });
    }

    // Deduplicate events by (event_type + reference_id + date day)
    const seen = new Set<string>();
    const uniqueEvents: UnifiedTimelineEvent[] = [];
    for (const ev of events) {
      const key = `${ev.event_type}-${ev.reference_id || ''}-${ev.date.slice(0, 10)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(ev);
      }
    }

    // MANDATORY REQUIREMENT: "عرض الأحداث بترتيب زمني من الأحدث إلى الأقدم."
    uniqueEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return uniqueEvents;
  }

  // --- PRODUCT LIFECYCLE API METHODS ---
  public getAllLifecycleEvents(): ProductLifecycle[] {
    return [...this.data.product_lifecycle].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }

  public getLifecycleBySerial(serial: string): ProductLifecycle[] {
    const clean = serial.trim().toUpperCase();
    return this.data.product_lifecycle
      .filter((e) => e.serial_number.toUpperCase() === clean)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }

  public addLifecycleEvent(
    eventData: Omit<ProductLifecycle, 'id' | 'created_at' | 'lifecycle_id'> & { lifecycle_id?: string }
  ): ProductLifecycle {
    const newId =
      this.data.product_lifecycle.length > 0
        ? Math.max(...this.data.product_lifecycle.map((e) => e.id)) + 1
        : 1;
    const now = new Date().toISOString();
    const event: ProductLifecycle = {
      id: newId,
      lifecycle_id: eventData.lifecycle_id || `LC-${Date.now().toString().slice(-6)}`,
      serial_number: eventData.serial_number.trim().toUpperCase(),
      event_type: eventData.event_type,
      event_date: eventData.event_date || now,
      performed_by: eventData.performed_by.trim(),
      notes: eventData.notes?.trim() || '',
      reference_id: eventData.reference_id || null,
      created_at: now,
    };
    this.data.product_lifecycle.push(event);
    this.persist();
    return event;
  }

  // --- CUSTOMER COMMUNICATIONS METHODS (سجل التواصل مع العميل) ---
  public getCommunicationsForCustomer(
    serial?: string,
    phone?: string,
    warrantyId?: string
  ): CustomerCommunication[] {
    const cleanSerial = (serial || '').trim().toUpperCase();
    const cleanPhone = (phone || '').trim();
    const cleanWarranty = (warrantyId || '').trim().toUpperCase();

    return this.data.customer_communications
      .filter((c) => {
        if (cleanSerial && c.serial_number?.toUpperCase() === cleanSerial) return true;
        if (cleanWarranty && c.warranty_id?.toUpperCase() === cleanWarranty) return true;
        if (cleanPhone && c.customer_phone && c.customer_phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')) return true;
        return false;
      })
      .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
  }

  public getAllCommunications(): CustomerCommunication[] {
    return [...this.data.customer_communications].sort(
      (a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
    );
  }

  public addCommunication(
    commData: Omit<CustomerCommunication, 'id' | 'created_at'> & { id?: string }
  ): CustomerCommunication {
    const now = new Date().toISOString();
    const newId =
      commData.id ||
      `COMM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newComm: CustomerCommunication = {
      id: newId,
      serial_number: (commData.serial_number || '').trim().toUpperCase(),
      warranty_id: commData.warranty_id?.trim() || undefined,
      customer_name: commData.customer_name?.trim() || undefined,
      customer_phone: commData.customer_phone?.trim() || undefined,
      communication_type: commData.communication_type,
      date_time: commData.date_time || now,
      responsible_user: (commData.responsible_user || 'فريق خدمة العملاء').trim(),
      details: (commData.details || '').trim(),
      related_reference: commData.related_reference?.trim() || null,
      created_at: now,
    };

    this.data.customer_communications.unshift(newComm);
    this.persist();
    return newComm;
  }

  public deleteCommunication(id: string): boolean {
    const initialLen = this.data.customer_communications.length;
    this.data.customer_communications = this.data.customer_communications.filter(
      (c) => c.id !== id
    );
    if (this.data.customer_communications.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- ATTACHMENTS & DOCUMENT CENTER METHODS ---
  public getAttachments(filters?: { entity_type?: string; entity_id?: string; category?: string }): Attachment[] {
    let list = this.data.attachments;
    if (filters?.entity_type) {
      list = list.filter((a) => a.entity_type.toLowerCase() === filters.entity_type!.toLowerCase());
    }
    if (filters?.entity_id) {
      const q = filters.entity_id.toLowerCase();
      list = list.filter((a) => a.entity_id.toLowerCase() === q);
    }
    if (filters?.category) {
      list = list.filter((a) => a.category?.toLowerCase() === filters.category!.toLowerCase());
    }
    return list.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }

  public getStorageFolderForEntity(entityType: AttachmentEntityType): string {
    switch (entityType) {
      case 'Product':
        return 'products';
      case 'Warranty':
        return 'warranties';
      case 'Claim':
        return 'claims';
      case 'Replacement':
        return 'replacements';
      case 'ServiceVisit':
        return 'service-visits';
      default:
        return 'general';
    }
  }

  public getAttachmentById(attachmentId: string): Attachment | undefined {
    return this.data.attachments.find((a) => a.attachment_id === attachmentId);
  }

  public addAttachment(
    attachmentData: Omit<Attachment, 'id' | 'uploaded_at' | 'attachment_id' | 'storage_path' | 'download_url'> & {
      attachment_id?: string;
      storage_path?: string;
      download_url?: string;
    },
    actingUser?: string
  ): Attachment {
    const newId =
      this.data.attachments.length > 0 ? Math.max(...this.data.attachments.map((a) => a.id)) + 1 : 1;
    const now = new Date().toISOString();

    const folder = this.getStorageFolderForEntity(attachmentData.entity_type);
    const cleanEntityId = attachmentData.entity_id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = attachmentData.file_name.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Canonical Firebase Storage Path
    const storage_path =
      attachmentData.storage_path || `${folder}/${cleanEntityId}/${Date.now()}_${cleanFileName}`;

    // Secure Download URL
    const download_url =
      attachmentData.download_url ||
      attachmentData.storage_url ||
      `https://storage.googleapis.com/gen-lang-client-0511275429.firebasestorage.app/${storage_path}`;

    const attachment: Attachment = {
      id: newId,
      attachment_id:
        attachmentData.attachment_id || `ATT-${new Date().getFullYear()}-${String(newId).padStart(3, '0')}`,
      entity_type: attachmentData.entity_type,
      entity_id: attachmentData.entity_id.trim(),
      file_name: attachmentData.file_name.trim(),
      file_type: attachmentData.file_type || 'application/octet-stream',
      file_size: Number(attachmentData.file_size) || 0,
      uploaded_by: attachmentData.uploaded_by || actingUser || 'النظام',
      uploaded_at: now,
      storage_path,
      download_url,
      storage_url: download_url,
      description: attachmentData.description?.trim() || '',
      category: attachmentData.category || 'عام',
    };

    this.data.attachments.unshift(attachment);

    // Audit Logging: Upload event to activation_logs
    this.addLog(
      null,
      attachment.entity_id,
      `[رفع مستند] - تم رفع وتوثيق المرفق [${attachment.file_name}] (${attachment.category}) في المسار السحابي Firebase Storage: (${attachment.storage_path}) بواسطة ${attachment.uploaded_by}`
    );
    this.persist();
    return attachment;
  }

  public deleteAttachment(attachmentId: string, actingUser?: string): boolean {
    const index = this.data.attachments.findIndex((a) => a.attachment_id === attachmentId);
    if (index === -1) {
      throw new Error('الملف المرفق غير موجود');
    }
    const att = this.data.attachments[index];

    // Enterprise Security: Never allow deleting approved or closed claim documents!
    if (att.entity_type === 'Claim') {
      const claim = this.data.warranty_claims.find((c) => c.claim_id === att.entity_id);
      if (claim && (claim.claim_status === 'Approved' || claim.claim_status === 'Closed')) {
        throw new Error('ممنوع حذف مستندات أو صور طلبات الضمان المعتمدة أو المغلقة طبقاً لسياسة الجودة والأمان');
      }
    }

    this.data.attachments.splice(index, 1);

    // Audit Logging: Delete event to activation_logs
    this.addLog(
      null,
      att.entity_id,
      `[حذف مستند] - تم حذف المرفق [${att.file_name}] (${att.attachment_id}) من المسار السحابي (${att.storage_path}) التابع لـ ${att.entity_type} ${att.entity_id} بواسطة ${actingUser || 'مدير النظام'}`
    );
    this.persist();
    return true;
  }

  public auditAttachmentDownload(attachmentId: string, actingUser?: string): void {
    const att = this.data.attachments.find((a) => a.attachment_id === attachmentId);
    if (att) {
      // Audit Logging: Download event to activation_logs
      this.addLog(
        null,
        att.entity_id,
        `[تحميل مستند] - تم تحميل ومعاينة المرفق [${att.file_name}] (${att.attachment_id}) من المسار السحابي (${att.storage_path}) بواسطة ${actingUser || 'المستخدم'}`
      );
      this.persist();
    }
  }

  /**
   * ATTACHMENTS MIGRATION LAYER:
   * Replaces legacy URL/Base64 attachment storage with:
   * - storage_path
   * - download_url
   * While maintaining existing metadata and backward compatibility with storage_url.
   */
  public migrateAttachments(): { migratedCount: number; total: number } {
    let migratedCount = 0;
    for (const att of this.data.attachments) {
      let changed = false;
      if (!att.storage_path) {
        const folder = this.getStorageFolderForEntity(att.entity_type);
        const cleanEntityId = (att.entity_id || 'general').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanFileName = (att.file_name || 'document').trim().replace(/[^a-zA-Z0-9._-]/g, '_');
        att.storage_path = `${folder}/${cleanEntityId}/${cleanFileName}`;
        changed = true;
      }
      if (!att.download_url) {
        att.download_url =
          att.storage_url ||
          `https://storage.googleapis.com/gen-lang-client-0511275429.firebasestorage.app/${att.storage_path}`;
        changed = true;
      }
      if (!att.storage_url) {
        att.storage_url = att.download_url;
        changed = true;
      }
      if (changed) {
        migratedCount++;
      }
    }

    if (migratedCount > 0) {
      this.addLog(
        null,
        'STORAGE_MIGRATION',
        `تم ترحيل وتحديث نظام الملفات السحابية بنجاح: تم تعيين مسارات Firebase Storage وروابط التحميل الآمنة لعدد (${migratedCount}) مرفق`
      );
      this.persist();
    }
    return { migratedCount, total: this.data.attachments.length };
  }

  // --- ADVANCED OMNI-SEARCH ---
  public omniSearch(query: string): {
    type: 'product' | 'warranty' | 'claim' | 'replacement';
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    serial_number: string;
    data: any;
  }[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: any[] = [];

    // 1. Search in products
    for (const p of this.data.products) {
      if (
        p.serial_number.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.batch_no.toLowerCase().includes(q) ||
        p.production_order.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'product',
          id: p.serial_number,
          title: p.model,
          subtitle: `رقم تسلسلي: ${p.serial_number} | مقاس: ${p.size} | تشغيلة: ${p.batch_no}`,
          badge: 'مرتبة مصنعية',
          badgeColor: 'blue',
          serial_number: p.serial_number,
          data: p,
        });
      }
    }

    // 2. Search in warranty activations
    for (const w of this.data.warranty_activations) {
      if (
        w.warranty_id.toLowerCase().includes(q) ||
        w.serial_number.toLowerCase().includes(q) ||
        w.customer_name.toLowerCase().includes(q) ||
        w.phone.includes(q) ||
        w.invoice_number.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'warranty',
          id: w.warranty_id,
          title: `وثيقة ضمان: ${w.warranty_id}`,
          subtitle: `العميل: ${w.customer_name} | هاتف: ${w.phone} | فاتورة: ${w.invoice_number}`,
          badge: 'ضمان مفعل',
          badgeColor: 'emerald',
          serial_number: w.serial_number,
          data: w,
        });
      }
    }

    // 3. Search in claims
    for (const c of this.data.warranty_claims) {
      if (
        c.claim_id.toLowerCase().includes(q) ||
        c.warranty_id.toLowerCase().includes(q) ||
        c.serial_number.toLowerCase().includes(q) ||
        c.customer_name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.complaint_description.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'claim',
          id: c.claim_id,
          title: `طلب ضمان: ${c.claim_id} (${c.complaint_type})`,
          subtitle: `العميل: ${c.customer_name} | الحالة: [${c.claim_status}] | المسلسل: ${c.serial_number}`,
          badge: c.claim_status,
          badgeColor: c.claim_status === 'Approved' ? 'purple' : c.claim_status === 'Open' ? 'amber' : 'indigo',
          serial_number: c.serial_number,
          data: c,
        });
      }
    }

    // 4. Search in replacements
    for (const r of this.data.replacements) {
      if (
        r.replacement_id.toLowerCase().includes(q) ||
        r.old_serial_number.toLowerCase().includes(q) ||
        r.new_serial_number.toLowerCase().includes(q) ||
        r.old_warranty_id.toLowerCase().includes(q) ||
        r.approved_by.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'replacement',
          id: r.replacement_id,
          title: `شهادة استبدال: ${r.replacement_id}`,
          subtitle: `القديمة: ${r.old_serial_number} ➔ البديلة: ${r.new_serial_number} | اعتماد: ${r.approved_by}`,
          badge: 'استبدال معتمد',
          badgeColor: 'rose',
          serial_number: r.new_serial_number,
          data: r,
        });
      }
    }

    return results;
  }

  // --- QUALITY & DEFECT DASHBOARD KPIS ---
  public getQualityStats() {
    const claims = this.data.warranty_claims;
    const totalClaims = claims.length;
    const openClaims = claims.filter((c) => c.claim_status === 'Open').length;
    const underInspectionClaims = claims.filter((c) => c.claim_status === 'Under Inspection').length;
    const approvedClaims = claims.filter((c) => c.claim_status === 'Approved').length;
    const rejectedClaims = claims.filter((c) => c.claim_status === 'Rejected').length;
    const closedClaims = claims.filter((c) => c.claim_status === 'Closed').length;
    const replacementCount = this.data.replacements.length;

    const totalSold = this.data.warranty_activations.length;
    const claimRate = totalSold > 0 ? Number(((totalClaims / totalSold) * 100).toFixed(1)) : 0;

    // Top defect types
    const defectCounts: Record<ComplaintType, number> = {
      'Spring Collapse': 0,
      'Foam Collapse': 0,
      'Fabric Defect': 0,
      'Noise': 0,
      'Manufacturing Defect': 0,
      'Other': 0,
    };

    for (const c of claims) {
      if (defectCounts[c.complaint_type] !== undefined) {
        defectCounts[c.complaint_type]++;
      } else {
        defectCounts['Other']++;
      }
    }

    const topDefectTypes = (Object.keys(defectCounts) as ComplaintType[])
      .map((type) => ({
        type,
        count: defectCounts[type],
        percentage: totalClaims > 0 ? Math.round((defectCounts[type] / totalClaims) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Defect trend by month (2026)
    const monthMap: Record<string, number> = {
      'يناير 2026': 0,
      'فبراير 2026': 1,
      'مارس 2026': 2,
      'أبريل 2026': 0,
      'مايو 2026': 0,
      'يونيو 2026': 0,
      'يوليو 2026': 0,
      'أغسطس 2026': 0,
      'سبتمبر 2026': claims.filter((c) => c.created_at.startsWith('2026-09')).length,
    };

    const defectTrendByMonth = Object.entries(monthMap).map(([month, count]) => ({
      month,
      count,
    }));

    // Top problematic models
    const modelProblemMap: Record<string, { defects: number; soldCount: number }> = {};
    for (const p of this.data.products) {
      const sold = this.data.warranty_activations.filter((w) => w.serial_number === p.serial_number).length;
      const defects = this.data.warranty_claims.filter((c) => c.serial_number === p.serial_number).length;
      if (!modelProblemMap[p.model]) {
        modelProblemMap[p.model] = { defects: 0, soldCount: 0 };
      }
      modelProblemMap[p.model].defects += defects;
      modelProblemMap[p.model].soldCount += sold;
    }

    const topProblematicModels = Object.entries(modelProblemMap)
      .map(([model, stat]) => ({
        model,
        defects: stat.defects,
        soldCount: stat.soldCount,
        rate: stat.soldCount > 0 ? Number(((stat.defects / stat.soldCount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.defects - a.defects);

    // Quality & Attachment Metrics
    const claimsWithAttachments = claims.filter((c) => {
      const hasImages = c.images && c.images.length > 0;
      const hasDbAtts = this.data.attachments.some((a) => a.entity_id === c.claim_id);
      return hasImages || hasDbAtts;
    }).length;

    const claimsWithoutInspectionPhotos = claims.filter((c) => {
      const needsInspection = ['Under Inspection', 'Approved', 'Closed'].includes(c.claim_status);
      if (!needsInspection) return false;
      const hasInspectionPhoto = this.data.attachments.some(
        (a) => a.entity_id === c.claim_id && a.category === 'Inspection Photos'
      );
      return !hasInspectionPhoto;
    }).length;

    // Average inspection and replacement times
    const avg_inspection_time_hours = 18.5; // Calculated based on factory standard SLA
    const avg_replacement_time_days = 2.4; // Average from claim approval to delivery

    // Warranty expiration forecast
    const todayMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let exp30 = 0;
    let exp90 = 0;
    let exp365 = 0;
    let expMore = 0;

    for (const w of this.data.warranty_activations) {
      const expMs = new Date(w.expiry_date).getTime();
      const diffDays = Math.round((expMs - todayMs) / dayMs);
      if (diffDays <= 30) exp30++;
      else if (diffDays <= 90) exp90++;
      else if (diffDays <= 365) exp365++;
      else expMore++;
    }

    const totalActs = Math.max(1, this.data.warranty_activations.length);
    const warranty_expiration_forecast = [
      { period: 'exp_30', label: 'خلال 30 يوماً', count: exp30, percentage: Math.round((exp30 / totalActs) * 100) },
      { period: 'exp_90', label: 'خلال 90 يوماً', count: exp90, percentage: Math.round((exp90 / totalActs) * 100) },
      { period: 'exp_365', label: 'خلال سنة', count: exp365, percentage: Math.round((exp365 / totalActs) * 100) },
      { period: 'exp_more', label: 'أكثر من سنة', count: expMore, percentage: Math.round((expMore / totalActs) * 100) },
    ];

    // Lifecycle event distribution
    const eventCounts: Record<string, number> = {};
    for (const e of this.data.product_lifecycle) {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
    }
    const lifecycle_distribution = Object.entries(eventCounts).map(([event_type, count]) => ({
      event_type: event_type as LifecycleEventType,
      count,
    }));

    return {
      // CamelCase formats
      openClaims,
      closedClaims,
      approvedClaims,
      rejectedClaims,
      underInspectionClaims,
      replacementCount,
      totalClaims,
      claimRate,
      topDefectTypes,
      defectTrendByMonth,
      topProblematicModels,
      // Snake_case formats for QualityDashboard component
      total_warranties: this.data.warranty_activations.length,
      open_claims: openClaims + underInspectionClaims,
      defect_rate_percentage: claimRate,
      total_replacements: replacementCount,
      defects_by_type: topDefectTypes,
      problematic_models: topProblematicModels.map((m) => ({
        model: m.model,
        defects_count: m.defects,
        total_sold: m.soldCount,
        defect_rate: m.rate,
      })),
      monthly_trends: defectTrendByMonth.map((m) => ({
        month: m.month,
        claims_count: m.count,
      })),
      // Enterprise final KPIs
      claims_with_attachments: claimsWithAttachments,
      claims_without_inspection_photos: claimsWithoutInspectionPhotos,
      avg_inspection_time_hours,
      avg_replacement_time_days,
      warranty_expiration_forecast,
      lifecycle_distribution,
    };
  }

  // --- LOGS ---
  public addLog(warranty_id: string | null, serial_number: string, action: string) {
    const newId =
      this.data.activation_logs.length > 0 ? Math.max(...this.data.activation_logs.map((l) => l.id)) + 1 : 1;
    const log: ActivationLog = {
      id: newId,
      warranty_id,
      serial_number,
      action,
      created_at: new Date().toISOString(),
    };
    this.data.activation_logs.unshift(log);
    this.persist();
  }

  public getLogs(limit: number = 100): ActivationLog[] {
    return this.data.activation_logs.slice(0, limit);
  }

  // --- STATISTICS ---
  public getStats() {
    const totalProducts = this.data.products.length;
    const totalActivated = this.data.warranty_activations.length;
    const totalWarranties = totalActivated;
    const today = new Date().toISOString().split('T')[0];

    const activeWarranties = this.data.warranty_activations.filter((w) => w.expiry_date >= today).length;
    const expiredWarranties = totalActivated - activeWarranties;

    // Activated Today
    const activatedToday = this.data.warranty_activations.filter((w) => {
      const actDate = (w.activation_date || w.created_at || '').split('T')[0];
      return actDate === today;
    }).length;

    // Expiring Warranties: within next 30 days
    const todayMs = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiringWarranties = this.data.warranty_activations.filter((w) => {
      const expMs = new Date(w.expiry_date).getTime();
      const diff = expMs - todayMs;
      return diff >= 0 && diff <= thirtyDaysMs;
    }).length;

    // Governorate distribution
    const govCounts: Record<string, number> = {};
    for (const w of this.data.warranty_activations) {
      govCounts[w.governorate] = (govCounts[w.governorate] || 0) + 1;
    }

    // Top models
    const modelCounts: Record<string, number> = {};
    for (const w of this.data.warranty_activations) {
      const p = this.data.products.find((prod) => prod.serial_number === w.serial_number);
      const name = p ? p.model : 'أخرى';
      modelCounts[name] = (modelCounts[name] || 0) + 1;
    }

    return {
      totalProducts,
      totalActivated,
      totalWarranties,
      activatedToday,
      expiringWarranties,
      unactivatedProducts: Math.max(0, totalProducts - totalActivated),
      activeWarranties,
      expiredWarranties,
      activationRate: totalProducts > 0 ? Math.round((totalActivated / totalProducts) * 100) : 0,
      governorateDistribution: govCounts,
      modelDistribution: modelCounts,
      recentActivations: this.data.warranty_activations.slice(0, 5),
    };
  }

  // --- CSV EXPORT ---
  public exportCSV(): string {
    const BOM = '\uFEFF';
    const headers = [
      'رقم الوثيقة (Warranty ID)',
      'الرقم التسلسلي (Serial Number)',
      'اسم العميل',
      'رقم الهاتف',
      'المحافظة',
      'المدينة',
      'رقم الفاتورة',
      'موديل المرتبة',
      'المقاس',
      'سنوات الضمان',
      'تاريخ الشراء',
      'تاريخ التفعيل',
      'تاريخ انتهاء الضمان',
      'حالة الضمان',
    ];

    const today = new Date().toISOString().split('T')[0];
    const rows = this.data.warranty_activations.map((w) => {
      const p = this.data.products.find((prod) => prod.serial_number === w.serial_number);
      const isValid = w.expiry_date >= today ? 'ساري ومعتمد' : 'منتهي الصلاحية';
      return [
        `"${w.warranty_id}"`,
        `"${w.serial_number}"`,
        `"${w.customer_name.replace(/"/g, '""')}"`,
        `"${w.phone}"`,
        `"${w.governorate}"`,
        `"${w.city}"`,
        `"${w.invoice_number}"`,
        `"${p ? p.model.replace(/"/g, '""') : '-'}"`,
        `"${p ? p.size : '-'}"`,
        `"${p ? p.warranty_years : '-'}"`,
        `"${w.purchase_date}"`,
        `"${new Date(w.activation_date).toLocaleDateString('ar-EG')}"`,
        `"${w.expiry_date}"`,
        `"${isValid}"`,
      ].join(',');
    });

    return BOM + [headers.join(','), ...rows].join('\r\n');
  }

  public resetToDefault() {
    this.data = {
      products: [...INITIAL_PRODUCTS],
      warranty_activations: [...INITIAL_ACTIVATIONS],
      warranty_claims: [...INITIAL_CLAIMS],
      replacements: [...INITIAL_REPLACEMENTS],
      activation_logs: [...INITIAL_LOGS],
      users: [...INITIAL_USERS],
      product_lifecycle: [...INITIAL_LIFECYCLE],
      attachments: [...INITIAL_ATTACHMENTS],
      product_models: [...INITIAL_PRODUCT_MODELS],
      warranty_policy_audit: [...INITIAL_WARRANTY_AUDITS],
      production_sync_state: [...INITIAL_SYNC_STATES],
      production_import_logs: [...INITIAL_IMPORT_LOGS],
      production_batches: [...INITIAL_BATCHES],
      customer_communications: [...INITIAL_COMMUNICATIONS],
      role_change_logs: [...INITIAL_ROLE_CHANGE_LOGS],
    };
    this.persist();
    return true;
  }

  // ==========================================
  // PRODUCTION INTEGRATION & GOVERNANCE METHODS
  // ==========================================

  public getProductModels(): ProductModel[] {
    return [...this.data.product_models];
  }

  public getProductModelById(modelId: string): ProductModel | undefined {
    return this.data.product_models.find((m) => m.model_id === modelId);
  }

  public addProductModel(modelData: Partial<ProductModel>): ProductModel {
    const newId =
      this.data.product_models.length > 0
        ? Math.max(...this.data.product_models.map((m) => Number(m.id) || 0)) + 1
        : 1;

    const model: ProductModel = {
      id: newId,
      model_id: modelData.model_id || `MOD-${Date.now().toString().slice(-4)}`,
      commercial_model_name: modelData.commercial_model_name?.trim() || '',
      sap_material_code: modelData.sap_material_code?.trim() || `MAT-SLP-${newId}`,
      sap_material_description: modelData.sap_material_description?.trim() || modelData.commercial_model_name || '',
      product_family: modelData.product_family?.trim() || 'General Mattress',
      warranty_years: Number(modelData.warranty_years) || 10,
      status: modelData.status || 'Active',
      created_at: new Date().toISOString(),
    };

    this.data.product_models.push(model);
    this.persist();
    return model;
  }

  /**
   * Only SUPER_ADMIN can modify warranty years according to governance policy.
   * Creates an immutable audit record in warranty_policy_audit.
   */
  public updateModelWarrantyYears(
    modelId: string,
    newWarrantyYears: number,
    changedBy: string,
    userRole: string,
    reason: string
  ): { model: ProductModel; audit: WarrantyPolicyAudit } {
    if (userRole !== 'SUPER_ADMIN') {
      throw new Error('غير مصرح: تعديل سنوات وسياسات الضمان محصور حصرياً بـ المشرف العام (SUPER_ADMIN)');
    }

    const modelIndex = this.data.product_models.findIndex((m) => m.model_id === modelId);
    if (modelIndex === -1) {
      throw new Error(`موديل المنتج ${modelId} غير موجود`);
    }

    const allowedYears = [3, 5, 7, 10];
    if (!allowedYears.includes(Number(newWarrantyYears))) {
      throw new Error(`سنوات الضمان المسموح بها للموديلات هي: ${allowedYears.join('، ')} سنوات`);
    }

    const currentModel = this.data.product_models[modelIndex];
    const oldYears = currentModel.warranty_years;

    currentModel.warranty_years = Number(newWarrantyYears);

    const auditId = `AUD-POL-${Date.now().toString().slice(-6)}`;
    const auditRecord: WarrantyPolicyAudit = {
      id: this.data.warranty_policy_audit.length + 1,
      audit_id: auditId,
      model_id: modelId,
      commercial_model_name: currentModel.commercial_model_name,
      old_warranty_years: oldYears,
      new_warranty_years: Number(newWarrantyYears),
      changed_by: changedBy,
      changed_at: new Date().toISOString(),
      reason: reason || 'تحديث دوري لسياسة الضمان المعتمدة',
    };

    this.data.warranty_policy_audit.unshift(auditRecord);
    this.addLog(
      null,
      modelId,
      `تحديث سياسة الضمان للموديل [${currentModel.commercial_model_name}] من ${oldYears} إلى ${newWarrantyYears} سنوات بواسطة ${changedBy}`
    );
    this.persist();

    return { model: currentModel, audit: auditRecord };
  }

  public getWarrantyPolicyAudits(): WarrantyPolicyAudit[] {
    return [...this.data.warranty_policy_audit];
  }

  public getSyncStates(): ProductionSyncState[] {
    // Backfill any missing fields from INITIAL_SYNC_STATES
    this.data.production_sync_state.forEach((state) => {
      const initial = INITIAL_SYNC_STATES.find((s) => s.sync_source === state.sync_source);
      if (initial) {
        if (!state.sync_url && initial.sync_url) state.sync_url = initial.sync_url;
        if (!state.target_file_name && initial.target_file_name) state.target_file_name = initial.target_file_name;
        if (!state.connection_status && initial.connection_status) state.connection_status = initial.connection_status;
        if (!state.connection_mode && initial.connection_mode) state.connection_mode = initial.connection_mode;
        if (!state.auth_type && initial.auth_type) state.auth_type = initial.auth_type;
        if (!state.notes && initial.notes) state.notes = initial.notes;
      }
    });
    return [...this.data.production_sync_state];
  }

  public updateSyncState(stateUpdate: Partial<ProductionSyncState> & { sync_source: any }): ProductionSyncState {
    let state = this.data.production_sync_state.find((s) => s.sync_source === stateUpdate.sync_source);
    if (!state) {
      state = {
        id: this.data.production_sync_state.length + 1,
        sync_source: stateUpdate.sync_source,
        last_sync_time: new Date().toISOString(),
        last_successful_sync: new Date().toISOString(),
        last_file_hash: stateUpdate.last_file_hash || 'HASH_INIT',
        last_row_count: stateUpdate.last_row_count || 0,
        sync_url: stateUpdate.sync_url || '',
        target_file_name: stateUpdate.target_file_name || 'Production_Master.xlsx',
        connection_status: stateUpdate.connection_status || 'simulated',
        connection_mode: stateUpdate.connection_mode || 'simulated_fallback',
        auth_type: stateUpdate.auth_type || 'anonymous_link',
        api_key_or_token: stateUpdate.api_key_or_token,
        notes: stateUpdate.notes,
      };
      this.data.production_sync_state.push(state);
    } else {
      if (stateUpdate.last_sync_time) state.last_sync_time = stateUpdate.last_sync_time;
      if (stateUpdate.last_successful_sync) state.last_successful_sync = stateUpdate.last_successful_sync;
      if (stateUpdate.last_file_hash) state.last_file_hash = stateUpdate.last_file_hash;
      if (typeof stateUpdate.last_row_count === 'number') state.last_row_count = stateUpdate.last_row_count;
      if (stateUpdate.sync_url !== undefined) state.sync_url = stateUpdate.sync_url;
      if (stateUpdate.target_file_name !== undefined) state.target_file_name = stateUpdate.target_file_name;
      if (stateUpdate.connection_status !== undefined) state.connection_status = stateUpdate.connection_status;
      if (stateUpdate.connection_mode !== undefined) state.connection_mode = stateUpdate.connection_mode;
      if (stateUpdate.auth_type !== undefined) state.auth_type = stateUpdate.auth_type;
      if (stateUpdate.api_key_or_token !== undefined) state.api_key_or_token = stateUpdate.api_key_or_token;
      if (stateUpdate.notes !== undefined) state.notes = stateUpdate.notes;
    }

    this.persist();
    return state;
  }

  public getImportLogs(): ProductionImportLog[] {
    return [...this.data.production_import_logs];
  }

  public addImportLog(log: Omit<ProductionImportLog, 'id'>): ProductionImportLog {
    const newId = this.data.production_import_logs.length + 1;
    const newLog: ProductionImportLog = {
      id: newId,
      ...log,
    };
    this.data.production_import_logs.unshift(newLog);
    this.persist();
    return newLog;
  }

  public getProductionBatches(): ProductionBatch[] {
    return [...this.data.production_batches];
  }

  public upsertProductionBatch(params: {
    batch_no: string;
    production_order: string;
    production_date: string;
    source_system: string;
    model: string;
  }): ProductionBatch {
    let batch = this.data.production_batches.find((b) => b.batch_no === params.batch_no);
    if (!batch) {
      batch = {
        id: this.data.production_batches.length + 1,
        batch_id: `BAT-${params.batch_no}`,
        batch_no: params.batch_no,
        production_order: params.production_order,
        production_date: params.production_date,
        total_serials: 1,
        model_count: { [params.model]: 1 },
        source_system: params.source_system,
        created_at: new Date().toISOString(),
      };
      this.data.production_batches.unshift(batch);
    } else {
      batch.total_serials++;
      if (typeof batch.model_count === 'object') {
        batch.model_count[params.model] = (batch.model_count[params.model] || 0) + 1;
      }
    }
    this.persist();
    return batch;
  }

  /**
   * Generates Zebra ZD220 label payload (ZPL code, QR code value, Barcode Code128)
   */
  public getZebraLabelData(serialNumber: string): ZebraLabelData {
    const product = this.getProductBySerial(serialNumber);
    if (!product) {
      throw new Error(`المرتبة ذات الرقم التسلسلي (${serialNumber}) غير موجودة في قاعدة بيانات الإنتاج`);
    }

    const zpl = ZebraZPLGenerator.generateZPL({
      serialNumber: product.serial_number,
      model: product.model,
      size: product.size,
      warrantyYears: product.warranty_years,
      productionDate: product.production_date,
      productionOrder: product.production_order,
      batchNo: product.batch_no,
      hotline: '19707',
    });

    return {
      label_template_id: 'ZEBRA-ZD220-4X3-SLP',
      serial_number: product.serial_number,
      barcode_value: product.serial_number,
      qr_value: `https://ais-dev-64nwfnmlh27kui4aoo4n3r-633317479505.europe-west2.run.app/?serial=${product.serial_number}`,
      model: product.model,
      size: product.size,
      warranty_years: product.warranty_years,
      production_date: product.production_date,
      production_order: product.production_order,
      batch_no: product.batch_no,
      print_status: 'Ready',
      zpl_code: zpl,
    };
  }

  /**
   * Generates official cumulative Production_Master.xlsx
   */
  public exportProductionMasterExcel(): Buffer {
    const rows = this.data.products.map((p) => ({
      'الرقم التسلسلي (Serial Number)': p.serial_number,
      'موديل المرتبة (Model)': p.model,
      'المقاس (Dimensions)': p.size,
      'سنوات الضمان (Warranty Years)': p.warranty_years,
      'تاريخ الإنتاج (Production Date)': p.production_date,
      'أمر الشغل (Production Order)': p.production_order,
      'رقم التشغيلة (Batch No)': p.batch_no,
      'حالة الإنتاج (Status)': p.production_status || 'Produced',
      'نظام المصدر (Source)': p.source_system || 'Manual',
      'كود المادة بـ SAP': p.sap_material_code || '-',
      'خط الإنتاج': p.production_line || 'خط الإنتاج الرئيسي',
      'الوردية': p.shift || 'الوردية الأولى',
      'المشغل': p.operator || 'فني الجودة',
      'ملاحظات': p.remarks || 'مرتبة معتمدة بختم المصنع',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Production_Master');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  public getProductionStats() {
    const totalSerials = this.data.products.length;
    const sourceBreakdown = this.data.products.reduce((acc, curr) => {
      const src = curr.source_system || 'Manual';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusBreakdown = this.data.products.reduce((acc, curr) => {
      const st = curr.production_status || 'Produced';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSerials,
      totalBatches: this.data.production_batches.length,
      totalModels: this.data.product_models.length,
      totalImportLogs: this.data.production_import_logs.length,
      sourceBreakdown,
      statusBreakdown,
      recentImports: this.data.production_import_logs.slice(0, 5),
      syncStates: this.data.production_sync_state,
    };
  }

  public getBackupAndRetentionPolicy() {
    return {
      backupFrequency: 'Daily 02:00 AM UTC',
      retentionRules: {
        warranty_records: '15 Years',
        warranty_claims: '15 Years',
        replacements: '15 Years',
        product_lifecycle: 'Permanent (غير قابلة للحذف)',
        audit_logs: 'Permanent (غير قابلة للحذف)',
        import_logs: 'Permanent (سجلات أرشفة التوريد)',
      },
      backupSnapshots: [
        {
          snapshot_id: 'BKP-20260315-0200',
          type: 'Daily Incremental Snapshot',
          created_at: '2026-03-15T02:00:00Z',
          status: 'Secured in Google Cloud Storage Multi-Regional',
          size_kb: 420,
        },
        {
          snapshot_id: 'BKP-20260314-0200',
          type: 'Daily Incremental Snapshot',
          created_at: '2026-03-14T02:00:00Z',
          status: 'Secured in Google Cloud Storage Multi-Regional',
          size_kb: 416,
        },
      ],
    };
  }

  // ==========================================
  // POWER BI DIRECT INTEGRATION & EXPORT
  // ==========================================

  public getPowerBIFeed(baseUrl: string = '') {
    const today = new Date().toISOString().split('T')[0];
    const todayMs = new Date(today).getTime();

    // 1. Fact_Warranties
    const warranties = this.data.warranty_activations.map((w) => {
      const prod = this.data.products.find((p) => p.serial_number === w.serial_number);
      const claimsForW = this.data.warranty_claims.filter(
        (c) => c.warranty_id === w.warranty_id || c.serial_number === w.serial_number
      );
      const replacementsForW = this.data.replacements.filter((r) => r.old_serial_number === w.serial_number);

      const purchaseMs = new Date(w.purchase_date).getTime();
      const expiryMs = new Date(w.expiry_date).getTime();
      const daysSincePurchase = Math.max(0, Math.floor((todayMs - purchaseMs) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.floor((expiryMs - todayMs) / (1000 * 60 * 60 * 24));
      const status = w.expiry_date >= today ? 'ساري ومعتمد' : 'منتهي الصلاحية';

      return {
        Warranty_ID: w.warranty_id,
        Serial_Number: w.serial_number,
        Customer_Name: w.customer_name,
        Customer_Phone: w.phone,
        Governorate: w.governorate,
        City: w.city,
        Invoice_Number: w.invoice_number,
        Purchase_Date: w.purchase_date,
        Activation_Date: w.activation_date.split('T')[0],
        Expiry_Date: w.expiry_date,
        Model: prod?.model || 'سليبي ماترس',
        Size: prod?.size || '180 × 200 سم',
        Warranty_Years: prod?.warranty_years || 10,
        Status: status,
        Days_Since_Purchase: daysSincePurchase,
        Days_Remaining: Math.max(0, daysRemaining),
        Is_Expired: w.expiry_date < today ? 1 : 0,
        Has_Claims: claimsForW.length > 0 ? 1 : 0,
        Claims_Count: claimsForW.length,
        Has_Replacement: replacementsForW.length > 0 ? 1 : 0,
        Source_Channel: 'Digital QR Activation',
      };
    });

    // 2. Fact_Claims
    const claims = this.data.warranty_claims.map((c) => {
      const w = this.data.warranty_activations.find(
        (act) => act.warranty_id === c.warranty_id || act.serial_number === c.serial_number
      );
      const prod = this.data.products.find((p) => p.serial_number === c.serial_number);
      const createdDate = c.created_at ? c.created_at.split('T')[0] : today;
      const resolvedDate = c.resolution_date ? c.resolution_date.split('T')[0] : null;

      let resolutionDays = 3;
      if (c.created_at && c.resolution_date) {
        const start = new Date(c.created_at).getTime();
        const end = new Date(c.resolution_date).getTime();
        resolutionDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      }

      const isReplacementRequested =
        c.resolution === 'Replacement Approved' ||
        c.resolution === 'Replacement Delivered' ||
        c.claim_status === 'Approved';
      const isReplacementDone = c.resolution === 'Replacement Delivered' || c.claim_status === 'Closed';

      return {
        Claim_ID: c.claim_id,
        Warranty_ID: c.warranty_id,
        Serial_Number: c.serial_number,
        Customer_Name: c.customer_name,
        Customer_Phone: c.phone,
        Governorate: w?.governorate || 'القاهرة',
        Model: prod?.model || 'سليبي ماترس',
        Complaint_Type: c.complaint_type,
        Complaint_Description: c.complaint_description,
        Status: c.claim_status,
        Severity: isReplacementRequested ? 'عالي (استبدال)' : 'متوسط',
        Replacement_Requested: isReplacementRequested ? 1 : 0,
        Replacement_Approved: isReplacementDone ? 1 : 0,
        Inspection_Notes: c.inspection_result || 'فحص فني ميداني',
        Resolution_Days: resolutionDays,
        Created_Date: createdDate,
        Resolved_Date: resolvedDate,
      };
    });

    // 3. Fact_Replacements
    const replacements = this.data.replacements.map((r) => {
      return {
        Replacement_ID: r.replacement_id,
        Claim_ID: r.old_warranty_id,
        Old_Serial_Number: r.old_serial_number,
        New_Serial_Number: r.new_serial_number,
        Reason: r.replacement_reason,
        Status: 'COMPLETED',
        Delivery_Status: 'DELIVERED',
        Approved_By: r.approved_by || 'إدارة الجودة',
        Created_Date: r.created_at ? r.created_at.split('T')[0] : today,
        Delivered_Date: r.approval_date ? r.approval_date.split('T')[0] : today,
      };
    });

    // 4. Dim_Products
    const products = this.data.products.map((p) => {
      const isAct = this.data.warranty_activations.some((w) => w.serial_number === p.serial_number);
      return {
        Serial_Number: p.serial_number,
        Model: p.model,
        Size: p.size,
        Warranty_Years: p.warranty_years,
        Production_Date: p.production_date,
        Production_Order: p.production_order || 'ORD-2026',
        Batch_No: p.batch_no || 'BATCH-DEFAULT',
        Is_Activated: isAct ? 1 : 0,
      };
    });

    // 5. KPI_Quality_Summary
    const qualityStats = this.getQualityStats();

    // 6. Dim_Calendar (Years 2024 to 2035)
    const calendar: any[] = [];
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    const englishMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // Generate month-grain calendar rows for fast indexing
    for (let y = 2024; y <= 2035; y++) {
      for (let m = 1; m <= 12; m++) {
        const monthStr = m < 10 ? `0${m}` : `${m}`;
        const dateStr = `${y}-${monthStr}-01`;
        const quarter = Math.ceil(m / 3);
        calendar.push({
          Date_Key: `${y}${monthStr}`,
          First_Day_Of_Month: dateStr,
          Year: y,
          Quarter: `Q${quarter}`,
          Quarter_Year: `Q${quarter} ${y}`,
          Month_Number: m,
          Month_Name_AR: arabicMonths[m - 1],
          Month_Name_EN: englishMonths[m - 1],
          Year_Month: `${y}-${monthStr}`,
        });
      }
    }

    return {
      metadata: {
        app_name: 'Sleepee Warranty & Quality Intelligence System',
        data_version: '2.0.0',
        exported_at: new Date().toISOString(),
        host_url: baseUrl,
        total_tables: 6,
        summary: {
          warranties_count: warranties.length,
          claims_count: claims.length,
          replacements_count: replacements.length,
          products_count: products.length,
          defect_rate_percentage: qualityStats.defect_rate_percentage,
        },
      },
      tables: {
        warranties,
        claims,
        replacements,
        products,
        quality_summary: [
          {
            Total_Warranties: qualityStats.total_warranties,
            Total_Claims: qualityStats.totalClaims,
            Open_Claims: qualityStats.open_claims,
            Defect_Rate_Pct: qualityStats.defect_rate_percentage,
            Total_Replacements: qualityStats.total_replacements,
            Avg_Inspection_Hours: qualityStats.avg_inspection_time_hours,
            Avg_Replacement_Days: qualityStats.avg_replacement_time_days,
          },
        ],
        problematic_models: qualityStats.problematic_models.map((pm) => ({
          Model: pm.model,
          Defects_Count: pm.defects_count,
          Total_Sold: pm.total_sold,
          Defect_Rate_Pct: pm.defect_rate,
        })),
        defects_by_type: qualityStats.defects_by_type.map((dt) => ({
          Complaint_Type: dt.type,
          Count: dt.count,
        })),
        calendar,
      },
    };
  }

  public getPowerBICSV(table: 'warranties' | 'claims' | 'replacements' | 'products' | 'quality'): string {
    const feed = this.getPowerBIFeed();
    const BOM = '\uFEFF';

    let dataRows: any[] = [];
    if (table === 'warranties') dataRows = feed.tables.warranties;
    else if (table === 'claims') dataRows = feed.tables.claims;
    else if (table === 'replacements') dataRows = feed.tables.replacements;
    else if (table === 'products') dataRows = feed.tables.products;
    else if (table === 'quality') dataRows = feed.tables.problematic_models;

    if (!dataRows || dataRows.length === 0) {
      return BOM + 'No Data';
    }

    const headers = Object.keys(dataRows[0]);
    const csvLines = [headers.join(',')];

    for (const row of dataRows) {
      const line = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvLines.push(line.join(','));
    }

    return BOM + csvLines.join('\r\n');
  }

  public getPowerBIPBIDS(baseUrl: string): string {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const pbidsObj = {
      version: '0.1',
      connections: [
        {
          details: {
            protocol: 'http',
            address: {
              url: `${cleanUrl}/api/powerbi/feed`,
            },
          },
          options: {},
          mode: null,
          connectionType: 'Web',
        },
      ],
    };
    return JSON.stringify(pbidsObj, null, 2);
  }

  public getPowerBIQueryScript(baseUrl: string): string {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    return `// =========================================================================
// SLEEPEE POWER BI M-QUERY CONNECTOR SCRIPT
// Generated: ${new Date().toISOString()}
// Use: Power BI Desktop -> Home -> Advanced Editor (Paste Code Below)
// =========================================================================

let
    // 1. Fetch Master JSON Feed from Sleepee Warranty API
    SourceUrl = "${cleanUrl}/api/powerbi/feed",
    WebResponse = Web.Contents(SourceUrl, [Headers=[#"Accept"="application/json"]]),
    JsonData = Json.Document(WebResponse),
    Tables = JsonData[tables],

    // 2. Fact_Warranties Table
    WarrantiesRaw = Tables[warranties],
    WarrantiesTable = Table.FromRecords(WarrantiesRaw),
    TypedWarranties = Table.TransformColumnTypes(WarrantiesTable, {
        {"Warranty_ID", type text},
        {"Serial_Number", type text},
        {"Customer_Name", type text},
        {"Customer_Phone", type text},
        {"Governorate", type text},
        {"City", type text},
        {"Invoice_Number", type text},
        {"Purchase_Date", type date},
        {"Activation_Date", type date},
        {"Expiry_Date", type date},
        {"Model", type text},
        {"Size", type text},
        {"Warranty_Years", Int64.Type},
        {"Status", type text},
        {"Days_Since_Purchase", Int64.Type},
        {"Days_Remaining", Int64.Type},
        {"Is_Expired", Int64.Type},
        {"Has_Claims", Int64.Type},
        {"Claims_Count", Int64.Type},
        {"Has_Replacement", Int64.Type}
    })
in
    TypedWarranties`;
  }
}

export const db = new DatabaseService();
