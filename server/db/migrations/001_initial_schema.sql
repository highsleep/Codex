-- ==========================================================
-- Sleepee Mattress Warranty Management System
-- PostgreSQL Initial Schema Migration (001_initial_schema.sql)
-- Supabase / Cloud SQL PostgreSQL Compatibility
-- Company: Sleepee (سليبي) | Support Hotline: 19707
-- ==========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 1. Custom PostgreSQL Enum Types
-- ==========================================================

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'SUPER_ADMIN',
        'QUALITY_MANAGER',
        'PLANT_MANAGER',
        'PRODUCTION',
        'CUSTOMER_SERVICE',
        'VIEWER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM (
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE model_status_enum AS ENUM (
        'Active',
        'Inactive'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE production_status_enum AS ENUM (
        'Produced',
        'Quality Approved',
        'Packed',
        'Shipped',
        'Delivered'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE sync_source_enum AS ENUM (
        'SharePoint',
        'OneDrive',
        'Excel',
        'CSV',
        'SAP',
        'Manual'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE complaint_type_enum AS ENUM (
        'Spring Collapse',
        'Foam Collapse',
        'Fabric Defect',
        'Noise',
        'Manufacturing Defect',
        'Other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE claim_status_enum AS ENUM (
        'Open',
        'Under Inspection',
        'Approved',
        'Rejected',
        'Closed'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE lifecycle_event_enum AS ENUM (
        'Produced',
        'Quality Approved',
        'Packed',
        'Shipped',
        'Delivered',
        'Sold',
        'Warranty Activated',
        'Claim Opened',
        'Inspection Scheduled',
        'Inspection Completed',
        'Repair Approved',
        'Repair Completed',
        'Replacement Approved',
        'Replacement Completed',
        'Warranty Expired',
        'Archived'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE attachment_entity_enum AS ENUM (
        'Product',
        'Warranty',
        'Claim',
        'Replacement',
        'ServiceVisit'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE communication_type_enum AS ENUM (
        'مكالمة هاتفية',
        'واتساب',
        'بريد إلكتروني',
        'زيارة',
        'ملاحظة داخلية'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE import_status_enum AS ENUM (
        'SUCCESS',
        'PARTIAL',
        'FAILED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================================
-- 2. Trigger Function for Automatic updated_at Timestamps
-- ==========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 3. Core Relational Tables
-- ==========================================================

-- Table: schema_migrations (Tracks executed migrations)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: users (System administrative and operational accounts)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'VIEWER',
    department VARCHAR(100) NOT NULL DEFAULT 'Quality',
    avatar TEXT,
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: role_change_logs (Security audit trail for RBAC privilege escalation)
CREATE TABLE IF NOT EXISTS role_change_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    old_role user_role_enum NOT NULL,
    new_role user_role_enum NOT NULL,
    modified_by VARCHAR(255) NOT NULL,
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: product_models (Commercial mattress catalog & default policy warranty years)
CREATE TABLE IF NOT EXISTS product_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(100) UNIQUE NOT NULL,
    commercial_model_name VARCHAR(255) NOT NULL,
    sap_material_code VARCHAR(100) NOT NULL,
    sap_material_description TEXT,
    product_family VARCHAR(100) NOT NULL,
    warranty_years INTEGER NOT NULL DEFAULT 10,
    status model_status_enum NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: warranty_policy_audit (Auditing warranty term changes on model catalogs)
CREATE TABLE IF NOT EXISTS warranty_policy_audit (
    id SERIAL PRIMARY KEY,
    audit_id VARCHAR(100) UNIQUE NOT NULL,
    model_id VARCHAR(100) NOT NULL REFERENCES product_models(model_id) ON DELETE CASCADE,
    commercial_model_name VARCHAR(255),
    old_warranty_years INTEGER NOT NULL,
    new_warranty_years INTEGER NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: products (Manufactured mattress units with unique serial identifiers)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(200) NOT NULL,
    size VARCHAR(100) NOT NULL,
    warranty_years INTEGER NOT NULL DEFAULT 10,
    production_date DATE NOT NULL,
    status VARCHAR(100) DEFAULT 'جاهز للتسليم',
    production_order VARCHAR(100) NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    image_url TEXT,
    production_status production_status_enum DEFAULT 'Produced',
    source_system sync_source_enum DEFAULT 'Excel',
    sap_production_order VARCHAR(100),
    sap_batch_number VARCHAR(100),
    sap_material_code VARCHAR(100),
    sap_last_sync TIMESTAMP WITH TIME ZONE,
    production_line VARCHAR(100),
    shift VARCHAR(50),
    operator VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: production_batches (Aggregated production lot statistics)
CREATE TABLE IF NOT EXISTS production_batches (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    production_order VARCHAR(100) NOT NULL,
    production_date DATE NOT NULL,
    total_serials INTEGER NOT NULL DEFAULT 0,
    model_count JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_system VARCHAR(100) NOT NULL DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: warranty_activations (Activated warranties for consumer mattresses)
CREATE TABLE IF NOT EXISTS warranty_activations (
    id SERIAL PRIMARY KEY,
    warranty_id VARCHAR(100) UNIQUE NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL REFERENCES products(serial_number) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    governorate VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    activation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE NOT NULL,
    status VARCHAR(100) DEFAULT 'ساري',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: warranty_claims (Warranty claims, inspection lifecycle & tasks)
CREATE TABLE IF NOT EXISTS warranty_claims (
    id SERIAL PRIMARY KEY,
    claim_id VARCHAR(100) UNIQUE NOT NULL,
    warranty_id VARCHAR(100) NOT NULL REFERENCES warranty_activations(warranty_id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL REFERENCES products(serial_number) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    complaint_type complaint_type_enum NOT NULL,
    complaint_description TEXT NOT NULL,
    claim_status claim_status_enum NOT NULL DEFAULT 'Open',
    assigned_to VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    inspection_date TIMESTAMP WITH TIME ZONE,
    inspection_result TEXT,
    resolution TEXT,
    resolution_date TIMESTAMP WITH TIME ZONE,
    images JSONB DEFAULT '[]'::jsonb,
    claim_date DATE DEFAULT CURRENT_DATE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    last_action_date TIMESTAMP WITH TIME ZONE,
    target_resolution_days INTEGER DEFAULT 7,
    pending_tasks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: replacements (Approved mattress replacement tracking)
CREATE TABLE IF NOT EXISTS replacements (
    id SERIAL PRIMARY KEY,
    replacement_id VARCHAR(100) UNIQUE NOT NULL,
    old_serial_number VARCHAR(100) NOT NULL REFERENCES products(serial_number) ON DELETE RESTRICT,
    new_serial_number VARCHAR(100) NOT NULL REFERENCES products(serial_number) ON DELETE RESTRICT,
    old_warranty_id VARCHAR(100) NOT NULL REFERENCES warranty_activations(warranty_id) ON DELETE RESTRICT,
    new_warranty_id VARCHAR(100),
    replacement_reason TEXT NOT NULL,
    approval_date TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: activation_logs (Audit logs for customer verification & activation attempts)
CREATE TABLE IF NOT EXISTS activation_logs (
    id SERIAL PRIMARY KEY,
    warranty_id VARCHAR(100),
    serial_number VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: product_lifecycle (Immutable event stream for mattress lifecycle)
CREATE TABLE IF NOT EXISTS product_lifecycle (
    id SERIAL PRIMARY KEY,
    lifecycle_id VARCHAR(100) UNIQUE NOT NULL,
    serial_number VARCHAR(100) NOT NULL REFERENCES products(serial_number) ON DELETE CASCADE,
    event_type lifecycle_event_enum NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    notes TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: attachments (Metadata for warranty, inspection, and product files)
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    attachment_id VARCHAR(100) UNIQUE NOT NULL,
    entity_type attachment_entity_enum NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    storage_path TEXT NOT NULL,
    download_url TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: customer_communications (Omni-channel customer touchpoint history)
CREATE TABLE IF NOT EXISTS customer_communications (
    id VARCHAR(100) PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL,
    warranty_id VARCHAR(100),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    communication_type communication_type_enum NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    formatted_date_time VARCHAR(100),
    responsible_user VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    related_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: production_sync_state (Synchronization status for external ERP/SharePoint)
CREATE TABLE IF NOT EXISTS production_sync_state (
    id SERIAL PRIMARY KEY,
    sync_source sync_source_enum UNIQUE NOT NULL,
    last_sync_time TIMESTAMP WITH TIME ZONE,
    last_successful_sync TIMESTAMP WITH TIME ZONE,
    last_file_hash VARCHAR(255),
    last_row_count INTEGER DEFAULT 0,
    sync_url TEXT,
    target_file_name VARCHAR(255),
    connection_status VARCHAR(50) DEFAULT 'not_configured',
    connection_mode VARCHAR(50) DEFAULT 'simulated_fallback',
    auth_type VARCHAR(50),
    api_key_or_token TEXT,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: production_import_logs (Audit log for batch production data imports)
CREATE TABLE IF NOT EXISTS production_import_logs (
    id SERIAL PRIMARY KEY,
    import_id VARCHAR(100) UNIQUE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    source_type sync_source_enum NOT NULL,
    import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    imported_records INTEGER NOT NULL DEFAULT 0,
    skipped_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    execution_time INTEGER NOT NULL DEFAULT 0,
    performed_by VARCHAR(255) NOT NULL,
    status import_status_enum NOT NULL,
    error_log JSONB DEFAULT '[]'::jsonb,
    batch_no VARCHAR(100),
    production_order VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 4. Triggers for Automatic Timestamps
-- ==========================================================

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_product_models_updated_at ON product_models;
CREATE TRIGGER trg_product_models_updated_at
    BEFORE UPDATE ON product_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_production_batches_updated_at ON production_batches;
CREATE TRIGGER trg_production_batches_updated_at
    BEFORE UPDATE ON production_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_warranty_activations_updated_at ON warranty_activations;
CREATE TRIGGER trg_warranty_activations_updated_at
    BEFORE UPDATE ON warranty_activations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_warranty_claims_updated_at ON warranty_claims;
CREATE TRIGGER trg_warranty_claims_updated_at
    BEFORE UPDATE ON warranty_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_production_sync_state_updated_at ON production_sync_state;
CREATE TRIGGER trg_production_sync_state_updated_at
    BEFORE UPDATE ON production_sync_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- 5. Performance Indexes
-- ==========================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- role_change_logs
CREATE INDEX IF NOT EXISTS idx_role_logs_user_id ON role_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_role_logs_timestamp ON role_change_logs(timestamp);

-- product_models
CREATE INDEX IF NOT EXISTS idx_models_model_id ON product_models(model_id);
CREATE INDEX IF NOT EXISTS idx_models_sap_code ON product_models(sap_material_code);

-- warranty_policy_audit
CREATE INDEX IF NOT EXISTS idx_policy_audit_model_id ON warranty_policy_audit(model_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_serial ON products(serial_number);
CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);
CREATE INDEX IF NOT EXISTS idx_products_batch ON products(batch_no);
CREATE INDEX IF NOT EXISTS idx_products_prod_order ON products(production_order);
CREATE INDEX IF NOT EXISTS idx_products_prod_date ON products(production_date);

-- production_batches
CREATE INDEX IF NOT EXISTS idx_batches_batch_no ON production_batches(batch_no);
CREATE INDEX IF NOT EXISTS idx_batches_prod_order ON production_batches(production_order);

-- warranty_activations
CREATE INDEX IF NOT EXISTS idx_warranty_id ON warranty_activations(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_serial ON warranty_activations(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranty_phone ON warranty_activations(phone);
CREATE INDEX IF NOT EXISTS idx_warranty_governorate ON warranty_activations(governorate);
CREATE INDEX IF NOT EXISTS idx_warranty_invoice ON warranty_activations(invoice_number);

-- warranty_claims
CREATE INDEX IF NOT EXISTS idx_claims_claim_id ON warranty_claims(claim_id);
CREATE INDEX IF NOT EXISTS idx_claims_warranty_id ON warranty_claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_claims_serial ON warranty_claims(serial_number);
CREATE INDEX IF NOT EXISTS idx_claims_status ON warranty_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_claims_assigned_to ON warranty_claims(assigned_to);
CREATE INDEX IF NOT EXISTS idx_claims_claim_date ON warranty_claims(claim_date);

-- replacements
CREATE INDEX IF NOT EXISTS idx_replacements_old_serial ON replacements(old_serial_number);
CREATE INDEX IF NOT EXISTS idx_replacements_new_serial ON replacements(new_serial_number);
CREATE INDEX IF NOT EXISTS idx_replacements_old_warranty ON replacements(old_warranty_id);

-- activation_logs
CREATE INDEX IF NOT EXISTS idx_activation_logs_serial ON activation_logs(serial_number);
CREATE INDEX IF NOT EXISTS idx_activation_logs_warranty ON activation_logs(warranty_id);

-- product_lifecycle
CREATE INDEX IF NOT EXISTS idx_lifecycle_serial ON product_lifecycle(serial_number);
CREATE INDEX IF NOT EXISTS idx_lifecycle_event_type ON product_lifecycle(event_type);
CREATE INDEX IF NOT EXISTS idx_lifecycle_event_date ON product_lifecycle(event_date);

-- attachments
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_attachment_id ON attachments(attachment_id);

-- customer_communications
CREATE INDEX IF NOT EXISTS idx_communications_serial ON customer_communications(serial_number);
CREATE INDEX IF NOT EXISTS idx_communications_phone ON customer_communications(customer_phone);

-- production_import_logs
CREATE INDEX IF NOT EXISTS idx_import_logs_date ON production_import_logs(import_date);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON production_import_logs(status);
