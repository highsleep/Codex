-- ==========================================================
-- Sleepee Mattress Warranty Management System
-- Google Cloud SQL PostgreSQL Database Schema
-- Company: Sleepee (سليبي) | Support Hotline: 19707
-- ==========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products Table (قائمة المنتجات والقطع المصنعة)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(200) NOT NULL,
    size VARCHAR(100) NOT NULL,
    warranty_years INTEGER NOT NULL DEFAULT 10,
    production_date DATE NOT NULL,
    production_order VARCHAR(100) NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_serial ON products(serial_number);
CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);
CREATE INDEX IF NOT EXISTS idx_products_batch ON products(batch_no);

-- 2. Warranty Activations Table (عمليات تفعيل الضمان للعملاء)
-- Rule: One warranty activation per serial number (UNIQUE constraint on serial_number)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warranty_id ON warranty_activations(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_serial ON warranty_activations(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranty_phone ON warranty_activations(phone);
CREATE INDEX IF NOT EXISTS idx_warranty_governorate ON warranty_activations(governorate);

-- 3. Activation Logs Table (سجل حركات وتتبع تفعيل الضمان والتحقق)
CREATE TABLE IF NOT EXISTS activation_logs (
    id SERIAL PRIMARY KEY,
    warranty_id VARCHAR(100),
    serial_number VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_serial ON activation_logs(serial_number);
CREATE INDEX IF NOT EXISTS idx_logs_warranty_id ON activation_logs(warranty_id);

-- 4. Initial Seed Data (نماذج تجريبية للمراتب الفاخرة)
INSERT INTO products (serial_number, model, size, warranty_years, production_date, production_order, batch_no, image_url)
VALUES 
('SLP-2026-9081', 'سليبي رويال بوكيت سبرينج (Royal Pocket)', '180 × 200 سم', 10, '2026-01-15', 'ORD-2026-041', 'BATCH-88A', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'),
('SLP-2026-9082', 'سليبي سوبر ميموري فوم (Super Memory Foam)', '160 × 200 سم', 10, '2026-02-01', 'ORD-2026-052', 'BATCH-88A', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'),
('SLP-2026-9083', 'سليبي أورثوبيديك الطبية (Orthopedic Comfort)', '120 × 200 سم', 5, '2026-02-10', 'ORD-2026-063', 'BATCH-89B', 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=800&q=80'),
('SLP-2026-9084', 'سليبي كلاود بيلو توب الفاخرة (Cloud Pillow Top)', '200 × 200 سم', 10, '2026-02-18', 'ORD-2026-077', 'BATCH-90A', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'),
('SLP-2026-9085', 'سليبي هايبريد لاتكس الطبيعي (Hybrid Latex)', '160 × 200 سم', 10, '2026-03-01', 'ORD-2026-091', 'BATCH-91C', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80')
ON CONFLICT (serial_number) DO NOTHING;
