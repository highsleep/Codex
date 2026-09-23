import React, { useState, useEffect } from 'react';
import {
  Search,
  Bed,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  ArrowLeftRight,
  ChevronRight,
  FolderOpen,
  Wrench,
  Award,
  Layers,
  CheckSquare,
  FileCheck,
  History,
} from 'lucide-react';
import {
  CustomerService360 as CS360Type,
  WarrantyActivation,
  Product,
  WarrantyClaim,
  Replacement,
  AppUser,
} from '../types';

import { CustomerProfileTab } from './cs360/CustomerProfileTab';
import { ProductWarrantyTab } from './cs360/ProductWarrantyTab';
import { ClaimsHistoryTab } from './cs360/ClaimsHistoryTab';
import { InspectionsQualityTab } from './cs360/InspectionsQualityTab';
import { RepairsReplacementsTab } from './cs360/RepairsReplacementsTab';
import { AttachmentsPhotosTab } from './cs360/AttachmentsPhotosTab';
import { LifecycleTimelineTab } from './cs360/LifecycleTimelineTab';
import { WarrantiesTab } from './cs360/WarrantiesTab';
import { ActivityLogsTab } from './cs360/ActivityLogsTab';

import { NewClaimModal } from './cs360/modals/NewClaimModal';
import { ApproveReplacementModal } from './cs360/modals/ApproveReplacementModal';
import { ApproveRepairModal } from './cs360/modals/ApproveRepairModal';
import { CloseCaseModal } from './cs360/modals/CloseCaseModal';
import { ReplacementCertificateModal } from './cs360/modals/ReplacementCertificateModal';

export type CS360Tab =
  | 'customer_profile'
  | 'product_warranty'
  | 'claims_history'
  | 'inspections_quality'
  | 'repairs_replacements'
  | 'attachments_photos'
  | 'lifecycle_timeline'
  | 'warranties'
  | 'logs';

interface CustomerService360Props {
  initialQuery?: string;
  initialTab?: CS360Tab;
  currentUser?: AppUser | null;
  onOpenNewClaim?: (serial: string, warrantyId?: string, customerName?: string, phone?: string) => void;
  onOpenReplacement?: (oldSerial: string, oldWarrantyId: string) => void;
  onViewCertificate?: (activation: WarrantyActivation, product: Product) => void;
}

export const CustomerService360: React.FC<CustomerService360Props> = ({
  initialQuery = 'SLP-2026-9082',
  initialTab,
  currentUser,
  onOpenNewClaim,
  onOpenReplacement,
  onViewCertificate,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CS360Type | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The Official Sub-tabs (including Warranties & Activity Logs)
  const [activeTab, setActiveTab] = useState<CS360Tab>(initialTab || 'customer_profile');

  // Modals state
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [showApproveReplacementModal, setShowApproveReplacementModal] = useState(false);
  const [showApproveRepairModal, setShowApproveRepairModal] = useState(false);
  const [showCloseCaseModal, setShowCloseCaseModal] = useState(false);
  const [activeReplacementCertificate, setActiveReplacementCertificate] = useState<Replacement | null>(null);

  // Selected claim for contextual inspection/repair/close
  const [selectedClaimForAction, setSelectedClaimForAction] = useState<WarrantyClaim | null>(null);

  const fetch360 = async (query: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    setLoading(true);
    setError(null);

    try {
      let res = await fetch(`/api/customer-360/${encodeURIComponent(cleanQuery)}`);
      if (!res.ok && res.status === 404) {
        // Fallback to query parameter format
        const fallbackRes = await fetch(`/api/customer-service/360?q=${encodeURIComponent(cleanQuery)}`);
        if (fallbackRes.ok || fallbackRes.headers.get('content-type')?.includes('application/json')) {
          res = fallbackRes;
        }
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`لم يتم العثور على سجل بالرقم (${cleanQuery})، أو أن الخادم قيد إعادة التشغيل.`);
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'تعذر جلب ملف خدمة العملاء 360');
      }
      setData(result);
    } catch (err: any) {
      console.error('Error fetching 360 view:', err);
      setError(err.message || 'حدث خطأ في تحميل البيانات');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch360(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetch360(searchQuery);
  };

  // Determine current case execution step (متابعة حالة التنفيذ)
  const currentClaim = data?.claims && data.claims.length > 0 ? data.claims[0] : null;

  const getExecutionStage = () => {
    if (!currentClaim) {
      if (data?.replacement_received_for) return 4; // Delivered replacement
      return 1;
    }
    if (currentClaim.claim_status === 'Closed') return 5;
    if (currentClaim.claim_status === 'Approved') return 4;
    if (currentClaim.claim_status === 'Under Inspection') return 2;
    if (currentClaim.inspection_result) return 3;
    return 1;
  };

  const currentStage = getExecutionStage();

  // Modal Handlers
  const handleOpenNewClaim = () => {
    setShowNewClaimModal(true);
  };

  const handleOpenReplacement = (claim?: WarrantyClaim) => {
    if (claim) setSelectedClaimForAction(claim);
    setShowApproveReplacementModal(true);
  };

  const handleOpenRepair = (claim: WarrantyClaim) => {
    setSelectedClaimForAction(claim);
    setShowApproveRepairModal(true);
  };

  const handleOpenCloseCase = (claim: WarrantyClaim) => {
    setSelectedClaimForAction(claim);
    setShowCloseCaseModal(true);
  };

  const handleSelectClaimForInspection = (claim: WarrantyClaim) => {
    setSelectedClaimForAction(claim);
    setActiveTab('inspections_quality');
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* 1. Top Search Bar & Case Management Header */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#E5E7EB] flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D62828] text-white flex items-center justify-center font-bold font-mono shadow-md shadow-[#D62828]/20">
            360°
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#111111] font-['Cairo']">
                مركز إدارة الحالة وخدمة العملاء 360°
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 bg-[#D62828]/10 text-[#D62828] rounded-full font-bold border border-[#D62828]/20">
                Case Management Center
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة متكاملة لدورة خدمة العميل، الضمان، الشكاوى، المعاينات، قرارات الجودة، والاستبدال من شاشة موحدة
            </p>
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="w-full md:w-auto flex-1 max-w-lg flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالرقم التسلسلي، رقم الضمان، هاتف العميل، أو الفاتورة..."
              className="w-full px-4 py-2.5 pr-10 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#111111] focus:bg-white focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 focus:outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs shadow-md shadow-[#D62828]/20 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>استعلام</span>
          </button>
        </form>
      </div>

      {/* Quick sample chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <span className="font-bold text-[#111111]">سجلات تجريبية سريعة:</span>
        <button
          type="button"
          onClick={() => {
            setSearchQuery('SLP-2026-9082');
            fetch360('SLP-2026-9082');
          }}
          className="px-3 py-1 bg-[#F5F5F5] hover:bg-[#D62828]/10 text-slate-800 hover:text-[#D62828] border border-[#E5E7EB] rounded-lg font-mono text-[11px] transition cursor-pointer"
        >
          SLP-2026-9082 (حالة كاملة: شكوى + استبدال + مرفقات)
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchQuery('SLP-2026-9081');
            fetch360('SLP-2026-9081');
          }}
          className="px-3 py-1 bg-[#F5F5F5] hover:bg-[#D62828]/10 text-slate-800 hover:text-[#D62828] border border-[#E5E7EB] rounded-lg font-mono text-[11px] transition cursor-pointer"
        >
          SLP-2026-9081 (رويال بوكيت مفعلة)
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchQuery('01012345678');
            fetch360('01012345678');
          }}
          className="px-3 py-1 bg-[#F5F5F5] hover:bg-[#D62828]/10 text-slate-800 hover:text-[#D62828] border border-[#E5E7EB] rounded-lg font-mono text-[11px] transition cursor-pointer"
        >
          هاتف: 01012345678 (أحمد محمود)
        </button>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h4 className="text-sm font-bold text-rose-900">تعذر تحميل بيانات العميل</h4>
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* Main 360 Workspace */}
      {data && (
        <div className="space-y-6">
          {/* 2. Hero Card: Mattress & Customer Identity + Quick Case Actions */}
          <div className="bg-white rounded-3xl shadow-xs border border-[#E5E7EB] overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D62828] to-[#B71C1C] text-white flex items-center justify-center font-bold shadow-md shadow-[#D62828]/20">
                  <Bed className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black font-['Cairo'] text-[#111111]">
                      {data.activation ? data.activation.customer_name : 'مرتبة لم تُفعل للعميل بعد'}
                    </h3>
                    {data.replacement_received_for && (
                      <span className="text-[10px] px-2.5 py-0.5 bg-purple-600 text-white rounded-full font-bold">
                        مرتبة بديلة معتمدة
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                    <span className="text-[#D62828] font-bold">
                      السيريال: {data.product.serial_number}
                    </span>
                    <span>•</span>
                    <span className="text-slate-800 font-sans font-bold">
                      {data.product.model} ({data.product.size})
                    </span>
                    {data.activation && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-sans font-bold">
                          وثيقة: {data.activation.warranty_id}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenNewClaim}
                  className="px-3.5 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-[#D62828]/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء شكوى جديدة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRepair(currentClaim || {
                    claim_id: 'DIRECT-REPAIR',
                    warranty_id: data.activation?.warranty_id || '',
                    serial_number: data.product.serial_number,
                    customer_name: data.activation?.customer_name || 'عميل مباشر',
                    phone: data.activation?.phone || '',
                    complaint_type: 'Other',
                    complaint_description: 'أمر إصلاح وصيانة مباشر',
                    claim_status: 'Approved',
                    assigned_to: null,
                    inspection_date: null,
                    inspection_result: null,
                    resolution: null,
                    resolution_date: null,
                    images: [],
                    created_at: new Date().toISOString(),
                  })}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>اعتماد الإصلاح</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenReplacement(currentClaim || undefined)}
                  className="px-3.5 py-2 bg-[#111111] hover:bg-black text-[#D4AF37] hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>اعتماد الاستبدال</span>
                </button>

                {currentClaim && currentClaim.claim_status !== 'Closed' && (
                  <button
                    type="button"
                    onClick={() => handleOpenCloseCase(currentClaim)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>إغلاق الحالة</span>
                  </button>
                )}

                {data.activation && onViewCertificate && (
                  <button
                    type="button"
                    onClick={() => onViewCertificate(data.activation!, data.product)}
                    className="px-3.5 py-2 bg-[#F5F5F5] hover:bg-slate-200 text-[#111111] text-xs font-bold rounded-xl border border-[#E5E7EB] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>شهادة الضمان</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Execution Pipeline (متابعة حالة التنفيذ) */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-[#F5F5F5] border-b border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-black text-[#111111] font-['Cairo'] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#D62828]" />
                  <span>متابعة حالة التنفيذ ومراحل دورة الخدمة:</span>
                </span>
                <span className="text-slate-500 font-mono">
                  {currentClaim
                    ? `البلاغ النشط: ${currentClaim.claim_id} (${currentClaim.claim_status})`
                    : 'حالة المنتج: سليم ومسجل بالضمان'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  { step: 1, title: '1- تسجيل البلاغ', desc: currentClaim ? 'تم فتح الشكوى' : 'لا توجد شكاوى' },
                  { step: 2, title: '2- المعاينة الفنية', desc: currentStage >= 2 ? 'فحص ميداني' : 'بانتظار الفحص' },
                  { step: 3, title: '3- قرار الجودة', desc: currentStage >= 3 ? 'إصلاح / استبدال' : 'بانتظار القرار' },
                  { step: 4, title: '4- التنفيذ والصيانة', desc: currentStage >= 4 ? 'جاري التنفيذ' : 'معلق' },
                  { step: 5, title: '5- التسليم والإغلاق', desc: currentStage === 5 ? 'تم الإغلاق بنجاح' : 'قيد المتابعة' },
                ].map((item) => {
                  const isPast = currentStage > item.step;
                  const isCurrent = currentStage === item.step;
                  return (
                    <div
                      key={item.step}
                      className={`p-3 rounded-2xl border transition ${
                        isCurrent
                          ? 'bg-[#D62828] text-white border-[#D62828] shadow-md shadow-[#D62828]/20 font-bold'
                          : isPast
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-white text-slate-400 border-[#E5E7EB]'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        <span className="text-[11px] font-black">{item.title}</span>
                      </div>
                      <span className={`text-[10px] block truncate ${isCurrent ? 'text-white/90' : 'opacity-80'}`}>
                        {item.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. The Official Sub-tabs Navigation Bar */}
            <div className="bg-[#F5F5F5] px-6 py-2 flex items-center gap-1.5 overflow-x-auto border-t border-[#E5E7EB]">
              {[
                { id: 'customer_profile', label: '1- بيانات العميل', icon: User, badge: null },
                { id: 'product_warranty', label: '2- بيانات المنتج والضمان', icon: ShieldCheck, badge: null },
                { id: 'claims_history', label: '3- سجل الشكاوى', icon: AlertTriangle, badge: data.claims?.length || 0 },
                { id: 'inspections_quality', label: '4- المعاينات وقرارات الجودة', icon: Award, badge: null },
                { id: 'repairs_replacements', label: '5- الإصلاحات والاستبدالات', icon: ArrowLeftRight, badge: data.replacements?.length || 0 },
                { id: 'attachments_photos', label: '6- المرفقات والصور', icon: FolderOpen, badge: data.attachments?.length || 0 },
                { id: 'lifecycle_timeline', label: '7- السجل الزمني الكامل للحالة', icon: Clock, badge: data.unified_timeline?.length || 0 },
                { id: 'warranties', label: '8- وثائق الضمان', icon: ShieldCheck, badge: null },
                { id: 'logs', label: '9- سجل النشاطات', icon: History, badge: data.logs?.length || 0 },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as CS360Tab)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#D62828] text-white shadow-xs'
                        : 'text-slate-700 hover:text-[#D62828] hover:bg-white border border-transparent hover:border-[#E5E7EB]'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.badge !== null && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isActive ? 'bg-white text-[#D62828]' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Sub-tabs Content Rendering */}
          <div>
            {activeTab === 'customer_profile' && (
              <CustomerProfileTab
                activation={data.activation}
                product={data.product}
                communications={data.communications}
                onRefresh={() => fetch360(data.product.serial_number)}
                onOpenNewClaim={handleOpenNewClaim}
              />
            )}

            {activeTab === 'product_warranty' && (
              <ProductWarrantyTab
                product={data.product}
                activation={data.activation}
                onViewCertificate={onViewCertificate}
              />
            )}

            {activeTab === 'claims_history' && (
              <ClaimsHistoryTab
                claims={data.claims}
                currentSerial={data.product.serial_number}
                warrantyId={data.activation?.warranty_id}
                customerName={data.activation?.customer_name}
                phone={data.activation?.phone}
                onOpenNewClaim={handleOpenNewClaim}
                onSelectClaimForInspection={handleSelectClaimForInspection}
                onApproveRepair={handleOpenRepair}
                onApproveReplacement={handleOpenReplacement}
                onCloseClaim={handleOpenCloseCase}
                onLoadCase={(serial) => fetch360(serial)}
              />
            )}

            {activeTab === 'inspections_quality' && (
              <InspectionsQualityTab
                claims={data.claims}
                selectedClaimId={selectedClaimForAction?.claim_id}
                currentUser={currentUser}
                onRefresh={() => fetch360(data.product.serial_number)}
                onApproveReplacement={handleOpenReplacement}
              />
            )}

            {activeTab === 'repairs_replacements' && (
              <RepairsReplacementsTab
                product={data.product}
                activation={data.activation}
                replacements={data.replacements}
                replacementOrigin={data.replacement_received_for}
                claims={data.claims}
                currentUser={currentUser}
                onRefresh={() => fetch360(data.product.serial_number)}
                onOpenReplacementModal={() => handleOpenReplacement(currentClaim || undefined)}
                onViewReplacementCertificate={(rep) => setActiveReplacementCertificate(rep)}
                onLoadCase={(serial) => fetch360(serial)}
              />
            )}

            {activeTab === 'attachments_photos' && (
              <AttachmentsPhotosTab
                data={data}
                onRefresh={() => fetch360(data.product.serial_number)}
              />
            )}

            {activeTab === 'lifecycle_timeline' && (
              <LifecycleTimelineTab
                data={data}
                onRefresh={() => fetch360(data.product.serial_number)}
              />
            )}

            {activeTab === 'warranties' && (
              <WarrantiesTab
                currentActivation={data.activation}
                currentProduct={data.product}
                onViewCertificate={onViewCertificate}
                onLoadCase={(serial) => fetch360(serial)}
              />
            )}

            {activeTab === 'logs' && (
              <ActivityLogsTab
                currentLogs={data.logs}
                currentSerial={data.product.serial_number}
                onLoadCase={(serial) => fetch360(serial)}
              />
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {data && (
        <>
          <NewClaimModal
            isOpen={showNewClaimModal}
            serialNumber={data.product.serial_number}
            warrantyId={data.activation?.warranty_id}
            customerName={data.activation?.customer_name}
            phone={data.activation?.phone}
            onClose={() => setShowNewClaimModal(false)}
            onSuccess={() => {
              fetch360(data.product.serial_number);
              setActiveTab('claims_history');
            }}
          />

          <ApproveReplacementModal
            isOpen={showApproveReplacementModal}
            oldSerial={data.product.serial_number}
            oldWarrantyId={data.activation?.warranty_id}
            defaultReason={selectedClaimForAction?.complaint_description}
            currentUser={currentUser}
            onClose={() => setShowApproveReplacementModal(false)}
            onSuccess={(rep) => {
              fetch360(data.product.serial_number);
              setActiveReplacementCertificate(rep);
              setActiveTab('repairs_replacements');
            }}
          />

          <ApproveRepairModal
            isOpen={showApproveRepairModal}
            claim={selectedClaimForAction || currentClaim}
            currentUser={currentUser}
            onClose={() => setShowApproveRepairModal(false)}
            onSuccess={() => {
              fetch360(data.product.serial_number);
              setActiveTab('repairs_replacements');
            }}
          />

          <CloseCaseModal
            isOpen={showCloseCaseModal}
            claim={selectedClaimForAction || currentClaim}
            currentUser={currentUser}
            onClose={() => setShowCloseCaseModal(false)}
            onSuccess={() => {
              fetch360(data.product.serial_number);
              setActiveTab('claims_history');
            }}
          />

          <ReplacementCertificateModal
            replacement={activeReplacementCertificate}
            onClose={() => setActiveReplacementCertificate(null)}
          />
        </>
      )}
    </div>
  );
};
