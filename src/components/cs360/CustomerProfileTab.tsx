import React, { useState } from 'react';
import {
  User,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Copy,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { WarrantyActivation, Product, CustomerCommunication } from '../../types';
import { CustomerCommunicationsSection } from '../CustomerCommunicationsSection';

interface CustomerProfileTabProps {
  activation: WarrantyActivation | null;
  product: Product;
  communications?: CustomerCommunication[];
  onRefresh: () => void;
  onOpenNewClaim?: () => void;
}

export const CustomerProfileTab: React.FC<CustomerProfileTabProps> = ({
  activation,
  product,
  communications = [],
  onRefresh,
  onOpenNewClaim,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPhone = (phoneStr: string) => {
    navigator.clipboard.writeText(phoneStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatWhatsApp = (phoneStr: string) => {
    let clean = phoneStr.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '2' + clean;
    }
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* 1. Customer Identity & Verification Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
                  {activation ? activation.customer_name : 'عميل غير مسجل / منتج في المستودع'}
                </h3>
                {activation ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>عميل موثق</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3 h-3" />
                    <span>بانتظار التفعيل</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                الملف الشامل لبيانات العميل، جهات الاتصال، وتفاصيل فاتورة الشراء الأصلية
              </p>
            </div>
          </div>

          {activation && (
            <div className="flex items-center gap-2">
              <a
                href={formatWhatsApp(activation.phone)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>محادثة واتساب</span>
              </a>
              <a
                href={`tel:${activation.phone}`}
                className="px-3 py-2 bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال هاتف</span>
              </a>
            </div>
          )}
        </div>

        {activation ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {/* Primary Contact */}
            <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-3 text-xs">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                بيانات التواصل والموقع
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[#111111] font-bold">
                  <Phone className="w-4 h-4 text-[#D62828]" />
                  <span dir="ltr">{activation.phone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyPhone(activation.phone)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 rounded-lg text-[10px] font-bold border border-[#E5E7EB] text-slate-600 transition flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              <div className="flex items-start gap-2 text-slate-700 pt-1">
                <MapPin className="w-4 h-4 text-[#D62828] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#111111]">
                    {activation.governorate} - {activation.city}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    العنوان المسجل لدى خدمة العملاء
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice & Purchase */}
            <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-2.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                بيانات الفاتورة والشراء
              </span>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#D62828]" />
                  <span>رقم الفاتورة:</span>
                </span>
                <span className="font-mono font-bold text-[#D62828] bg-white px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                  {activation.invoice_number}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ الشراء:</span>
                </span>
                <span className="font-mono text-[#111111] font-bold">
                  {activation.purchase_date}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>منفذ البيع / المعرض:</span>
                </span>
                <span className="text-slate-800 font-bold">
                  معارض سليبي الرسمية المعتمدة
                </span>
              </div>
            </div>

            {/* Registration Metadata */}
            <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-2.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                بيانات تسجيل الوثيقة
              </span>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
                <span className="text-slate-500">رقم وثيقة الضمان:</span>
                <span className="font-mono font-bold text-[#111111]">
                  {activation.warranty_id}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
                <span className="text-slate-500">تاريخ تفعيل الضمان:</span>
                <span className="font-mono text-slate-800">
                  {new Date(activation.activation_date).toLocaleString('ar-EG')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">قناة التفعيل:</span>
                <span className="text-slate-800 font-bold bg-white px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                  بوابة الضمان الإلكتروني بالباركود
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] mt-6 space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="text-sm font-black text-[#111111]">لم يتم تفعيل الضمان لهذا الرقم التسلسلي بعد</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              المرتبة مسجلة في المصنع ومجهزة، وعندما يقوم العميل بشراء المرتبة وتفعيل الضمان ستظهر كافة بياناته الشخصية هنا تلقائياً.
            </p>
          </div>
        )}
      </div>

      {/* 2. Customer Communications Log */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <CustomerCommunicationsSection
          serialNumber={product.serial_number}
          communications={communications}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
};
