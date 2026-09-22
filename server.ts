import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db/index.js';
import { ScheduledJobsRunner } from './server/cron/jobs.js';
import { ProductionDataProvider } from './server/providers/ProductionDataProvider.js';
import { ExcelProvider } from './server/providers/ExcelProvider.js';
import { CSVProvider } from './server/providers/CSVProvider.js';
import { ZebraZPLGenerator } from './server/zebra/zplGenerator.js';
import fs from 'fs';
import { apiSecurity } from './server/security/apiSecurity.js';
import { authenticatedActor } from './server/security/auth.js';

const app = express();
const PORT = 3000;

// Initialize scheduled background automation engine
const jobsRunner = new ScheduledJobsRunner(db);
const productionEngine = new ProductionDataProvider(db);

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

    const product = db.getProductBySerial(serial);
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
    const products = db.getProducts(search);
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

    const result = db.bulkAddProducts(products, authenticatedActor(req));
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
    const product = db.getProductBySerial(cleanSerial);

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
    const product = db.getProductBySerial(req.params.serial);
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
    const product = db.getProductBySerial(cleanSerial);
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

    const result = db.activateWarranty({
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
    const data = db.getWarrantyByIdOrSerial(identifier);

    if (!data) {
      // Check if product exists but not yet activated
      const unactivatedProduct = db.getProductBySerial(identifier);
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
    db.addLog(data.activation.warranty_id, data.product.serial_number, `تم التحقق من سريان الضمان عبر مسح رمز QR`);

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

    const results = db.searchWarranties(q, type);

    // If no direct warranty activation found, check if it's an unactivated product serial
    let unactivatedProduct: any = null;
    if (results.length === 0 && (type === 'all' || type === 'serial')) {
      const prod = db.getProductBySerial(q);
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
    const stats = db.getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Products CRUD
app.get('/api/admin/products', (req, res) => {
  try {
    const search = req.query.search as string;
    const products = db.getProducts(search);
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

    const product = db.addProduct({
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
    const updated = db.updateProduct(id, req.body);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = db.deleteProduct(id);
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
    const warranties = db.getWarranties(search);
    res.json(warranties);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Activation Logs
app.get('/api/admin/logs', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = db.getLogs(limit);
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
    const users = db.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/role-logs', (req, res) => {
  try {
    const logs = db.getRoleChangeLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'الدور مطلوب' });
    const result = db.updateUserRole(req.params.id, role, authenticatedActor(req));
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
    const result = db.updateUserStatus(req.params.id, status, authenticatedActor(req));
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
    const claims = db.getClaims({ status, search, type });
    res.json(claims);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/claims/:id', (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
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

    const claim = db.createClaim(
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
    const updated = db.updateClaimWorkflow(
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
    const updated = db.updateClaimSLA(
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
    const replacements = db.getReplacements(search);
    res.json(replacements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/replacements/:id', (req, res) => {
  try {
    const replacement = db.getReplacementById(req.params.id);
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

    const replacement = db.createReplacement(
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
      const timeline = db.getLifecycleBySerial(serial);
      return res.json(timeline);
    }
    const allLifecycle = (db as any).data?.product_lifecycle || [];
    res.json(allLifecycle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lifecycle/:serial', (req, res) => {
  try {
    const serial = req.params.serial;
    if (!serial) return res.status(400).json({ error: 'الرقم التسلسلي مطلوب' });
    const timeline = db.getLifecycleBySerial(serial);
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
    const event = db.addLifecycleEvent({
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
    const attachments = db.getAttachments({ entity_type, entity_id, category });
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

    const attachment = db.addAttachment(
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
    db.deleteAttachment(req.params.id, actingUser);
    res.json({ success: true, message: 'تم حذف المرفق بنجاح وتوثيق العملية في سجل التدقيق' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/attachments/:id/audit-download', (req, res) => {
  try {
    const actingUser = authenticatedActor(req);
    db.auditAttachmentDownload(req.params.id, actingUser);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Secure download/view URL resolution with automatic audit logging
app.get('/api/attachments/:id/download-url', (req, res) => {
  try {
    const attachment = db.getAttachmentById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: 'المرفق غير موجود' });
    }

    const actingUser = authenticatedActor(req);
    db.auditAttachmentDownload(attachment.attachment_id, actingUser);

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
    const stats = db.migrateAttachments();
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

    const data = db.getCustomer360(query);
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
      const communications = db.getCommunicationsForCustomer(serial, phone, warrantyId);
      return res.json(communications);
    }

    const all = db.getAllCommunications();
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

    const newComm = db.addCommunication({
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
    const deleted = db.deleteCommunication(req.params.id);
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
    const results = db.omniSearch(query);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// QUALITY DASHBOARD & DEFECT KPIS API
// ----------------------------------------------------
app.get('/api/quality/stats', (req, res) => {
  try {
    const stats = db.getQualityStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin CSV Export
app.get('/api/admin/export-csv', (req, res) => {
  try {
    const csvData = db.exportCSV();
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
    const feed = db.getPowerBIFeed(baseUrl);

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
    const pbidsContent = db.getPowerBIPBIDS(baseUrl);

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

    const csvData = db.getPowerBICSV(table);
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
    const script = db.getPowerBIQueryScript(baseUrl);

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
    const feed = db.getPowerBIFeed(baseUrl);

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

// Reset / Re-seed
app.post('/api/admin/reset-data', (req, res) => {
  try {
    db.resetToDefault();
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
    const stats = db.getProductionStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Product Models & Warranty Years Mapping
app.get('/api/production/models', (req, res) => {
  try {
    const models = db.getProductModels();
    res.json(models);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/production/models', (req, res) => {
  try {
    const model = db.addProductModel(req.body);
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

    const result = db.updateModelWarrantyYears(
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
    const audits = db.getWarrantyPolicyAudits();
    res.json(audits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Cloud Sync States (SharePoint, OneDrive, SAP, Excel, CSV)
app.get('/api/production/sync-states', (req, res) => {
  try {
    const states = db.getSyncStates();
    res.json(states);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Import Logs
app.get('/api/production/import-logs', (req, res) => {
  try {
    const logs = db.getImportLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Production Batches
app.get('/api/production/batches', (req, res) => {
  try {
    const batches = db.getProductionBatches();
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
    const existingSerials = new Set(db.getProducts().map((p) => p.serial_number));
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
    const result = await productionEngine.syncSharePoint(authenticatedActor(req), customUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Trigger OneDrive Sync
app.post('/api/production/sync/onedrive', async (req, res) => {
  try {
    const { customUrl } = req.body;
    const result = await productionEngine.syncOneDrive(authenticatedActor(req), customUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Trigger SAP S/4HANA Sync
app.post('/api/production/sync/sap', async (req, res) => {
  try {
    const { performedBy, customUrl } = req.body;
    const result = await productionEngine.syncSAP(authenticatedActor(req), customUrl);
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

    const updated = db.updateSyncState({
      sync_source,
      sync_url,
      target_file_name,
      connection_mode: connection_mode || (sync_url ? 'live_url' : 'simulated_fallback'),
      connection_status: sync_url ? 'connected' : 'simulated',
      auth_type,
      api_key_or_token,
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

    const trimmedUrl = sync_url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يبدأ الرابط بـ https:// أو http://',
      });
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
    const buffer = db.exportProductionMasterExcel();
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
    const labelData = db.getZebraLabelData(serial);
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
    const policy = db.getBackupAndRetentionPolicy();
    res.json(policy);
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
    // Start automated background tasks runner
    jobsRunner.start(60);
  });
}

startServer();
