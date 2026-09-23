import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  QrCode,
  Printer,
  Camera,
  Upload,
  Calendar,
  MapPin,
  Phone,
  User,
  FileText,
  Bed,
  Clock,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  PhoneCall,
  ChevronDown,
  ChevronUp,
  Award,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Wrench,
  Truck,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, WarrantyActivation, ProductLifecycle, AppUser, LifecycleEventType } from '../types';
import { LifecycleTimeline } from './LifecycleTimeline';
import { CustomerClaimModal } from './CustomerClaimModal';

const EGYPTIAN_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الدقهلية',
  'الشرقية',
  'المنوفية',
  'الغربية',
  'البحيرة',
  'دمياط',
  'كفر الشيخ',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
];

interface VerifyResponse {
  status: 'VALID' | 'UNACTIVATED' | 'EXPIRED' | 'NOT_FOUND';
  message: string;
  product?: Product;
  activation?: WarrantyActivation;
  days_remaining?: number;
}

export interface WarrantyStatusTheme {
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  cardBg: string;
  borderColor: string;
  titleColor: string;
  descColor: string;
  label: string;
  subLabel: string;
  iconBg: string;
  iconColor: string;
}

export const getWarrantyStatusTheme = (
  status: string,
  daysRemaining?: number,
  activationDate?: string,
  isRecentBanner?: boolean
): WarrantyStatusTheme => {
  let isRecent = !!isRecentBanner;
  if (!isRecent && activationDate) {
    try {
      const actTime = new Date(activationDate).getTime();
      const now = Date.now();
      const diffDays = (now - actTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 30 && diffDays >= 0) {
        isRecent = true;
      }
    } catch {
      // ignore
    }
  }

  // Red: Expired
  if (status === 'EXPIRED' || (daysRemaining !== undefined && daysRemaining <= 0)) {
    return {
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-950',
      dotColor: 'bg-rose-600',
      cardBg: 'bg-rose-50/80',
      borderColor: 'border-rose-400',
      titleColor: 'text-rose-950',
      descColor: 'text-rose-800',
      label: 'الضمان منتهي',
      subLabel: 'انتهت فترة سريان الضمان المقررة لهذا المنتج',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
    };
  }

  // Yellow: Less than 180 days remaining
  if (daysRemaining !== undefined && daysRemaining <= 180 && daysRemaining > 0) {
    return {
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-950',
      dotColor: 'bg-amber-600',
      cardBg: 'bg-amber-50/80',
      borderColor: 'border-amber-400',
      titleColor: 'text-amber-950',
      descColor: 'text-amber-800',
      label: 'الضمان ساري (متبقي أقل من 180 يوم)',
      subLabel: `متبقي ${daysRemaining} يوماً على نهاية فترة الضمان المعتمدة`,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    };
  }

  // Blue: Recently activated
  if (isRecent) {
    return {
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-950',
      dotColor: 'bg-blue-600',
      cardBg: 'bg-blue-50/80',
      borderColor: 'border-blue-400',
      titleColor: 'text-blue-950',
      descColor: 'text-blue-800',
      label: 'تم تفعيل الضمان حديثاً',
      subLabel: 'تم تسجيل وثيقة الضمان وتوثيقها رسمياً بالمنظومة',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    };
  }

  // Green: Standard active warranty (> 180 days)
  return {
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-950',
    dotColor: 'bg-emerald-600',
    cardBg: 'bg-emerald-50/80',
    borderColor: 'border-emerald-500',
    titleColor: 'text-emerald-950',
    descColor: 'text-emerald-800',
    label: 'الضمان ساري',
    subLabel: 'وثيقة الضمان معتمدة وسارية المفعول رسمياً',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
  };
};

const ACTIVATED_WARRANTY_STEPS = [
  {
    number: 1,
    title: 'التحقق من المنتج',
    subtitle: 'مطابقة الرقم التسلسلي',
    targetId: 'section-verification',
  },
  {
    number: 2,
    title: 'بيانات الضمان',
    subtitle: 'المواصفات وتاريخ السريان',
    targetId: 'section-warranty-details',
  },
  {
    number: 3,
    title: 'شهادة الضمان',
    subtitle: 'الشهادة المعتمدة الأصلية',
    targetId: 'section-certificate',
  },
  {
    number: 4,
    title: 'سجل دورة الحياة',
    subtitle: 'تتبع مراحل التصنيع والاعتماد',
    targetId: 'section-lifecycle',
  },
];

// Internal Search Source Tracking (for analytics and audit logging)
export type SearchSource = 'Manual Search' | 'Camera QR' | 'QR Image' | 'OCR Label';

interface UnifiedWarrantyPortalProps {
  initialSerial?: string;
  currentUser?: AppUser;
  onNavigateToAdmin?: () => void;
}

export const UnifiedWarrantyPortal: React.FC<UnifiedWarrantyPortalProps> = ({
  initialSerial = '',
  currentUser,
  onNavigateToAdmin,
}) => {
  // Search & Query state
  const [searchQuery, setSearchQuery] = useState(initialSerial);
  const [loading, setLoading] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');

  // Internal Search Source Tracking
  const lastSearchSourceRef = useRef<SearchSource>('Manual Search');

  // Result state
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [qrCertificateUrl, setQrCertificateUrl] = useState<string>('');
  const [trackedClaim, setTrackedClaim] = useState<any | null>(null);
  const [associatedClaims, setAssociatedClaims] = useState<any[]>([]);
  const [associatedReplacements, setAssociatedReplacements] = useState<any[]>([]);

  // Scanner modal / camera state & feedback
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraScanIntervalRef = useRef<number | null>(null);

  // Activation form state (used when status === 'UNACTIVATED')
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccessBanner, setActivationSuccessBanner] = useState<string | null>(null);

  // Label OCR & QR Image reader states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatusMessage, setOcrStatusMessage] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessMessage, setOcrSuccessMessage] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrLowConfidenceSerial, setOcrLowConfidenceSerial] = useState<string | null>(null);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatusMessage, setQrStatusMessage] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrSuccessMessage, setQrSuccessMessage] = useState<string | null>(null);

  const ocrFileInputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const ocrRunningRef = useRef<boolean>(false);
  const qrRunningRef = useRef<boolean>(false);

  // Activation Steps Bar computation
  const getActiveStep = (): number => {
    // Step 4: Warranty activation successfully completed
    if (verifyResult?.status === 'VALID' && verifyResult.activation) {
      return 4;
    }
    // Step 2 or 3: Product found (UNACTIVATED status)
    if (verifyResult?.status === 'UNACTIVATED' && verifyResult.product) {
      // Step 3: Customer information completed and review section visible
      if (customerName.trim().length >= 3 && phone.trim().length >= 8 && purchaseDate) {
        return 3;
      }
      // Step 2: Product found and customer information entry started
      return 2;
    }
    // Step 1: No product selected yet
    return 1;
  };

  const activeStep = getActiveStep();

  const ACTIVATION_STEPS = [
    { number: 1, title: 'التحقق من المنتج', subtitle: 'البحث أو مسح QR' },
    { number: 2, title: 'بيانات العميل', subtitle: 'الاسم ورقم الهاتف' },
    { number: 3, title: 'مراجعة البيانات', subtitle: 'التأكد من تفاصيل الشراء' },
    { number: 4, title: 'تفعيل الضمان', subtitle: 'إصدار الشهادة الرسمية' },
  ];

  // Helper: Normalize Arabic digits (٠-٩) to standard numbers (0-9)
  const normalizeArabicDigits = (str: string): string => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`);
  };

  // Helper: Extract Serial Number specifically optimized for Sleepee product labels
  const extractSerialFromOcr = (rawText: string, confidence: number) => {
    const normalized = normalizeArabicDigits(rawText);

    // 1. Prioritize explicit keyword labels: Serial, SN, S/N, الرقم التسلسلي, etc.
    const labelPatterns = [
      /(?:serial(?:\s*number)?|s\/?n|sn|الرقم\s*التسلسلي|سيريال|تسلسلي|باركود|كود)[:\s#]*([A-Za-z0-9\-_]{5,25})/i,
      /(?:الرقم\s*التسلسلي|سيريال|كود\s*المنتج)[:\s#]*([A-Za-z0-9\-_]{5,25})/i,
    ];

    let candidate: string | null = null;
    for (const regex of labelPatterns) {
      const match = normalized.match(regex);
      if (match && match[1]) {
        const val = match[1].trim().replace(/\s*-\s*/g, '-').replace(/[\s_]+/g, '-');
        if (val.length >= 5) {
          candidate = val;
          break;
        }
      }
    }

    // 2. Detect Sleepee product serial format directly (SLP-YYYY-XXXX)
    if (!candidate) {
      const sleepeeRegex = /\b(SLP[-_\s]?[0-9]{4}[-_\s]?[0-9]{4,6})\b/i;
      const matchSleepee = normalized.match(sleepeeRegex);
      if (matchSleepee && matchSleepee[1]) {
        candidate = matchSleepee[1].replace(/[\s_]+/g, '-');
      }
    }

    // 3. Detect Warranty ID format (WRN-YYYY-XXXX)
    if (!candidate) {
      const wrnRegex = /\b(WRN[-_\s]?[0-9]{4}[-_\s]?[0-9]{4,6})\b/i;
      const matchWrn = normalized.match(wrnRegex);
      if (matchWrn && matchWrn[1]) {
        candidate = matchWrn[1].replace(/[\s_]+/g, '-');
      }
    }

    // 4. Detect General alphanumeric serial format (e.g. SLP-2026-9081)
    if (!candidate) {
      const genericRegex = /\b([A-Z]{2,4}[-_\s][0-9]{4}[-_\s][0-9]{4,6})\b/i;
      const matchGeneric = normalized.match(genericRegex);
      if (matchGeneric && matchGeneric[1]) {
        candidate = matchGeneric[1].replace(/[\s_]+/g, '-');
      }
    }

    const finalSerial = candidate ? candidate.toUpperCase().replace(/-+/g, '-').trim() : null;

    return {
      serial: finalSerial,
      confidence: Math.round(confidence),
    };
  };

  // Handler: Label OCR file upload
  const handleOcrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be reselected
    e.target.value = '';

    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setOcrError('حجم الصورة يتجاوز الحد الأقصى المسموح به (10 ميجابايت).');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setOcrError('صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو JPEG.');
      return;
    }

    if (ocrRunningRef.current) return;
    ocrRunningRef.current = true;

    setOcrLoading(true);
    setOcrStatusMessage('جاري قراءة الليبل...');
    setOcrError(null);
    setOcrSuccessMessage(null);
    setOcrLowConfidenceSerial(null);

    try {
      // Read image
      const imageBitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Prepare canvas with optimized dimensions
      const canvas = document.createElement('canvas');
      const maxDim = 1800;
      let w = imageBitmap.width;
      let h = imageBitmap.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(imageBitmap, 0, 0, w, h);

      // Dynamically import tesseract.js on demand (zero impact on initial page load)
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(canvas);
      await worker.terminate();

      let extracted = extractSerialFromOcr(ret.data.text || '', ret.data.confidence || 0);

      // If not detected at 0 deg, try rotated 90 degrees (tilted / mobile camera photos)
      if (!extracted.serial) {
        canvas.width = h;
        canvas.height = w;
        ctx.save();
        ctx.translate(h / 2, w / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(imageBitmap, -w / 2, -h / 2, w, h);
        ctx.restore();

        const workerRotated = await createWorker('eng');
        const retRotated = await workerRotated.recognize(canvas);
        await workerRotated.terminate();
        extracted = extractSerialFromOcr(retRotated.data.text || '', retRotated.data.confidence || 0);
      }

      if (!extracted.serial) {
        setOcrError('تعذر التعرف على الرقم التسلسلي من الصورة');
      } else {
        setOcrConfidence(extracted.confidence);
        // If confidence is below threshold (< 70%), ask user to verify before searching
        if (extracted.confidence < 70) {
          setOcrLowConfidenceSerial(extracted.serial);
        } else {
          // High confidence: populate serial and trigger search once
          setOcrSuccessMessage(`تم التعرف على الرقم التسلسلي بنجاح: ${extracted.serial}`);
          setSearchQuery(extracted.serial);
          handleSearch(extracted.serial, 'OCR Label');
        }
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setOcrError('تعذر التعرف على الرقم التسلسلي من الصورة');
    } finally {
      setOcrLoading(false);
      setOcrStatusMessage(null);
      ocrRunningRef.current = false;
    }
  };

  // Handler: QR Image upload & decode
  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value
    e.target.value = '';

    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setQrError('حجم الصورة يتجاوز الحد الأقصى المسموح به (10 ميجابايت).');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setQrError('صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو JPEG.');
      return;
    }

    if (qrRunningRef.current) return;
    qrRunningRef.current = true;

    setQrLoading(true);
    setQrStatusMessage('جاري قراءة رمز QR...');
    setQrError(null);
    setQrSuccessMessage(null);

    try {
      const imageBitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const canvas = document.createElement('canvas');
      const maxDim = 1600;
      let w = imageBitmap.width;
      let h = imageBitmap.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(imageBitmap, 0, 0, w, h);

      // Dynamically import jsqr on demand (zero startup penalty)
      const jsqrModule = await import('jsqr');
      const jsQR: any = (jsqrModule as any).default || jsqrModule;

      const imgData = ctx.getImageData(0, 0, w, h);
      let code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'attemptBoth',
      });

      // If not found, try rotated 90 degrees
      if (!code) {
        canvas.width = h;
        canvas.height = w;
        ctx.save();
        ctx.translate(h / 2, w / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(imageBitmap, -w / 2, -h / 2, w, h);
        ctx.restore();
        const rotatedData = ctx.getImageData(0, 0, h, w);
        code = jsQR(rotatedData.data, rotatedData.width, rotatedData.height, {
          inversionAttempts: 'attemptBoth',
        });
      }

      if (code && code.data && code.data.trim()) {
        const rawData = code.data.trim();
        let extractedSerial = rawData;

        // If decoded value is a full URL, extract verify or serial query parameter
        try {
          if (rawData.includes('http') || rawData.includes('?')) {
            const url = new URL(rawData, window.location.origin);
            const v = url.searchParams.get('verify') || url.searchParams.get('serial');
            if (v) extractedSerial = v;
          }
        } catch (e) {
          const match = rawData.match(/(?:verify|serial)=([A-Za-z0-9\-_]+)/i);
          if (match && match[1]) {
            extractedSerial = match[1];
          }
        }

        setQrSuccessMessage(`تم العثور على رمز QR صالح (${extractedSerial})`);
        setSearchQuery(extractedSerial);
        handleSearch(extractedSerial, 'QR Image');
      } else {
        setQrError('لم يتم العثور على رمز QR صالح داخل الصورة');
      }
    } catch (err: any) {
      console.error('QR Image Decode Error:', err);
      setQrError('لم يتم العثور على رمز QR صالح داخل الصورة');
    } finally {
      setQrLoading(false);
      setQrStatusMessage(null);
      qrRunningRef.current = false;
    }
  };

  // UI state for active certificate
  const [copiedLink, setCopiedLink] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [lifecycleEvents, setLifecycleEvents] = useState<ProductLifecycle[]>([]);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Collapsible Search section state
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);

  // Activated Warranty Steps Bar active selection
  const [activeActivatedStep, setActiveActivatedStep] = useState<number>(1);

  // Management role check and Lifecycle view mode
  const isManagementRole = Boolean(
    currentUser &&
    ['SUPER_ADMIN', 'QUALITY_MANAGER', 'PLANT_MANAGER'].includes(currentUser.role)
  );
  const [lifecycleViewMode, setLifecycleViewMode] = useState<'MANAGEMENT' | 'CUSTOMER'>('CUSTOMER');

  // Sync default view mode with role
  useEffect(() => {
    if (isManagementRole) {
      setLifecycleViewMode('MANAGEMENT');
    } else {
      setLifecycleViewMode('CUSTOMER');
    }
  }, [isManagementRole]);

  const CUSTOMER_LIFECYCLE_TYPES: LifecycleEventType[] = [
    'Produced',
    'Quality Approved',
    'Sold',
    'Warranty Activated',
  ];

  const visibleLifecycleEvents = useMemo(() => {
    if (isManagementRole && lifecycleViewMode === 'MANAGEMENT') {
      return lifecycleEvents;
    }
    return lifecycleEvents.filter((ev) =>
      CUSTOMER_LIFECYCLE_TYPES.includes(ev.event_type as LifecycleEventType)
    );
  }, [lifecycleEvents, isManagementRole, lifecycleViewMode]);

  // Auto-verify if initialSerial passed
  useEffect(() => {
    if (initialSerial && initialSerial.trim()) {
      handleSearch(initialSerial.trim());
    }
  }, [initialSerial]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Generate QR code when active certificate is available
  useEffect(() => {
    if (verifyResult?.activation) {
      const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(verifyResult.activation.warranty_id)}`;
      QRCode.toDataURL(verifyUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCertificateUrl(url))
        .catch((err) => console.error('QR generation failed:', err));

      // Fetch lifecycle events
      if (verifyResult.product?.serial_number) {
        fetch(`/api/lifecycle?serial=${encodeURIComponent(verifyResult.product.serial_number)}`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) setLifecycleEvents(data);
          })
          .catch((err) => console.error('Error fetching lifecycle:', err));
      }
    }
  }, [verifyResult?.activation, verifyResult?.product]);

  // Camera handling with live scanning and feedback status
  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraError(null);
    setCameraStatusMessage('قم بتوجيه الكاميرا نحو رمز QR');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('المتصفح لا يدعم الوصول المباشر لكاميرا الجهاز');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Start live frame decoding using jsQR
        try {
          const jsqrModule = await import('jsqr');
          const jsQR: any = (jsqrModule as any).default || jsqrModule;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (cameraScanIntervalRef.current) {
            clearInterval(cameraScanIntervalRef.current);
          }

          cameraScanIntervalRef.current = window.setInterval(() => {
            if (!videoRef.current || videoRef.current.readyState < 2 || !ctx) {
              return;
            }
            const vw = videoRef.current.videoWidth || 640;
            const vh = videoRef.current.videoHeight || 480;
            canvas.width = vw;
            canvas.height = vh;
            ctx.drawImage(videoRef.current, 0, 0, vw, vh);
            const imgData = ctx.getImageData(0, 0, vw, vh);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (code && code.data && code.data.trim()) {
              const rawData = code.data.trim();
              let extracted = rawData;
              try {
                if (rawData.includes('http') || rawData.includes('?')) {
                  const url = new URL(rawData, window.location.origin);
                  const v = url.searchParams.get('verify') || url.searchParams.get('serial');
                  if (v) extracted = v;
                }
              } catch {
                const match = rawData.match(/(?:verify|serial)=([A-Za-z0-9\-_]+)/i);
                if (match && match[1]) extracted = match[1];
              }

              if (cameraScanIntervalRef.current) {
                clearInterval(cameraScanIntervalRef.current);
                cameraScanIntervalRef.current = null;
              }

              setCameraStatusMessage('تم التعرف على رمز QR');
              setTimeout(() => {
                stopCamera();
                setSearchQuery(extracted);
                handleSearch(extracted, 'Camera QR');
              }, 400);
            }
          }, 350);
        } catch (qrErr) {
          console.warn('Live scanner initialization:', qrErr);
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('تعذر فتح الكاميرا، يرجى السماح بإذن الكاميرا أو استخدام إدخال الرقم يدوياً.');
    }
  };

  const stopCamera = () => {
    if (cameraScanIntervalRef.current) {
      clearInterval(cameraScanIntervalRef.current);
      cameraScanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraStatusMessage(null);
  };

  // Perform search / verification with internal source tracking and double-click prevention
  const handleSearch = async (termToVerify?: string, source: SearchSource = 'Manual Search') => {
    const raw = termToVerify !== undefined ? termToVerify : searchQuery;
    const term = raw.trim();
    if (!term || loading) return;

    lastSearchSourceRef.current = source;
    console.info(`[Analytics] Product Search initiated | Source: "${source}" | Term: "${term}" | Time: ${new Date().toISOString()}`);

    setLoading(true);
    setSearchExecuted(true);
    setSearchedTerm(term);
    setActivationError(null);
    setActivationSuccessBanner(null);

    // Support direct lookup of Claim IDs
    if (term.toUpperCase().startsWith('CLM-')) {
      try {
        const response = await fetch(`/api/claims/${encodeURIComponent(term)}`);
        if (response.ok) {
          const claimData = await response.json();
          setTrackedClaim(claimData);
          setVerifyResult({
            status: 'VALID',
            message: 'تم العثور على طلب الضمان والشكوى الفنية المعتمدة بنجاح.',
            product: {
              serial_number: claimData.serial_number,
              model: 'مرتبة سليبي',
              size: 'مقاس معتمد',
              warranty_years: 10,
              image_url: '',
              production_date: claimData.created_at ? claimData.created_at.split('T')[0] : '2026-01-01',
            } as any,
            activation: {
              warranty_id: claimData.warranty_id || 'سليبي-ضمان-عام',
              serial_number: claimData.serial_number,
              customer_name: claimData.customer_name,
              phone: claimData.phone,
              activation_date: claimData.created_at,
              expiry_date: '2036-01-01',
              status: 'ساري',
            } as any,
            days_remaining: 3450,
          });
          setIsSearchCollapsed(true);
          
          // Fetch all other claims and replacements for the same serial
          fetch(`/api/claims?search=${encodeURIComponent(claimData.serial_number)}`)
            .then((r) => r.json())
            .then((claims) => setAssociatedClaims(claims))
            .catch((e) => console.error(e));
          fetch(`/api/replacements?search=${encodeURIComponent(claimData.serial_number)}`)
            .then((r) => r.json())
            .then((reps) => setAssociatedReplacements(reps))
            .catch((e) => console.error(e));
          
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Direct claim fetch error:', err);
      }
    }

    try {
      const response = await fetch(`/api/warranty/verify/${encodeURIComponent(term)}?source=${encodeURIComponent(source)}`);
      const data: VerifyResponse = await response.json();
      setVerifyResult(data);
      setTrackedClaim(null);
      if (data.status === 'VALID') {
        setIsSearchCollapsed(true);
        const serial = data.product?.serial_number || term;
        fetch(`/api/claims?search=${encodeURIComponent(serial)}`)
          .then((r) => r.json())
          .then((claims) => setAssociatedClaims(claims))
          .catch((e) => console.error(e));
        fetch(`/api/replacements?search=${encodeURIComponent(serial)}`)
          .then((r) => r.json())
          .then((reps) => setAssociatedReplacements(reps))
          .catch((e) => console.error(e));
      } else {
        setAssociatedClaims([]);
        setAssociatedReplacements([]);
      }
    } catch (err: any) {
      console.error('Search verification error:', err);
      setVerifyResult({
        status: 'NOT_FOUND',
        message: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit Activation Form (In-page)
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyResult?.product) return;

    if (!customerName.trim()) {
      setActivationError('يرجى إدخال اسم العميل بالكامل');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setActivationError('يرجى إدخال رقم هاتف صحيح (8 أرقام على الأقل)');
      return;
    }
    if (!governorate) {
      setActivationError('يرجى اختيار المحافظة');
      return;
    }
    if (!purchaseDate) {
      setActivationError('يرجى تحديد تاريخ الشراء');
      return;
    }

    setActivating(true);
    setActivationError(null);

    try {
      const payload = {
        serial_number: verifyResult.product.serial_number,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        governorate,
        city: governorate, // default to governorate
        invoice_number: invoiceNumber.trim() ? invoiceNumber.trim() : 'بدون فاتورة',
        purchase_date: purchaseDate,
      };

      const res = await fetch('/api/warranty/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل في تفعيل الضمان');
      }

      // Launch Confetti!
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#D62828', '#D4AF37', '#10B981', '#1E3A8A'],
        });
      } catch (cErr) {
        console.warn('Confetti error:', cErr);
      }

      setActivationSuccessBanner(`تم تفعيل وثيقة الضمان بنجاح برقم: ${data.activation.warranty_id}`);
      setIsSearchCollapsed(true);

      // Instantly refresh the verify result in place to VALID state!
      setVerifyResult({
        status: 'VALID',
        message: 'تم تفعيل وثيقة الضمان بنجاح وهي سارية المفعول الآن.',
        product: data.product || verifyResult.product,
        activation: data.activation,
        days_remaining: verifyResult.product.warranty_years * 365,
      });
    } catch (err: any) {
      console.error('Activation error:', err);
      setActivationError(err.message || 'حدث خطأ أثناء تفعيل الضمان');
    } finally {
      setActivating(false);
    }
  };

  // Print Certificate action
  const handlePrintCertificate = () => {
    window.print();
  };

  // Copy verify link
  const handleCopyLink = () => {
    if (!verifyResult?.activation) return;
    const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(verifyResult.activation.warranty_id)}`;
    navigator.clipboard.writeText(verifyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Reset search
  const handleResetSearch = () => {
    setSearchQuery('');
    setSearchedTerm('');
    setSearchExecuted(false);
    setVerifyResult(null);
    setActivationError(null);
    setActivationSuccessBanner(null);
    setIsSearchCollapsed(false);
    setOcrStatusMessage(null);
    setOcrError(null);
    setOcrSuccessMessage(null);
    setOcrLowConfidenceSerial(null);
    setQrStatusMessage(null);
    setQrError(null);
    setQrSuccessMessage(null);
    if (isCameraOpen) {
      stopCamera();
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 font-['Cairo'] text-right">
      {/* Top Main Hero Title (no-print) */}
      <div className="no-print bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#D62828] via-[#B71C1C] to-[#D4AF37]" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D62828] to-[#B71C1C] flex items-center justify-center text-white shadow-lg shadow-[#D62828]/25 shrink-0">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full bg-[#D62828]/10 text-[#D62828] font-bold text-xs tracking-wider">
                  بوابة المستهلك الموحدة
                </span>
                <span className="text-xs text-slate-400 font-mono">SLEEPEE E-WARRANTY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                الضمان الإلكتروني
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                المنظومة الموحدة للاستعلام والتحقق الرقمي وتفعيل واستعراض شهادات ضمان مراتب سليبي في خطوة واحدة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <a
              href="tel:19707"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-800 border border-[#E5E7EB] transition text-xs font-bold"
            >
              <PhoneCall className="w-4 h-4 text-[#D62828]" />
              <span>الخط الساخن: 19707</span>
            </a>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3) Activated Warranty Steps Bar / Activation Steps Bar (no-print) */}
      {/* ==================================================== */}
      {verifyResult?.status === 'VALID' ? (
        <div className="no-print bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                مراحل ومسار وثيقة الضمان المعتمدة
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>وثيقة نشطة ومكتملة</span>
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {ACTIVATED_WARRANTY_STEPS.map((step) => {
              const isSelected = activeActivatedStep === step.number;

              return (
                <button
                  type="button"
                  key={step.number}
                  onClick={() => {
                    setActiveActivatedStep(step.number);
                    const el = document.getElementById(step.targetId);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`text-right flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50/90 border-2 border-[#D62828] shadow-xs ring-2 ring-[#D62828]/10'
                      : 'bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/25 ring-4 ring-[#D62828]/15'
                        : 'bg-emerald-600 text-white shadow-xs'
                    }`}
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs sm:text-sm font-black truncate ${
                        isSelected ? 'text-[#D62828]' : 'text-emerald-950'
                      }`}
                    >
                      {step.title}
                    </div>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {isSelected ? 'القسم المعروض حالياً' : step.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="no-print bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                مراحل تفعيل شهادة الضمان الرسمية
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              المرحلة {activeStep} من 4
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {ACTIVATION_STEPS.map((step) => {
              const isCompleted = activeStep > step.number || (activeStep === 4 && step.number <= 4);
              const isCurrent = activeStep === step.number && !(activeStep === 4 && step.number < 4);

              return (
                <div
                  key={step.number}
                  className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl transition-all ${
                    isCurrent
                      ? 'bg-rose-50/90 border-2 border-[#D62828] shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50/70 border border-emerald-300'
                      : 'bg-[#F9FAFB] border border-slate-200/90 opacity-70'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/25 ring-4 ring-[#D62828]/15'
                        : 'bg-white text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : step.number}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs sm:text-sm font-black truncate ${
                        isCurrent
                          ? 'text-[#D62828]'
                          : isCompleted
                          ? 'text-emerald-950'
                          : 'text-slate-600'
                      }`}
                    >
                      {step.title}
                    </div>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {isCompleted ? 'تم بنجاح ✓' : isCurrent ? 'المرحلة الحالية' : step.subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2) الخطوة الأولى: البحث أو مسح QR (مع خاصية الطي بعد التحقق) */}
      {/* ==================================================== */}
      {isSearchCollapsed && verifyResult?.status === 'VALID' && verifyResult.product ? (
        <div className="no-print bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-400/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-emerald-950">✓ تم العثور على المنتج بنجاح</span>
                <span className="font-mono font-black text-xs sm:text-sm text-[#111111] bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  {searchedTerm || searchQuery || verifyResult.product.serial_number}
                </span>
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  الضمان ساري
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                المنتج: <strong className="text-slate-800">{verifyResult.product.model}</strong> ({verifyResult.product.size})
                {verifyResult.activation?.warranty_id && (
                  <> &nbsp;|&nbsp; رقم الوثيقة: <strong className="font-mono text-[#D62828] font-bold">{verifyResult.activation.warranty_id}</strong></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="expand-search-btn"
              onClick={() => setIsSearchCollapsed(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 rounded-xl transition cursor-pointer border border-slate-200"
            >
              <Search className="w-3.5 h-3.5" />
              <span>تعديل البحث</span>
            </button>
            <button
              type="button"
              id="new-search-btn"
              onClick={() => {
                handleResetSearch();
                setIsSearchCollapsed(false);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بحث جديد</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="no-print bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#D62828] text-white flex items-center justify-center text-sm font-black shadow-xs">
                1
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#111111]">
                  الخطوة الأولى: البحث أو مسح QR
                </h2>
                <p className="text-xs text-slate-500">
                  أدخل الرقم التسلسلي المطبوع على بطاقة المرتبة أو استخدم ماسح الـ QR والتعرف على الليبل
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {verifyResult?.status === 'VALID' && (
                <button
                  type="button"
                  onClick={() => setIsSearchCollapsed(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer border border-slate-200"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>طي قسم البحث</span>
                </button>
              )}
              {searchExecuted && (
                <button
                  onClick={handleResetSearch}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#D62828] font-bold px-3 py-1.5 rounded-xl hover:bg-[#F5F5F5] transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>بحث جديد</span>
                </button>
              )}
            </div>
          </div>

        {/* Input Bar & Actions */}
        <div className="space-y-3">
          <div className="flex flex-col 2xl:flex-row gap-3">
            {/* Input Field */}
            <div className="relative flex-1 min-w-[260px]">
              <input
                id="serial-search-input"
                type="text"
                value={searchQuery}
                disabled={loading}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch(undefined, 'Manual Search')}
                placeholder="أدخل الرقم التسلسلي (مثال: SLP-2026-9081) أو رقم الوثيقة"
                className="w-full text-left font-mono font-bold uppercase tracking-wider h-[52px] px-4 pl-12 pr-11 rounded-2xl border border-slate-300 bg-[#F9FAFB] focus:bg-white focus:ring-4 focus:ring-[#D62828]/10 focus:border-[#D62828] outline-none text-[#111111] text-sm sm:text-base transition disabled:opacity-60"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              
              {searchQuery && !loading && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-md cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Action Buttons Group (Search, Camera QR, Label OCR, QR Image) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap 2xl:flex-nowrap gap-2.5 sm:gap-3 items-center w-full 2xl:w-auto">
              {/* Search Button */}
              <button
                id="search-warranty-btn"
                type="button"
                onClick={() => handleSearch(undefined, 'Manual Search')}
                disabled={loading || !searchQuery.trim()}
                className="h-[52px] w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#D62828] hover:bg-[#B71C1C] text-white border-2 border-[#D62828] font-bold rounded-2xl shadow-md shadow-[#D62828]/20 transition disabled:opacity-50 text-sm cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                    <span>جاري البحث عن المنتج...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 shrink-0" />
                    <span>بحث واستعلام</span>
                  </>
                )}
              </button>

              {/* Camera QR Button */}
              <button
                id="open-qr-scanner-btn"
                type="button"
                onClick={isCameraOpen ? stopCamera : startCamera}
                className={`h-[52px] w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl border-2 font-bold text-sm transition cursor-pointer shrink-0 ${
                  isCameraOpen
                    ? 'bg-rose-50 border-rose-400 text-rose-800'
                    : 'bg-[#111111] hover:bg-black text-white border-[#111111] shadow-md'
                }`}
              >
                <Camera className="w-5 h-5 text-amber-300 shrink-0" />
                <span>{isCameraOpen ? 'إغلاق الكاميرا' : 'مسح QR بالكاميرا'}</span>
              </button>

              {/* Label OCR Button */}
              <button
                id="upload-label-ocr-btn"
                type="button"
                onClick={() => ocrFileInputRef.current?.click()}
                disabled={ocrLoading || loading}
                className="h-[52px] w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl border-2 font-bold text-sm transition cursor-pointer shrink-0 bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-[#D62828] shadow-xs disabled:opacity-50"
              >
                {ocrLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-[#D62828] shrink-0" />
                    <span>جاري قراءة الليبل...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 text-[#D62828] shrink-0" />
                    <span>قراءة الليبل من صورة</span>
                  </>
                )}
              </button>

              {/* QR Image Button */}
              <button
                id="upload-qr-image-btn"
                type="button"
                onClick={() => qrFileInputRef.current?.click()}
                disabled={qrLoading || loading}
                className="h-[52px] w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl border-2 font-bold text-sm transition cursor-pointer shrink-0 bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-[#111111] shadow-xs disabled:opacity-50"
              >
                {qrLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-[#111111] shrink-0" />
                    <span>جاري قراءة رمز QR...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 text-[#111111] shrink-0" />
                    <span>قراءة QR من صورة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={ocrFileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleOcrFileUpload}
          />
          <input
            ref={qrFileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleQrImageUpload}
          />

          {/* Status & Feedback Banners */}
          {ocrStatusMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs sm:text-sm font-bold animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-[#D62828] shrink-0" />
              <span>{ocrStatusMessage}</span>
            </div>
          )}

          {qrStatusMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm font-bold animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-[#111111] shrink-0" />
              <span>{qrStatusMessage}</span>
            </div>
          )}

          {ocrError && (
            <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{ocrError}</span>
              </div>
              <button
                type="button"
                onClick={() => setOcrError(null)}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>
          )}

          {qrError && (
            <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{qrError}</span>
              </div>
              <button
                type="button"
                onClick={() => setQrError(null)}
                className="text-xs text-amber-700 hover:text-amber-900 font-bold px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>
          )}

          {ocrSuccessMessage && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{ocrSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setOcrSuccessMessage(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>
          )}

          {qrSuccessMessage && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{qrSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setQrSuccessMessage(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>
          )}

          {/* Low-confidence verification dialog */}
          {ocrLowConfidenceSerial && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs sm:text-sm space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>يرجى مراجعة الرقم التسلسلي قبل البحث:</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={ocrLowConfidenceSerial}
                  onChange={(e) => setOcrLowConfidenceSerial(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-amber-300 bg-white font-mono font-bold text-[#111111] uppercase tracking-wider text-sm outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const s = ocrLowConfidenceSerial.trim();
                    setOcrLowConfidenceSerial(null);
                    setSearchQuery(s);
                    handleSearch(s, 'OCR Label');
                  }}
                  className="px-6 py-2.5 bg-[#D62828] text-white font-bold rounded-xl hover:bg-[#B71C1C] transition cursor-pointer"
                >
                  تأكيد والبحث
                </button>
                <button
                  type="button"
                  onClick={() => setOcrLowConfidenceSerial(null)}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Shortcuts */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>أمثلة سريعة للتجربة والمعاينة:</span>
            </span>

            {/* 1. Unactivated sample */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('SLP-2026-9084');
                handleSearch('SLP-2026-9084', 'Manual Search');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>SLP-2026-9084 (الضمان غير مفعل)</span>
            </button>

            {/* 2. Active sample */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('SLP-2026-9081');
                handleSearch('SLP-2026-9081', 'Manual Search');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>SLP-2026-9081 (الضمان مفعل)</span>
            </button>

            {/* 3. Expired sample */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('SLP-2015-7001');
                handleSearch('SLP-2015-7001', 'Manual Search');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>SLP-2015-7001 (الضمان منتهي)</span>
            </button>

            {/* 4. Not found sample */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('SLP-9999-0000');
                handleSearch('SLP-9999-0000', 'Manual Search');
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100 font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>SLP-9999-0000 (رقم غير موجود)</span>
            </button>
          </div>
        </div>

        {/* Camera Viewfinder Box (Interactive QR Scanner) */}
        {isCameraOpen && (
          <div className="p-6 bg-slate-900 rounded-3xl text-white text-center space-y-4 border-2 border-amber-400/50 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-sm font-bold">ماسح رمز QR لمراتب سليبي</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                إلغاء ومسح
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-rose-900/50 border border-rose-700 rounded-2xl text-rose-200 text-xs sm:text-sm">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
                <p>{cameraError}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('SLP-2026-9081');
                      stopCamera();
                      handleSearch('SLP-2026-9081', 'Camera QR');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-amber-300 cursor-pointer"
                  >
                    تجربة نموذج برمز QR المقروء
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative max-w-sm mx-auto aspect-square bg-black rounded-2xl overflow-hidden border-2 border-dashed border-[#D4AF37] flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Optical Targeting Reticle */}
                <div className="absolute inset-8 border-2 border-[#D4AF37] rounded-xl pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-r-2 border-[#D62828]" />
                    <span className="w-4 h-4 border-t-2 border-l-2 border-[#D62828]" />
                  </div>
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D62828] to-transparent animate-pulse" />
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-r-2 border-[#D62828]" />
                    <span className="w-4 h-4 border-b-2 border-l-2 border-[#D62828]" />
                  </div>
                </div>
                <div className={`absolute bottom-3 left-3 right-3 text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  cameraStatusMessage === 'تم التعرف على رمز QR'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                    : 'bg-black/80 text-amber-300 border border-amber-400/30'
                }`}>
                  {cameraStatusMessage === 'تم التعرف على رمز QR' ? (
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  ) : (
                    <Camera className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                  )}
                  <span>{cameraStatusMessage || 'قم بتوجيه الكاميرا نحو رمز QR'}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
              <span className="text-slate-400">أو يمكنك النقر لمحاكاة مسح رمز المرتبة:</span>
              <button
                type="button"
                onClick={() => {
                  setCameraStatusMessage('تم التعرف على رمز QR');
                  setTimeout(() => {
                    stopCamera();
                    setSearchQuery('SLP-2026-9084');
                    handleSearch('SLP-2026-9084', 'Camera QR');
                  }, 400);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold border border-amber-500/30 cursor-pointer"
              >
                مسح مرتبة جديدة للتفعيل (SLP-2026-9084)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraStatusMessage('تم التعرف على رمز QR');
                  setTimeout(() => {
                    stopCamera();
                    setSearchQuery('SLP-2026-9081');
                    handleSearch('SLP-2026-9081', 'Camera QR');
                  }, 400);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold border border-emerald-500/30 cursor-pointer"
              >
                مسح مرتبة سارية الضمان (SLP-2026-9081)
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ==================================================== */}
      {/* 1) SUCCESS SUMMARY BAR (Directly Below Search Area)   */}
      {/* ==================================================== */}
      {verifyResult?.status === 'VALID' && verifyResult.product && verifyResult.activation && (
        <div id="section-verification" className="no-print bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-400 shadow-md shadow-emerald-500/5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>ملخص التحقق السريع من وثيقة الضمان</span>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>تم التحقق والاعتماد بنجاح</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs sm:text-sm">
            {/* 1. المنتج أصلي */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">المنتج</span>
              <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">المنتج أصلي ({verifyResult.product.model})</span>
              </div>
            </div>

            {/* 2. الضمان ساري */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">حالة الوثيقة</span>
              <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>الضمان ساري ومسجل</span>
              </div>
            </div>

            {/* 3. مدة الضمان */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">مدة الضمان</span>
              <div className="flex items-center gap-1.5 text-[#D62828] font-bold">
                <Award className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>{verifyResult.product.warranty_years} سنوات شاملة</span>
              </div>
            </div>

            {/* 4. الأيام المتبقية */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">الأيام المتبقية</span>
              <div className="flex items-center gap-1.5 text-slate-900 font-mono font-black">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{verifyResult.days_remaining !== undefined ? `${verifyResult.days_remaining} يوم` : '—'}</span>
              </div>
            </div>

            {/* 5. رقم وثيقة الضمان */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">رقم وثيقة الضمان</span>
              <div className="font-mono font-black text-xs sm:text-sm text-[#D62828] truncate">
                {verifyResult.activation.warranty_id}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* الخطوة الثانية: عرض حالة المنتج بعد العثور عليه مباشرة */}
      {/* ==================================================== */}
      {searchExecuted && verifyResult && (
        <div className="space-y-6">
          {/* ========================================== */}
          {/* CASE 1: الضمان مفعل (Active Warranty)      */}
          {/* ========================================== */}
          {verifyResult.status === 'VALID' && verifyResult.product && verifyResult.activation && (() => {
            const statusTheme = getWarrantyStatusTheme(
              verifyResult.status,
              verifyResult.days_remaining,
              verifyResult.activation.activated_at,
              Boolean(activationSuccessBanner)
            );

            return (
              <div className="space-y-6 animate-fade-in">
                {/* Success Banner if just activated */}
                {activationSuccessBanner && (
                  <div className="no-print p-4 rounded-2xl bg-emerald-100 border border-emerald-400 text-emerald-950 font-bold flex items-center gap-3 shadow-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span>{activationSuccessBanner}</span>
                  </div>
                )}

                {/* Status Header Banner with Clear Color */}
                <div className={`no-print ${statusTheme.cardBg} border-2 ${statusTheme.borderColor} rounded-3xl p-6 sm:p-8 shadow-xs`}>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                    <div className="flex items-center gap-4 text-right">
                      <div className={`w-16 h-16 rounded-2xl ${statusTheme.iconBg} ${statusTheme.iconColor} flex items-center justify-center shrink-0 shadow-sm`}>
                        <ShieldCheck className="w-9 h-9" />
                      </div>
                      <div>
                        <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full ${statusTheme.badgeBg} ${statusTheme.badgeText} text-xs font-black mb-1.5`}>
                          <span className={`w-2 h-2 rounded-full ${statusTheme.dotColor} animate-pulse`} />
                          <span>حالة الضمان: {statusTheme.label}</span>
                        </div>
                        <h3 className={`text-xl sm:text-2xl font-black ${statusTheme.titleColor}`}>
                          {statusTheme.subLabel}
                        </h3>
                        <p className={`text-xs sm:text-sm ${statusTheme.descColor} mt-0.5`}>
                          رقم وثيقة الضمان الرسمية: <strong className="font-mono text-[#D62828] font-black">{verifyResult.activation.warranty_id}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                      {verifyResult.days_remaining !== undefined && (
                        <div className="bg-white px-6 py-3.5 rounded-2xl border border-slate-200/90 text-center shadow-xs">
                          <span className="text-[11px] text-slate-500 font-bold block">متبقي على نهاية الضمان</span>
                          <span className={`font-black text-xl font-mono block ${statusTheme.titleColor}`}>
                            {verifyResult.days_remaining} يوماً
                          </span>
                        </div>
                      )}

                      <button
                        id="print-certificate-top-btn"
                        onClick={handlePrintCertificate}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-2xl shadow-md shadow-[#D62828]/20 transition cursor-pointer text-sm shrink-0"
                      >
                        <Printer className="w-4 h-4 text-white" />
                        <span>طباعة شهادة الضمان</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* 5) QUICK CUSTOMER ACTIONS PANEL                      */}
                {/* ==================================================== */}
                <div className="no-print bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>لوحة إجراءات وخدمات العميل السريعة</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">إجراءات فورية</span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. طباعة شهادة الضمان */}
                    <button
                      type="button"
                      onClick={handlePrintCertificate}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 text-right transition cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#D62828] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#D62828] transition-colors">
                          طباعة شهادة الضمان
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">إصدار نسخة ورقية رسمية</span>
                      </div>
                    </button>

                    {/* 2. نسخ رابط الوثيقة */}
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-right transition cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 transition-colors">
                          {copiedLink ? 'تم نسخ الرابط ✓' : 'نسخ رابط الوثيقة'}
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">مشاركة الرابط للتحقق</span>
                      </div>
                    </button>

                    {/* 3. تقديم طلب صيانة أو فحص */}
                    <button
                      type="button"
                      onClick={() => setIsClaimModalOpen(true)}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 text-right transition cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                          تقديم طلب صيانة أو فحص
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">خدمة العملاء والدعم الفني</span>
                      </div>
                    </button>

                    {/* 4. التحقق من منتج آخر */}
                    <button
                      type="button"
                      onClick={() => {
                        handleResetSearch();
                        setIsSearchCollapsed(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-right transition cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 transition-colors">
                          التحقق من منتج آخر
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">إجراء استعلام جديد</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Required Details Grid:
                    - الرقم التسلسلي
                    - الموديل
                    - المقاس
                    - تاريخ الإنتاج
                    - تاريخ التفعيل
                    - مدة الضمان
                    - تاريخ انتهاء الضمان
                */}
                <div id="section-warranty-details" className="no-print bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-6 h-6 text-[#D4AF37]" />
                    <h4 className="text-lg font-black text-[#111111]">
                      بيانات المنتج والضمان المعتمدة
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 rounded-xl transition border border-[#E5E7EB] cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ رابط الوثيقة'}</span>
                    </button>
                    <button
                      onClick={() => setIsClaimModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl transition border border-amber-200 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>تقديم طلب صيانة أو فحص</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs sm:text-sm">
                  {/* 1. الرقم التسلسلي */}
                  <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200">
                    <span className="text-slate-500 block mb-1 text-xs">الرقم التسلسلي (Serial)</span>
                    <strong className="text-[#D62828] font-mono text-base font-black block truncate">
                      {verifyResult.product.serial_number}
                    </strong>
                  </div>

                  {/* 2. الموديل */}
                  <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200">
                    <span className="text-slate-500 block mb-1 text-xs">الموديل</span>
                    <strong className="text-[#111111] text-sm sm:text-base font-bold block truncate">
                      {verifyResult.product.model}
                    </strong>
                  </div>

                  {/* 3. المقاس */}
                  <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200">
                    <span className="text-slate-500 block mb-1 text-xs">المقاس</span>
                    <strong className="text-[#111111] text-sm sm:text-base font-bold block truncate">
                      {verifyResult.product.size}
                    </strong>
                  </div>

                  {/* 4. تاريخ الإنتاج */}
                  <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200">
                    <span className="text-slate-500 block mb-1 text-xs">تاريخ الإنتاج</span>
                    <strong className="text-slate-800 font-mono text-sm sm:text-base font-bold block">
                      {verifyResult.product.production_date}
                    </strong>
                  </div>

                  {/* 5. تاريخ التفعيل */}
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <span className="text-emerald-700 block mb-1 text-xs">تاريخ التفعيل</span>
                    <strong className="text-emerald-950 font-mono text-sm sm:text-base font-bold block">
                      {new Date(verifyResult.activation.activation_date).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </strong>
                  </div>

                  {/* 6. مدة الضمان */}
                  <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200">
                    <span className="text-slate-500 block mb-1 text-xs">مدة الضمان</span>
                    <strong className="text-[#D62828] text-sm sm:text-base font-black block">
                      {verifyResult.product.warranty_years} سنوات ضمان شامل
                    </strong>
                  </div>

                  {/* 7. تاريخ انتهاء الضمان */}
                  <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200">
                    <span className="text-slate-500 block mb-1 text-xs">تاريخ انتهاء الضمان</span>
                    <strong className="text-slate-900 font-mono text-sm sm:text-base font-bold block">
                      {verifyResult.activation.expiry_date}
                    </strong>
                  </div>

                  {/* Customer Name */}
                  <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200">
                    <span className="text-slate-500 block mb-1 text-xs">اسم العميل المسجل</span>
                    <strong className="text-[#111111] text-sm sm:text-base font-bold block truncate">
                      {verifyResult.activation.customer_name}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* بوابة تتبع طلبات الصيانة والشكاوى الفنية (Claims & Workflow Tracking) */}
              {/* ========================================================= */}
              <div id="section-claims-tracking" className="no-print bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-6 h-6 text-[#D62828]" />
                    <div>
                      <h4 className="text-lg font-black text-[#111111]">
                        بوابة الدعم الفني وتتبع طلبات الصيانة والضمان
                      </h4>
                      <p className="text-xs text-slate-500">
                        تتبع حالة الفحص الفني، المعاينة المنزلية، واستبدال مراتب سليبي
                      </p>
                    </div>
                  </div>
                  
                  <span className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold font-mono text-slate-600">
                    إجمالي الطلبات: {associatedClaims.length}
                  </span>
                </div>

                {associatedClaims.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-slate-800">لا توجد طلبات صيانة نشطة أو سابقة</h5>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        إذا واجهت أي مشكلة فنية أو هبوط في المرتبة، يمكنك تقديم طلب فحص فني فوري وسيقوم مهندس المعاينة بالتواصل معك لزيارتك في المنزل.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsClaimModalOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>تقديم طلب معاينة وضمان جديد</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {associatedClaims.map((claim) => {
                      // Status Badge Themes
                      let badgeBg = 'bg-amber-100 text-amber-900 border-amber-300';
                      let badgeText = 'قيد المراجعة والجدولة';
                      if (claim.claim_status === 'Approved' || claim.claim_status === 'Inspected' || claim.claim_status === 'Assigned') {
                        badgeBg = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                        badgeText = 'تمت المعاينة وقيد المعالجة';
                      } else if (claim.claim_status === 'Closed') {
                        badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                        badgeText = 'تم الحل والإغلاق بنجاح';
                      }

                      // Find linked replacement
                      const linkedReplacement = associatedReplacements.find(
                        (r) => r.old_serial_number === claim.serial_number || r.old_warranty_id === claim.warranty_id
                      );

                      return (
                        <div key={claim.claim_id} className="p-5 sm:p-6 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-5 text-right relative">
                          {/* Claim Top Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-[#D62828] text-base">
                                رقم الطلب: {claim.claim_id}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${badgeBg}`}>
                                {badgeText}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-bold">
                              تاريخ تسجيل الشكوى: <span className="font-mono">{claim.created_at ? claim.created_at.split('T')[0] : 'غير معروف'}</span>
                            </div>
                          </div>

                          {/* Complaint Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                            <div className="space-y-2">
                              <span className="text-slate-500 font-bold block">موضوع الشكوى والتشخيص الفني:</span>
                              <div className="bg-white p-3.5 rounded-xl border border-slate-200 font-bold text-slate-800">
                                {claim.complaint_type === 'Spring Collapse' && 'هبوط / كسر في شاسيه السوست'}
                                {claim.complaint_type === 'Foam Collapse' && 'هبوط موضعي في طبقات الإسفنج / الفوم'}
                                {claim.complaint_type === 'Fabric Defect' && 'عيب في القماش الخارجي أو الكابتونيه'}
                                {claim.complaint_type === 'Noise' && 'أصوات احتكاك أو طقطقة غير طبيعية'}
                                {claim.complaint_type === 'Manufacturing Defect' && 'عيب مصنعي عام أو تشطيب'}
                                {claim.complaint_type === 'Other' && 'شكوى أو عيب آخر'}
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                                {claim.complaint_description}
                              </p>
                            </div>

                            {/* Technical Inspection Timeline (مسار المعاينة الفنية) */}
                            <div className="space-y-2">
                              <span className="text-slate-500 font-bold block">مسار المعاينة الفنية الميدانية:</span>
                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${claim.inspection_date ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    ✓
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800">تحديد موعد المعاينة المنزلية:</div>
                                    <div className="text-xs font-mono text-slate-600 mt-0.5">
                                      {claim.inspection_date 
                                        ? `مجدولة بتاريخ: ${claim.inspection_date}`
                                        : 'جاري التنسيق لتحديد موعد الزيارة من مهندس الفحص الفني'
                                      }
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-start gap-3 border-t border-slate-100 pt-2.5">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${claim.inspection_result ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    ✓
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800">تقرير نتيجة الفحص والتقييم:</div>
                                    <div className="text-xs text-slate-600 mt-0.5 leading-relaxed font-semibold">
                                      {claim.inspection_result 
                                        ? claim.inspection_result
                                        : 'بانتظار وصول مهندس الفحص الفني للتقييم المنزلي وتسجيل التقرير'
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Replacement Order Workflow (سير عمل الاستبدال والحل النهائي) */}
                          {linkedReplacement ? (
                            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                              <div className="flex items-center gap-2 text-emerald-950 font-black text-xs sm:text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>إذن الاستبدال الفوري المعتمد والمصدر من إدارة الجودة:</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                                  <span className="text-slate-500 block mb-0.5">رقم إذن الاستبدال</span>
                                  <strong className="text-emerald-950 font-mono font-bold block">{linkedReplacement.replacement_id}</strong>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                                  <span className="text-slate-500 block mb-0.5">الرقم التسلسلي الجديد الممنوح</span>
                                  <strong className="text-[#D62828] font-mono font-black block">{linkedReplacement.new_serial_number}</strong>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                                  <span className="text-slate-500 block mb-0.5">تاريخ اعتماد الإذن</span>
                                  <strong className="text-slate-800 font-mono font-bold block">{linkedReplacement.approval_date ? linkedReplacement.approval_date.split('T')[0] : '2026-01-01'}</strong>
                                </div>
                              </div>
                            </div>
                          ) : (
                            claim.claim_status === 'Approved' && (
                              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600" />
                                <span>تمت الموافقة الفنية على استبدال المرتبة، وجاري إصدار وطباعة شهادة الرقم التسلسلي الجديد من خطوط الإنتاج.</span>
                              </div>
                            )
                          )}

                          {/* Claim Closure Final Verdict Block */}
                          {claim.claim_status === 'Closed' && (
                            <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl space-y-1 text-xs">
                              <div className="text-slate-700 font-bold">القرار والحل النهائي المغلق بمصادقة العميل:</div>
                              <p className="font-bold text-slate-900 text-sm mt-1 leading-relaxed">
                                {claim.resolution || 'تم تسليم المنتج المستبدل وإجراء الصيانة الشاملة وإغلاق الطلب.'}
                              </p>
                              {claim.resolution_date && (
                                <div className="text-slate-400 text-[10px] font-mono pt-1">
                                  تاريخ الإغلاق الرسمي: {claim.resolution_date.split('T')[0]}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* شهادة الضمان الرسمية الفاخرة المطبوعة (Printable Certificate) */}
              {/* ========================================================= */}
              <div id="section-certificate" className="certificate-print-area bg-white rounded-3xl border-4 border-[#D4AF37] p-6 sm:p-10 shadow-xl relative overflow-hidden text-right">
                {/* Decorative Frame */}
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-[#D62828] via-[#D4AF37] to-[#D62828]" />
                <div className="absolute inset-2 sm:inset-3 border border-[#D4AF37]/50 rounded-2xl pointer-events-none" />
                <div className="absolute inset-3 sm:inset-4 border border-dashed border-[#D4AF37]/30 rounded-xl pointer-events-none" />

                {/* Certificate Top Header */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-b-2 border-[#E5E7EB] pb-6 mb-8 gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-[#D62828] flex items-center justify-center shadow-lg shadow-[#D62828]/25 border-2 border-[#D4AF37]">
                      <Bed className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-[#111111] tracking-tight">سليبي</h2>
                        <span className="text-[#D62828] font-mono font-black text-xl tracking-widest">SLEEPEE</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">الشركة العربية لتصنيع مراتب السوست والإسفنج</p>
                      <p className="text-[11px] text-[#D4AF37] font-bold">شهادة ضمان الجودة والصلابة الأصلية المعتمدة</p>
                    </div>
                  </div>

                  <div className="text-center sm:text-left bg-[#F5F5F5] border border-[#D4AF37]/40 px-5 py-3 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">رقم وثيقة الضمان المعتمدة</div>
                    <div className="text-lg font-mono font-black text-[#D62828] tracking-wide">
                      {verifyResult.activation.warranty_id}
                    </div>
                    <div className="text-[11px] font-bold mt-1 flex items-center justify-center sm:justify-start gap-1">
                      <span className="w-2 h-2 rounded-full inline-block bg-emerald-500" />
                      <span className="text-emerald-700">شهادة سارية ومسجلة رسمياً</span>
                    </div>
                  </div>
                </div>

                {/* Certificate Title Badge */}
                <div className="relative z-10 text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#111111] text-xs sm:text-sm font-black mb-3">
                    <Award className="w-4 h-4 text-[#D4AF37]" />
                    <span className="tracking-wide">شهادة ضمان الجودة الأصلية المعتمدة | OFFICIAL WARRANTY CERTIFICATE</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#111111]">
                    تشهد شركة سليبي للمراتب بضمان هذا المنتج الأصلي
                  </h3>
                  <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
                    صنعت هذه المرتبة وفقاً لأعلى المعايير والمواصفات الطبية العالمية مع الالتزام الكامل بخدمات الصيانة والاستبدال.
                  </p>
                </div>

                {/* Certificate 2-Column Details Grid */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Customer Information */}
                  <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
                    <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2.5 mb-3 text-[#111111] font-bold text-sm">
                      <User className="w-4 h-4 text-[#D62828]" />
                      <span>بيانات العميل وفاتورة الشراء</span>
                    </div>
                    <dl className="space-y-2.5 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">اسم العميل:</dt>
                        <dd className="font-bold text-[#111111]">{verifyResult.activation.customer_name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">رقم الهاتف المسجل:</dt>
                        <dd className="font-mono font-bold text-[#111111]">{verifyResult.activation.phone}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">المحافظة والمدينة:</dt>
                        <dd className="font-semibold text-slate-800">
                          {verifyResult.activation.governorate} {verifyResult.activation.city ? `- ${verifyResult.activation.city}` : ''}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">رقم الفاتورة الأصلية:</dt>
                        <dd className="font-mono font-bold text-[#D62828]">{verifyResult.activation.invoice_number}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">تاريخ الشراء:</dt>
                        <dd className="font-mono font-bold text-slate-800">{verifyResult.activation.purchase_date}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Mattress Specifications */}
                  <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
                    <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2.5 mb-3 text-[#111111] font-bold text-sm">
                      <Bed className="w-4 h-4 text-[#D62828]" />
                      <span>مواصفات المرتبة وفترة الضمان</span>
                    </div>
                    <dl className="space-y-2.5 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">موديل المرتبة:</dt>
                        <dd className="font-bold text-[#111111]">{verifyResult.product.model}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">المقاس والأبعاد:</dt>
                        <dd className="font-semibold text-slate-800">{verifyResult.product.size}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">الرقم التسلسلي (Serial No):</dt>
                        <dd className="font-mono font-black text-[#D62828] tracking-wider">{verifyResult.product.serial_number}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-semibold">تاريخ الإنتاج:</dt>
                        <dd className="font-mono font-semibold text-slate-700">{verifyResult.product.production_date}</dd>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                        <dt className="text-[#111111] font-bold">مدة الضمان الإجمالية:</dt>
                        <dd className="px-3 py-1 rounded-full bg-[#D62828] text-white font-black text-xs font-mono shadow-xs">
                          {verifyResult.product.warranty_years} سنوات ضمان شامل
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Validity Period Ribbon */}
                <div className="relative z-10 bg-[#111111] text-white rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-[#D4AF37]/50 shadow-md">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-[#D4AF37] shrink-0" />
                    <div>
                      <div className="text-xs text-[#D4AF37] font-bold">فترة سريان الضمان المعتمد:</div>
                      <div className="text-base font-black font-mono mt-0.5 tracking-wide">
                        من: {verifyResult.activation.purchase_date} &nbsp;وحتى:&nbsp; {verifyResult.activation.expiry_date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right sm:border-r sm:border-slate-700 sm:pr-4">
                    <div>
                      <span className="text-xs text-slate-400 block">تاريخ التفعيل بالنظام:</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {new Date(verifyResult.activation.activation_date).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code & Warranty Terms */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-t-2 border-[#E5E7EB] pt-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center p-3 bg-[#F5F5F5] rounded-2xl border border-[#D4AF37]/40 shadow-xs text-center">
                    {qrCertificateUrl ? (
                      <img src={qrCertificateUrl} alt="QR Code" className="w-32 h-32 object-contain rounded-lg mb-2 mix-blend-multiply" />
                    ) : (
                      <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center text-xs text-slate-400 mb-2">
                        توليد رمز QR...
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-[#111111]">امسح للتحقق الفوري من صحة الضمان</span>
                  </div>

                  {/* Terms */}
                  <div className="md:col-span-2 text-xs text-slate-600 space-y-1.5 leading-relaxed bg-[#F5F5F5] p-5 rounded-2xl border border-[#E5E7EB]">
                    <h4 className="font-bold text-[#111111] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#D62828]" />
                      <span>شروط وضوابط ضمان مراتب سليبي (Sleepee Warranty Terms):</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      <li>يشمل الضمان هبوط السوست أو عيوب الصناعة الهيكلية في الشاسيه الداخلي وطبقات الفوم.</li>
                      <li>الضمان يسري فقط مع الاحتفاظ بأصل فاتورة الشراء وهذه الشهادة المعتمدة برمز QR.</li>
                      <li>لا يشمل الضمان التلف الناتج عن سوء الاستخدام أو سوء التخزين أو انسكاب السوائل.</li>
                      <li>لأي استفسار أو طلب صيانة يرجى الاتصال بالخط الساخن المباشر: <strong className="text-[#D62828]">19707</strong>.</li>
                    </ul>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-[#E5E7EB] mt-2 font-mono">
                      <span className="font-bold text-[#111111]">إدارة الجودة والضمان: SLEEPEE QA DEPT</span>
                      <span className="font-bold text-[#D62828]">الخط الساخن: 19707</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8) Role-Based Product Lifecycle Timeline (no-print) */}
              {visibleLifecycleEvents.length > 0 && (
                <div id="section-lifecycle" className="no-print bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#D62828]" />
                      <div>
                        <h4 className="text-sm font-bold text-[#111111]">
                          سجل دورة حياة المرتبة والتحقق التوثيقي ({visibleLifecycleEvents.length} حدث)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {isManagementRole
                            ? (lifecycleViewMode === 'MANAGEMENT'
                                ? 'عرض الإدارة والجودة الكامل (جميع أحداث الإنتاج والتحقق)'
                                : 'معاينة عرض العميل (المراحل الرئيسية فقط)')
                            : 'عرض العميل المعتمد (المراحل الأساسية للتصنيع والتفعيل)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isManagementRole && (
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setLifecycleViewMode('MANAGEMENT')}
                            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                              lifecycleViewMode === 'MANAGEMENT'
                                ? 'bg-white text-slate-900 shadow-xs font-black'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            عرض الإدارة ({lifecycleEvents.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setLifecycleViewMode('CUSTOMER')}
                            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                              lifecycleViewMode === 'CUSTOMER'
                                ? 'bg-white text-slate-900 shadow-xs font-black'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            معاينة العميل
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowTimeline(!showTimeline)}
                        className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{showTimeline ? 'إخفاء المسار الزمني' : 'عرض المسار الزمني'}</span>
                        {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {showTimeline && (
                    <div className="pt-3 border-t border-[#E5E7EB]">
                      <LifecycleTimeline
                        serialNumber={verifyResult.product.serial_number}
                        timeline={visibleLifecycleEvents}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })()}

          {/* ==================================================== */}
          {/* CASE 2: الضمان غير مفعل (Not Activated)              */}
          {/* إظهار نموذج تفعيل الضمان مباشرة داخل نفس الصفحة       */}
          {/* الحقول:                                              */}
          {/* - اسم العميل                                        */}
          {/* - رقم الهاتف                                        */}
          {/* - المحافظة                                          */}
          {/* - تاريخ الشراء                                      */}
          {/* - رقم الفاتورة (اختياري)                             */}
          {/* زر: تفعيل الضمان                                     */}
          {/* ==================================================== */}
          {verifyResult.status === 'UNACTIVATED' && verifyResult.product && (
            <div className="space-y-6 animate-fade-in">
              {/* Product Identified Banner with Amber Theme */}
              <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-200/80 pb-5 mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-8 h-8 text-amber-700" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/70 text-amber-950 text-xs font-black mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                        <span>حالة الضمان: الضمان غير مفعل</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-amber-950">
                        المرتبة أصلية ومسجلة في المصنع - جاهزة للتفعيل الآن
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-900 mt-0.5">
                        تم التحقق بنجاح من وجود الرقم التسلسلي بخطوط إنتاج سليبي. يرجى استكمال بيانات الشراء أدناه لتفعيل الضمان فوراً.
                      </p>
                    </div>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 font-mono font-bold text-xs text-amber-900 shrink-0">
                    الحالة: غير مفعل (جاهز)
                  </span>
                </div>

                {/* Product Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs sm:text-sm">
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200">
                    <span className="text-slate-500 block mb-1 text-xs">الرقم التسلسلي</span>
                    <strong className="text-[#D62828] font-mono text-sm sm:text-base font-black block truncate">
                      {verifyResult.product.serial_number}
                    </strong>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200">
                    <span className="text-slate-500 block mb-1 text-xs">موديل المرتبة</span>
                    <strong className="text-[#111111] text-sm sm:text-base font-bold block truncate">
                      {verifyResult.product.model}
                    </strong>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200">
                    <span className="text-slate-500 block mb-1 text-xs">المقاس</span>
                    <strong className="text-[#111111] text-sm sm:text-base font-bold block truncate">
                      {verifyResult.product.size}
                    </strong>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200">
                    <span className="text-slate-500 block mb-1 text-xs">مدة الضمان المقررة</span>
                    <strong className="text-[#D62828] text-sm sm:text-base font-black block">
                      {verifyResult.product.warranty_years} سنوات ضمان شامل
                    </strong>
                  </div>
                </div>
              </div>

              {/* In-Page Activation Form */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-xs space-y-6">
                <div className="border-b border-[#E5E7EB] pb-4">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-6 h-6 text-[#D62828]" />
                    <h4 className="text-lg sm:text-xl font-black text-[#111111]">
                      نموذج تفعيل الضمان الإلكتروني المباشر
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    أدخل بيانات المشتري وتاريخ الشراء لإصدار وثيقة الضمان الرسمية فوراً بدون مغادرة هذه الشاشة.
                  </p>
                </div>

                {activationError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{activationError}</span>
                  </div>
                )}

                <form onSubmit={handleActivateSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* 1. اسم العميل */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        اسم العميل ثلاثي *
                      </label>
                      <div className="relative">
                        <input
                          id="customer-name-input"
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="مثال: أحمد محمد علي"
                          className="w-full text-sm px-4 py-3.5 pr-10 rounded-2xl border border-slate-300 bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-4" />
                      </div>
                    </div>

                    {/* 2. رقم الهاتف */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رقم الهاتف المحمول *
                      </label>
                      <div className="relative">
                        <input
                          id="customer-phone-input"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="مثال: 01012345678"
                          className="w-full text-left font-mono text-sm px-4 py-3.5 pr-10 rounded-2xl border border-slate-300 bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-4" />
                      </div>
                    </div>

                    {/* 3. المحافظة */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        المحافظة *
                      </label>
                      <div className="relative">
                        <select
                          id="customer-governorate-select"
                          value={governorate}
                          onChange={(e) => setGovernorate(e.target.value)}
                          className="w-full text-sm px-4 py-3.5 pr-10 rounded-2xl border border-slate-300 bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111] cursor-pointer"
                        >
                          {EGYPTIAN_GOVERNORATES.map((gov) => (
                            <option key={gov} value={gov}>
                              {gov}
                            </option>
                          ))}
                        </select>
                        <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-4" />
                      </div>
                    </div>

                    {/* 4. تاريخ الشراء */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        تاريخ الشراء *
                      </label>
                      <div className="relative">
                        <input
                          id="customer-purchase-date-input"
                          type="date"
                          required
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full text-left font-mono text-sm px-4 py-3.5 pr-10 rounded-2xl border border-slate-300 bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        />
                        <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-4" />
                      </div>
                    </div>

                    {/* 5. رقم الفاتورة (اختياري) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رقم الفاتورة (اختياري)
                      </label>
                      <div className="relative">
                        <input
                          id="customer-invoice-input"
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="مثال: INV-2026-104 (يمكن تركه فارغاً إذا لم تتوفر الفاتورة حالياً)"
                          className="w-full text-left font-mono text-sm px-4 py-3.5 pr-10 rounded-2xl border border-slate-300 bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        />
                        <FileText className="w-4 h-4 text-slate-400 absolute right-3.5 top-4" />
                      </div>
                    </div>
                  </div>

                  {/* Step 3: مراجعة البيانات قبل التفعيل */}
                  {customerName.trim().length >= 3 && phone.trim().length >= 8 && (
                    <div className="p-4 sm:p-5 bg-[#F9FAFB] rounded-2xl border-2 border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>المرحلة الثالثة: مراجعة ملخص بيانات التفعيل قبل التأكيد</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          جاهز للتفعيل
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">اسم العميل:</span>
                          <strong className="text-[#111111] font-bold truncate block">{customerName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">رقم الهاتف:</span>
                          <strong className="text-[#111111] font-mono font-bold block">{phone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">المحافظة:</span>
                          <strong className="text-[#111111] font-bold block">{governorate}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">تاريخ الشراء:</span>
                          <strong className="text-[#111111] font-mono font-bold block">{purchaseDate}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">
                      بالنقر على تفعيل الضمان، يتم تسجيل المرتبة رسمياً وإصدار شهادة الضمان المعتمدة.
                    </span>

                    <button
                      id="submit-activation-btn"
                      type="submit"
                      disabled={activating}
                      className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-2xl shadow-lg shadow-[#D62828]/25 transition cursor-pointer text-base disabled:opacity-50"
                    >
                      {activating ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>جاري تفعيل الضمان وإصدار الشهادة...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 text-white" />
                          <span>تفعيل الضمان</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* CASE 3: الضمان منتهي (Expired Warranty)    */}
          {/* تحويل الصفحة إلى مركز خدمات ما بعد انتهاء الضمان */}
          {/* ========================================== */}
          {verifyResult.status === 'EXPIRED' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                {/* Top Status Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rose-200 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-9 h-9" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-200 text-rose-950 text-xs font-black mb-1">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        <span>حالة الضمان: الضمان منتهي</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-rose-950">
                        فترة الضمان الرسمية المقررة لهذا المنتج قد انتهت
                      </h3>
                      <p className="text-xs sm:text-sm text-rose-800 mt-1">
                        مركز خدمات ودعم ما بعد انتهاء فترة الضمان الرسمي من سليبي
                      </p>
                    </div>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 font-mono font-bold text-xs text-rose-900 shrink-0">
                    الحالة: منتهي الصلاحية
                  </span>
                </div>

                {/* 1) Prominent Expired Warranty Message */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-rose-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-950 font-black text-sm sm:text-base">
                    <AlertCircle className="w-5 h-5 text-[#D62828] shrink-0" />
                    <span>إشعار خدمات ما بعد انتهاء الضمان:</span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-slate-800 font-bold">
                    انتهت فترة الضمان الرسمية لهذا المنتج، وما زالت خدمات الصيانة والدعم الفني والتقييم متاحة من خلال سليبي. يتم تحديد تكلفة الخدمة النهائية بعد الفحص الفني.
                  </p>
                </div>

                {/* Product Data Grid */}
                {verifyResult.product && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs sm:text-sm">
                    <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-2xs">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">الرقم التسلسلي</span>
                      <strong className="text-[#D62828] font-mono text-sm sm:text-base font-black block truncate">
                        {verifyResult.product.serial_number}
                      </strong>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-2xs">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">موديل المرتبة</span>
                      <strong className="text-[#111111] text-sm sm:text-base font-bold block truncate">
                        {verifyResult.product.model}
                      </strong>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-2xs">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">المقاس</span>
                      <strong className="text-[#111111] text-sm sm:text-base font-bold block truncate">
                        {verifyResult.product.size}
                      </strong>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-2xs">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">تاريخ انتهاء الضمان</span>
                      <strong className="text-rose-700 font-mono text-sm sm:text-base font-black block">
                        {verifyResult.activation?.expiry_date || 'منتهي'}
                      </strong>
                    </div>
                  </div>
                )}

                {/* 2) After-Warranty Maintenance Services */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-rose-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <Wrench className="w-5 h-5 text-[#D62828] shrink-0" />
                    <h4 className="text-base sm:text-lg font-black text-slate-900">
                      خدمات الصيانة المتاحة بعد انتهاء الضمان
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>استبدال الأقمشة الخارجية</span>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>تجديد طبقات الإسفنج والمواد الداخلية</span>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>إصلاح أو استبدال الشاسيه والسوست</span>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>إعادة تنجيد وتجديد المرتبة بالكامل</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 font-bold">
                    <HelpCircle className="w-4 h-4 text-[#D62828] shrink-0" />
                    <span>يتم تحديد تكلفة الخدمة النهائية بعد الفحص الفني.</span>
                  </div>
                </div>

                {/* 3) Technical Inspection Options */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-rose-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <FileText className="w-5 h-5 text-[#D62828] shrink-0" />
                    <h4 className="text-base sm:text-lg font-black text-slate-900">
                      خيارات الفحص الفني
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-[#F9FAFB] hover:border-slate-300 transition space-y-2">
                      <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm sm:text-base">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-[#D62828] flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <span>زيارة فنية بموقع العميل</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-bold pr-10.5">
                        يقوم فني معتمد بمعاينة المرتبة وتحديد الأعمال المطلوبة.
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-[#F9FAFB] hover:border-slate-300 transition space-y-2">
                      <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm sm:text-base">
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span>إرسال المرتبة للمصنع للتقييم</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-bold pr-10.5">
                        يتم فحص المرتبة داخل المصنع وإصدار تقرير فني وتكلفة تقديرية للإصلاح.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5) Authorized Service Center (Placeholders) */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-rose-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-5 h-5 text-[#D62828] shrink-0" />
                      <h4 className="text-base sm:text-lg font-black text-slate-900">
                        أقرب مركز خدمة معتمد
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                      معلومات استرشادية
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">اسم الفرع أو المركز</span>
                      <strong className="text-slate-900 font-bold block truncate">
                        مركز خدمة وضمان سليبي الرئيسي
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">المدينة</span>
                      <strong className="text-slate-900 font-bold block truncate">
                        القاهرة الكبرى (تغطية لكافة الفروع)
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">رقم التواصل</span>
                      <strong className="text-[#D62828] font-mono font-black text-sm block">
                        19707
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block mb-1 text-xs font-bold">مواعيد العمل</span>
                      <strong className="text-slate-900 font-bold block text-xs">
                        السبت - الخميس: 9:00 ص - 9:00 م
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4 & 6) Actions Group (Prominent Paid Service Request, Hotline, New Search) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-rose-200">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Primary Action Button: طلب خدمة صيانة مدفوعة (Disabled - قريباً) */}
                    <button
                      type="button"
                      disabled
                      className="h-[52px] px-6 py-3.5 bg-[#D62828] text-white font-bold rounded-2xl shadow-md shadow-[#D62828]/25 opacity-75 cursor-not-allowed inline-flex items-center justify-center gap-2.5 text-sm sm:text-base border-2 border-[#D62828]"
                    >
                      <Wrench className="w-5 h-5 shrink-0" />
                      <span>طلب خدمة صيانة مدفوعة</span>
                      <span className="px-2 py-0.5 rounded-lg bg-white/25 text-white text-xs font-bold">
                        قريباً
                      </span>
                    </button>

                    {/* Hotline Contact Button */}
                    <a
                      href="tel:19707"
                      className="h-[52px] px-5 py-3.5 bg-[#111111] hover:bg-black text-white font-bold rounded-2xl shadow-md transition inline-flex items-center justify-center gap-2 text-xs sm:text-sm border-2 border-[#111111] cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>طلب صيانة عبر الخط الساخن 19707</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="h-[52px] px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-300 transition inline-flex items-center justify-center text-xs sm:text-sm cursor-pointer"
                  >
                    استعلام عن مرتبة أخرى
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* CASE 4: الرقم غير موجود (Not Found)       */}
          {/* تحسين صفحة المنتج غير موجود بالنظام       */}
          {/* ========================================== */}
          {verifyResult.status === 'NOT_FOUND' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                {/* 1) Top Status Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-red-200 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                      <XCircle className="w-9 h-9" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-200 text-red-950 text-xs font-black mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        <span>نتيجة البحث: لا توجد نتائج مطابقة</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-red-950">
                        عذراً، لم نتمكن من العثور على أي منتج يطابق معايير البحث
                      </h3>
                      <p className="text-xs sm:text-sm text-red-800 mt-1">
                        لم يتم العثور على أي سجل مسجل بالنظام يطابق البيانات المدخلة في معايير الاستعلام الحالية.
                      </p>
                    </div>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-xl bg-white border border-red-300 font-bold text-xs text-red-900 shrink-0">
                    حالة المنتج: غير موجود بالنظام
                  </span>
                </div>

                {/* 4) Clearer Compact Status Presentation */}
                <div className="p-4 bg-white rounded-2xl border border-red-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 block">حالة المنتج</span>
                      <strong className="text-base sm:text-lg font-black text-red-900">
                        غير موجود بالنظام
                      </strong>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    نتيجة الاستعلام: لم يتم العثور على منتج مطابق لبيانات البحث
                  </div>
                </div>

                {/* 7) Future OCR Compatibility Banner (If search originated from OCR) */}
                {lastSearchSourceRef.current === 'OCR Label' && (
                  <div className="p-4 bg-white rounded-2xl border-2 border-red-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800 font-bold">
                      <Camera className="w-4 h-4 text-[#D62828] shrink-0" />
                      <span>قد تكون الصورة غير واضحة أو الرقم غير مقروء بالكامل.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => ocrFileInputRef.current?.click()}
                      className="h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة قراءة الصورة</span>
                    </button>
                  </div>
                )}

                {/* 3) Guidance Action Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#D62828]" />
                    <span>خطوات إرشادية مقترحة:</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Card 1 */}
                    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-red-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm sm:text-base">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span>التحقق من الرقم التسلسلي</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        تأكد من مطابقة الرقم الموجود على بطاقة المنتج أو الليبل.
                      </p>
                    </div>

                    {/* Card 2 */}
                    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-red-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm sm:text-base">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <span>استخدام مسح QR</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        استخدم مسح QR بالكاميرا لتجنب أخطاء الإدخال اليدوي.
                      </p>
                    </div>

                    {/* Card 3 */}
                    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-red-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm sm:text-base">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span>التواصل مع خدمة العملاء</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        في حال استمرار المشكلة يرجى التواصل مع خدمة العملاء.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5) Customer Guidance Message (Highlighted Note) */}
                <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-200/90 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-amber-950 font-bold leading-relaxed">
                    إذا كانت المرتبة حديثة الشراء ولم يتم العثور على الرقم التسلسلي، يرجى التواصل مع خدمة العملاء للتحقق من بيانات المنتج.
                  </p>
                </div>

                {/* 6) Primary Actions */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-red-200">
                  <a
                    href="tel:19707"
                    className="h-[52px] px-6 py-3 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition inline-flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>التواصل مع خدمة العملاء 19707</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="h-[52px] px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 transition cursor-pointer"
                  >
                    المحاولة برقم آخر
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Claim Modal */}
      {isClaimModalOpen && verifyResult?.activation && verifyResult?.product && (
        <CustomerClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          activation={verifyResult.activation}
          product={verifyResult.product}
          onClaimSubmitted={() => {
            setIsClaimModalOpen(false);
            if (verifyResult.product) {
              handleSearch(verifyResult.product.serial_number);
            }
          }}
        />
      )}
    </div>
  );
};
