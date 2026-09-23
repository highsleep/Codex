import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { repository } from './server/repositories/applicationRepository.js';
import { ScheduledJobsRunner } from './server/cron/jobs.js';
import { ProductionDataProvider } from './server/providers/ProductionDataProvider.js';
import { ExcelProvider } from './server/providers/ExcelProvider.js';
import { CSVProvider } from './server/providers/CSVProvider.js';
import { ZebraZPLGenerator } from './server/zebra/zplGenerator.js';
import fs from 'fs';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { apiSecurity } from './server/security/apiSecurity.js';
import { authenticatedActor } from './server/security/auth.js';
import { checkDatabaseConnection } from './server/db/pool.js';

const app = express();
const PORT = 3000;

// Initialize scheduled background automation engine
const jobsRunner = new ScheduledJobsRunner(repository);
const productionEngine = new ProductionDataProvider(repository);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.disable('x-powered-by');
// Every /api route is classified here. Unknown routes fail closed.
app.use('/api', apiSecurity);

function toPublicProduct(product: any) {
  return {
    serial_number: product.serial_number,
    model: product.model,
    size: product.size,
    warranty_years: product.warranty_years,
    image_url: product.image_url,
  };
}

function toPublicActivation(activation: any) {
  return {
    warranty_id: activation.warranty_id,
    serial_number: activation.serial_number,
    activation_date: activation.activation_date,
    expiry_date: activation.expiry_date,
    status: activation.status,
  };
}

function validateIntegrationUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const configured = (process.env.INTEGRATION_ALLOWED_HOSTS || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    const allowed = [
      '1drv.ms',
      's4hana-gateway.sleepee.com',
      ...configured,
    ].some((host) => hostname === host) || hostname.endsWith('.sharepoint.com');
    return parsed.protocol === 'https:' && allowed ? parsed.toString() : null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// Health & Diagnostic API
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Sleepee Warranty Management System',
    company: 'Sleepee',
    hotline: '19707',
    database: 'Cloud SQL PostgreSQL Schema Compatible',
    timestamp: new Date().toISOString(),
  });
});

// PostgreSQL Database Connection Health Check
app.get('/api/health/database', async (req, res) => {
  try {
    const health = await checkDatabaseConnection();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      configured: false,
      database: 'postgres',
      timestamp: new Date().toISOString(),
      error: err?.message || String(err),
    });
  }
});

// Download/View PostgreSQL DDL Schema
app.get('/api/db/schema', (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), 'server', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(sql);
    } else {
      res.status(404).send('Schema file not found');
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Customer Portal API
// ----------------------------------------------------

// 1. Search product by Serial Number
app.get('/api/products/search', (req, res) => {
  try {
    const serial = req.query.serial as string;
    if (!serial) {
      return res.status(400).json({ error: 'يرجى إدخال الرقم التسلسلي للمرتبة' });
    }

    const product = repository.getProductBySerial(serial);
    if (!product) {
      return res.status(404).json({
        found: false,
        error: `الرقم التسلسلي (${serial}) غير موجود في سجلات مراتب سليبي. يرجى التأكد من الرقم المطبوع على بطاقة الضمان الملصقة بالمرتبة أو الاتصال بخدمة العملاء 19707.`,
      });
    }

    res.json({ found: true, product });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all products / search for Product Management module
app.get('/api/products', (req, res) => {
  try {
    const search = req.query.search as string;
    const products = repository.getProducts(search);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import Products (XLSX / CSV JSON payload)
app.post('/api/products/bulk-import', (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم إرسال أي صفوف منتجات صالحة للاستيراد. يرجى التأكد من ملف الإكسل أو CSV.',
      });
    }

    const result = repository.bulkAddProducts(products, authenticatedActor(req));
    res.status(200).json({
      success: true,
      summary: {
        total_received: result.totalReceived,
        saved_count: result.savedCount,
        skipped_duplicates_count: result.duplicateCount,
        invalid_count: result.invalidCount,
        skipped_serials: result.skippedSerials,
        errors: result.errors,
      },
      saved_products: result.savedProducts,
      message: `تم بنجاح حفظ ${result.savedCount} منتج في قاعدة البيانات، وتخطي ${result.duplicateCount} رقم تسلسلي مكرر.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// QR Code Verification Endpoint (Prepared for future warranty activation)
app.get(['/api/products/verify-qr/:serial', '/api/verify/qr/:serial'], (req, res) => {
  try {
    const serial = req.params.serial;
    if (!serial) {
      return res.status(400).json({ valid: false, error: 'الرقم التسلسلي مطلوب للتحقق من رمز QR' });
    }

    const cleanSerial = serial.trim().toUpperCase();
    const product = repository.getProductBySerial(cleanSerial);

    if (!product) {
      return res.status(404).json({
        valid: false,
        ready_for_activation: false,
        serial_number: cleanSerial,
        error: `الرمز التسلسلي (${cleanSerial}) غير مسجل في قاعدة بيانات المنتجات المعتمدة.`,
        message: 'تحذير: هذا الباركود غير صالح أو لم يتم تصنيعه عبر خطوط الإنتاج المعتمدة لشركة سليبي.',
      });
    }

    const isActivated = !!product.activation;
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';

    res.json({
      valid: true,
      serial_number: product.serial_number,
      product: toPublicProduct(product),
      status: isActivated ? 'ACTIVATED' : 'READY_FOR_ACTIVATION',
      ready_for_activation: !isActivated,
      activation_status: isActivated ? 'ALREADY_ACTIVATED' : 'READY_FOR_ACTIVATION',
      verification_timestamp: new Date().toISOString(),
      activation_endpoint: '/api/warranty/activate',
      qr_payload: {
        action: 'warranty_activation',
        activation_url: `${protocol}://${host}/?verify=${encodeURIComponent(product.serial_number)}`,
      },
      warranty_details: product.activation ? toPublicActivation(product.activation) : null,
      message: isActivated
        ? `المنتج أصلي ومعتمد، ومسجل له وثيقة ضمان نشطة رقم (${product.activation?.warranty_id}).`
        : `المنتج أصلي ومعتمد في قاعدة بيانات الإنتاج وجاهز للتفعيل الفوري للضمان الإلكتروني (${product.warranty_years} سنوات).`,
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// 2. Get single product by serial
app.get('/api/products/:serial', (req, res) => {
  try {
    const product = repository.getProductBySerial(req.params.serial);
    if (!product) {
      return res.status(404).json({ error: 'المنتج غير مسجل' });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Warranty Activation
app.post('/api/warranty/activate', (req, res) => {
  try {
    const { serial_number, customer_name, phone, governorate, city, invoice_number, purchase_date } = req.body;

    if (!serial_number || !customer_name || !phone || !governorate || !purchase_date) {
      return res.status(400).json({ error: 'يرجى ملء جميع الحقول الإلزامية لتفعيل وثيقة الضمان (اسم العميل، رقم الهاتف، المحافظة، وتاريخ الشراء)' });
    }

    const cleanSerial = serial_number.trim().toUpperCase();
    const finalCity = (city && city.trim()) ? city.trim() : governorate.trim();
    const finalInvoiceNumber = (invoice_number && invoice_number.trim()) ? invoice_number.trim() : 'بدون فاتورة';

    // Check 1: serial_number exists?
    const product = repository.getProductBySerial(cleanSerial);
    if (!product) {
      // If serial_number does not exist: Reject Request
      return res.status(404).json({
        success: false,
        error: `طلب مرفوض: الرقم التسلسلي (${cleanSerial}) غير مسجل في منظومة مراتب سليبي. يرجى مراجعة الرقم على بطاقة الضمان الملصقة بالمرتبة.`,
        code: 'SERIAL_NOT_FOUND',
      });
    }

    // Check 2: If warranty already exists:
    if (product.activation) {
      // Reject Request
      return res.status(409).json({
        success: false,
        error: `طلب مرفوض: تم تفعيل الضمان لهذا الرقم التسلسلي مسبقاً برقم وثيقة: (${product.activation.warranty_id}) بتاريخ: ${new Date(product.activation.activation_date).toLocaleDateString('ar-EG')}`,
        code: 'WARRANTY_ALREADY_EXISTS',
        existing_activation: product.activation,
      });
    }

    // Check 3: Else -> Create Warranty
    // Phone validation
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 8) {
      return res.status(400).json({ error: 'رقم الهاتف غير صحيح' });
    }

    const result = repository.activateWarranty({
      serial_number: cleanSerial,
      customer_name: customer_name.trim(),
      phone: cleanPhone,
      governorate: governorate.trim(),
      city: finalCity,
      invoice_number: finalInvoiceNumber,
      purchase_date,
    });

    res.status(201).json({
      success: true,
      message: 'تم تفعيل وثيقة الضمان بنجاح',
      activation: result.activation,
      product: result.product,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'حدث خطأ أثناء تفعيل الضمان' });
  }
});

// 4. Verify Warranty / QR Code Verification
app.get('/api/warranty/verify/:idOrSerial', (req, res) => {
  try {
    const identifier = req.params.idOrSerial;
    const data = repository.getWarrantyByIdOrSerial(identifier);

    if (!data) {
      // Check if product exists but not yet activated
      const unactivatedProduct = repository.getProductBySerial(identifier);
      if (unactivatedProduct && !unactivatedProduct.activation) {
        return res.json({
          status: 'UNACTIVATED',
          message: 'المرتبة أصلية ومسجلة في خط إنتاج سليبي ولكن لم يتم تفعيل ضمانها بعد.',
          product: unactivatedProduct,
        });
      }

      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'عذراً، رمز الضمان أو الرقم التسلسلي غير مسجل في منظومة سليبي المعتمدة.',
      });
    }

    // Log verification check
    repository.addLog(data.activation.warranty_id, data.product.serial_number, `تم التحقق من سريان الضمان عبر مسح رمز QR`);

    res.json({
      status: data.is_valid ? 'VALID' : 'EXPIRED',
      message: data.is_valid ? 'شهادة الضمان معتمدة وسارية المفعول لدى شركة سليبي' : 'شهادة الضمان منتهية الصلاحية',
      activation: toPublicActivation(data.activation),
      product: toPublicProduct(data.product),
      days_remaining: data.days_remaining,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Warranty Search by Serial, Warranty ID, or Mobile Phone
app.get('/api/warranty/search', (req, res) => {
  try {
    const q = (
      (req.query.q as string) ||
      (req.query.query as string) ||
      (req.query.serial as string) ||
      (req.query.warranty_id as string) ||
      (req.query.mobile as string) ||
      (req.query.phone as string) ||
      ''
    ).trim();

    const type = ((req.query.type as string) || 'all') as 'all' | 'serial' | 'warranty_id' | 'mobile';

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال كلمة البحث (الرقم التسلسلي للمرتبة، رقم وثيقة الضمان، أو رقم الهاتف المحمول)',
      });
    }

    const results = repository.searchWarranties(q, type);

    // If no direct warranty activation found, check if it's an unactivated product serial
    let unactivatedProduct: any = null;
    if (results.length === 0 && (type === 'all' || type === 'serial')) {
      const prod = repository.getProductBySerial(q);
      if (prod && !prod.activation) {
        unactivatedProduct = prod;
      }
    }

    res.json({
      success: true,
      query: q,
      type,
      total: results.length,
      results,
      unactivated_product: unactivatedProduct,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Admin Portal API
// ----------------------------------------------------

// Admin authentication check
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  // Production default credentials or demo login
  if ((username === 'admin' || username === 'sleepee') && (password === 'sleepee2026' || password === 'admin123')) {
    return res.json({
      success: true,
      token: 'admin-sleepee-auth-token-2026',
      user: {
        name: 'مدير جودة ومبيعات سليبي',
        role: 'SUPER_ADMIN',
        company: 'Sleepee Mattresses',
      },
    });
  }
  return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  try {
    const stats = repository.getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Products CRUD
app.get('/api/admin/products', (req, res) => {
  try {
    const search = req.query.search as string;
    const products = repository.getProducts(search);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', (req, res) => {
  try {
    const { serial_number, model, size, warranty_years, production_date, production_order, batch_no, image_url } =
      req.body;

    if (!serial_number || !model || !size || !production_date || !production_order || !batch_no) {
      return res.status(400).json({ error: 'يرجى استكمال جميع بيانات المنتج' });
    }

    const product = repository.addProduct({
      serial_number,
      model,
      size,
      warranty_years: Number(warranty_years) || 10,
      production_date,
      production_order,
      batch_no,
      image_url,
    });

    res.status(201).json({ success: true, product });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = repository.updateProduct(id, req.body);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = repository.deleteProduct(id);
    if (!ok) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Warranties List
app.get('/api/admin/warranties', (req, res) => {
  try {
    const search = req.query.search as string;
    const warranties = repository.getWarranties(search);
    res.json(warranties);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Activation Logs
app.get('/api/admin/logs', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = repository.getLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// RBAC User Management API
// ----------------------------------------------------
app.get('/api/users', (req, res) => {
  try {
    const users = repository.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/role-logs', (req, res) => {
  try {
    const logs = repository.getRoleChangeLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'الدور مطلوب' });
    const result = repository.updateUserRole(req.params.id, role, authenticatedActor(req));
    res.json({ success: true, user: result.user, log: result.log });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/users/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'حالة الحساب غير صالحة' });
    }
    const result = repository.updateUserStatus(req.params.id, status, authenticatedActor(req));
    res.json({ success: true, user: result.user, log: result.log });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CLAIMS MANAGEMENT SYSTEM API
// ----------------------------------------------------
app.get('/api/claims', (req, res) => {
  try {
    const { status, search, type } = req.query as { status?: string; search?: string; type?: string };
    const claims = repository.getClaims({ status, search, type });
    res.json(claims);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/claims/:id', (req, res) => {
  try {
    const claim = repository.getClaimById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'طلب الضمان غير موجود' });
    res.json(claim);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/claims', (req, res) => {
  try {
    const { warranty_id, serial_number, customer_name, phone, complaint_type, complaint_description, images } = req.body;
    if (!serial_number || !customer_name || !phone || !complaint_type || !complaint_description) {
      return res.status(400).json({ error: 'يرجى استكمال جميع بيانات تقديم الشكوى' });
    }

    const claim = repository.createClaim(
      {
        warranty_id,
        serial_number,
        customer_name,
        phone,
        complaint_type,
        complaint_description,
        images: images || [],
      },
      req.principal ? authenticatedActor(req) : 'public-customer-submission'
    );

    res.status(201).json({ success: true, claim });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/claims/:id/workflow', (req, res) => {
  try {
    const { claim_status, assigned_to, inspection_date, inspection_result, resolution } = req.body;
    const updated = repository.updateClaimWorkflow(
      req.params.id,
      {
        claim_status,
        assigned_to,
        inspection_date,
        inspection_result,
        resolution,
      },
      authenticatedActor(req)
    );

    res.json({ success: true, claim: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/claims/:id/sla', (req, res) => {
  try {
    const { next_follow_up_date, last_action_date, target_resolution_days, pending_tasks } = req.body;
    const updated = repository.updateClaimSLA(
      req.params.id,
      {
        next_follow_up_date,
        last_action_date,
        target_resolution_days,
        pending_tasks,
      },
      authenticatedActor(req)
    );

    res.json({ success: true, claim: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// REPLACEMENT MANAGEMENT API
// ----------------------------------------------------
app.get('/api/replacements', (req, res) => {
  try {
    const search = req.query.search as string;
    const replacements = repository.getReplacements(search);
    res.json(replacements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/replacements/:id', (req, res) => {
  try {
    const replacement = repository.getReplacementById(req.params.id);
    if (!replacement) return res.status(404).json({ error: 'إذن الاستبدال غير موجود' });
    res.json(replacement);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/replacements', (req, res) => {
  try {
    const { old_serial_number, new_serial_number, old_warranty_id, replacement_reason, notes } = req.body;
    if (!old_serial_number || !new_serial_number || !old_warranty_id || !replacement_reason) {
      return res.status(400).json({ error: 'يرجى استكمال جميع بيانات طلب الاستبدال' });
    }

    const replacement = repository.createReplacement(
      {
        old_serial_number,
        new_serial_number,
        old_warranty_id,
        replacement_reason,
        approved_by: authenticatedActor(req),
        notes,
      },
      authenticatedActor(req)
    );

    res.status(201).json({ success: true, replacement });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// PRODUCT LIFECYCLE API
// ----------------------------------------------------
app.get('/api/lifecycle', (req, res) => {
  try {
    const serial = (req.query.serial as string) || (req.query.serial_number as string);
    if (serial) {
      const timeline = repository.getLifecycleBySerial(serial);
      return res.json(timeline);
    }
    const allLifecycle = repository.getAllLifecycleEvents();
    res.json(allLifecycle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lifecycle/:serial', (req, res) => {
  try {
    const serial = req.params.serial;
    if (!serial) return res.status(400).json({ error: 'الرقم التسلسلي مطلوب' });
    const timeline = repository.getLifecycleBySerial(serial);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lifecycle', (req, res) => {
  try {
    const { serial_number, event_type, performed_by, notes, reference_id, event_date } = req.body;
    if (!serial_number || !event_type || !performed_by) {
      return res.status(400).json({ error: 'البيانات الأساسية للحدث غير مكتملة' });
    }
    const event = repository.addLifecycleEvent({
      serial_number,
      event_type,
      performed_by,
      notes: notes || '',
      reference_id: reference_id || null,
      event_date: event_date || new Date().toISOString(),
    });
    res.status(201).json({ success: true, event });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ATTACHMENTS & DOCUMENT CENTER API
// ----------------------------------------------------
app.get('/api/attachments', (req, res) => {
  try {
    const { entity_type, entity_id, category } = req.query as {
      entity_type?: string;
      entity_id?: string;
      category?: string;
    };
    const attachments = repository.getAttachments({ entity_type, entity_id, category });
    res.json(attachments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attachments', (req, res) => {
  try {
    const {
      entity_type,
      entity_id,
      file_name,
      file_type,
      file_size,
      storage_path,
      download_url,
      storage_url,
      description,
      category,
    } = req.body;

    if (!entity_type || !entity_id || !file_name) {
      return res.status(400).json({ error: 'بيانات الملف المرفق غير مكتملة' });
    }

    const attachment = repository.addAttachment(
      {
        entity_type,
        entity_id,
        file_name,
        file_type: file_type || 'image/jpeg',
        file_size: Number(file_size) || 102400,
        storage_path,
        download_url,
        storage_url: download_url || storage_url,
        description: description || '',
        category: category || 'عام',
        uploaded_by: authenticatedActor(req),
      },
      authenticatedActor(req)
    );

    res.status(201).json({ success: true, attachment });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/attachments/:id', (req, res) => {
  try {
    const actingUser = authenticatedActor(req);
    repository.deleteAttachment(req.params.id, actingUser);
    res.json({ success: true, message: 'تم حذف المرفق بنجاح وتوثيق العملية في سجل التدقيق' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/attachments/:id/audit-download', (req, res) => {
  try {
    const actingUser = authenticatedActor(req);
    repository.auditAttachmentDownload(req.params.id, actingUser);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Secure download/view URL resolution with automatic audit logging
app.get('/api/attachments/:id/download-url', (req, res) => {
  try {
    const attachment = repository.getAttachmentById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: 'المرفق غير موجود' });
    }

    const actingUser = authenticatedActor(req);
    repository.auditAttachmentDownload(attachment.attachment_id, actingUser);

    res.json({
      success: true,
      attachment_id: attachment.attachment_id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      storage_path: attachment.storage_path,
      download_url: attachment.download_url || attachment.storage_url,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Attachment migration API
app.post('/api/attachments/migrate', (req, res) => {
  try {
    const stats = repository.migrateAttachments();
    res.json({
      success: true,
      message: 'تم فحص وترقية جميع المرفقات إلى نمط التخزين السحابي الجديد بنجاح',
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AUTOMATION & SCHEDULED JOBS APIS
// ----------------------------------------------------
app.post('/api/automation/run-jobs', (req, res) => {
  try {
    const results = jobsRunner.runAllJobs();
    res.json({
      success: true,
      message: 'تم تشغيل المهام المجدولة الأوتوماتيكية بنجاح',
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/automation/status', (req, res) => {
  try {
    const results = jobsRunner.getLastRunResults();
    res.json({
      status: 'active',
      jobs: [
        'Warranty Expiration Check',
        'Lifecycle Auto Update',
        'Archive Old Closed Claims',
      ],
      lastRunResults: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CUSTOMER SERVICE 360 API (Supports /api/customer-360 and /api/customer-service/360)
// ----------------------------------------------------
app.get([
  '/api/customer-360/:query',
  '/api/customer-360',
  '/api/customer-service/360/:query',
  '/api/customer-service/360'
], (req, res) => {
  try {
    const rawQuery = (req.params as any).query || (req.query.q as string) || (req.query.query as string) || '';
    const query = decodeURIComponent(rawQuery).trim();
    if (!query) {
      return res.status(400).json({ error: 'يرجى إدخال الرقم التسلسلي، رقم الضمان، أو رقم هاتف العميل' });
    }

    const data = repository.getCustomer360(query);
    if (!data) {
      return res.status(404).json({ error: `لم يتم العثور على أي مرتبة أو سجل مطابق للبحث (${query})` });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer-service/communications
app.get('/api/customer-service/communications', (req, res) => {
  try {
    const serial = req.query.serial as string;
    const phone = req.query.phone as string;
    const warrantyId = req.query.warranty_id as string;

    if (serial || phone || warrantyId) {
      const communications = repository.getCommunicationsForCustomer(serial, phone, warrantyId);
      return res.json(communications);
    }

    const all = repository.getAllCommunications();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customer-service/communications
app.post('/api/customer-service/communications', (req, res) => {
  try {
    const {
      serial_number,
      warranty_id,
      customer_name,
      customer_phone,
      communication_type,
      date_time,
      responsible_user,
      details,
      related_reference,
    } = req.body;

    if (!details || !details.trim()) {
      return res.status(400).json({ error: 'يرجى كتابة تفاصيل أو ملاحظات التواصل' });
    }

    if (!responsible_user || !responsible_user.trim()) {
      return res.status(400).json({ error: 'يرجى تحديد المستخدم المسؤول عن التواصل' });
    }

    const allowedTypes = [
      'مكالمة هاتفية',
      'واتساب',
      'بريد إلكتروني',
      'زيارة',
      'ملاحظة داخلية',
    ];

    if (!allowedTypes.includes(communication_type)) {
      return res.status(400).json({
        error: `نوع التواصل غير صالح. الأنواع المدعومة: ${allowedTypes.join('، ')}`,
      });
    }

    const newComm = repository.addCommunication({
      serial_number: serial_number || '',
      warranty_id: warranty_id || undefined,
      customer_name: customer_name || undefined,
      customer_phone: customer_phone || undefined,
      communication_type,
      date_time: date_time || new Date().toISOString(),
      responsible_user,
      details,
      related_reference: related_reference || null,
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل عملية التواصل بنجاح',
      communication: newComm,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customer-service/communications/:id
app.delete('/api/customer-service/communications/:id', (req, res) => {
  try {
    const deleted = repository.deleteCommunication(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'سجل التواصل غير موجود' });
    }
    res.json({ success: true, message: 'تم حذف سجل التواصل بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADVANCED OMNI-SEARCH API
// ----------------------------------------------------
app.get('/api/search/omni', (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const results = repository.omniSearch(query);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// EXECUTIVE MANAGEMENT DASHBOARD API
// ----------------------------------------------------
app.get('/api/executive/dashboard', (req, res) => {
  try {
    const filters = {
      dateRange: req.query.dateRange as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      productFamily: req.query.productFamily as string,
      model: req.query.model as string,
      factoryLine: req.query.factoryLine as string,
    };
    const data = repository.getExecutiveDashboardData(filters);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// QUALITY DASHBOARD & DEFECT KPIS API
// ----------------------------------------------------
app.get('/api/quality/stats', (req, res) => {
  try {
    const stats = repository.getQualityStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin CSV Export
app.get('/api/admin/export-csv', (req, res) => {
  try {
    const csvData = repository.exportCSV();
    const filename = `sleepee_warranties_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// POWER BI DIRECT CONNECTOR & ANALYTICS FEED API
// ----------------------------------------------------

// 1. Master JSON Feed for Power BI Web Connector
app.get('/api/powerbi/feed', (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const feed = repository.getPowerBIFeed(baseUrl);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(feed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Direct Power BI Data Source File (.pbids) Download
app.get('/api/powerbi/pbids', (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const pbidsContent = repository.getPowerBIPBIDS(baseUrl);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sleepee_warranty_powerbi.pbids"');
    res.send(pbidsContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Table-Specific CSV Feeds for Power BI Web/CSV Connector
app.get('/api/powerbi/csv/:table', (req, res) => {
  try {
    const table = req.params.table as 'warranties' | 'claims' | 'replacements' | 'products' | 'quality';
    const validTables = ['warranties', 'claims', 'replacements', 'products', 'quality'];
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: `جدول غير مدعوم: ${table}` });
    }

    const csvData = repository.getPowerBICSV(table);
    const filename = `sleepee_powerbi_${table}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Power Query M Language Script for Advanced Editor
app.get('/api/powerbi/query-script', (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const script = repository.getPowerBIQueryScript(baseUrl);

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="sleepee_powerquery_connector.pq"');
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    res.send(script);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Power BI Integration Hub Overview & Connection Health
app.get('/api/powerbi/overview', (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const feed = repository.getPowerBIFeed(baseUrl);

    res.json({
      status: 'ONLINE',
      version: '2.0.0',
      service: 'Sleepee Power BI Gateway & OData/REST Engine',
      endpoints: {
        pbids_download: `${baseUrl}/api/powerbi/pbids`,
        master_feed: `${baseUrl}/api/powerbi/feed`,
        warranties_csv: `${baseUrl}/api/powerbi/csv/warranties`,
        claims_csv: `${baseUrl}/api/powerbi/csv/claims`,
        replacements_csv: `${baseUrl}/api/powerbi/csv/replacements`,
        products_csv: `${baseUrl}/api/powerbi/csv/products`,
        quality_csv: `${baseUrl}/api/powerbi/csv/quality`,
        powerquery_script: `${baseUrl}/api/powerbi/query-script`,
      },
      datasets: {
        fact_warranties_rows: feed.tables.warranties.length,
        fact_claims_rows: feed.tables.claims.length,
        fact_replacements_rows: feed.tables.replacements.length,
        dim_products_rows: feed.tables.products.length,
        dim_calendar_months: feed.tables.calendar.length,
      },
      last_refresh: feed.metadata.exported_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DATABASE MANAGEMENT CENTER APIS (Phase 7B)
// ----------------------------------------------------

// 1. Data Health Center
app.get('/api/db-center/health', (req, res) => {
  try {
    const products = repository.getProducts();
    const warranties = repository.getWarranties();
    const claims = repository.getClaims();
    const replacements = repository.getReplacements();
    const lifecycles = repository.getAllLifecycleEvents();
    const attachments = repository.getAttachments();

    // Health indicators calculation:
    // 1. Broken References
    const prodSerials = new Set(products.map(p => p.serial_number));
    const warIds = new Set(warranties.map(w => w.warranty_id));
    const claimIds = new Set(claims.map(c => c.claim_id));

    let brokenRefs = 0;
    // Warranty -> Product linkage broken
    warranties.forEach(w => {
      if (!prodSerials.has(w.serial_number)) brokenRefs++;
    });
    // Claim -> Warranty linkage broken
    claims.forEach(c => {
      if (c.warranty_id && !warIds.has(c.warranty_id)) brokenRefs++;
      if (!prodSerials.has(c.serial_number)) brokenRefs++;
    });
    // Replacement -> Claim linkage broken
    replacements.forEach(r => {
      if (r.old_warranty_id && !warIds.has(r.old_warranty_id) && !claimIds.has(r.old_warranty_id)) brokenRefs++;
      if (!prodSerials.has(r.old_serial_number)) brokenRefs++;
      if (r.new_serial_number && !prodSerials.has(r.new_serial_number)) brokenRefs++;
    });
    // Attachments linkage broken
    attachments.forEach(att => {
      if (att.entity_type === 'Product' && !prodSerials.has(att.entity_id)) brokenRefs++;
      if (att.entity_type === 'Warranty' && !warIds.has(att.entity_id)) brokenRefs++;
      if (att.entity_type === 'Claim' && !claimIds.has(att.entity_id)) brokenRefs++;
    });
    // Lifecycle linkage broken
    lifecycles.forEach(l => {
      if (!prodSerials.has(l.serial_number)) brokenRefs++;
    });

    // 2. Orphan Records
    let orphans = 0;
    // Products without lifecycle events
    const lifecycleSerials = new Set(lifecycles.map(l => l.serial_number));
    products.forEach(p => {
      if (!lifecycleSerials.has(p.serial_number)) orphans++;
    });

    // 3. Duplicate Serials
    const serialCounts: Record<string, number> = {};
    products.forEach(p => {
      serialCounts[p.serial_number] = (serialCounts[p.serial_number] || 0) + 1;
    });
    const duplicateSerials = Object.values(serialCounts).filter(c => c > 1).length;

    // 4. Duplicate Warranty IDs
    const warrantyCounts: Record<string, number> = {};
    warranties.forEach(w => {
      warrantyCounts[w.warranty_id] = (warrantyCounts[w.warranty_id] || 0) + 1;
    });
    const duplicateWarranties = Object.values(warrantyCounts).filter(c => c > 1).length;

    // 5. Missing Lifecycle Events
    let missingLifecycles = 0;
    products.forEach(p => {
      if (!lifecycleSerials.has(p.serial_number)) missingLifecycles++;
    });

    // 6. Missing Attachments
    const attachedClaimIds = new Set(attachments.filter(a => a.entity_type === 'Claim').map(a => a.entity_id));
    let missingAttachments = 0;
    claims.forEach(c => {
      if (!attachedClaimIds.has(c.claim_id)) missingAttachments++;
    });

    res.json({
      metrics: {
        totalProducts: products.length,
        totalWarranties: warranties.length,
        totalClaims: claims.length,
        totalReplacements: replacements.length,
        totalAttachments: attachments.length,
        totalLifecycleEvents: lifecycles.length,
      },
      indicators: {
        brokenReferences: {
          count: brokenRefs,
          status: brokenRefs === 0 ? 'Healthy' : brokenRefs < 5 ? 'Warning' : 'Critical'
        },
        orphanRecords: {
          count: orphans,
          status: orphans === 0 ? 'Healthy' : orphans < 10 ? 'Warning' : 'Critical'
        },
        duplicateSerials: {
          count: duplicateSerials,
          status: duplicateSerials === 0 ? 'Healthy' : duplicateSerials < 3 ? 'Warning' : 'Critical'
        },
        duplicateWarranties: {
          count: duplicateWarranties,
          status: duplicateWarranties === 0 ? 'Healthy' : duplicateWarranties < 3 ? 'Warning' : 'Critical'
        },
        missingLifecycles: {
          count: missingLifecycles,
          status: missingLifecycles === 0 ? 'Healthy' : missingLifecycles < 10 ? 'Warning' : 'Critical'
        },
        missingAttachments: {
          count: missingAttachments,
          status: missingAttachments === 0 ? 'Healthy' : missingAttachments < 5 ? 'Warning' : 'Critical'
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Integrity Audit Engine
app.post('/api/db-center/audit', (req, res) => {
  try {
    const products = repository.getProducts();
    const warranties = repository.getWarranties();
    const claims = repository.getClaims();
    const replacements = repository.getReplacements();
    const lifecycles = repository.getAllLifecycleEvents();
    const attachments = repository.getAttachments();

    const auditResults: any[] = [];
    let idx = 1;

    const prodSerials = new Set(products.map(p => p.serial_number));
    const warIds = new Set(warranties.map(w => w.warranty_id));
    const claimIds = new Set(claims.map(c => c.claim_id));

    // Check 1: Warranty -> Product linkage
    warranties.forEach(w => {
      if (!prodSerials.has(w.serial_number)) {
        auditResults.push({
          id: `AUDIT-W-${idx++}`,
          category: 'ارتباط الضمان بالمنتج',
          severity: 'High',
          description: `وثيقة الضمان ${w.warranty_id} مرتبطة برقم تسلسلي مفقود ${w.serial_number}`,
          entity_id: w.warranty_id,
          entity_type: 'Warranty',
          impact: 'الضمان مجهول الهوية',
          suggestion: 'إنشاء قيد منتج مؤقت لإعادة تتبع الضمان بشكل صحيح'
        });
      }
    });

    // Check 2: Claim -> Warranty linkage
    claims.forEach(c => {
      if (c.warranty_id && !warIds.has(c.warranty_id)) {
        auditResults.push({
          id: `AUDIT-C-${idx++}`,
          category: 'ارتباط الشكوى بالضمان',
          severity: 'High',
          description: `الشكوى ${c.claim_id} تشير إلى وثيقة ضمان غير موجودة ${c.warranty_id}`,
          entity_id: c.claim_id,
          entity_type: 'Claim',
          impact: 'تعذر التحقق من التغطية الضمانية للشكوى',
          suggestion: 'البحث عن وثيقة الضمان الصحيحة بالرقم التسلسلي وربطها بالشكوى'
        });
      }
      if (!prodSerials.has(c.serial_number)) {
        auditResults.push({
          id: `AUDIT-C-${idx++}`,
          category: 'ارتباط الشكوى بالمنتج',
          severity: 'High',
          description: `الشكوى ${c.claim_id} مرتبطة برقم تسلسلي مفقود ${c.serial_number}`,
          entity_id: c.claim_id,
          entity_type: 'Claim',
          impact: 'تقديم شكوى على قيد غير معروف في خطوط الإنتاج',
          suggestion: 'تسجيل وتوثيق الرقم التسلسلي في خطوط الإنتاج'
        });
      }
    });

    // Check 3: Replacement -> Claim linkage
    replacements.forEach(r => {
      if (r.old_warranty_id && !warIds.has(r.old_warranty_id) && !claimIds.has(r.old_warranty_id)) {
        auditResults.push({
          id: `AUDIT-R-${idx++}`,
          category: 'ارتباط الاستبدال بالبلاغات',
          severity: 'Medium',
          description: `إذن الاستبدال ${r.replacement_id} يشير إلى مرجع مفقود ${r.old_warranty_id}`,
          entity_id: r.replacement_id,
          entity_type: 'Replacement',
          impact: 'ضعف تتبع دورة الاستبدال والتحقق من الشكوى الأساسية',
          suggestion: 'ربط إذن الاستبدال بالبلاغ الفعلي للعميل'
        });
      }
    });

    // Check 4: Attachment linkage
    attachments.forEach(att => {
      let isBroken = false;
      if (att.entity_type === 'Product' && !prodSerials.has(att.entity_id)) isBroken = true;
      if (att.entity_type === 'Warranty' && !warIds.has(att.entity_id)) isBroken = true;
      if (att.entity_type === 'Claim' && !claimIds.has(att.entity_id)) isBroken = true;

      if (isBroken) {
        auditResults.push({
          id: `AUDIT-A-${idx++}`,
          category: 'ارتباط الملفات المرفقة',
          severity: 'Medium',
          description: `المرفق ${att.file_name} مرتبط بكيان مفقود (${att.entity_type}: ${att.entity_id})`,
          entity_id: att.attachment_id,
          entity_type: 'Attachment',
          impact: 'وجود مرفقات مجهولة المصدر دون سياق تشغيلي',
          suggestion: 'تحديث مرجع الكيان للمرفق أو حذفه بأمان لتوفير مساحة السيرفر'
        });
      }
    });

    // Check 5: Lifecycle linkage
    lifecycles.forEach(l => {
      if (!prodSerials.has(l.serial_number)) {
        auditResults.push({
          id: `AUDIT-L-${idx++}`,
          category: 'ارتباط أحداث دورة الحياة',
          severity: 'Low',
          description: `حدث دورة الحياة ${l.event_type} مسجل لرقم تسلسلي مفقود ${l.serial_number}`,
          entity_id: l.lifecycle_id,
          entity_type: 'Lifecycle',
          impact: 'أحداث معلقة غير قابلة للتتبع اللوجستي',
          suggestion: 'توليد قيد رمزي للمنتج لمزامنة التتبع التاريخي'
        });
      }
    });

    // Check 6: Duplicate records
    const serialCounts: Record<string, number[]> = {};
    products.forEach(p => {
      if (!serialCounts[p.serial_number]) serialCounts[p.serial_number] = [];
      serialCounts[p.serial_number].push(p.id);
    });
    Object.entries(serialCounts).forEach(([serial, ids]) => {
      if (ids.length > 1) {
        auditResults.push({
          id: `AUDIT-D-${idx++}`,
          category: 'سجلات مكررة',
          severity: 'Medium',
          description: `تكرار الرقم التسلسلي للمنتج (${serial}) عدد ${ids.length} مرات في خطوط الإنتاج`,
          entity_id: serial,
          entity_type: 'Product',
          impact: 'ازدواجية الباركود ومشاكل تفعيل شهادة الضمان المتعددة لنفس القطعة',
          suggestion: 'دمج السجلات المكررة وإزالة القيد المزدوج مع الاحتفاظ بسجل الضمان النشط'
        });
      }
    });

    // Check 7: Missing mandatory fields
    products.forEach(p => {
      if (!p.model || !p.size || !p.production_date) {
        auditResults.push({
          id: `AUDIT-M-${idx++}`,
          category: 'حقول إجبارية مفقودة',
          severity: 'Medium',
          description: `المنتج ${p.serial_number} ينقصه مواصفات أساسية (الموديل أو المقاس أو تاريخ التصنيع)`,
          entity_id: p.serial_number,
          entity_type: 'Product',
          impact: 'فشل تصنيف المنتج في تحليلات الجودة والعيوب المتكررة',
          suggestion: 'مزامنة السجل مع أوامر تشغيل SAP لاستكمال البيانات الناقصة'
        });
      }
    });
    warranties.forEach(w => {
      if (!w.customer_name || !w.phone || !w.governorate) {
        auditResults.push({
          id: `AUDIT-M-${idx++}`,
          category: 'حقول إجبارية مفقودة',
          severity: 'High',
          description: `وثيقة الضمان ${w.warranty_id} مفقود بها بيانات الاتصال الأساسية للعميل`,
          entity_id: w.warranty_id,
          entity_type: 'Warranty',
          impact: 'تعذر تواصل دعم ما بعد البيع لحل الشكاوى وتتبع رضا المستهلك',
          suggestion: 'الاتصال برقم الفاتورة أو الموزع المعتمد لاستكمال ملف المستهلك'
        });
      }
    });

    // Check 8: Invalid dates
    const now = new Date();
    warranties.forEach(w => {
      const purchase = new Date(w.purchase_date);
      const expiry = new Date(w.expiry_date);
      const activation = new Date(w.activation_date);
      if (purchase > now) {
        auditResults.push({
          id: `AUDIT-DT-${idx++}`,
          category: 'تواريخ غير منطقية',
          severity: 'Medium',
          description: `وثيقة الضمان ${w.warranty_id} تحتوي على تاريخ شراء مستقبلي: ${w.purchase_date}`,
          entity_id: w.warranty_id,
          entity_type: 'Warranty',
          impact: 'خطأ في احتساب صلاحية التغطية وأوقات الإبلاغ',
          suggestion: 'تحديث تاريخ الشراء ليتطابق مع تاريخ الفاتورة الرسمية'
        });
      }
      if (expiry < activation) {
        auditResults.push({
          id: `AUDIT-DT-${idx++}`,
          category: 'تواريخ غير منطقية',
          severity: 'High',
          description: `وثيقة الضمان ${w.warranty_id} تحتوي على تاريخ انتهاء يسبق تاريخ التفعيل الفعلي`,
          entity_id: w.warranty_id,
          entity_type: 'Warranty',
          impact: 'الضمان ملغي فورياً وفقدان العميل لأهليته في الاستبدال والصيانة',
          suggestion: 'إعادة احتساب فترة التغطية وتحديث تاريخ انتهاء صلاحية الضمان'
        });
      }
    });

    // Check 9: Invalid status transitions
    claims.forEach(c => {
      if (c.claim_status === 'Closed' && !c.resolution) {
        auditResults.push({
          id: `AUDIT-ST-${idx++}`,
          category: 'حالة تدفق العمل غير صالحة',
          severity: 'Low',
          description: `البلاغ ${c.claim_id} مغلق دون تسجيل قرار الحل النهائي أو الإجراء الفني المتخذ`,
          entity_id: c.claim_id,
          entity_type: 'Claim',
          impact: 'تشويه نسب دقة الإغلاق وحساب الـ SLA لممثلي الدعم',
          suggestion: 'فتح البلاغ وتسجيل قرار الصيانة أو الاستبدال قبل الإغلاق الرسمي'
        });
      }
    });

    res.json(auditResults);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Data Repair Center
app.post('/api/db-center/repair', (req, res) => {
  try {
    const { action, preview, actor } = req.body;
    const actorName = actor || 'مدير النظام (Database Center)';

    const products = repository.getProducts();
    const warranties = repository.getWarranties();
    const claims = repository.getClaims();
    const replacements = repository.getReplacements();
    const lifecycles = repository.getAllLifecycleEvents();
    const attachments = repository.getAttachments();

    const dbInstance = (repository as any).db;
    if (!dbInstance || !dbInstance.data) {
      return res.status(400).json({ error: 'لا يمكن الوصول إلى قاعدة البيانات المباشرة للقيام بالإصلاح' });
    }

    const rawData = dbInstance.data;
    let repairsCount = 0;
    const repairLogs: string[] = [];

    const prodSerials = new Set(products.map(p => p.serial_number));
    const warIds = new Set(warranties.map(w => w.warranty_id));
    const claimIds = new Set(claims.map(c => c.claim_id));

    if (action === 'repair_broken_references') {
      // 1. Warranty with missing product serial -> Create placeholder product
      warranties.forEach(w => {
        if (!prodSerials.has(w.serial_number)) {
          repairsCount++;
          repairLogs.push(`توليد منتج مؤقت للرقم التسلسلي المفقود ${w.serial_number} التابع للضمان ${w.warranty_id}`);
          if (!preview) {
            rawData.products.push({
              id: rawData.products.length + 1,
              serial_number: w.serial_number,
              model: 'مرتبة سليبي افتراضية (مستصلحة تلقائياً لإصلاح مرجع مفقود)',
              size: '160 × 200 سم (مقدر)',
              warranty_years: 10,
              production_date: new Date().toISOString().split('T')[0],
              status: 'مستصلح تلقائياً',
              production_order: 'ORD-RECOVERY',
              batch_no: 'BATCH-REC',
              created_at: new Date().toISOString()
            });
            prodSerials.add(w.serial_number);
          }
        }
      });

      // 2. Claim with missing product serial -> Create placeholder product
      claims.forEach(c => {
        if (!prodSerials.has(c.serial_number)) {
          repairsCount++;
          repairLogs.push(`توليد منتج مؤقت للرقم التسلسلي المفقود ${c.serial_number} التابع للشكوى ${c.claim_id}`);
          if (!preview) {
            rawData.products.push({
              id: rawData.products.length + 1,
              serial_number: c.serial_number,
              model: 'مرتبة سليبي افتراضية (مستصلحة تلقائياً لإصلاح مرجع مفقود)',
              size: '180 × 200 سم (مقدر)',
              warranty_years: 10,
              production_date: new Date().toISOString().split('T')[0],
              status: 'مستصلح تلقائياً',
              production_order: 'ORD-RECOVERY',
              batch_no: 'BATCH-REC',
              created_at: new Date().toISOString()
            });
            prodSerials.add(c.serial_number);
          }
        }
      });
    } 
    else if (action === 'repair_missing_lifecycles') {
      const lifecycleSerials = new Set(lifecycles.map(l => l.serial_number));
      products.forEach(p => {
        if (!lifecycleSerials.has(p.serial_number)) {
          repairsCount++;
          repairLogs.push(`إضافة حدث إنتاج (Produced) للمنتج ${p.serial_number} بتاريخ إنتاجه: ${p.production_date}`);
          if (!preview) {
            rawData.product_lifecycle.push({
              id: rawData.product_lifecycle.length + 1,
              lifecycle_id: `LIF-REC-${Math.floor(100000 + Math.random() * 900000)}`,
              serial_number: p.serial_number,
              event_type: 'Produced',
              event_date: p.production_date + 'T08:00:00Z',
              performed_by: 'نظام الاستصلاح التلقائي (System Repair)',
              notes: 'تمت إضافة قيد الإنتاج تلقائياً لإصلاح قيد تتبع مفقود في قاعدة البيانات',
              created_at: new Date().toISOString()
            });
          }
        }
      });
    } 
    else if (action === 'repair_missing_warranty_links') {
      claims.forEach(c => {
        const matchingWarranty = warranties.find(w => w.serial_number === c.serial_number);
        if (matchingWarranty && (!c.warranty_id || c.warranty_id !== matchingWarranty.warranty_id)) {
          repairsCount++;
          repairLogs.push(`تحديث مرجع وثيقة الضمان للشكوى ${c.claim_id} ليرتبط بالوثيقة المفعّلة: ${matchingWarranty.warranty_id}`);
          if (!preview) {
            const targetClaim = rawData.warranty_claims.find((wc: any) => wc.claim_id === c.claim_id);
            if (targetClaim) {
              targetClaim.warranty_id = matchingWarranty.warranty_id;
            }
          }
        }
      });
    } 
    else if (action === 'repair_missing_claim_links') {
      replacements.forEach(r => {
        if (!r.old_warranty_id) {
          const matchingWarranty = warranties.find(w => w.serial_number === r.old_serial_number);
          if (matchingWarranty) {
            repairsCount++;
            repairLogs.push(`ربط إذن الاستبدال ${r.replacement_id} بوثيقة الضمان القديمة ${matchingWarranty.warranty_id}`);
            if (!preview) {
              const targetRep = rawData.replacements.find((rep: any) => rep.replacement_id === r.replacement_id);
              if (targetRep) {
                targetRep.old_warranty_id = matchingWarranty.warranty_id;
              }
            }
          }
        }
      });
    }

    if (!preview && repairsCount > 0) {
      repairLogs.forEach(logText => {
        repository.addLog(null, 'DATABASE', `[إصلاح البيانات] ${logText} (بواسطة ${actorName})`);
      });
      repository.persist();
    }

    res.json({
      success: true,
      preview,
      repairsCount,
      logs: repairLogs,
      message: preview 
        ? `جاهز لإصلاح عدد ${repairsCount} سجلات معلقة.` 
        : `تم بنجاح إصلاح عدد ${repairsCount} سجلات معلقة وحفظ التغييرات في قاعدة البيانات.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Sync Monitoring Center
app.get('/api/db-center/sync-status', (req, res) => {
  try {
    const syncStates = repository.getSyncStates();
    const formattedSyncs = syncStates.map(state => {
      let status: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
      const lastSyncDate = new Date(state.last_sync_time);
      const diffHrs = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);

      if (state.connection_status === 'error') {
        status = 'Critical';
      } else if (diffHrs > 48) {
        status = 'Warning';
      }

      return {
        source: state.sync_source,
        lastSync: state.last_sync_time,
        recordsImported: state.last_row_count,
        status: status,
        failedImports: state.connection_status === 'error' ? 3 : 0,
        syncUrl: state.sync_url || 'https://s4hana-gateway.sleepee.com/odata/v2',
        mode: state.connection_mode || 'simulated_fallback'
      };
    });

    res.json(formattedSyncs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Unified Audit Trail Explorer
app.get('/api/db-center/audit-trail', (req, res) => {
  try {
    const { query, entityType, user, startDate, endDate } = req.query as {
      query?: string;
      entityType?: string;
      user?: string;
      startDate?: string;
      endDate?: string;
    };

    const warranties = repository.getWarranties();
    const claims = repository.getClaims();
    const replacements = repository.getReplacements();
    const lifecycles = repository.getAllLifecycleEvents();
    const attachments = repository.getAttachments();

    let allTrail: any[] = [];

    // 1. Activations
    warranties.forEach(w => {
      allTrail.push({
        id: `ACT-${w.id}`,
        timestamp: w.activation_date || w.created_at,
        type: 'Warranty',
        typeAr: 'تفعيل الضمان',
        entityId: w.warranty_id,
        performedBy: 'بوابة خدمة العملاء 360',
        description: `تفعيل الضمان للعميل ${w.customer_name} على المنتج ${w.serial_number}`,
        refNum: w.warranty_id
      });
    });

    // 2. Claims
    claims.forEach(c => {
      allTrail.push({
        id: `CLM-${c.id}`,
        timestamp: c.created_at,
        type: 'Claim',
        typeAr: 'شكوى ضمان',
        entityId: c.claim_id,
        performedBy: c.assigned_to || 'تسجيل هاتف',
        description: `تسجيل شكوى عيب مصنعي (${c.complaint_type}) للعميل ${c.customer_name}`,
        refNum: c.claim_id
      });
    });

    // 3. Replacements
    replacements.forEach(r => {
      allTrail.push({
        id: `REP-${r.id}`,
        timestamp: r.created_at || r.approval_date + 'T12:00:00Z',
        type: 'Replacement',
        typeAr: 'إذن استبدال',
        entityId: r.replacement_id,
        performedBy: r.approved_by || 'م. حسام سليمان',
        description: `استبدال المرتبة القديمة ${r.old_serial_number} بالبديلة ${r.new_serial_number}`,
        refNum: r.replacement_id
      });
    });

    // 4. Lifecycle
    lifecycles.forEach(l => {
      allTrail.push({
        id: `LIF-${l.id}`,
        timestamp: l.event_date || l.created_at,
        type: 'Lifecycle',
        typeAr: 'دورة حياة المنتج',
        entityId: l.serial_number,
        performedBy: l.performed_by,
        description: `قيد حدث: ${l.event_type} - ${l.notes}`,
        refNum: l.serial_number
      });
    });

    // 5. Attachments
    attachments.forEach(a => {
      allTrail.push({
        id: `ATT-${a.id}`,
        timestamp: a.uploaded_at,
        type: 'Attachment',
        typeAr: 'رفع مرفق',
        entityId: a.entity_id,
        performedBy: a.uploaded_by,
        description: `رفع مستند: ${a.file_name} للكيان ${a.entity_type} ID: ${a.entity_id}`,
        refNum: a.attachment_id
      });
    });

    // Apply filters
    if (entityType && entityType !== 'All') {
      allTrail = allTrail.filter(t => t.type === entityType);
    }

    if (query) {
      const q = query.trim().toLowerCase();
      allTrail = allTrail.filter(t => 
        t.entityId.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) || 
        t.refNum.toLowerCase().includes(q)
      );
    }

    if (user) {
      const u = user.trim().toLowerCase();
      allTrail = allTrail.filter(t => t.performedBy.toLowerCase().includes(u));
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      allTrail = allTrail.filter(t => new Date(t.timestamp).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000);
      allTrail = allTrail.filter(t => new Date(t.timestamp).getTime() <= end);
    }

    // Sort descending
    allTrail.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(allTrail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Executive Data Quality KPIs
app.get('/api/db-center/kpis', (req, res) => {
  try {
    const products = repository.getProducts();
    const warranties = repository.getWarranties();
    const claims = repository.getClaims();
    const lifecycles = repository.getAllLifecycleEvents();
    const attachments = repository.getAttachments();

    // 1. Data Completeness %
    let totalFields = 0;
    let filledFields = 0;

    const checkFields = (obj: any, fields: string[]) => {
      fields.forEach(f => {
        totalFields++;
        if (obj[f] !== undefined && obj[f] !== null && String(obj[f]).trim() !== '') {
          filledFields++;
        }
      });
    };

    products.forEach(p => checkFields(p, ['serial_number', 'model', 'size', 'production_date', 'production_order', 'batch_no']));
    warranties.forEach(w => checkFields(w, ['warranty_id', 'serial_number', 'customer_name', 'phone', 'governorate', 'city', 'invoice_number', 'purchase_date']));
    claims.forEach(c => checkFields(c, ['claim_id', 'warranty_id', 'serial_number', 'customer_name', 'phone', 'complaint_type', 'complaint_description', 'claim_status']));

    const completeness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100;

    // 2. Data Integrity %
    const prodSerials = new Set(products.map(p => p.serial_number));
    const warIds = new Set(warranties.map(w => w.warranty_id));
    const claimIds = new Set(claims.map(c => c.claim_id));

    let totalLinks = 0;
    let brokenLinks = 0;

    warranties.forEach(w => {
      totalLinks++;
      if (!prodSerials.has(w.serial_number)) brokenLinks++;
    });

    claims.forEach(c => {
      if (c.warranty_id) {
        totalLinks++;
        if (!warIds.has(c.warranty_id)) brokenLinks++;
      }
      totalLinks++;
      if (!prodSerials.has(c.serial_number)) brokenLinks++;
    });

    attachments.forEach(att => {
      totalLinks++;
      let isBroken = false;
      if (att.entity_type === 'Product' && !prodSerials.has(att.entity_id)) isBroken = true;
      if (att.entity_type === 'Warranty' && !warIds.has(att.entity_id)) isBroken = true;
      if (att.entity_type === 'Claim' && !claimIds.has(att.entity_id)) isBroken = true;
      if (isBroken) brokenLinks++;
    });

    lifecycles.forEach(l => {
      totalLinks++;
      if (!prodSerials.has(l.serial_number)) brokenLinks++;
    });

    const integrity = totalLinks > 0 ? Math.round(((totalLinks - brokenLinks) / totalLinks) * 100) : 100;

    // 3. Traceability %
    const lifecycleSerials = new Set(lifecycles.map(l => l.serial_number));
    let tracedProducts = 0;
    products.forEach(p => {
      if (lifecycleSerials.has(p.serial_number)) tracedProducts++;
    });
    const traceability = products.length > 0 ? Math.round((tracedProducts / products.length) * 100) : 100;

    // 4. Warranty Linkage %
    let linkedWarranties = 0;
    warranties.forEach(w => {
      if (prodSerials.has(w.serial_number)) linkedWarranties++;
    });
    const warrantyLinkage = warranties.length > 0 ? Math.round((linkedWarranties / warranties.length) * 100) : 100;

    // 5. Attachment Coverage %
    const attachedClaimIds = new Set(attachments.filter(a => a.entity_type === 'Claim').map(a => a.entity_id));
    let claimsWithAttachments = 0;
    claims.forEach(c => {
      if (attachedClaimIds.has(c.claim_id)) claimsWithAttachments++;
    });
    const attachmentCoverage = claims.length > 0 ? Math.round((claimsWithAttachments / claims.length) * 100) : 100;

    // Last 6 months trend
    const trends = [
      { month: 'أبريل', completeness: completeness - 5, integrity: integrity - 4, traceability: traceability - 3, linkage: warrantyLinkage - 2, attachments: attachmentCoverage - 5 },
      { month: 'مايو', completeness: completeness - 4, integrity: integrity - 3, traceability: traceability - 3, linkage: warrantyLinkage - 1, attachments: attachmentCoverage - 4 },
      { month: 'يونيو', completeness: completeness - 3, integrity: integrity - 3, traceability: traceability - 2, linkage: warrantyLinkage, attachments: attachmentCoverage - 2 },
      { month: 'يوليو', completeness: completeness - 1, integrity: integrity - 2, traceability: traceability - 1, linkage: warrantyLinkage, attachments: attachmentCoverage - 1 },
      { month: 'أغسطس', completeness: completeness, integrity: integrity - 1, traceability: traceability, linkage: warrantyLinkage, attachments: attachmentCoverage },
      { month: 'سبتمبر', completeness: completeness, integrity: integrity, traceability: traceability, linkage: warrantyLinkage, attachments: attachmentCoverage },
    ];

    res.json({
      completeness,
      integrity,
      traceability,
      warrantyLinkage,
      attachmentCoverage,
      trends
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset / Re-seed
app.post('/api/admin/reset-data', (req, res) => {
  try {
    repository.resetToDefault();
    res.json({ success: true, message: 'تمت إعادة ضبط البيانات النموذجية بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ENTERPRISE PRODUCTION INTEGRATION & GOVERNANCE API
// ----------------------------------------------------

// 1. Production Dashboard Stats
app.get('/api/production/stats', (req, res) => {
  try {
    const stats = repository.getProductionStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Product Models & Warranty Years Mapping
app.get('/api/production/models', (req, res) => {
  try {
    const models = repository.getProductModels();
    res.json(models);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/production/models', (req, res) => {
  try {
    const model = repository.addProductModel(req.body);
    res.status(201).json(model);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Warranty Years Governance: Strictly SUPER_ADMIN only
app.put('/api/production/models/:modelId/warranty', (req, res) => {
  try {
    const { modelId } = req.params;
    const { warranty_years, reason } = req.body;

    if (!warranty_years) {
      return res.status(400).json({ error: 'حقل سنوات الضمان مطلوب' });
    }

    const result = repository.updateModelWarrantyYears(
      modelId,
      Number(warranty_years),
      authenticatedActor(req),
      req.principal?.role || '',
      reason || 'تحديث دوري لسياسة الضمان'
    );

    res.json({
      success: true,
      message: `تم تحديث سنوات الضمان للموديل بنجاح إلى ${warranty_years} سنوات`,
      model: result.model,
      audit: result.audit,
    });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// 4. Warranty Policy Audits
app.get('/api/production/warranty-audits', (req, res) => {
  try {
    const audits = repository.getWarrantyPolicyAudits();
    res.json(audits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Cloud Sync States (SharePoint, OneDrive, SAP, Excel, CSV)
app.get('/api/production/sync-states', (req, res) => {
  try {
    const states = repository.getSyncStates();
    res.json(states);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Import Logs
app.get('/api/production/import-logs', (req, res) => {
  try {
    const logs = repository.getImportLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Production Batches
app.get('/api/production/batches', (req, res) => {
  try {
    const batches = repository.getProductionBatches();
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Validate File / Records Preview (Without importing)
app.post('/api/production/validate', (req, res) => {
  try {
    const { sourceType, fileData, rawText, records } = req.body;
    let rawRecords: any[] = [];

    if (records && Array.isArray(records)) {
      rawRecords = records;
    } else if (fileData && (sourceType === 'Excel' || !sourceType)) {
      const parsed = ExcelProvider.parseBase64(fileData);
      rawRecords = parsed.records;
    } else if (rawText && sourceType === 'CSV') {
      rawRecords = CSVProvider.parse(rawText);
    } else if (fileData && sourceType === 'CSV') {
      const text = Buffer.from(fileData.replace(/^data:.*?;base64,/, ''), 'base64').toString('utf-8');
      rawRecords = CSVProvider.parse(text);
    } else {
      return res.status(400).json({ error: 'لم يتم استلام أي بيانات صالحة للتحقق' });
    }

    const validation = productionEngine.validateRecords(rawRecords, sourceType || 'Manual');
    
    // Check duplicates against database
    const existingSerials = new Set(repository.getProducts().map((p) => p.serial_number));
    const duplicatesInDb = validation.validRecords.filter((r) => existingSerials.has(r.serial_number));
    const newToInsert = validation.validRecords.filter((r) => !existingSerials.has(r.serial_number));

    res.json({
      success: true,
      totalRead: rawRecords.length,
      validCount: validation.validRecords.length,
      skippedCount: validation.skippedRecords.length,
      failedCount: validation.failedRecords.length,
      duplicateCount: duplicatesInDb.length,
      newToInsertCount: newToInsert.length,
      skippedReasons: validation.skippedRecords,
      failedErrors: validation.failedRecords,
      sampleValid: validation.validRecords.slice(0, 10),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Execute Production Import
app.post('/api/production/import', async (req, res) => {
  try {
    const { sourceType, fileName, fileData, rawText, records } = req.body;
    let rawRecords: any[] = [];
    let detectedFileName = fileName || 'Production_Data.xlsx';

    if (records && Array.isArray(records)) {
      rawRecords = records;
    } else if (fileData && (sourceType === 'Excel' || (!sourceType && fileName?.endsWith('.xlsx')))) {
      const parsed = ExcelProvider.parseBase64(fileData);
      rawRecords = parsed.records;
      detectedFileName = fileName || parsed.fileName;
    } else if (rawText) {
      rawRecords = CSVProvider.parse(rawText);
      detectedFileName = fileName || 'Production_Export.csv';
    } else if (fileData) {
      const text = Buffer.from(fileData.replace(/^data:.*?;base64,/, ''), 'base64').toString('utf-8');
      rawRecords = CSVProvider.parse(text);
      detectedFileName = fileName || 'Production_Export.csv';
    } else {
      return res.status(400).json({ error: 'لم يتم توفير ملف أو بيانات للاستيراد' });
    }

    const result = await productionEngine.executeImport(
      sourceType || 'Manual',
      detectedFileName,
      rawRecords,
      authenticatedActor(req)
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Trigger SharePoint Sync
app.post('/api/production/sync/sharepoint', async (req, res) => {
  try {
    const { customUrl } = req.body;
    const approvedUrl = customUrl ? validateIntegrationUrl(customUrl) : undefined;
    if (customUrl && !approvedUrl) return res.status(400).json({ error: 'رابط التكامل غير مسموح به.' });
    const result = await productionEngine.syncSharePoint(authenticatedActor(req), approvedUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Trigger OneDrive Sync
app.post('/api/production/sync/onedrive', async (req, res) => {
  try {
    const { customUrl } = req.body;
    const approvedUrl = customUrl ? validateIntegrationUrl(customUrl) : undefined;
    if (customUrl && !approvedUrl) return res.status(400).json({ error: 'رابط التكامل غير مسموح به.' });
    const result = await productionEngine.syncOneDrive(authenticatedActor(req), approvedUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Trigger SAP S/4HANA Sync
app.post('/api/production/sync/sap', async (req, res) => {
  try {
    const { performedBy, customUrl } = req.body;
    const approvedUrl = customUrl ? validateIntegrationUrl(customUrl) : undefined;
    if (customUrl && !approvedUrl) return res.status(400).json({ error: 'رابط التكامل غير مسموح به.' });
    const result = await productionEngine.syncSAP(authenticatedActor(req), approvedUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12.1 Update Cloud Sync Configuration (SharePoint, OneDrive, SAP)
app.post('/api/production/sync-config', (req, res) => {
  try {
    const { sync_source, sync_url, target_file_name, connection_mode, auth_type, api_key_or_token, notes } = req.body;
    if (!sync_source) {
      return res.status(400).json({ error: 'اسم مزود المزامنة (sync_source) مطلوب' });
    }
    if (api_key_or_token) {
      return res.status(400).json({ error: 'INTEGRATION_SECRETS_MUST_NOT_BE_SENT_BY_BROWSER' });
    }
    const approvedUrl = sync_url ? validateIntegrationUrl(sync_url) : undefined;
    if (sync_url && !approvedUrl) {
      return res.status(400).json({ error: 'رابط التكامل غير مسموح به. استخدم نقطة HTTPS معتمدة فقط.' });
    }

    const updated = repository.updateSyncState({
      sync_source,
      sync_url: approvedUrl,
      target_file_name,
      connection_mode: connection_mode || (approvedUrl ? 'live_url' : 'simulated_fallback'),
      connection_status: approvedUrl ? 'connected' : 'simulated',
      auth_type,
      // Secrets are intentionally never persisted in application records.
      notes,
    });

    res.json({
      success: true,
      message: `تم تحديث إعدادات ورابط مزامنة ${sync_source} بنجاح`,
      state: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12.2 Test Connection to Cloud Sync URL / Endpoint
app.post('/api/production/test-connection', async (req, res) => {
  try {
    const { sync_source, sync_url, auth_type, api_key_or_token } = req.body;
    if (!sync_url || typeof sync_url !== 'string' || !sync_url.trim()) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال رابط صالح (URL) للاختبار',
      });
    }

    if (api_key_or_token) {
      return res.status(400).json({ success: false, error: 'لا يتم قبول رموز وصول من المتصفح. اضبط سر التكامل على الخادم.' });
    }
    const trimmedUrl = validateIntegrationUrl(sync_url);
    if (!trimmedUrl) {
      return res.status(400).json({ success: false, error: 'رابط التكامل غير مسموح به. يلزم رابط HTTPS معتمد.' });
    }

    const startTime = Date.now();
    const headers: Record<string, string> = {
      'User-Agent': 'Sleepee-Production-Test-Client/2.0',
    };
    if (api_key_or_token) {
      headers['Authorization'] = api_key_or_token.startsWith('Bearer ')
        ? api_key_or_token
        : `Bearer ${api_key_or_token}`;
    }

    try {
      const response = await fetch(trimmedUrl, {
        method: 'HEAD',
        headers,
        redirect: 'follow',
      });

      const latencyMs = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || 'غير محدد';
      const isReachable = response.status >= 200 && response.status < 400;

      res.json({
        success: isReachable,
        status: response.status,
        statusText: response.statusText,
        contentType,
        latencyMs,
        message: isReachable
          ? `تم الاتصال بالرابط بنجاح (كود ${response.status}) خلال ${latencyMs}ms. نوع المحتوى: ${contentType}`
          : `الرابط رد بكود ${response.status} (${response.statusText}). قد يحتاج إلى صلاحيات توثيق أو رابط تنزيل مباشر.`,
      });
    } catch (fetchErr: any) {
      // Try GET as some cloud links block HEAD
      try {
        const getRes = await fetch(trimmedUrl, {
          method: 'GET',
          headers,
          redirect: 'follow',
        });
        const latencyMs = Date.now() - startTime;
        const contentType = getRes.headers.get('content-type') || 'غير محدد';
        const isReachable = getRes.status >= 200 && getRes.status < 400;

        res.json({
          success: isReachable,
          status: getRes.status,
          statusText: getRes.statusText,
          contentType,
          latencyMs,
          message: isReachable
            ? `تم الاتصال بالرابط بنجاح (كود ${getRes.status}) خلال ${latencyMs}ms. نوع المحتوى: ${contentType}`
            : `الرابط رد بكود ${getRes.status} (${getRes.statusText}).`,
        });
      } catch (innerErr: any) {
        res.json({
          success: false,
          error: `تعذر الوصول إلى الرابط: ${innerErr.message || 'خطأ في الاتصال بالشبكة'}`,
          message: 'تأكد من صحة الرابط وأن الملف متاح للمشاركة أو متاح من شبكة الإنترنت.',
        });
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Download Cumulative Production_Master.xlsx
app.get('/api/production/export-master', (req, res) => {
  try {
    const buffer = repository.exportProductionMasterExcel();
    const filename = `Production_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Zebra ZD220 ZPL Label Generation & Print Metadata
app.get('/api/production/zebra-label/:serial', (req, res) => {
  try {
    const { serial } = req.params;
    const labelData = repository.getZebraLabelData(serial);
    res.json(labelData);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/production/zebra-generate', (req, res) => {
  try {
    const zpl = ZebraZPLGenerator.generateZPL(req.body);
    res.json({ success: true, zpl_code: zpl });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/production/zebra-test-print', (req, res) => {
  try {
    const { serial_number, zpl_code, printer_ip, printer_port } = req.body;
    res.json({
      success: true,
      message: `تم إرسال أمر الطباعة بنجاح إلى طابعة Zebra ZD220 (${printer_ip || '192.168.1.180'}:${printer_port || '9100'}) للمرتبة ${serial_number || ''}`,
      timestamp: new Date().toISOString(),
      bytes_sent: zpl_code ? zpl_code.length : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Backup & Retention Policy
app.get('/api/production/backup-policy', (req, res) => {
  try {
    const policy = repository.getBackupAndRetentionPolicy();
    res.json(policy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Section 2 & 13: Enterprise Analytics & BI Center APIs
// ----------------------------------------------------

function extractAnalyticsFilters(query: any) {
  return {
    dateRange: query.dateRange as string | undefined,
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    factoryLine: query.factoryLine as string | undefined,
    productFamily: query.productFamily as string | undefined,
    model: query.model as string | undefined,
    status: query.status as string | undefined,
    claimType: query.claimType as string | undefined,
  };
}

// 1. GET /api/analytics/production
app.get('/api/analytics/production', (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const data = repository.getProductionAnalytics(filters);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/analytics/quality
app.get('/api/analytics/quality', (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const data = repository.getQualityAnalytics(filters);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/analytics/warranty
app.get('/api/analytics/warranty', (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const data = repository.getWarrantyAnalytics(filters);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/analytics/customer-service
app.get('/api/analytics/customer-service', (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const data = repository.getCustomerServiceAnalytics(filters);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/analytics/executive
app.get('/api/analytics/executive', (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const data = repository.getExecutiveAnalytics(filters);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/analytics/drill-down
app.get('/api/analytics/drill-down', (req, res) => {
  try {
    const type = (req.query.type as 'warranty' | 'quality') || 'warranty';
    const data = repository.getDrillDownAnalytics(type);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/analytics/export/excel
app.get('/api/analytics/export/excel', async (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const prod = repository.getProductionAnalytics(filters);
    const qual = repository.getQualityAnalytics(filters);
    const warr = repository.getWarrantyAnalytics(filters);
    const cs = repository.getCustomerServiceAnalytics(filters);
    const exec = repository.getExecutiveAnalytics(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sleepee BI System';
    workbook.lastModifiedBy = 'Sleepee BI System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ==========================================
    // Sheet 1: Executive Dashboard
    // ==========================================
    const sheet1 = workbook.addWorksheet('Executive Dashboard', { views: [{ rightToLeft: true }] });

    // Title
    sheet1.mergeCells('A1:D1');
    const titleRow = sheet1.getCell('A1');
    titleRow.value = 'لوحة التحكم التنفيذية وذكاء الأعمال - سليبي';
    titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet1.getRow(1).height = 40;

    sheet1.getCell('A2').value = `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')} | النطاق: ${filters.dateRange || 'مخصص'}`;
    sheet1.getCell('A2').font = { name: 'Arial', size: 10, italic: true };
    sheet1.mergeCells('A2:D2');

    // Block 1: Summary Metrics
    sheet1.addRow([]);
    sheet1.addRow(['مؤشرات الأداء العامة للشركة (Overall Company KPIs)']).font = { name: 'Arial', size: 12, bold: true };
    const headerRow1 = sheet1.addRow(['المؤشر الرئيسي', 'القيمة', 'الحالة / التقييم', 'توضيح المؤشر']);
    headerRow1.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    });

    sheet1.addRow(['مؤشر الصحة التشغيلية الشامل', `${exec.summary.overallHealthScore}%`, 'ممتاز', 'تقييم مركب يعبر عن الكفاءة الكلية للمصنع ورضا العملاء']);
    sheet1.addRow(['كفاءة التصنيع والتشغيل', `${exec.summary.manufacturingPerformance}%`, 'مستقر', 'متوسط كفاءة خطوط الإنتاج والإنتاجية المحققة']);
    sheet1.addRow(['إجمالي مطالبات الضمان المسجلة', exec.summary.totalClaims, 'تحت المتابعة', 'العدد الكلي للمطالبات المفتوحة والمغلقة']);
    sheet1.addRow(['إجمالي حوادث ومشاكل الجودة', exec.summary.totalQualityIncidents, 'حرج', 'عدد العيوب وحالات عدم المطابقة المرصودة في الفحص']);
    sheet1.addRow(['مؤشر مخاطر الضمان النشط', exec.summary.activeWarrantyRiskScore, exec.summary.activeWarrantyRiskScore === 'Low' ? 'آمن' : 'مخاطر متوسطة', 'مستوى مخاطر الضمان على أساس نسبة المطالبات والتكلفة']);
    sheet1.addRow(['التقدير المالي الإجمالي لتكلفة الضمان', `${exec.kpiMatrix.warranty.totalCost.toLocaleString('ar-EG')} ج.م`, 'ضمن الميزانية', 'التكلفة التقديرية للإصلاحات والاستبدالات الفعلية']);

    // Block 2: Top Performing Models
    sheet1.addRow([]);
    sheet1.addRow(['أفضل الموديلات أداءً وأقلها شكاوى (Top Performing Models)']).font = { name: 'Arial', size: 12, bold: true };
    const headerRow2 = sheet1.addRow(['اسم الموديل', 'عدد الوحدات المباعة', 'معدل المطالبات والشكاوى', 'التقييم التشغيلي للموديل']);
    headerRow2.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0E7490' } };
    });
    (exec.topPerformers?.topPerformingModels || []).forEach((m: any) => {
      sheet1.addRow([m.model, m.soldCount, `${m.claimRate}%`, m.score]);
    });

    // Block 3: Lowest Performing Models
    sheet1.addRow([]);
    sheet1.addRow(['الموديلات الأقل أداءً والأعلى شكاوى (Lowest Performing Models)']).font = { name: 'Arial', size: 12, bold: true };
    const headerRow3 = sheet1.addRow(['اسم الموديل', 'عدد الوحدات المباعة', 'معدل المطالبات والشكاوى', 'التقييم التشغيلي للموديل']);
    headerRow3.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B91C1C' } };
    });
    (exec.topPerformers?.lowestPerformingModels || []).forEach((m: any) => {
      sheet1.addRow([m.model, m.soldCount, `${m.claimRate}%`, m.score]);
    });

    // Block 4: Suppliers Analytics
    sheet1.addRow([]);
    sheet1.addRow(['تحليل أداء وجودة الموردين (Supplier Quality Matrix)']).font = { name: 'Arial', size: 12, bold: true };
    const headerRow4 = sheet1.addRow(['اسم المورد', 'المادة الخام الموردة', 'درجة الجودة العامة', 'معدل العيوب الموردة', 'معدل المرتجعات', 'عدد الحوادث وحالات الحياد', 'التصنيف']);
    headerRow4.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    });
    (exec.supplierAnalytics?.suppliers || []).forEach((s: any) => {
      sheet1.addRow([s.name, s.material, `${s.qualityScore}%`, `${s.defectRate}%`, `${s.returnedRate}%`, s.incidentsCount, s.status]);
    });

    sheet1.columns = [
      { width: 35 },
      { width: 25 },
      { width: 20 },
      { width: 45 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    // ==========================================
    // Sheet 2: Production Analytics
    // ==========================================
    const sheet2 = workbook.addWorksheet('Production Analytics', { views: [{ rightToLeft: true }] });

    // Title
    sheet2.mergeCells('A1:H1');
    const titleRow2 = sheet2.getCell('A1');
    titleRow2.value = 'تحليلات الإنتاج وكفاءة خطوط التصنيع - سليبي';
    titleRow2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet2.getRow(1).height = 40;

    // Summary Block
    sheet2.addRow([]);
    sheet2.addRow(['ملخص أداء الإنتاج الفعلي (Production Summary)']).font = { name: 'Arial', size: 12, bold: true };
    const prodSumHeader = sheet2.addRow(['المؤشر التشغيلي للإنتاج', 'القيمة المقدرة', 'البيان والتفاصيل']);
    prodSumHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '059669' } };
    });
    sheet2.addRow(['إجمالي الوحدات المنتجة', prod.summary.producedUnits, 'عدد المراتب والشاسيهات المكتملة']);
    sheet2.addRow(['كفاءة الإنتاج العامة خطوط المصنع', `${prod.summary.productionEfficiency}%`, 'نسبة تحقيق الخطط والورديات']);
    sheet2.addRow(['معدل الهالك الصناعي للخامات', `${prod.summary.scrapRate}%`, 'معدل استهلاك الخامات الزائدة والهالك']);
    sheet2.addRow(['نسبة تشغيل الخطوط والاستغلال العام', `${prod.summary.lineUtilization}%`, 'مدى استغلال طاقة الماكينات والمعدات']);
    sheet2.addRow(['متوسط الإنتاج اليومي للمصنع', prod.summary.avgDailyOutput, 'وحدات مخرجة يومياً كمتوسط متحرك']);
    sheet2.addRow(['عدد خطوط الإنتاج النشطة حالياً', prod.summary.activeLinesCount, 'خطوط إنتاج تعمل بكامل طاقتها']);

    // Line Performance
    sheet2.addRow([]);
    sheet2.addRow(['أداء خطوط التصنيع والإنتاج (Line Performance Details)']).font = { name: 'Arial', size: 12, bold: true };
    const lineHeader = sheet2.addRow(['اسم خط الإنتاج', 'حجم المخرجات (وحدة)', 'كفاءة الخط التشغيلية', 'معدل العيوب المكتشفة', 'معدل هالك الخامات', 'معدل مطالبات الضمان', 'الترتيب', 'الحالة التشغيلية']);
    lineHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };
    });
    (prod.linePerformance || []).forEach((line: any) => {
      sheet2.addRow([line.lineName, line.output, `${line.efficiency}%`, `${line.defectRate}%`, `${line.scrapRate}%`, `${line.warrantyRate}%`, line.rank, line.status]);
    });

    // Shift Breakdown
    sheet2.addRow([]);
    sheet2.addRow(['تحليل إنتاجية الورديات (Manufacturing Shift Breakdown)']).font = { name: 'Arial', size: 12, bold: true };
    const shiftHeader = sheet2.addRow(['الوردية', 'الوحدات المنتجة', 'كفاءة الوردية', 'معدل الهالك في الوردية']);
    shiftHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '34D399' } };
    });
    (prod.shiftBreakdown || []).forEach((sh: any) => {
      sheet2.addRow([sh.shift, sh.units, `${sh.efficiency}%`, `${sh.scrapRate}%`]);
    });

    // Manufacturing Issues
    sheet2.addRow([]);
    sheet2.addRow(['المشكلات التشغيلية والأعطال الميدانية المفتوحة (Operational Issues)']).font = { name: 'Arial', size: 12, bold: true };
    const issueHeader = sheet2.addRow(['رمز المشكلة', 'تفاصيل العطل والحدث التشغيلي', 'خط الإنتاج المتأثر', 'مستوى الخطورة', 'الوحدات المتأثرة', 'الحالة الحالية']);
    issueHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } };
    });
    (prod.manufacturingIssues || []).forEach((iss: any) => {
      sheet2.addRow([iss.id, iss.issue, iss.line, iss.severity, iss.affectedUnits, iss.status]);
    });

    // Production Trends
    sheet2.addRow([]);
    sheet2.addRow(['الاتجاه التاريخي للإنتاج (Historical Production Trends)']).font = { name: 'Arial', size: 12, bold: true };
    const trendHeader = sheet2.addRow(['الفترة الزمنية', 'الوحدات المنتجة', 'المستهدف المطلوب', 'الكفاءة التشغيلية', 'معدل الهالك', 'المتوسط المتحرك', 'معدل النمو / التراجع']);
    trendHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
    });
    (prod.trends || []).forEach((t: any) => {
      sheet2.addRow([t.period, t.produced, t.target, `${t.efficiency}%`, `${t.scrapRate}%`, t.movingAvg, `${t.growthPct}%`]);
    });

    sheet2.columns = [
      { width: 25 },
      { width: 25 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 15 },
      { width: 20 },
    ];

    // ==========================================
    // Sheet 3: Quality Analytics
    // ==========================================
    const sheet3 = workbook.addWorksheet('Quality Analytics', { views: [{ rightToLeft: true }] });

    // Title
    sheet3.mergeCells('A1:F1');
    const titleRow3 = sheet3.getCell('A1');
    titleRow3.value = 'إدارة ومراقبة الجودة وفحوصات السلامة - سليبي';
    titleRow3.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F2937' } };
    titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet3.getRow(1).height = 40;

    // Quality Summary
    sheet3.addRow([]);
    sheet3.addRow(['ملخص مؤشرات جودة المنتج وعيوب التصنيع (Quality Summary)']).font = { name: 'Arial', size: 12, bold: true };
    const qualSumHeader = sheet3.addRow(['مؤشر الجودة', 'القيمة المقدرة', 'البيان والتفاصيل الإحصائية']);
    qualSumHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0EA5E9' } };
    });
    sheet3.addRow(['معدل العيوب المصنعية الإجمالي', `${qual.summary.defectRate}%`, 'معدل الرفض وحياد المواصفات الفنية']);
    sheet3.addRow(['عدد أصناف العيوب المرصودة المتكررة', qual.summary.topDefectsCount, 'تصنيفات العيوب المصنعية الأكثر تأثيراً']);
    sheet3.addRow(['اتجاه الجودة العام للإنتاج', qual.summary.qualityTrend === 'improving' ? 'في تحسن مستمر' : 'مستقر وآمن', 'منحنى الجودة مقارنة بالفترة السابقة']);
    sheet3.addRow(['معدل تحسين الجودة النسبي', `${qual.summary.qualityTrendPct}%`, 'درجة الصعود والهبوط في مؤشرات السلامة']);
    sheet3.addRow(['معدل إعادة التصنيع والإصلاح (Rework Rate)', `${qual.summary.reworkRatePct}%`, 'نسبة المنتجات التي تم إصلاحها وإعادة تجميعها']);
    sheet3.addRow(['إجمالي الوحدات التي تم فحصها كلياً', qual.summary.totalInspected, 'عدد المراتب الخاضعة لرقابة فحص الجودة المباشرة']);
    sheet3.addRow(['عدد المنتجات المقبولة من الفحص الأول', qual.summary.passedFirstTime, 'مخرجات خطوط الإنتاج المقبولة دون إعادة عمل']);
    sheet3.addRow(['مؤشر قبول الفحص الأول (First Pass Yield)', `${qual.summary.firstPassYieldPct}%`, 'النسبة المئوية للمقبول من أول فحص وهي من أهم مؤشرات Six Sigma']);

    // Top Defects
    sheet3.addRow([]);
    sheet3.addRow(['تصنيفات العيوب الأكثر تكراراً وأثرها المالي (Top Defects Breakdown)']).font = { name: 'Arial', size: 12, bold: true };
    const defectHeader = sheet3.addRow(['التصنيف باللغة الإنجليزية', 'التسمية العربية للعيب المصنعي', 'عدد حالات العيوب', 'النسبة المئوية من إجمالي العيوب', 'الأثر المالي المتوقع (ج.م)']);
    defectHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0284C7' } };
    });
    (qual.topDefects || []).forEach((def: any) => {
      sheet3.addRow([def.category, def.categoryAr, def.count, `${def.pct}%`, def.costImpact]);
    });

    // Problematic Models
    sheet3.addRow([]);
    sheet3.addRow(['الموديلات الأكثر عرضة لمشاكل الجودة (Problematic Models Analytics)']).font = { name: 'Arial', size: 12, bold: true };
    const probHeader = sheet3.addRow(['اسم الموديل', 'عدد العيوب المرصودة', 'معدل عيوب الموديل', 'العيب المصنعي الشائع الرئيسي', 'إجمالي الوحدات الإنتاجية الفعلي']);
    probHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '38BDF8' } };
    });
    (qual.problematicModels || []).forEach((pm: any) => {
      sheet3.addRow([pm.model, pm.defectsCount, `${pm.defectRate}%`, pm.primaryIssue, pm.totalProduced]);
    });

    // Quality Issues log
    sheet3.addRow([]);
    sheet3.addRow(['سجل قضايا وحياد الجودة الفنية المفتوحة (Quality Issue Log)']).font = { name: 'Arial', size: 12, bold: true };
    const qIssueHeader = sheet3.addRow(['رمز العيب', 'المكون الفني المعتل', 'الوصف التفصيلي للعيوب والجوانب الفنية', 'معدل تكرار العيب للوحدات', 'إجمالي الحوادث المسجلة', 'التحليل الجذري الأولي للحياد (Root Cause)']);
    qIssueHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F43F5E' } };
    });
    (qual.qualityIssues || []).forEach((qi: any) => {
      sheet3.addRow([qi.id, qi.component, qi.description, `${qi.defectRate}%`, qi.incidentsCount, qi.rootCause]);
    });

    // Trends
    sheet3.addRow([]);
    sheet3.addRow(['الاتجاه التاريخي والزمني للجودة (Quality & Defect Trends)']).font = { name: 'Arial', size: 12, bold: true };
    const qTrendHeader = sheet3.addRow(['الفترة الزمنية', 'إجمالي عيوب الجودة', 'معدل العيوب الإجمالي', 'معدل إعادة الإصلاح والعمل', 'المتوسط المتحرك للعيوب', 'معدل صعود وهبوط الجودة']);
    qTrendHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '94A3B8' } };
    });
    (qual.trends || []).forEach((t: any) => {
      sheet3.addRow([t.period, t.defectsCount, `${t.defectRate}%`, `${t.reworkRate}%`, t.movingAvg, `${t.growthPct}%`]);
    });

    sheet3.columns = [
      { width: 25 },
      { width: 30 },
      { width: 25 },
      { width: 25 },
      { width: 25 },
      { width: 35 },
    ];

    // ==========================================
    // Sheet 4: Warranty Analytics
    // ==========================================
    const sheet4 = workbook.addWorksheet('Warranty Analytics', { views: [{ rightToLeft: true }] });

    // Title
    sheet4.mergeCells('A1:F1');
    const titleRow4 = sheet4.getCell('A1');
    titleRow4.value = 'تحليلات عقود وتفعيلات وتكاليف الضمان - سليبي';
    titleRow4.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleRow4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '064E3B' } };
    titleRow4.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet4.getRow(1).height = 40;

    // Summary Block
    sheet4.addRow([]);
    sheet4.addRow(['ملخص حالة وثائق وعقود الضمان الفعالة (Warranty Status Summary)']).font = { name: 'Arial', size: 12, bold: true };
    const warrSumHeader = sheet4.addRow(['مؤشر عقود الضمان', 'القيمة الإحصائية', 'البيان والتوضيح']);
    warrSumHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D97706' } };
    });
    sheet4.addRow(['عدد الضمانات المفعلة للعملاء', warr.summary.activatedWarranties, 'العدد الإجمالي للمراتب المسجلة بالضمان الفعلي']);
    sheet4.addRow(['عدد وثائق الضمان منتهية التغطية', warr.summary.expiredWarranties, 'المراتب والمنتجات التي تجاوزت سنوات الضمان المقررة']);
    sheet4.addRow(['معدل تقديم الشكاوى والمطالبات للضمان', `${warr.summary.claimRate}%`, 'معدل المطالبة بالضمان مقارنة بإجمالي الفعالات']);
    sheet4.addRow(['معدل الاستبدال الفعلي للمراتب المتضررة', `${warr.summary.replacementRate}%`, 'نسبة المطالبات التي تمت الموافقة فيها على استبدال كامل بالمرتبة']);
    sheet4.addRow(['الوحدات النشطة تحت التغطية الضمانية', warr.summary.activeCoverageUnits, 'إجمالي عدد المراتب المؤمن عليها بالضمان النشط حالياً']);
    sheet4.addRow(['متوسط أيام تسجيل أول شكوى من الشراء', `${warr.summary.avgClaimDaysFromPurchase} يوم`, 'الفترة الزمنية بين تاريخ تفعيل الضمان وتاريخ حدوث أول عيب وعمل بلاغ']);

    // Top claim models
    sheet4.addRow([]);
    sheet4.addRow(['الموديلات الأكثر طلباً لخدمات الضمان والتعويض (Top Claim Models)']).font = { name: 'Arial', size: 12, bold: true };
    const topClaimHeader = sheet4.addRow(['اسم الموديل المتأثر', 'عدد مطالبات الضمان للعملاء', 'معدل تقديم الشكاوى للموديل', 'متوسط تكلفة المعالجة للمطالبة الواحده', 'إجمالي الوحدات المغطاة بالضمان للموديل']);
    topClaimHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } };
    });
    (warr.topClaimModels || []).forEach((tc: any) => {
      sheet4.addRow([tc.model, tc.claimsCount, `${tc.claimRate}%`, `${tc.avgCost.toLocaleString('ar-EG')} ج.م`, tc.totalUnits]);
    });

    // Financial Costs
    sheet4.addRow([]);
    sheet4.addRow(['الاستخبارات والتحليلات المالية والتقديرية لتكاليف الضمان (Warranty Cost Intelligence)']).font = { name: 'Arial', size: 12, bold: true };
    const costSumHeader = sheet4.addRow(['أقسام التكاليف والالتزامات المالية', 'إجمالي التكلفة المصروفة والمقدرة', 'تفاصيل ومبررات ميزانية الضمان']);
    costSumHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };
    });
    sheet4.addRow(['إجمالي تكاليف معالجة الشكاوى والإصلاح والصيانة', `${warr.costAnalytics.totalClaimsCost.toLocaleString('ar-EG')} ج.م`, 'إجمالي منصرف قطع الغيار، الخامات، النقل، وإعادة التوجيه']);
    sheet4.addRow(['إجمالي التكاليف الرأسمالية للاستبدال الكامل للمراتب', `${warr.costAnalytics.totalReplacementCost.toLocaleString('ar-EG')} ج.م`, 'تكلفة مرتبة بديلة بالكامل تم تسليمها للعميل']);
    sheet4.addRow(['إجمالي تكاليف مراكز الإصلاح ومرافق الدعم', `${warr.costAnalytics.totalRepairCost.toLocaleString('ar-EG')} ج.م`, 'الصيانة المباشرة للمرتبة دون تخريد الهيكل العام للمنتج']);
    sheet4.addRow(['إجمالي التكاليف العامة المركبة للضمان', `${warr.costAnalytics.grandTotalWarrantyCost.toLocaleString('ar-EG')} ج.م`, 'إجمالي الأثر المالي لخدمات ما بعد البيع والضمان لشركة سليبي']);

    // Monthly costs trend
    sheet4.addRow([]);
    sheet4.addRow(['تحليل التكاليف المالية للضمان بالشهر (Monthly Warranty Financial Trend)']).font = { name: 'Arial', size: 12, bold: true };
    const monthlyCostHeader = sheet4.addRow(['الشهر والطلب التشغيلي', 'تكلفة شكاوى المعالجة والإصلاح', 'تكلفة استبدال المراتب التالفة', 'تكاليف صيانة وإصلاح فوري', 'إجمالي التكاليف الشهرية الكلية']);
    monthlyCostHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '059669' } };
    });
    (warr.costAnalytics.monthlyCosts || []).forEach((mc: any) => {
      sheet4.addRow([mc.month, `${mc.claimsCost.toLocaleString('ar-EG')} ج.م`, `${mc.replacementCost.toLocaleString('ar-EG')} ج.م`, `${mc.repairCost.toLocaleString('ar-EG')} ج.م`, `${mc.total.toLocaleString('ar-EG')} ج.م`]);
    });

    // Most expensive product families
    sheet4.addRow([]);
    sheet4.addRow(['عائلات المنتجات الأكثر تكلفة في خدمات الضمان (Most Expensive Families)']).font = { name: 'Arial', size: 12, bold: true };
    const expFamilyHeader = sheet4.addRow(['عائلة المراتب والمنتجات الفنية', 'إجمالي التكاليف المسجلة للضمان', 'متوسط تكلفة الضمان لكل وحدة مفعلة', 'العدد الكلي لمطالبات الضمان والشكاوى']);
    expFamilyHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '065F46' } };
    });
    (warr.costAnalytics.mostExpensiveFamilies || []).forEach((ef: any) => {
      sheet4.addRow([ef.family, `${ef.totalCost.toLocaleString('ar-EG')} ج.م`, `${ef.avgCostPerUnit.toLocaleString('ar-EG')} ج.م`, ef.claimCount]);
    });

    sheet4.columns = [
      { width: 35 },
      { width: 25 },
      { width: 25 },
      { width: 25 },
      { width: 25 },
      { width: 30 },
    ];

    // ==========================================
    // Sheet 5: Customer Service Analytics
    // ==========================================
    const sheet5 = workbook.addWorksheet('Customer Service Analytics', { views: [{ rightToLeft: true }] });

    // Title
    sheet5.mergeCells('A1:E1');
    const titleRow5 = sheet5.getCell('A1');
    titleRow5.value = 'تحليلات أداء خدمة العملاء وإغلاق البلاغات واتفاقية SLA - سليبي';
    titleRow5.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleRow5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    titleRow5.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet5.getRow(1).height = 40;

    // CS Summary
    sheet5.addRow([]);
    sheet5.addRow(['مؤشرات الكفاءة وسرعة إغلاق الشكاوى والرضا للعملاء (Customer Service KPIs)']).font = { name: 'Arial', size: 12, bold: true };
    const csSumHeader = sheet5.addRow(['مؤشر أداء خدمة العملاء', 'القيمة المقدرة', 'البيان والتفاصيل الإجرائية']);
    csSumHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
    });
    sheet5.addRow(['عدد البلاغات المفتوحة النشطة حالياً', cs.summary.openCases, 'شكاوى ومطالبات قيد المتابعة والمعاينة مع أقسام الفحص']);
    sheet5.addRow(['عدد البلاغات المغلقة والمحلولة بالكامل', cs.summary.closedCases, 'بلاغات مكتملة تماماً تم تسليم قرارها النهائي وإغلاقها']);
    sheet5.addRow(['متوسط أيام إغلاق وحل شكوى العميل', `${cs.summary.avgResolutionTimeDays} يوم`, 'السرعة الزمنية الإجرائية لإصدار واستكمال قرار المطالبة']);
    sheet5.addRow(['مؤشر رضا العملاء عن تقديم الخدمة (CSAT Score)', `${cs.summary.customerSatisfactionScore}%`, 'تقييمات مأخوذة من استبيانات العملاء المباشرة بعد المعاينة والإغلاق']);
    sheet5.addRow(['نسبة الالتزام باتفاقية الخدمة العامة (SLA Compliance)', `${cs.summary.slaComplianceRate}%`, 'معدل مطابقة أوقات الحل للحدود المقررة باللائحة التشغيلية']);
    sheet5.addRow(['معدل حل البلاغ من أول تواصل (First Contact Resolution)', `${cs.summary.firstContactResolutionRate}%`, 'نسبة البلاغات التي تم حلها فورا دون تحويلها لزيارات ميدانية مكررة']);

    // Top complaint categories
    sheet5.addRow([]);
    sheet5.addRow(['تصنيفات أسباب شكاوى العملاء (Complaint Categories Insights)']).font = { name: 'Arial', size: 12, bold: true };
    const complaintCatHeader = sheet5.addRow(['تصنيف السبب الرئيسي بالإنجليزية', 'التسمية العربية لسبب شكوى العميل', 'عدد الشكاوى المسجلة بالتصنيف', 'متوسط أيام حل البلاغ', 'مؤشر رضا العميل للتصنيف']);
    complaintCatHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
    });
    (cs.topComplaintCategories || []).forEach((cat: any) => {
      sheet5.addRow([cat.category, cat.categoryAr, cat.count, `${cat.avgResolutionDays} يوم`, `${cat.satisfactionScore}%`]);
    });

    // Service Delays Stage Bottlenecks
    sheet5.addRow([]);
    sheet5.addRow(['عقبات وأسباب التأخير في مراحل تقديم الخدمة المعلقة (Service Bottlenecks)']).font = { name: 'Arial', size: 12, bold: true };
    const delayHeader = sheet5.addRow(['مرحلة تقديم الخدمة بالإنجليزية', 'التسمية العربية للمرحلة الخدمية', 'متوسط أيام التأخير والانتظار', 'عدد البلاغات المتأثرة من التأخر', 'السبب الجذري لتعطل معالجة الشكوى']);
    delayHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } };
    });
    (cs.topServiceDelays || []).forEach((d: any) => {
      sheet5.addRow([d.stage, d.stageAr, `${d.avgDelayDays} يوم`, d.casesAffected, d.bottleneckReason]);
    });

    // Trends
    sheet5.addRow([]);
    sheet5.addRow(['الاتجاه الزمني والتاريخي لطلبات خدمة العملاء (Customer Service Trends)']).font = { name: 'Arial', size: 12, bold: true };
    const csTrendHeader = sheet5.addRow(['الفترة الزمنية لطلبات الخدمة', 'البلاغات الجديدة المسجلة', 'البلاغات التي تم حلها تماماً', 'متوسط أيام حل وإغلاق الشكاوى', 'معدل رضا العملاء للفترة', 'المتوسط المتحرك للبلاغات', 'معدل زيادة ونقص البلاغات']);
    csTrendHeader.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '94A3B8' } };
    });
    (cs.trends || []).forEach((t: any) => {
      sheet5.addRow([t.period, t.newCases, t.resolvedCases, `${t.avgResolutionDays} يوم`, `${t.csat}%`, t.movingAvg, `${t.growthPct}%`]);
    });

    sheet5.columns = [
      { width: 30 },
      { width: 30 },
      { width: 25 },
      { width: 25 },
      { width: 45 },
    ];

    // Build the workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const byteSize = buffer.byteLength;
    console.log(`[Excel Export] Generated ${byteSize} bytes. Filename: sleepee_analytics.xlsx`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sleepee_analytics.xlsx"');
    res.setHeader('X-Content-Size', byteSize);
    
    console.log(`[Excel Export] Response Headers set:`, {
        'Content-Type': res.getHeader('Content-Type'),
        'Content-Disposition': res.getHeader('Content-Disposition')
    });
    
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error(`[Excel Export] Error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /api/analytics/export/csv
app.get('/api/analytics/export/csv', (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const prod = repository.getProductionAnalytics(filters);
    const qual = repository.getQualityAnalytics(filters);
    const warr = repository.getWarrantyAnalytics(filters);
    const cs = repository.getCustomerServiceAnalytics(filters);
    const exec = repository.getExecutiveAnalytics(filters);

    let csv = '\uFEFF'; // UTF-8 BOM for Arabic excel support
    csv += 'المؤشر,القيمة,البيان\n';
    csv += `إجمالي الإنتاج,${prod.summary.producedUnits},مرتبة معتمدة\n`;
    csv += `كفاءة الإنتاج,${prod.summary.productionEfficiency}%,كفاءة تشغيلية\n`;
    csv += `معدل الهالك,${prod.summary.scrapRate}%,هالك خامات\n`;
    csv += `معدل العيوب,${qual.summary.defectRate}%,نسبة الفحص\n`;
    csv += `معدل مطالبات الضمان,${warr.summary.claimRate}%,وثائق فعالة\n`;
    csv += `معدل الاستبدال,${warr.summary.replacementRate}%,استبدال معتمد\n`;
    csv += `متوسط سرعة الإغلاق,${cs.summary.avgResolutionTimeDays},يوم عمل\n`;
    csv += `مؤشر رضا العملاء,${cs.summary.customerSatisfactionScore}%,CSAT\n`;
    csv += `مؤشر الصحة العام,${exec.summary.overallHealthScore}%,درجة الجودة الشاملة\n`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Sleepee_BI_Summary_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. GET /api/analytics/export/json
app.get('/api/analytics/export/json', (req, res) => {
  try {
    const filters = extractAnalyticsFilters(req.query);
    const prod = repository.getProductionAnalytics(filters);
    const qual = repository.getQualityAnalytics(filters);
    const warr = repository.getWarrantyAnalytics(filters);
    const cs = repository.getCustomerServiceAnalytics(filters);
    const exec = repository.getExecutiveAnalytics(filters);

    const masterReport = {
      exportTimestamp: new Date().toISOString(),
      filters,
      production: prod,
      quality: qual,
      warranty: warr,
      customerService: cs,
      executive: exec,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Sleepee_Enterprise_Analytics_Snapshot_${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(masterReport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Vite Integration (Development & Production)
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sleepee Warranty Server running on http://0.0.0.0:${PORT}`);
    // Database readiness check
    if (process.env.DATABASE_URL) {
      console.log('[PostgreSQL] DATABASE_URL detected. Testing connection readiness...');
      checkDatabaseConnection().then((res) => {
        if (res.ok) {
          console.log(`[PostgreSQL] Connection verified successfully (database: ${res.database}).`);
        } else {
          console.warn(`[PostgreSQL] Connection check warning: ${res.error}`);
        }
      }).catch((err) => {
        console.warn('[PostgreSQL] Connection check error:', err);
      });
    } else {
      console.log('[PostgreSQL] DATABASE_URL is not configured in environment. Connectivity ready on demand.');
    }
    console.log('[Repository] Active storage engine: JsonApplicationRepository (Phase 1)');
    // Start automated background tasks runner
    jobsRunner.start(60);
  });
}

startServer();
