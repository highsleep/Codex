import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Award, RefreshCw } from 'lucide-react';
import { WarrantyActivation, Product } from '../../types';

interface WarrantiesTabProps {
  currentActivation?: WarrantyActivation | null;
  currentProduct?: Product;
  onViewCertificate?: (activation: WarrantyActivation, product: Product) => void;
  onLoadCase?: (serial: string) => void;
}

export const WarrantiesTab: React.FC<WarrantiesTabProps> = ({
  currentActivation,
  currentProduct,
  onViewCertificate,
  onLoadCase,
}) => {
  const [warranties, setWarranties] = useState<WarrantyActivation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [warrantySearch, setWarrantySearch] = useState('');

  const fetchWarrantiesData = async () => {
    setLoading(true);
    try {
      const [warRes, prodRes] = await Promise.all([
        fetch('/api/admin/warranties'),
        fetch('/api/admin/products'),
      ]);
      if (warRes.ok) {
        const warData = await warRes.json();
        setWarranties(warData);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
    } catch (err) {
      console.error('Error fetching warranties in CS360:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarrantiesData();
  }, []);

  const filteredWarranties = warranties.filter((w) => {
    const q = warrantySearch.toLowerCase();
    return (
      w.warranty_id.toLowerCase().includes(q) ||
      w.serial_number.toLowerCase().includes(q) ||
      w.customer_name.toLowerCase().includes(q) ||
      w.phone.includes(q) ||
      w.invoice_number.toLowerCase().includes(q) ||
      (w.governorate && w.governorate.toLowerCase().includes(q)) ||
      (w.city && w.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 text-right font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#111111] font-['Cairo']">سجل وثائق الضمان المفعلة</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                قاعدة بيانات وثائق الضمان لجميع العملاء مع إمكانية البحث والتحقق من سريان الشهادات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={warrantySearch}
                onChange={(e) => setWarrantySearch(e.target.value)}
                placeholder="بحث برقم الوثيقة، العميل، الهاتف، الفاتورة..."
                className="w-full px-4 py-2 pr-10 text-xs rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
            <button
              onClick={fetchWarrantiesData}
              disabled={loading}
              title="تحديث البيانات"
              className="p-2.5 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F5] border-b border-[#E5E7EB] text-slate-700">
              <tr>
                <th className="p-3 font-bold">رقم وثيقة الضمان</th>
                <th className="p-3 font-bold">الرقم التسلسلي</th>
                <th className="p-3 font-bold">اسم العميل</th>
                <th className="p-3 font-bold">الهاتف</th>
                <th className="p-3 font-bold">المحافظة / المدينة</th>
                <th className="p-3 font-bold">رقم الفاتورة</th>
                <th className="p-3 font-bold">تاريخ الشراء</th>
                <th className="p-3 font-bold">انتهاء الضمان</th>
                <th className="p-3 font-bold text-center">حالة الضمان</th>
                <th className="p-3 font-bold text-center">الشهادة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#D62828]" />
                      <span>جاري تحميل وثائق الضمان...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredWarranties.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    لا توجد وثائق ضمان مطابقة لنتائج البحث
                  </td>
                </tr>
              ) : (
                filteredWarranties.map((w) => {
                  let prod = products.find((p) => p.serial_number === w.serial_number);
                  if (!prod && currentProduct && currentProduct.serial_number === w.serial_number) {
                    prod = currentProduct;
                  }
                  const isExpired = new Date(w.expiry_date) < new Date();
                  const isCurrent = currentActivation && currentActivation.warranty_id === w.warranty_id;

                  return (
                    <tr
                      key={w.id || w.warranty_id}
                      className={`transition ${
                        isCurrent ? 'bg-amber-50/60 font-medium' : 'hover:bg-[#F5F5F5]/80'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-[#D62828]">{w.warranty_id}</td>
                      <td className="p-3 font-mono font-bold text-[#111111]">{w.serial_number}</td>
                      <td className="p-3 font-bold text-[#111111]">{w.customer_name}</td>
                      <td className="p-3 font-mono text-slate-700">{w.phone}</td>
                      <td className="p-3 text-slate-700">
                        {w.governorate} - {w.city}
                      </td>
                      <td className="p-3 font-mono text-slate-600">{w.invoice_number}</td>
                      <td className="p-3 font-mono text-slate-600">{w.purchase_date}</td>
                      <td className="p-3 font-mono font-bold text-[#111111]">{w.expiry_date}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isExpired
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isExpired ? 'منتهي الصلاحية' : 'ساري ومفعل (Active)'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onLoadCase && (
                            <button
                              type="button"
                              onClick={() => onLoadCase(w.serial_number)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold transition shadow-xs text-[11px] cursor-pointer"
                              title="فتح هذه الحالة في ملف خدمة العملاء 360"
                            >
                              <span>فتح في 360</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (prod && onViewCertificate) {
                                onViewCertificate(w, prod);
                              } else if (onViewCertificate) {
                                onViewCertificate(w, {
                                  serial_number: w.serial_number,
                                  model: 'مرتبة سليبي',
                                  size: 'قياسي',
                                  warranty_years: 10,
                                  production_date: w.purchase_date,
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111111] hover:bg-black text-white font-bold transition shadow-xs text-[11px] cursor-pointer"
                          >
                            <Award className="w-3 h-3 text-[#D4AF37]" />
                            <span>عرض الشهادة</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
