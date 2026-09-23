import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import {
  Package,
  Search,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  RefreshCw,
  QrCode,
  ArrowLeft,
  Copy,
  Download,
  Printer,
  Calendar,
  Layers,
  ShieldCheck,
  Hash,
  Sparkles,
  Info,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Product, AppUser } from '../types';
import { firestoreDb } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { canCreateProducts, canImportProducts } from '../utils/rbac';

interface ProductManagementProps {
  currentUser?: AppUser | null;
}

interface ImportSummary {
  totalRows: number;
  validCount: number;
  skippedDuplicatesCount: number;
  invalidCount: number;
  skippedSerials: string[];
  errors: { row: number; serial?: string; reason: string }[];
}

interface ParsedRow {
  rowNumber: number;
  serial_number: string;
  model: string;
  size: string;
  warranty_years: number;
  production_date: string;
  status: string;
  isValid: boolean;
  isDuplicate: boolean;
  validationError?: string;
}

interface QRVerificationResult {
  valid: boolean;
  serial_number?: string;
  model?: string;
  size?: string;
  warranty_years?: number;
  production_date?: string;
  status?: string;
  ready_for_activation?: boolean;
  activation_status?: string;
  verification_timestamp?: string;
  activation_endpoint?: string;
  qr_payload?: any;
  message?: string;
  error?: string;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({ currentUser }) => {
  const userRole = currentUser?.role || 'SUPER_ADMIN';
  const allowCreate = canCreateProducts(userRole);
  const allowImport = canImportProducts(userRole);
  const isReadOnly = userRole === 'QUALITY_MANAGER' || userRole === 'VIEWER';

  // Navigation within module
  const [activeSubTab, setActiveSubTab] = useState<'database' | 'import' | 'search' | 'details'>('database');

  // Products Database state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // QR code state for details page
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrVerificationResult, setQrVerificationResult] = useState<QRVerificationResult | null>(null);
  const [isVerifyingQR, setIsVerifyingQR] = useState<boolean>(false);
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  // Bulk Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importColumnErrors, setImportColumnErrors] = useState<string[]>([]);
  const [isSavingProducts, setIsSavingProducts] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Single Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newProductForm, setNewProductForm] = useState({
    serial_number: '',
    model: '',
    size: '',
    warranty_years: 10,
    production_date: new Date().toISOString().split('T')[0],
    status: 'جاهز للضمان',
  });
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isSubmittingNewProduct, setIsSubmittingNewProduct] = useState<boolean>(false);

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) {
        throw new Error(`خطأ في جلب المنتجات: ${res.statusText}`);
      }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setDbError(err.message || 'تعذر تحميل قاعدة بيانات المنتجات');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate QR code when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(selectedProduct.serial_number)}`;
      QRCode.toDataURL(verifyUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#111111',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));

      // Reset QR test result
      setQrVerificationResult(null);
    }
  }, [selectedProduct]);

  // Test the QR Verification Endpoint
  const handleTestQREndpoint = async (serial: string) => {
    setIsVerifyingQR(true);
    setQrVerificationResult(null);
    try {
      const res = await fetch(`/api/products/verify-qr/${encodeURIComponent(serial)}`);
      const data = await res.json();
      setQrVerificationResult(data);
    } catch (err: any) {
      setQrVerificationResult({
        valid: false,
        error: err.message || 'فشل الاتصال بنقطة التحقق البرمجية',
      });
    } finally {
      setIsVerifyingQR(false);
    }
  };

  // Copy Serial Number to Clipboard
  const handleCopySerial = (serial: string) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 2500);
  };

  // Download Sample Excel Template
  const handleDownloadSample = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        'Serial Number': 'SLP-2026-9101',
        'Model': 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
        'Size': '180 × 200 سم',
        'Warranty Years': 10,
        'Production Date': '2026-03-15',
        'Status': 'جاهز للضمان',
      },
      {
        'Serial Number': 'SLP-2026-9102',
        'Model': 'سليبي سوبر ميموري فوم (Super Memory Foam)',
        'Size': '160 × 200 سم',
        'Warranty Years': 10,
        'Production Date': '2026-03-15',
        'Status': 'جاهز للضمان',
      },
      {
        'Serial Number': 'SLP-2026-9103',
        'Model': 'سليبي أورثوبيديك الطبية (Orthopedic Comfort)',
        'Size': '120 × 200 سم',
        'Warranty Years': 5,
        'Production Date': '2026-03-16',
        'Status': 'جاهز للضمان',
      },
      {
        'Serial Number': 'SLP-2026-9104',
        'Model': 'سليبي كلاود بيلو توب الفاخرة (Cloud Pillow Top)',
        'Size': '200 × 200 سم',
        'Warranty Years': 10,
        'Production Date': '2026-03-16',
        'Status': 'جاهز للضمان',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة المنتجات');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'نموذج_استيراد_مراتب_سليبي.xlsx');
    } else {
      XLSX.writeFile(workbook, 'نموذج_استيراد_مراتب_سليبي.csv', { bookType: 'csv' });
    }
  };

  // File parsing logic
  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setIsProcessingFile(true);
    setImportColumnErrors([]);
    setImportSummary(null);
    setSaveSuccessMessage(null);
    setParsedRows([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('الملف فارغ ولا يحتوي على أي أوراق عمل.');
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('ورقة العمل لا تحتوي على أي سجلات.');
      }

      // Detect Column Mapping (supports both Arabic and English headers)
      const sampleRow = rawRows[0];
      const keys = Object.keys(sampleRow);

      const findKey = (possibleNames: string[]) => {
        return keys.find((k) => {
          const cleanK = k.trim().toLowerCase().replace(/[-_]/g, ' ');
          return possibleNames.some((name) => cleanK.includes(name.toLowerCase()));
        });
      };

      const serialKey = findKey(['serial number', 'serial', 'رقم السيريال', 'الرقم التسلسلي', 'السيريال']);
      const modelKey = findKey(['model', 'الموديل', 'اسم الموديل', 'طراز']);
      const sizeKey = findKey(['size', 'المقاس', 'الأبعاد', 'ابعاد']);
      const warrantyKey = findKey(['warranty years', 'warranty', 'الضمان', 'سنوات الضمان', 'مدة الضمان']);
      const dateKey = findKey(['production date', 'date', 'تاريخ الإنتاج', 'تاريخ التصنيع', 'تاريخ']);
      const statusKey = findKey(['status', 'الحالة', 'حالة المنتج']);

      // Validate required columns
      const missingColumns: string[] = [];
      if (!serialKey) missingColumns.push('الرقم التسلسلي (Serial Number)');
      if (!modelKey) missingColumns.push('الموديل (Model)');
      if (!sizeKey) missingColumns.push('المقاس (Size)');

      if (missingColumns.length > 0) {
        setImportColumnErrors(missingColumns);
        setIsProcessingFile(false);
        return;
      }

      // Existing DB serial numbers set for duplicate detection
      const existingSerialsSet = new Set((products || []).map((p) => p.serial_number?.toUpperCase() || ''));
      const fileSeenSerials = new Set<string>();

      const processedRows: ParsedRow[] = [];
      const skippedSerials: string[] = [];
      const errorsList: { row: number; serial?: string; reason: string }[] = [];
      let validCount = 0;

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2; // +1 header, +1 1-based index
        const rawSerial = serialKey ? String(row[serialKey] || '').trim().toUpperCase() : '';
        const rawModel = modelKey ? String(row[modelKey] || '').trim() : '';
        const rawSize = sizeKey ? String(row[sizeKey] || '').trim() : '';
        const rawWarranty = warrantyKey ? Number(row[warrantyKey]) || 10 : 10;
        const rawDate = dateKey ? String(row[dateKey] || '').trim() : new Date().toISOString().split('T')[0];
        const rawStatus = statusKey && row[statusKey] ? String(row[statusKey]).trim() : 'جاهز للضمان';

        // Check empty fields
        if (!rawSerial) {
          errorsList.push({ row: rowNum, reason: 'الرقم التسلسلي فارغ' });
          processedRows.push({
            rowNumber: rowNum,
            serial_number: '',
            model: rawModel,
            size: rawSize,
            warranty_years: rawWarranty,
            production_date: rawDate,
            status: rawStatus,
            isValid: false,
            isDuplicate: false,
            validationError: 'الرقم التسلسلي مفقود',
          });
          return;
        }

        if (!rawModel || !rawSize) {
          errorsList.push({ row: rowNum, serial: rawSerial, reason: 'الموديل أو المقاس مفقود' });
          processedRows.push({
            rowNumber: rowNum,
            serial_number: rawSerial,
            model: rawModel,
            size: rawSize,
            warranty_years: rawWarranty,
            production_date: rawDate,
            status: rawStatus,
            isValid: false,
            isDuplicate: false,
            validationError: 'بيانات الموديل أو المقاس غير مكتملة',
          });
          return;
        }

        // Check duplicate within the file
        if (fileSeenSerials.has(rawSerial)) {
          skippedSerials.push(rawSerial);
          processedRows.push({
            rowNumber: rowNum,
            serial_number: rawSerial,
            model: rawModel,
            size: rawSize,
            warranty_years: rawWarranty,
            production_date: rawDate,
            status: rawStatus,
            isValid: false,
            isDuplicate: true,
            validationError: 'رقم سيريال مكرر داخل هذا الملف',
          });
          return;
        }

        // Check duplicate in database
        if (existingSerialsSet.has(rawSerial)) {
          skippedSerials.push(rawSerial);
          processedRows.push({
            rowNumber: rowNum,
            serial_number: rawSerial,
            model: rawModel,
            size: rawSize,
            warranty_years: rawWarranty,
            production_date: rawDate,
            status: rawStatus,
            isValid: false,
            isDuplicate: true,
            validationError: 'الرقم التسلسلي مسجل مسبقاً في قاعدة بيانات المصنع',
          });
          return;
        }

        // Valid row
        fileSeenSerials.add(rawSerial);
        validCount++;
        processedRows.push({
          rowNumber: rowNum,
          serial_number: rawSerial,
          model: rawModel,
          size: rawSize,
          warranty_years: rawWarranty,
          production_date: rawDate,
          status: rawStatus,
          isValid: true,
          isDuplicate: false,
        });
      });

      setParsedRows(processedRows);
      setImportSummary({
        totalRows: rawRows.length,
        validCount,
        skippedDuplicatesCount: skippedSerials.length,
        invalidCount: errorsList.length,
        skippedSerials,
        errors: errorsList,
      });
    } catch (err: any) {
      console.error('Error reading file:', err);
      setImportColumnErrors([err.message || 'حدث خطأ أثناء قراءة الملف. يرجى التأكد من التنسيق.']);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.csv')
      ) {
        handleFileProcess(file);
      } else {
        setImportColumnErrors(['الصيغ المدعومة هي Excel (.xlsx, .xls) أو CSV (.csv) فقط']);
      }
    }
  };

  // Save parsed valid products to backend & Firestore
  const handleSaveImportedProducts = async () => {
    if (!importSummary || importSummary.validCount === 0) return;

    setIsSavingProducts(true);
    setSaveSuccessMessage(null);

    const validProductsToSave = parsedRows
      .filter((r) => r.isValid && !r.isDuplicate)
      .map((r) => ({
        serial_number: r.serial_number,
        model: r.model,
        size: r.size,
        warranty_years: r.warranty_years,
        production_date: r.production_date,
        status: r.status,
      }));

    try {
      // 1. Post to Express Server
      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: validProductsToSave,
          acting_user: 'مسؤول إدارة المنتجات والضمان',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ المنتجات في قاعدة البيانات');
      }

      // 2. Dual-save to Firestore if configured
      try {
        for (const item of validProductsToSave) {
          const docRef = doc(firestoreDb, 'products', item.serial_number);
          await setDoc(docRef, {
            ...item,
            created_at: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (firestoreErr) {
        console.warn('Firestore sync note:', firestoreErr);
      }

      setSaveSuccessMessage(
        `تم حفظ ${data.summary?.saved_count || validProductsToSave.length} منتج جديد بنجاح في قاعدة البيانات وتخطي ${data.summary?.skipped_duplicates_count || 0} أرقام مكررة!`
      );

      // Refresh product list
      await fetchProducts();

      // Clear imported rows after 3 seconds or keep summary
      setTimeout(() => {
        setActiveSubTab('database');
      }, 2500);
    } catch (err: any) {
      console.error('Save import error:', err);
      alert(`حدث خطأ أثناء الحفظ: ${err.message}`);
    } finally {
      setIsSavingProducts(false);
    }
  };

  // Submit Single Product Modal Form
  const handleCreateSingleProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    if (!newProductForm.serial_number.trim() || !newProductForm.model.trim() || !newProductForm.size.trim()) {
      setAddFormError('يرجى ملء جميع الحقول الإلزامية (الرقم التسلسلي، الموديل، المقاس).');
      return;
    }

    setIsSubmittingNewProduct(true);
    const cleanSerial = newProductForm.serial_number.trim().toUpperCase();

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: cleanSerial,
          model: newProductForm.model.trim(),
          size: newProductForm.size.trim(),
          warranty_years: Number(newProductForm.warranty_years) || 10,
          production_date: newProductForm.production_date,
          status: newProductForm.status || 'جاهز للضمان',
          production_order: `ORD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          batch_no: `BATCH-${new Date().getFullYear().toString().slice(-2)}A`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ المنتج');
      }

      // Save to Firestore too
      try {
        const docRef = doc(firestoreDb, 'products', cleanSerial);
        await setDoc(docRef, {
          serial_number: cleanSerial,
          model: newProductForm.model.trim(),
          size: newProductForm.size.trim(),
          warranty_years: Number(newProductForm.warranty_years) || 10,
          production_date: newProductForm.production_date,
          status: newProductForm.status || 'جاهز للضمان',
          created_at: new Date().toISOString(),
        }, { merge: true });
      } catch (fErr) {
        console.warn('Firestore single save note:', fErr);
      }

      setIsAddModalOpen(false);
      setNewProductForm({
        serial_number: '',
        model: '',
        size: '',
        warranty_years: 10,
        production_date: new Date().toISOString().split('T')[0],
        status: 'جاهز للضمان',
      });

      await fetchProducts();
    } catch (err: any) {
      setAddFormError(err.message || 'حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSubmittingNewProduct(false);
    }
  };

  // Filtered products for database and quick search
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      p.serial_number.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      (p.size && p.size.toLowerCase().includes(q)) ||
      (p.status && p.status.toLowerCase().includes(q))
    );
  });

  // Open details for a product
  const handleOpenDetails = (product: Product) => {
    setSelectedProduct(product);
    setActiveSubTab('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] pb-20 font-['Cairo']" dir="rtl">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-[#111111] text-white border-b-2 border-[#D62828] py-6 px-4 sm:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-mono font-bold tracking-wider mb-1">
              <Package className="w-4 h-4 text-[#D62828]" />
              <span>إدارة وتوثيق المنتجات | PRODUCT MANAGEMENT MODULE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Cairo']">
              منظومة إدارة المنتجات والضمان الإلكتروني
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              قاعدة بيانات المراتب المعتمدة، استيراد دفعات الإكسل وCSV، البحث المباشر، وتجهيز رموز QR للضمان
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5">
            {isReadOnly && (
              <span className="px-3.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>صلاحية استعراض فقط (Read-Only)</span>
              </span>
            )}

            {allowImport && (
              <button
                onClick={() => setActiveSubTab('import')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer shadow-xs ${
                  activeSubTab === 'import'
                    ? 'bg-[#D62828] text-white'
                    : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white border border-neutral-700'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#D4AF37]" />
                <span>استيراد ملف إكسل / CSV</span>
              </button>
            )}

            {allowCreate && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs font-bold transition shadow-md shadow-[#D62828]/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة منتج يدوي</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="bg-white p-1.5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveSubTab('database')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition duration-200 cursor-pointer ${
                activeSubTab === 'database'
                  ? 'bg-[#D62828] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#D62828] hover:bg-[#F5F5F5]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>قاعدة بيانات المنتجات ({products.length})</span>
            </button>

            {allowImport && (
              <button
                onClick={() => setActiveSubTab('import')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition duration-200 cursor-pointer ${
                  activeSubTab === 'import'
                    ? 'bg-[#D62828] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#D62828] hover:bg-[#F5F5F5]'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>استيراد مجمع (Bulk Import)</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition duration-200 cursor-pointer ${
                activeSubTab === 'search'
                  ? 'bg-[#D62828] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#D62828] hover:bg-[#F5F5F5]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>البحث برقم السيريال</span>
            </button>

            {selectedProduct && (
              <button
                onClick={() => setActiveSubTab('details')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition duration-200 cursor-pointer ${
                  activeSubTab === 'details'
                    ? 'bg-[#D62828] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#D62828] hover:bg-[#F5F5F5]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>تفاصيل المنتج ({selectedProduct.serial_number})</span>
              </button>
            )}
          </div>

          <button
            onClick={fetchProducts}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-[#D62828] transition font-medium cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {/* ====================================================
            VIEW 1: PRODUCT DATABASE
            ==================================================== */}
        {activeSubTab === 'database' && (
          <div className="space-y-6">
            {/* Quick Search & Filter Bar */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث برقم السيريال، اسم الموديل، أو المقاس..."
                    className="w-full pl-9 pr-10 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-sm focus:outline-hidden focus:border-[#D62828] focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-[#111111]">إجمالي المنتجات:</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 font-mono font-bold text-[#D62828]">
                    {filteredProducts.length} من أصل {products.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {dbError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-semibold">{dbError}</p>
              </div>
            )}

            {/* Products Table Card */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#D62828]" />
                  <h3 className="font-black text-base text-[#111111]">
                    سجل المنتجات المعتمدة في خطوط الإنتاج
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  الحقول المعتمدة: السيريال، الموديل، المقاس، سنوات الضمان، تاريخ الإنتاج، الحالة
                </span>
              </div>

              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#D62828]" />
                  <p className="text-sm font-medium">جاري تحميل سجلات قاعدة البيانات...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-slate-500 px-4">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-base font-bold text-slate-700">لا توجد منتجات تطابق البحث</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    يمكنك استيراد المنتجات مجمعة عبر ملف Excel/CSV أو إضافة منتج جديد يدوياً.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('import')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D62828] text-white text-xs font-bold cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>استيراد ملف الآن</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-6 py-3.5">الرقم التسلسلي (Serial Number)</th>
                        <th className="px-6 py-3.5">الموديل (Model)</th>
                        <th className="px-6 py-3.5">المقاس (Size)</th>
                        <th className="px-6 py-3.5">سنوات الضمان</th>
                        <th className="px-6 py-3.5">تاريخ الإنتاج</th>
                        <th className="px-6 py-3.5">الحالة (Status)</th>
                        <th className="px-6 py-3.5 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {filteredProducts.map((p) => (
                        <tr
                          key={p.id || p.serial_number}
                          className="hover:bg-red-50/20 transition-colors"
                        >
                          {/* Serial Number */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#111111] text-sm tracking-wide">
                                {p.serial_number}
                              </span>
                              <button
                                onClick={() => handleCopySerial(p.serial_number)}
                                className="text-slate-400 hover:text-[#D62828] transition cursor-pointer p-1"
                                title="نسخ السيريال"
                              >
                                {copiedSerial === p.serial_number ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Model */}
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {p.model}
                          </td>

                          {/* Size */}
                          <td className="px-6 py-4 font-medium text-slate-600 font-mono">
                            {p.size}
                          </td>

                          {/* Warranty Years */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold font-mono text-[11px]">
                              <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                              <span>{p.warranty_years} سنوات</span>
                            </span>
                          </td>

                          {/* Production Date */}
                          <td className="px-6 py-4 font-mono text-slate-600">
                            {p.production_date}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                                p.is_activated || p.status === 'مفعل بالضمان'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.is_activated || p.status === 'مفعل بالضمان'
                                    ? 'bg-blue-600'
                                    : 'bg-emerald-600'
                                }`}
                              />
                              <span>{p.status || 'جاهز للضمان'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenDetails(p)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-[#D62828] text-slate-700 hover:text-white transition text-xs font-bold cursor-pointer"
                                title="عرض تفاصيل المنتج ورمز QR"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>التفاصيل وQR</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            VIEW 2: BULK EXCEL & CSV IMPORT
            ==================================================== */}
        {activeSubTab === 'import' && (
          <div className="space-y-6">
            {/* Import Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                <div>
                  <div className="flex items-center gap-2 text-[#D62828] text-xs font-bold mb-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>الاستيراد المجمع لخطوط الإنتاج</span>
                  </div>
                  <h2 className="text-xl font-black text-[#111111]">
                    استيراد المنتجات المجمعة عبر ملفات Excel و CSV
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    يدعم استيراد صيغ (.xlsx, .xls, .csv) مع التحقق التلقائي من الأعمدة وتخطي الأرقام التسلسلية المكررة تلقائياً.
                  </p>
                </div>

                {/* Sample Template Downloads */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadSample('xlsx')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAFAFA] hover:bg-neutral-100 border border-[#E5E7EB] text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تحميل نموذج XLSX</span>
                  </button>

                  <button
                    onClick={() => handleDownloadSample('csv')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAFAFA] hover:bg-neutral-100 border border-[#E5E7EB] text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>تحميل نموذج CSV</span>
                  </button>
                </div>
              </div>

              {/* Supported Columns Guide */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold mb-1.5">
                  <Info className="w-3.5 h-3.5 text-[#D62828]" />
                  <span>الأعمدة المطلوبة في الملف (بالعربية أو الإنجليزية):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-900">Serial Number</span>
                    <span className="text-slate-500">الرقم التسلسلي</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-900">Model</span>
                    <span className="text-slate-500">طراز أو موديل المرتبة</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-900">Size</span>
                    <span className="text-slate-500">الأبعاد (مثال: 180 × 200)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-900">Warranty Years</span>
                    <span className="text-slate-500">سنوات الضمان (مثال: 10)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-900">Production Date</span>
                    <span className="text-slate-500">تاريخ الإنتاج (YYYY-MM-DD)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-900">Status</span>
                    <span className="text-slate-500">الحالة (جاهز للضمان)</span>
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-6 border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-[#D62828] bg-red-50/40 scale-[1.01]'
                    : 'border-slate-300 hover:border-[#D62828] bg-[#FAFAFA]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 flex items-center justify-center text-[#D62828] mb-4 shadow-xs">
                  {isProcessingFile ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'اسحب وأفلت ملف Excel أو CSV هنا'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  أو اضغط لاختيار الملف من جهازك (الملفات المدعومة: XLSX, XLS, CSV)
                </p>

                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم تحميل الملف: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {/* Column Validation Errors */}
              {importColumnErrors.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>أعمدة ناقصة أو خطأ في قراءة الملف:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {importColumnErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Notification */}
              {saveSuccessMessage && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-bold">{saveSuccessMessage}</p>
                </div>
              )}
            </div>

            {/* Import Summary & Save Action */}
            {importSummary && (
              <div className="space-y-6">
                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Rows */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                      <span>إجمالي السجلات المقروءة</span>
                      <Hash className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-2xl font-black font-mono mt-2 text-[#111111]">
                      {importSummary.totalRows}
                    </div>
                    <span className="text-[11px] text-slate-400">صف تم قراءته من الملف</span>
                  </div>

                  {/* Valid Products */}
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
                      <span>منتجات جديدة صالحة للحفظ</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black font-mono mt-2 text-emerald-700">
                      {importSummary.validCount}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">جاهزة للإدخال في قاعدة البيانات</span>
                  </div>

                  {/* Skipped Duplicates */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
                    <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                      <span>أرقام تسلسلية مكررة مستبعدة</span>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black font-mono mt-2 text-amber-800">
                      {importSummary.skippedDuplicatesCount}
                    </div>
                    <span className="text-[11px] text-amber-700 font-medium">تم تخطيها لمنع التكرار</span>
                  </div>

                  {/* Errors / Invalid */}
                  <div className="bg-white p-5 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs">
                    <div className="flex items-center justify-between text-red-700 text-xs font-bold">
                      <span>سجلات غير مكتملة / خطأ</span>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-2xl font-black font-mono mt-2 text-red-700">
                      {importSummary.invalidCount}
                    </div>
                    <span className="text-[11px] text-red-600 font-medium">بيانات ناقصة</span>
                  </div>
                </div>

                {/* Save Confirmation Button */}
                <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      هل أنت مستعد لحفظ المنتجات الصالحة في قاعدة البيانات؟
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      سيتم إضافة {importSummary.validCount} منتج جديد وتخطي {importSummary.skippedDuplicatesCount} سيريال مكرر.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setParsedRows([]);
                        setImportSummary(null);
                        setSelectedFile(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                    >
                      إلغاء
                    </button>

                    <button
                      onClick={handleSaveImportedProducts}
                      disabled={isSavingProducts || importSummary.validCount === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] disabled:bg-slate-300 text-white text-xs font-bold transition shadow-md shadow-[#D62828]/25 cursor-pointer"
                    >
                      {isSavingProducts ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جاري الحفظ في قاعدة البيانات...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>حفظ المنتجات الآن ({importSummary.validCount})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Parsed Rows Preview Table */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
                    <h3 className="font-bold text-sm text-slate-800">
                      معاينة البيانات قبل الحفظ ({parsedRows.length} صف)
                    </h3>
                    <span className="text-xs text-slate-400">
                      الصفوف الخضراء صالحة، والصفراء مكررة ومستبعدة تلقائياً
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] text-slate-500 font-bold z-10">
                        <tr>
                          <th className="px-4 py-3"># الصف</th>
                          <th className="px-4 py-3">الرقم التسلسلي</th>
                          <th className="px-4 py-3">الموديل</th>
                          <th className="px-4 py-3">المقاس</th>
                          <th className="px-4 py-3">الضمان</th>
                          <th className="px-4 py-3">تاريخ الإنتاج</th>
                          <th className="px-4 py-3">الحالة المقترحة</th>
                          <th className="px-4 py-3 text-center">حالة الفحص</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {parsedRows.map((r, i) => (
                          <tr
                            key={i}
                            className={
                              r.isValid
                                ? 'bg-emerald-50/10 hover:bg-emerald-50/30'
                                : r.isDuplicate
                                ? 'bg-amber-50/20 hover:bg-amber-50/40 text-slate-500'
                                : 'bg-red-50/20 hover:bg-red-50/40 text-slate-500'
                            }
                          >
                            <td className="px-4 py-3 font-mono text-slate-400 font-bold">
                              {r.rowNumber}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              {r.serial_number || '—'}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {r.model || '—'}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {r.size || '—'}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {r.warranty_years} سنوات
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {r.production_date}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>صالح للحفظ</span>
                                </span>
                              ) : r.isDuplicate ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>سيريال مكرر (مستبعد)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  <span>{r.validationError || 'خطأ'}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            VIEW 3: PRODUCT SEARCH
            ==================================================== */}
        {activeSubTab === 'search' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Search Input Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center gap-2 text-[#D62828] text-xs font-bold mb-1">
                <Search className="w-4 h-4" />
                <span>البحث المباشر في قاعدة البيانات</span>
              </div>
              <h2 className="text-xl font-black text-[#111111]">
                بحث بالرقم التسلسلي للمنتج (Search by Serial Number)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                أدخل الرقم التسلسلي المطبوع على بطاقة الضمان أو الباركود لعرض مواصفات المرتبة وحالتها فوراً.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="مثال: SLP-2026-9081 أو 9082..."
                    className="w-full pl-4 pr-12 py-3.5 bg-[#FAFAFA] border-2 border-[#E5E7EB] rounded-xl text-base font-mono focus:outline-hidden focus:border-[#D62828] focus:bg-white transition"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (filteredProducts.length === 1) {
                      handleOpenDetails(filteredProducts[0]);
                    }
                  }}
                  className="px-6 py-3.5 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold text-sm transition shadow-md shadow-[#D62828]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>بحث</span>
                </button>
              </div>

              {/* Sample quick search pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>نماذج سريعة للتجربة:</span>
                {products.slice(0, 4).map((p) => (
                  <button
                    key={p.serial_number}
                    onClick={() => setSearchQuery(p.serial_number)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-bold transition cursor-pointer"
                  >
                    {p.serial_number}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results Display */}
            {searchQuery.trim() && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 px-2">
                  <span>نتائج البحث عن: "{searchQuery}"</span>
                  <span className="font-mono font-bold text-[#D62828]">
                    {filteredProducts.length} نتيجة مطابقة
                  </span>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="bg-white p-10 rounded-2xl border border-[#E5E7EB] text-center text-slate-500 shadow-xs">
                    <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
                    <h3 className="text-base font-bold text-slate-800">
                      الرقم التسلسلي غير مسجل في قاعدة البيانات
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      تأكد من إدخال الرقم كما هو موضح بالمرتبة، أو يمكنك استيراده عبر تبويب "استيراد مجمع".
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredProducts.map((p) => (
                      <div
                        key={p.serial_number}
                        className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#D62828] transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-lg text-[#111111] tracking-wider">
                              {p.serial_number}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                p.is_activated || p.status === 'مفعل بالضمان'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {p.status || 'جاهز للضمان'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="block text-slate-400 font-medium">الموديل</span>
                              <span className="font-bold text-slate-800">{p.model}</span>
                            </div>

                            <div>
                              <span className="block text-slate-400 font-medium">المقاس</span>
                              <span className="font-bold text-slate-800 font-mono">{p.size}</span>
                            </div>

                            <div>
                              <span className="block text-slate-400 font-medium">سنوات الضمان</span>
                              <span className="font-bold text-amber-700 font-mono">{p.warranty_years} سنوات</span>
                            </div>

                            <div>
                              <span className="block text-slate-400 font-medium">تاريخ الإنتاج</span>
                              <span className="font-bold text-slate-800 font-mono">{p.production_date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={() => handleOpenDetails(p)}
                            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>عرض التفاصيل ورمز QR</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            VIEW 4: PRODUCT DETAILS PAGE & QR VERIFICATION TESTER
            ==================================================== */}
        {activeSubTab === 'details' && selectedProduct && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveSubTab('database')}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#D62828] transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                <span>العودة لقائمة المنتجات</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>طباعة بطاقة المنتج</span>
                </button>
              </div>
            </div>

            {/* Main Product Card */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
              {/* Product Header Banner */}
              <div className="bg-[#111111] text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-[#D62828]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D62828] text-white text-[11px] font-bold">
                      منتج معتمد
                    </span>
                    <span className="text-[#D4AF37] text-xs font-mono">
                      بطاقة المواصفات الفنية
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black">{selectedProduct.model}</h2>
                  <div className="flex items-center gap-2 text-neutral-400 font-mono text-xs">
                    <span>الرقم التسلسلي:</span>
                    <span className="text-white font-bold bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
                      {selectedProduct.serial_number}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex md:flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold ${
                      selectedProduct.is_activated || selectedProduct.status === 'مفعل بالضمان'
                        ? 'bg-blue-900/40 text-blue-300 border border-blue-600/50'
                        : 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/50'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedProduct.is_activated || selectedProduct.status === 'مفعل بالضمان'
                          ? 'bg-blue-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span>{selectedProduct.status || 'جاهز للضمان'}</span>
                  </span>
                </div>
              </div>

              {/* Product Specifications & QR Code Grid */}
              <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2 Columns: The 6 Product Fields */}
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D62828]" />
                    <span>البيانات الأساسية للمرتبة</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Serial Number */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-medium">الرقم التسلسلي (Serial Number)</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base font-mono font-black text-slate-900">
                          {selectedProduct.serial_number}
                        </span>
                        <button
                          onClick={() => handleCopySerial(selectedProduct.serial_number)}
                          className="text-slate-400 hover:text-[#D62828] transition cursor-pointer"
                        >
                          {copiedSerial === selectedProduct.serial_number ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Model */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-medium">الموديل التجاري (Model)</span>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {selectedProduct.model}
                      </p>
                    </div>

                    {/* Size */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-medium">المقاس / الأبعاد (Size)</span>
                      <p className="text-base font-bold text-slate-900 font-mono mt-1">
                        {selectedProduct.size}
                      </p>
                    </div>

                    {/* Warranty Years */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-medium">فترة الضمان المعتمدة (Warranty Years)</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-base font-black text-amber-700 font-mono">
                          {selectedProduct.warranty_years} سنوات ضمان مصنعي
                        </span>
                      </div>
                    </div>

                    {/* Production Date */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-medium">تاريخ الإنتاج (Production Date)</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold font-mono text-slate-800">
                          {selectedProduct.production_date}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-medium">حالة المنتج (Status)</span>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {selectedProduct.status || 'جاهز للضمان'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1 Column: QR Code & Verification Endpoint Preparation */}
                <div className="bg-[#FAFAFA] p-6 rounded-2xl border border-[#E5E7EB] flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold mb-3">
                    <QrCode className="w-4 h-4 text-[#D62828]" />
                    <span>رمز QR المشفر للتحقق والتفعيل</span>
                  </div>

                  {/* QR Image */}
                  <div className="p-3 bg-white rounded-xl border border-[#E5E7EB] shadow-xs">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code ${selectedProduct.serial_number}`}
                        className="w-48 h-48 rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-slate-300">
                        <QrCode className="w-16 h-16 animate-pulse" />
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-3 font-mono">
                    {selectedProduct.serial_number}
                  </p>

                  {/* Download QR Button */}
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`QR_${selectedProduct.serial_number}.png`}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-slate-700 hover:text-[#D62828] text-xs font-bold transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل صورة الباركود</span>
                    </a>
                  )}
                </div>
              </div>

              {/* QR Verification Endpoint Tester (Requirement 5) */}
              <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#D62828] text-xs font-bold mb-1">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>نقطة التحقق البرمجية لرمز QR | QR VERIFICATION ENDPOINT</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">
                      فحص جاهزية رمز QR لتفعيل الضمان المستقبلي
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      يتحقق هذا الفحص مباشرة من الـ API (`/api/products/verify-qr/:serial`) للتأكد من أصالة المنتج وصلاحيته للتفعيل.
                    </p>
                  </div>

                  <button
                    onClick={() => handleTestQREndpoint(selectedProduct.serial_number)}
                    disabled={isVerifyingQR}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-[#D62828] text-white text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
                  >
                    {isVerifyingQR ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري فحص الـ Endpoint...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        <span>اختبار نقطة التحقق (Test Endpoint)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* API Response Display */}
                {qrVerificationResult && (
                  <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        {qrVerificationResult.valid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-xs font-bold text-slate-800">
                          {qrVerificationResult.valid ? 'استجابة API: التحقق ناجح (200 OK)' : 'استجابة API: فشل التحقق'}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        GET /api/products/verify-qr/{selectedProduct.serial_number}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      {qrVerificationResult.message || qrVerificationResult.error}
                    </p>

                    {/* JSON Payload Inspection */}
                    <div className="bg-neutral-900 text-neutral-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto text-left" dir="ltr">
                      <pre>{JSON.stringify(qrVerificationResult, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================
          MODAL: ADD SINGLE PRODUCT MANUALLY
          ==================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E5E7EB] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#D62828]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#D62828]" />
                <h3 className="font-bold text-base">إضافة منتج جديد يدوياً</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleProduct} className="p-6 space-y-4">
              {addFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addFormError}</span>
                </div>
              )}

              {/* Serial Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم التسلسلي (Serial Number) *
                </label>
                <input
                  type="text"
                  required
                  value={newProductForm.serial_number}
                  onChange={(e) => setNewProductForm({ ...newProductForm, serial_number: e.target.value })}
                  placeholder="مثال: SLP-2026-9099"
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-xs font-mono focus:border-[#D62828] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموديل (Model) *
                </label>
                <input
                  type="text"
                  required
                  value={newProductForm.model}
                  onChange={(e) => setNewProductForm({ ...newProductForm, model: e.target.value })}
                  placeholder="مثال: سليبي رويال بوكيت سبرينج (Royal Pocket)"
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-xs focus:border-[#D62828] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Size */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المقاس (Size) *
                </label>
                <input
                  type="text"
                  required
                  value={newProductForm.size}
                  onChange={(e) => setNewProductForm({ ...newProductForm, size: e.target.value })}
                  placeholder="مثال: 180 × 200 سم"
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-xs font-mono focus:border-[#D62828] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Warranty Years & Production Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سنوات الضمان (Warranty Years)
                  </label>
                  <select
                    value={newProductForm.warranty_years}
                    onChange={(e) => setNewProductForm({ ...newProductForm, warranty_years: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-xs font-mono focus:border-[#D62828] focus:bg-white focus:outline-hidden"
                  >
                    <option value={3}>3 سنوات</option>
                    <option value={5}>5 سنوات</option>
                    <option value={7}>7 سنوات</option>
                    <option value={10}>10 سنوات</option>
                    <option value={12}>12 سنة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الإنتاج (Production Date)
                  </label>
                  <input
                    type="date"
                    value={newProductForm.production_date}
                    onChange={(e) => setNewProductForm({ ...newProductForm, production_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-xs font-mono focus:border-[#D62828] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الحالة (Status)
                </label>
                <select
                  value={newProductForm.status}
                  onChange={(e) => setNewProductForm({ ...newProductForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-xs focus:border-[#D62828] focus:bg-white focus:outline-hidden"
                >
                  <option value="جاهز للضمان">جاهز للضمان</option>
                  <option value="بالمخزن">بالمخزن</option>
                  <option value="تم التوزيع">تم التوزيع</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewProduct}
                  className="px-5 py-2 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {isSubmittingNewProduct ? 'جاري الحفظ...' : 'حفظ المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
