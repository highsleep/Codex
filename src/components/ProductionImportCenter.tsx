import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Printer,
  ShieldCheck,
  Calendar,
  Eye,
  Search,
  AlertTriangle,
  FileText,
  Clock,
  Plus,
  Play,
  RotateCcw,
  CheckSquare,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  Tag,
  Sliders,
  ShieldAlert,
  SlidersHorizontal,
  Workflow,
  Copy,
  Check,
  Save,
  FileSpreadsheet,
  QrCode,
  Sparkles,
  BarChart2,
  ChevronRight,
  ArrowRight,
  Shield,
  Layers3,
  ListOrdered
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  AppUser,
  ProductModel,
  ProductionOrder,
  ProductionOrderSource,
  ZebraLabelData,
  ProductCategoryMaster,
  BrandMaster,
  ModelMaster,
  ManufacturingSystemMaster,
  ProductMasterRecord
} from '../types';

interface ProductionImportCenterProps {
  currentUser: AppUser;
  onRefreshData?: () => void;
}

interface PrinterJob {
  jobId: string;
  timestamp: string;
  user: string;
  printer: string;
  template: string;
  quantity: number;
  result: 'Success' | 'Failed' | 'Queued';
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  category: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'PRINT' | 'IMPORT' | 'SYNC' | 'SECURITY';
  details: string;
}

interface LabelTemplate {
  id: string;
  name: string;
  type: 'zebra_100x80' | 'zebra_100x50' | 'warranty_card' | 'qr_label';
  widthMm: number;
  heightMm: number;
  version: string;
  showLogo: boolean;
  showQR: boolean;
  showBarcode: boolean;
  showWarrantyBadge: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  primaryColor: string;
  updatedAt: string;
}

export const ProductionImportCenter: React.FC<ProductionImportCenterProps> = ({
  currentUser,
  onRefreshData,
}) => {
  // 4 Core Tabs
  const [activeTab, setActiveTab] = useState<'quick-run' | 'orders' | 'traceability' | 'quality'>('quick-run');

  // Label Preview Modal State
  const [showLabelPreviewModal, setShowLabelPreviewModal] = useState<boolean>(false);
  const [previewLabelOrder, setPreviewLabelOrder] = useState<ProductionOrder | null>(null);

  // Reprint / Damaged replacement modal states
  const [showReprintModal, setShowReprintModal] = useState<boolean>(false);
  const [showDamagedModal, setShowDamagedModal] = useState<boolean>(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<ProductionOrder | null>(null);
  const [reprintReason, setReprintReason] = useState<string>('تلف الملصق أثناء عملية التغليف الحراري');
  const [damagedScrapReason, setDamagedScrapReason] = useState<string>('تمزق الملصق مع عيب في قماش المرتبة');
  const [damagedNewSerial, setDamagedNewSerial] = useState<string>('');

  // Source selection & filtering in orders tab
  const [selectedSourceType, setSelectedSourceType] = useState<ProductionOrderSource | 'ALL'>('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Core Data State
  const [models, setModels] = useState<ProductModel[]>([
    {
      model_id: 'MOD-001',
      commercial_model_name: 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
      sap_material_code: 'MAT-ROYAL-180',
      sap_material_description: 'Royal Pocket Spring Mattress 180x200',
      product_family: 'Pocket Spring',
      warranty_years: 10,
      status: 'Active',
      created_at: '2026-01-10'
    },
    {
      model_id: 'MOD-002',
      commercial_model_name: 'سليبي سوبر ميموري فوم (Super Memory Foam)',
      sap_material_code: 'MAT-MEM-160',
      sap_material_description: 'Super Memory Foam Mattress 160x200',
      product_family: 'Medical Foam',
      warranty_years: 10,
      status: 'Active',
      created_at: '2026-01-15'
    },
    {
      model_id: 'MOD-003',
      commercial_model_name: 'سليبي سوبر كراون (Super Crown)',
      sap_material_code: 'MAT-CROWN-180',
      sap_material_description: 'Super Crown Hybrid Mattress 180x200',
      product_family: 'Hybrid Luxury',
      warranty_years: 10,
      status: 'Active',
      created_at: '2026-02-01'
    }
  ]);

  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([
    {
      id: 'po-1',
      orderNumber: 'PO-2026-1001',
      batchNumber: 'B26-0001',
      productionDate: new Date().toISOString().split('T')[0],
      mattressModel: 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
      mattressSize: '180x200x30 سم',
      warrantyYears: 10,
      productionQuantity: 50,
      productionLine: 'خط الإنتاج الرئيسي (Line A)',
      sourceType: 'MANUAL',
      sourceReference: 'إدخال يدوي',
      status: 'Approved',
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      generatedSerials: [],
      printedCount: 0
    },
    {
      id: 'po-2',
      orderNumber: 'PO-2026-1002',
      batchNumber: 'B26-0002',
      productionDate: new Date().toISOString().split('T')[0],
      mattressModel: 'سليبي سوبر ميموري فوم (Super Memory Foam)',
      mattressSize: '160x200x25 سم',
      warrantyYears: 10,
      productionQuantity: 30,
      productionLine: 'خط الإنتاج الطبي (Line B)',
      sourceType: 'MANUAL',
      sourceReference: 'إدخال يدوي',
      status: 'Serial Generated',
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      generatedSerials: Array.from({ length: 30 }, (_, i) => `SLP-2026-${String(i + 1).padStart(6, '0')}`),
      printedCount: 12
    }
  ]);

  // Phase 9 Master Data Foundation Lists
  const [masterCategories, setMasterCategories] = useState<ProductCategoryMaster[]>([]);
  const [masterBrands, setMasterBrands] = useState<BrandMaster[]>([]);
  const [masterModels, setMasterModels] = useState<ModelMaster[]>([]);
  const [masterSystems, setMasterSystems] = useState<ManufacturingSystemMaster[]>([]);
  const [masterProducts, setMasterProducts] = useState<ProductMasterRecord[]>([]);

  // Form State for Production Order Entry
  const [manualForm, setManualForm] = useState({
    productionDate: new Date().toISOString().split('T')[0],
    orderNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    batchNumber: `B26-${Math.floor(1000 + Math.random() * 9000)}`,
    categoryId: 'CAT-01',
    brandId: 'BRD-01',
    modelId: 'MOD-01',
    manufacturingSystemId: 'MFS-01',
    mattressModel: 'سليبي - رويال بوكيت سبرينج (ألماني)',
    mattressSize: '180x200x30 سم',
    warrantyYears: 10,
    productionQuantity: 50,
    productionLine: 'خط الإنتاج الرئيسي (Line A)',
    notes: '',
    sourceReference: 'إدخال يدوي'
  });

  // Printer & Print Jobs State
  const [printJobs, setPrintJobs] = useState<PrinterJob[]>([
    { jobId: 'JOB-901', timestamp: '2026-09-24 14:20', user: currentUser.name, printer: 'Zebra ZD220 Industrial', template: 'Zebra 100x80 (Standard)', quantity: 12, result: 'Success' },
    { jobId: 'JOB-902', timestamp: '2026-09-24 11:10', user: currentUser.name, printer: 'Zebra ZD220 Industrial', template: 'Zebra 100x50 (Compact)', quantity: 30, result: 'Success' }
  ]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    { id: 'ALT-101', timestamp: '2026-09-24 14:00', action: 'إنشاء أمر إنتاج جديد', actor: currentUser.name, category: 'CREATE', details: 'أمر رقم PO-2026-1002 كمية 30' },
    { id: 'ALT-102', timestamp: '2026-09-24 12:30', action: 'توليد سيريالات', actor: currentUser.name, category: 'APPROVE', details: 'توليد 30 رقم تسلسلي للتشغيلة B26-0002' }
  ]);

  // Templates Management State
  const [templates, setTemplates] = useState<LabelTemplate[]>([
    {
      id: 'tpl-1',
      name: 'Zebra 100x80 مم (ملصق المرتبة القياسي)',
      type: 'zebra_100x80',
      widthMm: 100,
      heightMm: 80,
      version: 'v2.4',
      showLogo: true,
      showQR: true,
      showBarcode: true,
      showWarrantyBadge: true,
      fontSize: 'md',
      primaryColor: '#D4AF37',
      updatedAt: '2026-09-24 10:00'
    },
    {
      id: 'tpl-2',
      name: 'Zebra 100x50 مم (الملصق المدمج 4×2)',
      type: 'zebra_100x50',
      widthMm: 100,
      heightMm: 50,
      version: 'v1.8',
      showLogo: true,
      showQR: true,
      showBarcode: true,
      showWarrantyBadge: false,
      fontSize: 'sm',
      primaryColor: '#08152F',
      updatedAt: '2026-09-20 12:00'
    },
    {
      id: 'tpl-3',
      name: 'بطاقة الضمان المصنعي (Warranty Card A6)',
      type: 'warranty_card',
      widthMm: 148,
      heightMm: 105,
      version: 'v3.0',
      showLogo: true,
      showQR: true,
      showBarcode: true,
      showWarrantyBadge: true,
      fontSize: 'lg',
      primaryColor: '#E53935',
      updatedAt: '2026-09-18 15:30'
    },
    {
      id: 'tpl-4',
      name: 'ملصق QR الذكي (QR Label 50x50)',
      type: 'qr_label',
      widthMm: 50,
      heightMm: 50,
      version: 'v1.2',
      showLogo: false,
      showQR: true,
      showBarcode: false,
      showWarrantyBadge: true,
      fontSize: 'sm',
      primaryColor: '#08152F',
      updatedAt: '2026-09-15 09:00'
    }
  ]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-1');
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate>(templates[0]);
  const [templateSavedMsg, setTemplateSavedMsg] = useState<string | null>(null);

  // QR preview state for modal
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');

  // Fetch backend data
  const fetchBackendData = async () => {
    try {
      const [ordersRes, jobsRes, logsRes, catRes, brdRes, modRes, sysRes, prmRes] = await Promise.all([
        fetch('/api/production-orders').then(r => (r.ok ? r.json() : [])),
        fetch('/api/print-jobs').then(r => (r.ok ? r.json() : [])),
        fetch('/api/audit-logs').then(r => (r.ok ? r.json() : [])),
        fetch('/api/product-categories').then(r => (r.ok ? r.json() : [])),
        fetch('/api/brands').then(r => (r.ok ? r.json() : [])),
        fetch('/api/models').then(r => (r.ok ? r.json() : [])),
        fetch('/api/manufacturing-systems').then(r => (r.ok ? r.json() : [])),
        fetch('/api/product-master').then(r => (r.ok ? r.json() : [])),
      ]);

      if (Array.isArray(ordersRes) && ordersRes.length > 0) {
        setProductionOrders(ordersRes);
      }
      if (Array.isArray(jobsRes) && jobsRes.length > 0) {
        setPrintJobs(jobsRes);
      }
      if (Array.isArray(logsRes) && logsRes.length > 0) {
        setAuditLogs(logsRes);
      }
      if (Array.isArray(catRes) && catRes.length > 0) {
        setMasterCategories(catRes);
      }
      if (Array.isArray(brdRes) && brdRes.length > 0) {
        setMasterBrands(brdRes);
      }
      if (Array.isArray(modRes) && modRes.length > 0) {
        setMasterModels(modRes);
      }
      if (Array.isArray(sysRes) && sysRes.length > 0) {
        setMasterSystems(sysRes);
      }
      if (Array.isArray(prmRes) && prmRes.length > 0) {
        setMasterProducts(prmRes);
      }

      // Auto-set initial selections if unset
      if (Array.isArray(catRes) && catRes.length > 0 && Array.isArray(brdRes) && brdRes.length > 0) {
        setManualForm(prev => {
          const activeCats = catRes.filter(c => c.status === 'ACTIVE');
          const activeBrands = brdRes.filter(b => b.status === 'ACTIVE');
          const cat = prev.categoryId && catRes.some(c => c.id === prev.categoryId)
            ? prev.categoryId
            : activeCats[0]?.id || catRes[0].id;
          const brd = prev.brandId && brdRes.some(b => b.id === prev.brandId)
            ? prev.brandId
            : activeBrands[0]?.id || brdRes[0].id;
          const brandModels = Array.isArray(modRes) ? modRes.filter(m => m.brand_id === brd && m.status === 'ACTIVE') : [];
          const mod = prev.modelId && modRes.some(m => m.id === prev.modelId)
            ? prev.modelId
            : brandModels[0]?.id || modRes?.[0]?.id || '';
          const activeSys = Array.isArray(sysRes) ? sysRes.filter(s => s.status === 'ACTIVE') : [];
          const sys = prev.manufacturingSystemId && sysRes.some(s => s.id === prev.manufacturingSystemId)
            ? prev.manufacturingSystemId
            : activeSys[0]?.id || sysRes?.[0]?.id || '';
          const selModelObj = modRes?.find(m => m.id === mod);

          return {
            ...prev,
            categoryId: cat,
            brandId: brd,
            modelId: mod,
            manufacturingSystemId: sys,
            warrantyYears: selModelObj?.warranty_years || prev.warrantyYears || 10,
          };
        });
      }
    } catch (err) {
      console.error('Error fetching backend data:', err);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  useEffect(() => {
    const tpl = templates.find(t => t.id === selectedTemplateId) || templates[0];
    setEditingTemplate(tpl);
  }, [selectedTemplateId, templates]);

  // Generate QR for active preview order
  useEffect(() => {
    if (previewLabelOrder) {
      const serial = previewLabelOrder.generatedSerials?.[0] || `SLP-2026-${previewLabelOrder.orderNumber.replace(/\D/g, '') || '001001'}`;
      const url = `${window.location.origin}/?verify=${encodeURIComponent(serial)}`;
      QRCode.toDataURL(url, { width: 140, margin: 1 })
        .then(u => setPreviewQrDataUrl(u))
        .catch(() => {});
    }
  }, [previewLabelOrder]);

  const logAudit = async (action: string, category: AuditLogEntry['category'], details: string) => {
    const newEntry: AuditLogEntry = {
      id: `ALT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action,
      actor: currentUser.name,
      category,
      details
    };
    setAuditLogs(prev => [newEntry, ...prev]);
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, actor: currentUser.name, category, details }),
      });
    } catch (e) {}
  };

  // 1. Create Production Order (Draft or Approved)
  const handleCreateOrder = async (autoApprove: boolean) => {
    if (!manualForm.productionQuantity || manualForm.productionQuantity <= 0) {
      alert('يرجى تحديد كمية إنتاج صالحة');
      return;
    }

    const catObj = masterCategories.find(c => c.id === manualForm.categoryId) || masterCategories[0];
    const brdObj = masterBrands.find(b => b.id === manualForm.brandId) || masterBrands[0];
    const modObj = masterModels.find(m => m.id === manualForm.modelId) || masterModels.find(m => m.brand_id === brdObj?.id) || masterModels[0];
    const sysObj = masterSystems.find(s => s.id === manualForm.manufacturingSystemId) || masterSystems[0];

    if (!catObj || !brdObj || !modObj || !sysObj) {
      alert('يرجى تحديد: فئة المنتج ← العلامة التجارية ← الموديل ← نظام التصنيع');
      return;
    }

    const derivedModel = `${brdObj.name} - ${modObj.name} (${sysObj.name})`;

    try {
      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionDate: manualForm.productionDate,
          orderNumber: manualForm.orderNumber,
          batchNumber: manualForm.batchNumber,
          categoryId: catObj.id,
          brandId: brdObj.id,
          modelId: modObj.id,
          manufacturingSystemId: sysObj.id,
          mattressModel: derivedModel,
          mattressSize: manualForm.mattressSize,
          warrantyYears: Number(manualForm.warrantyYears || modObj.warranty_years || 10),
          productionQuantity: Number(manualForm.productionQuantity),
          productionLine: manualForm.productionLine,
          notes: manualForm.notes,
          sourceType: 'MANUAL',
          sourceReference: 'إدخال يدوي',
          status: autoApprove ? 'Approved' : 'Draft'
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        if (autoApprove) {
          await fetch(`/api/production-orders/${data.order.id}/approve`, { method: 'POST' });
        }
        await fetchBackendData();
        logAudit('إنشاء أمر إنتاج', 'CREATE', `أمر ${data.order.orderNumber} - كمية ${data.order.productionQuantity} (${autoApprove ? 'معتمد' : 'مسودة'})`);
        alert(`تم حفظ أمر الإنتاج ${data.order.orderNumber} بنجاح!`);
        setManualForm({
          ...manualForm,
          orderNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          batchNumber: `B26-${Math.floor(1000 + Math.random() * 9000)}`,
          notes: ''
        });
      } else {
        alert(data.error || 'حدث خطأ أثناء حفظ أمر الإنتاج');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال بالخادم');
    }
  };

  // 2. Generate Serials
  const handleGenerateSerials = async (order: ProductionOrder) => {
    try {
      const res = await fetch(`/api/production-orders/${order.id}/generate-serials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedBy: currentUser.name })
      });
      const data = await res.json();
      if (data.success) {
        await fetchBackendData();
        logAudit('توليد سيريالات', 'APPROVE', `توليد ${order.productionQuantity} سيريال لأمر الإنتاج ${order.orderNumber}`);
        alert(`تم توليد وحفظ ${order.productionQuantity} رقم تسلسلي فريد بنجاح!`);
      } else {
        alert(data.error || 'فشل توليد السيريالات');
      }
    } catch (err) {
      alert('حدث خطأ أثناء توليد السيريالات');
    }
  };

  // 3. Print Labels (Zebra ZD220)
  const handlePrintLabels = async (order: ProductionOrder) => {
    try {
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer: 'Zebra ZD220 Industrial (TCP/IP)',
          template: 'Zebra 100x80 (Standard)',
          quantity: order.productionQuantity,
          user: currentUser.name,
          orderId: order.id,
          orderNumber: order.orderNumber
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchBackendData();
        logAudit('طباعة ملصقات Zebra', 'PRINT', `إرسال أمر طباعة لـ ${order.productionQuantity} ملصق لأمر ${order.orderNumber}`);
        alert(`تم إرسال أمر الطباعة بنجاح لطابعة Zebra ZD220 لـ ${order.productionQuantity} ملصق!`);
      } else {
        alert(data.error || 'حدث خطأ أثناء إرسال أمر الطباعة');
      }
    } catch (err) {
      alert('فشل الاتصال بالطابعة');
    }
  };

  // 4. Reprint Action with reason
  const handleExecuteReprint = async () => {
    if (!selectedOrderForAction) return;
    try {
      await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer: 'Zebra ZD220 Industrial (TCP/IP)',
          template: 'Zebra 100x80 (Reprint)',
          quantity: 1,
          user: currentUser.name,
          orderId: selectedOrderForAction.id,
          orderNumber: selectedOrderForAction.orderNumber,
          notes: `إعادة طباعة - السبب: ${reprintReason}`
        })
      });
      await fetchBackendData();
      logAudit('إعادة طباعة ملصق', 'PRINT', `إعادة طباعة ملصق لأمر ${selectedOrderForAction.orderNumber} - السبب: ${reprintReason}`);
      alert('تم إرسال أمر إعادة الطباعة إلى طابعة Zebra وتسجيل السبب في سجل التدقيق بنجاح.');
      setShowReprintModal(false);
      setSelectedOrderForAction(null);
    } catch (err) {
      alert('حدث خطأ أثناء إعادة الطباعة');
    }
  };

  // 5. Damaged replacement print action
  const handleExecuteDamagedReplacement = async () => {
    if (!selectedOrderForAction) return;
    try {
      const generatedReplacementSerial = `SLP-2026-REP${Math.floor(1000 + Math.random() * 9000)}`;
      await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer: 'Zebra ZD220 Industrial (TCP/IP)',
          template: 'Zebra 100x80 (Damaged Replacement)',
          quantity: 1,
          user: currentUser.name,
          orderId: selectedOrderForAction.id,
          orderNumber: selectedOrderForAction.orderNumber,
          notes: `طباعة بدل تالف - السيريال الجديد: ${generatedReplacementSerial} - السبب: ${damagedScrapReason}`
        })
      });
      await fetchBackendData();
      logAudit('طباعة بدل تالف', 'PRINT', `طباعة ملصق بدل تالف (${generatedReplacementSerial}) لأمر ${selectedOrderForAction.orderNumber} - السبب: ${damagedScrapReason}`);
      alert(`تم إصدار وطباعة ملصق البدل التالف (${generatedReplacementSerial}) وربطه بسجل الجودة بنجاح.`);
      setShowDamagedModal(false);
      setSelectedOrderForAction(null);
    } catch (err) {
      alert('حدث خطأ أثناء طباعة البدل التالف');
    }
  };

  // Template Management Handlers
  const handleSaveTemplateVersion = () => {
    const updated = templates.map(t => {
      if (t.id === editingTemplate.id) {
        return {
          ...editingTemplate,
          version: `v${(parseFloat(editingTemplate.version.replace('v', '')) + 0.1).toFixed(1)}`,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      }
      return t;
    });
    setTemplates(updated);
    setTemplateSavedMsg(`تم حفظ إصدار القالب الجديد بنجاح (${editingTemplate.name})`);
    setTimeout(() => setTemplateSavedMsg(null), 3000);
  };

  const handleDuplicateTemplate = () => {
    const newTpl: LabelTemplate = {
      ...editingTemplate,
      id: `tpl-${Date.now().toString().slice(-4)}`,
      name: `نسخة من ${editingTemplate.name}`,
      version: 'v1.0',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setTemplates([...templates, newTpl]);
    setSelectedTemplateId(newTpl.id);
    setTemplateSavedMsg(`تم تكرار القالب بنجاح بنسخة جديدة`);
    setTimeout(() => setTemplateSavedMsg(null), 3000);
  };

  const handleRestoreTemplate = (tpl: LabelTemplate) => {
    setEditingTemplate(tpl);
    setTemplateSavedMsg(`تم استعادة بيانات القالب الافتراضية`);
    setTimeout(() => setTemplateSavedMsg(null), 3000);
  };

  // Filtered orders list
  const filteredOrders = productionOrders.filter(o => {
    const matchesSource = selectedSourceType === 'ALL' || o.sourceType === selectedSourceType;
    const matchesSearch = !orderSearchQuery.trim() || 
      o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.batchNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.mattressModel.toLowerCase().includes(orderSearchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

  const activeQuickOrder = productionOrders[0] || null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6 font-['Cairo'] text-right" dir="rtl">
      
      {/* 1. COMPACT ENTERPRISE HEADER BANNER */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#08152F] via-[#E53935] to-[#D4AF37]" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#08152F] text-[#D4AF37] flex items-center justify-center shadow-md shrink-0">
              <Printer className="w-7 h-7" />
            </div>
            <div>
              {/* Max two-level breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <span className="text-[#E53935] font-bold">القسم: إدارة الإنتاج والطباعة</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-bold">
                  {activeTab === 'quick-run' && 'التشغيل السريع الموحد'}
                  {activeTab === 'orders' && 'أوامر الإنتاج وسجل التشغيل'}
                  {activeTab === 'traceability' && 'التتبع وإدارة قوالب الليبل'}
                  {activeTab === 'quality' && 'الجودة والاعتماد الفني'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#08152F] tracking-tight">
                إدارة الإنتاج والطباعة
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                منظومة التشغيل الفوري، إصدار وتتبع أوامر الإنتاج، وطباعة بطاقات الضمان وملصقات Zebra الحرارية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>طابعة Zebra ZD220 جاهزة</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 SIMPLIFIED NAVIGATION TABS */}
      <div className="bg-white rounded-2xl p-1.5 border border-[#E5E7EB] shadow-xs grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <button
          onClick={() => setActiveTab('quick-run')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'quick-run'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. التشغيل السريع</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. أوامر الإنتاج</span>
        </button>

        <button
          onClick={() => setActiveTab('traceability')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'traceability'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>3. التتبع والطباعة</span>
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'quality'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>4. الجودة والاعتماد</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: QUICK RUN (SINGLE-SCREEN WORKFLOW) - DEFAULT TAB */}
      {/* ================================================================= */}
      {activeTab === 'quick-run' && (
        <div className="space-y-6">
          
          {/* Main Action Card: 6 Step Quick Flow in One Place */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                  <Play className="w-5 h-5 text-[#E53935]" />
                  <span>دورة التشغيل السريع الموحدة (Single-Screen Production & Printing Flow)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل أمر الإنتاج ← اعتمد ← ولّد السيريالات ← اطبع أو أعد الطباعة فوراً في خطوة واحدة بدون تنقل بين الشاشات.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (activeQuickOrder) {
                      setPreviewLabelOrder(activeQuickOrder);
                      setShowLabelPreviewModal(true);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-amber-600" />
                  <span>معاينة الملصق والـ QR</span>
                </button>
              </div>
            </div>

            {/* Step 1: Order Input Form Fields */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="text-xs font-black text-[#E53935] uppercase tracking-wider block">
                  1. مسار إدخال أمر الإنتاج المعتمد (Category → Brand → Model → System):
                </span>
                {/* Master Product Code Badge */}
                {(() => {
                  const cat = masterCategories.find(c => c.id === manualForm.categoryId);
                  const brd = masterBrands.find(b => b.id === manualForm.brandId);
                  const mod = masterModels.find(m => m.id === manualForm.modelId);
                  const sys = masterSystems.find(s => s.id === manualForm.manufacturingSystemId);
                  const code = `${cat?.code?.slice(0, 3) || 'MAT'}-${brd?.code?.slice(0, 3) || 'SLP'}-${mod?.code?.slice(0, 3) || 'MOD'}-${sys?.code?.slice(0, 3) || 'SYS'}`;
                  return (
                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-[#D4AF37] font-mono text-[11px] font-bold border border-slate-700">
                      كود الماستر التلقائي: {code}
                    </span>
                  );
                })()}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* 1. Category */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">فئة المنتج (Category):</label>
                  <select
                    value={manualForm.categoryId}
                    onChange={(e) => setManualForm({ ...manualForm, categoryId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    {masterCategories.filter(c => c.status === 'ACTIVE').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Brand */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">العلامة التجارية (Brand):</label>
                  <select
                    value={manualForm.brandId}
                    onChange={(e) => {
                      const newBrandId = e.target.value;
                      const brandModels = masterModels.filter(m => m.brand_id === newBrandId && m.status === 'ACTIVE');
                      const firstMod = brandModels[0];
                      setManualForm({
                        ...manualForm,
                        brandId: newBrandId,
                        modelId: firstMod?.id || '',
                        warrantyYears: firstMod?.warranty_years || manualForm.warrantyYears
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    {masterBrands.filter(b => b.status === 'ACTIVE').map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Model (linked to Brand only) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الموديل (مرتبط بالعلامة فقط):</label>
                  <select
                    value={manualForm.modelId}
                    onChange={(e) => {
                      const modId = e.target.value;
                      const selMod = masterModels.find(m => m.id === modId);
                      setManualForm({
                        ...manualForm,
                        modelId: modId,
                        warrantyYears: selMod?.warranty_years || manualForm.warrantyYears
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                  >
                    {masterModels
                      .filter(m => m.brand_id === manualForm.brandId && m.status === 'ACTIVE')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.code})
                        </option>
                      ))}
                  </select>
                </div>

                {/* 4. Manufacturing System */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نظام التصنيع (System):</label>
                  <select
                    value={manualForm.manufacturingSystemId}
                    onChange={(e) => setManualForm({ ...manualForm, manufacturingSystemId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    {masterSystems.filter(s => s.status === 'ACTIVE').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Quantity */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الكمية المطلوبة (Quantity):</label>
                  <input
                    type="number"
                    min="1"
                    value={manualForm.productionQuantity}
                    onChange={(e) => setManualForm({ ...manualForm, productionQuantity: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono font-black"
                  />
                </div>

                {/* 6. Production Date */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الإنتاج (Date):</label>
                  <input
                    type="date"
                    value={manualForm.productionDate}
                    onChange={(e) => setManualForm({ ...manualForm, productionDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono text-xs"
                  />
                </div>

                {/* 7. Auto Order & Batch */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أمر الإنتاج والتشغيلة (Auto):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualForm.orderNumber}
                      readOnly
                      className="w-1/2 h-10 px-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-[#E53935]"
                    />
                    <input
                      type="text"
                      value={manualForm.batchNumber}
                      onChange={(e) => setManualForm({ ...manualForm, batchNumber: e.target.value })}
                      className="w-1/2 h-10 px-2 rounded-xl border border-slate-300 bg-white font-mono font-bold"
                    />
                  </div>
                </div>

                {/* 8. Size & Dimensions */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المقاس والأبعاد:</label>
                  <input
                    type="text"
                    value={manualForm.mattressSize}
                    onChange={(e) => setManualForm({ ...manualForm, mattressSize: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                {/* 9. Production Line */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">خط الإنتاج:</label>
                  <select
                    value={manualForm.productionLine}
                    onChange={(e) => setManualForm({ ...manualForm, productionLine: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="خط الإنتاج الرئيسي (Line A)">خط الإنتاج الرئيسي (Line A)</option>
                    <option value="خط الإنتاج الطبي (Line B)">خط الإنتاج الطبي (Line B)</option>
                    <option value="خط الإنتاج الفندقي (Line C)">خط الإنتاج الفندقي (Line C)</option>
                  </select>
                </div>

                {/* 10. Warranty Years */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">سنوات الضمان:</label>
                  <input
                    type="number"
                    value={manualForm.warrantyYears}
                    onChange={(e) => setManualForm({ ...manualForm, warrantyYears: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono font-bold text-amber-600"
                  />
                </div>

                {/* 11. Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">ملاحظات التشغيل والربط (Notes):</label>
                  <input
                    type="text"
                    placeholder="ملاحظات العميل، أوامر التوريد، مواصفات خاصة..."
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Workflow Action Buttons Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* 2. Save Draft */}
                <button
                  onClick={() => handleCreateOrder(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 transition cursor-pointer"
                >
                  💾 حفظ مسودة
                </button>

                {/* 2. Save & Approve */}
                <button
                  onClick={() => handleCreateOrder(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  ⚡ حفظ واعتماد
                </button>

                {/* 3. Generate Serials */}
                <button
                  onClick={() => {
                    const target = productionOrders.find(o => o.status === 'Approved' || o.status === 'Draft') || activeQuickOrder;
                    if (target) handleGenerateSerials(target);
                    else alert('يرجى اختيار أو اعتماد أمر إنتاج أولاً');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  ⚙ توليد السيريالات
                </button>

                {/* 4. Print Zebra */}
                <button
                  onClick={() => {
                    const printReady = productionOrders.find(o => o.status === 'Serial Generated' || (o.generatedSerials && o.generatedSerials.length > 0)) || activeQuickOrder;
                    if (printReady) handlePrintLabels(printReady);
                    else alert('يرجى توليد السيريالات لأمر الإنتاج أولاً قبل الطباعة');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#E53935] hover:bg-red-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                >
                  🖨 طباعة Zebra ZD220
                </button>
              </div>

              {/* 5 & 6: Quick Actions for Reprint & Damaged */}
              <div className="flex items-center gap-2 border-r sm:border-r border-slate-200 pr-2">
                <button
                  onClick={() => {
                    if (activeQuickOrder) {
                      setSelectedOrderForAction(activeQuickOrder);
                      setShowReprintModal(true);
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer"
                >
                  🔄 إعادة طباعة
                </button>

                <button
                  onClick={() => {
                    if (activeQuickOrder) {
                      setSelectedOrderForAction(activeQuickOrder);
                      setShowDamagedModal(true);
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition cursor-pointer"
                >
                  ⚠️ طباعة بدل تالف
                </button>
              </div>
            </div>
          </div>

          {/* Real Database Metrics & Orders Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">إجمالي أوامر الإنتاج</span>
              <div className="text-2xl sm:text-3xl font-black text-[#08152F] font-mono mt-1">
                {productionOrders.length}
              </div>
              <span className="text-[11px] text-slate-500">أمر مسجل بالنظام</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">الأوامر المعتمدة</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-1">
                {productionOrders.filter(o => o.status !== 'Draft').length}
              </div>
              <span className="text-[11px] text-emerald-700">جاهزة للتوليد والطباعة</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">السيريالات المولدة</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono mt-1">
                {productionOrders.reduce((acc, o) => acc + (o.generatedSerials?.length || 0), 0)}
              </div>
              <span className="text-[11px] text-indigo-700">سيريال فريد موثق</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">الملصقات المطبوعة</span>
              <div className="text-2xl sm:text-3xl font-black text-[#E53935] font-mono mt-1">
                {productionOrders.reduce((acc, o) => acc + (o.printedCount || 0), 0)}
              </div>
              <span className="text-[11px] text-[#E53935]">ملصق حراري منجز</span>
            </div>
          </div>

          {/* Quick Active Orders Table */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#08152F] flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#E53935]" />
                <span>أحدث أوامر التشغيل الفورية (Live Operations Queue)</span>
              </h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs text-[#E53935] font-bold hover:underline"
              >
                عرض كل أوامر الإنتاج ←
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">رقم الأمر</th>
                    <th className="p-3">التشغيلة</th>
                    <th className="p-3">الموديل والمقاس</th>
                    <th className="p-3 text-center">الكمية</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {productionOrders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="p-3 text-indigo-700">{o.batchNumber}</td>
                      <td className="p-3 font-sans">
                        <strong className="block text-slate-900">{o.mattressModel}</strong>
                        <span className="text-[11px] text-slate-500">{o.mattressSize} ({o.warrantyYears} سنوات)</span>
                      </td>
                      <td className="p-3 text-center font-black">{o.productionQuantity}</td>
                      <td className="p-3 text-center font-sans">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          o.status === 'Approved' ? 'bg-amber-100 text-amber-800' :
                          o.status === 'Serial Generated' ? 'bg-blue-100 text-blue-800' :
                          o.status === 'Printed' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans flex items-center justify-center gap-1.5 flex-wrap">
                        {o.status === 'Draft' && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/production-orders/${o.id}/approve`, { method: 'POST' });
                              fetchBackendData();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                          >
                            ✓ اعتماد
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateSerials(o)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] cursor-pointer"
                        >
                          ⚙ سيريالات
                        </button>
                        <button
                          onClick={() => handlePrintLabels(o)}
                          className="px-2.5 py-1 rounded-lg bg-[#E53935] text-white font-bold text-[11px] cursor-pointer"
                        >
                          🖨 طباعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: PRODUCTION ORDERS MASTER TABLE */}
      {/* ================================================================= */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#E53935]" />
                <span>سجل أوامر الإنتاج المعتمدة (Production Orders Master)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تصفح وفلترة جميع أوامر الإنتاج ومصادرها مع تحكم كامل في التوليد والطباعة.
              </p>
            </div>

            {/* Source Filters */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <span className="text-[11px] text-slate-500 px-2">المصدر:</span>
              <button
                onClick={() => setSelectedSourceType('ALL')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${selectedSourceType === 'ALL' ? 'bg-[#08152F] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
              >
                الكل ({productionOrders.length})
              </button>
              <button
                onClick={() => setSelectedSourceType('MANUAL')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${selectedSourceType === 'MANUAL' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`}
              >
                يدوي MANUAL
              </button>
              <button
                onClick={() => setSelectedSourceType('EXCEL')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${selectedSourceType === 'EXCEL' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`}
              >
                إكسل EXCEL
              </button>
              <button
                onClick={() => setSelectedSourceType('SAP')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${selectedSourceType === 'SAP' ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`}
              >
                SAP
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث برقم الأمر، رقم التشغيلة، أو اسم الموديل..."
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-right"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="p-3">رقم الأمر</th>
                  <th className="p-3">التشغيلة</th>
                  <th className="p-3">المصدر</th>
                  <th className="p-3">الموديل والمقاس</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3">خط الإنتاج</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                      لا توجد أوامر إنتاج مطابقة حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="p-3 text-indigo-700">{o.batchNumber}</td>
                      <td className="p-3 font-sans">
                        <span className="px-2.5 py-0.5 rounded-lg border font-mono text-[10px] font-bold bg-slate-100 text-slate-800">
                          {o.sourceType}
                        </span>
                      </td>
                      <td className="p-3 font-sans">
                        <strong className="block text-slate-900">{o.mattressModel}</strong>
                        <span className="text-[11px] text-slate-500">{o.mattressSize} ({o.warrantyYears}y)</span>
                      </td>
                      <td className="p-3 text-center font-black">{o.productionQuantity}</td>
                      <td className="p-3 font-sans text-slate-700">{o.productionLine}</td>
                      <td className="p-3 text-center font-sans">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          o.status === 'Approved' ? 'bg-amber-100 text-amber-800' :
                          o.status === 'Serial Generated' ? 'bg-blue-100 text-blue-800' :
                          o.status === 'Printed' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans flex items-center justify-center gap-1.5 flex-wrap">
                        {o.status === 'Draft' && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/production-orders/${o.id}/approve`, { method: 'POST' });
                              fetchBackendData();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer"
                          >
                            ✓ اعتماد
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateSerials(o)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer"
                        >
                          ⚙ سيريالات
                        </button>
                        <button
                          onClick={() => handlePrintLabels(o)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                        >
                          🖨 طباعة
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: TRACEABILITY & LABEL TEMPLATE MANAGEMENT */}
      {/* ================================================================= */}
      {activeTab === 'traceability' && (
        <div className="space-y-6">
          
          {/* LABEL TEMPLATES MANAGEMENT SECTION */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#E53935]" />
                  <span>إدارة قوالب الليبل (Label Template Management)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  معاينة وتعديل وحفظ إصدارات قوالب ملصقات Zebra وبطاقات الضمان المصنعي.
                </p>
              </div>

              {/* Template Selector */}
              <div className="flex flex-wrap items-center gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedTemplateId === tpl.id
                        ? 'bg-[#08152F] text-[#D4AF37] shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tpl.name.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>

            {templateSavedMsg && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{templateSavedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Template Editor Controls */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-sm">خصائص القالب النشط:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-bold text-[11px]">
                    الإصدار: {editingTemplate.version}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم القالب:</label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المقاس (العرض × الارتفاع مم):</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editingTemplate.widthMm}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, widthMm: Number(e.target.value) })}
                        className="w-1/2 h-9 px-2 rounded-lg border border-slate-300 bg-white font-mono text-center"
                      />
                      <span className="text-slate-400 font-mono">×</span>
                      <input
                        type="number"
                        value={editingTemplate.heightMm}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, heightMm: Number(e.target.value) })}
                        className="w-1/2 h-9 px-2 rounded-lg border border-slate-300 bg-white font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showLogo}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showLogo: e.target.checked })}
                      className="w-4 h-4 rounded text-[#E53935]"
                    />
                    <span>إظهار شعار سليبي الرسمي (SLEEPEE Logo)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showQR}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showQR: e.target.checked })}
                      className="w-4 h-4 rounded text-[#E53935]"
                    />
                    <span>إظهار رمز QR للتحقق والتفعيل الفوري</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showBarcode}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showBarcode: e.target.checked })}
                      className="w-4 h-4 rounded text-[#E53935]"
                    />
                    <span>إظهار باركود Code-128 التسلسلي</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showWarrantyBadge}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showWarrantyBadge: e.target.checked })}
                      className="w-4 h-4 rounded text-[#E53935]"
                    />
                    <span>إظهار شارة وسنوات الضمان المعتمد</span>
                  </label>
                </div>

                {/* Template Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={handleSaveTemplateVersion}
                    className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-red-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ إصدار جديد</span>
                  </button>

                  <button
                    onClick={handleDuplicateTemplate}
                    className="px-3.5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>تكرار القالب</span>
                  </button>

                  <button
                    onClick={() => handleRestoreTemplate(templates.find(t => t.id === editingTemplate.id) || templates[0])}
                    className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة الافتراضي</span>
                  </button>
                </div>
              </div>

              {/* Live Interactive Label Preview */}
              <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500 font-bold mb-3">معاينة حية للقالب (Live Output View):</span>
                
                {/* Physical Label Mockup */}
                <div className="bg-white border-2 border-slate-800 rounded-lg p-4 shadow-md w-full max-w-[340px] text-right space-y-2 font-mono">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    {editingTemplate.showLogo ? (
                      <div className="flex items-center gap-1">
                        <span className="font-black text-sm text-[#08152F] font-['Cairo']">سليبي</span>
                        <span className="text-[10px] font-extrabold text-[#E53935]">SLEEPEE</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">FACTORY LABEL</span>
                    )}

                    {editingTemplate.showWarrantyBadge && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold">
                        ضمان 10 سنوات
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="text-[11px] font-sans space-y-0.5">
                    <strong className="block text-slate-900 font-bold">سليبي رويال بوكيت سبرينج</strong>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>المقاس: 180×200×30 سم</span>
                      <span>التشغيلة: B26-0001</span>
                    </div>
                  </div>

                  {/* QR & Barcode Section */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                    {editingTemplate.showBarcode && (
                      <div className="flex-1 space-y-0.5">
                        <div className="h-7 bg-slate-900 flex items-center justify-center text-white text-[8px] tracking-widest">
                          ||||| | |||| ||| |||||
                        </div>
                        <span className="text-[9px] text-slate-700 block text-center">SLP-2026-000001</span>
                      </div>
                    )}

                    {editingTemplate.showQR && (
                      <div className="w-14 h-14 bg-slate-50 border border-slate-300 rounded flex items-center justify-center p-1">
                        <QrCode className="w-10 h-10 text-slate-900" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Real Print Jobs Log */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
            <h3 className="text-base font-black text-[#08152F] flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#E53935]" />
              <span>سجل مهام الطباعة الحرارية (Thermal Print Jobs Log)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">رقم المهمة</th>
                    <th className="p-3">الوقت</th>
                    <th className="p-3">المشغل</th>
                    <th className="p-3">الطابعة</th>
                    <th className="p-3">القالب</th>
                    <th className="p-3 text-center">الكمية</th>
                    <th className="p-3 text-center">النتيجة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {printJobs.map((j) => (
                    <tr key={j.jobId} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{j.jobId}</td>
                      <td className="p-3 text-slate-500">{j.timestamp}</td>
                      <td className="p-3 font-sans text-slate-800">{j.user}</td>
                      <td className="p-3 text-slate-600">{j.printer}</td>
                      <td className="p-3 font-sans text-slate-700">{j.template}</td>
                      <td className="p-3 text-center font-black">{j.quantity}</td>
                      <td className="p-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {j.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: QUALITY & COMPLIANCE */}
      {/* ================================================================= */}
      {activeTab === 'quality' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#E53935]" />
                <span>حوكمة الجودة واعتماد الدفعات (Quality & Batch Approval)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تأكيد مطابقة المواصفات القياسية، فحص عينات الشاسيه والفوم، واعتماد الإفراج النهائي.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              معايير ISO-9001 نشطة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">1. فحص الشاسيه والسوست:</span>
              <p className="text-slate-600 text-[11px]">اختبار متانة أسلاك السوست والصلابة والكربون المعتمد.</p>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> مطابق بنسبة 100%
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">2. فحص كثافة الإسفنج والميموري:</span>
              <p className="text-slate-600 text-[11px]">مراجعة كثافة D30/D35 ونسبة الارتداد الطبي.</p>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> مطابق بنسبة 100%
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">3. فحص التغليف والباركود:</span>
              <p className="text-slate-600 text-[11px]">قراءة سريعة لرمز QR واختبار وضوح ملصق 4"×3".</p>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> جاهز للتحقق الفوري
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: REPRINT REASON LOGGING */}
      {/* ================================================================= */}
      {showReprintModal && selectedOrderForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-[#08152F] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>إعادة طباعة ملصق (Reprint Label)</span>
              </h3>
              <button onClick={() => setShowReprintModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="block text-slate-900">أمر الإنتاج: {selectedOrderForAction.orderNumber}</strong>
                <span className="text-slate-600">{selectedOrderForAction.mattressModel}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سبب إعادة الطباعة (إلزامي للتدقيق):</label>
                <select
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
                >
                  <option value="تلف الملصق أثناء عملية التغليف الحراري">تلف الملصق أثناء عملية التغليف الحراري</option>
                  <option value="عدم وضوح طباعة الباركود على طابعة Zebra">عدم وضوح طباعة الباركود على طابعة Zebra</option>
                  <option value="فقدان ملصق الضمان بالمستودع">فقدان ملصق الضمان بالمستودع</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowReprintModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteReprint}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
              >
                تأكيد وإرسال للطباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: DAMAGED REPLACEMENT LOGGING */}
      {/* ================================================================= */}
      {showDamagedModal && selectedOrderForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-[#08152F] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E53935]" />
                <span>طباعة بدل تالف وخردة (Damaged Replacement)</span>
              </h3>
              <button onClick={() => setShowDamagedModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                <strong className="block font-bold">أمر الإنتاج: {selectedOrderForAction.orderNumber}</strong>
                <span>سيتم توليد سيريال جديد وتسجيل السيريال السابق كبدل تالف/خردة في سجل الجودة.</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سبب الاستبدال / الخردة:</label>
                <select
                  value={damagedScrapReason}
                  onChange={(e) => setDamagedScrapReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
                >
                  <option value="تمزق الملصق مع عيب في قماش المرتبة">تمزق الملصق مع عيب في قماش المرتبة</option>
                  <option value="تلف أثناء النقل والتحميل الداخلي بالمصنع">تلف أثناء النقل والتحميل الداخلي بالمصنع</option>
                  <option value="استبدال تحت بند فحص الجودة الشامل">استبدال تحت بند فحص الجودة الشامل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDamagedModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteDamagedReplacement}
                className="px-5 py-2 rounded-xl bg-[#E53935] hover:bg-red-700 text-white font-bold text-xs shadow-xs"
              >
                تأكيد وطباعة البدل التالف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: LABEL & QR PREVIEW */}
      {/* ================================================================= */}
      {showLabelPreviewModal && previewLabelOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-[#08152F] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#E53935]" />
                <span>معاينة ملصق بطاقة الضمان القياسي (Zebra 4×3")</span>
              </h3>
              <button onClick={() => setShowLabelPreviewModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Visual Card */}
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-lg space-y-3 font-mono">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-[#08152F] font-['Cairo']">
                    {previewLabelOrder.brandName || 'سليبي'}
                  </span>
                  <span className="text-xs font-extrabold text-[#E53935]">
                    {previewLabelOrder.brandName ? previewLabelOrder.brandName.toUpperCase() : 'SLEEPEE'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-sans font-bold">
                    {previewLabelOrder.categoryName || 'مرتبة'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                  ضمان {previewLabelOrder.warrantyYears || 10} سنوات
                </span>
              </div>

              <div className="text-xs font-sans space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-slate-900 font-black block">
                    {previewLabelOrder.modelName || previewLabelOrder.mattressModel}
                  </strong>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    نظام التصنيع: {previewLabelOrder.manufacturingSystemName || 'ألماني'}
                  </span>
                </div>
                <div className="text-slate-700 font-medium">المقاس: {previewLabelOrder.mattressSize || '180×200 سم'}</div>
                {previewLabelOrder.internalProductCode && (
                  <div className="text-slate-500 font-mono text-[10px]">
                    كود المنتج الماستر: <span className="font-bold text-slate-800">{previewLabelOrder.internalProductCode}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                  <span>أمر الإنتاج: {previewLabelOrder.orderNumber}</span>
                  <span>التشغيلة: {previewLabelOrder.batchNumber}</span>
                  <span>تاريخ الإنتاج: {previewLabelOrder.productionDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <div className="flex-1 space-y-1">
                  <div className="h-9 bg-slate-900 flex items-center justify-center text-white text-[9px] tracking-widest rounded">
                    |||||| | ||||| || |||||| | ||
                  </div>
                  <span className="text-[10px] text-slate-700 font-bold block text-center font-mono">
                    {previewLabelOrder.generatedSerials?.[0] || 'SLP-2026-000001'}
                  </span>
                </div>

                {previewQrDataUrl && (
                  <img src={previewQrDataUrl} alt="QR" className="w-16 h-16 rounded border border-slate-300 p-0.5" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowLabelPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  setShowLabelPreviewModal(false);
                  handlePrintLabels(previewLabelOrder);
                }}
                className="px-5 py-2 rounded-xl bg-[#E53935] hover:bg-red-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة هذا الملصق فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
