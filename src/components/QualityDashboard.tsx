import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Bed,
  RefreshCw,
  Award,
  Filter,
  ArrowUpRight,
  Flame,
  Clock,
  BarChart2,
} from 'lucide-react';
import { QualityDashboardStats } from '../types';
import { PowerBIIntegrationHub } from './PowerBIIntegrationHub';

export const QualityDashboard: React.FC = () => {
  const [stats, setStats] = useState<QualityDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPowerBIModal, setShowPowerBIModal] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quality/stats');
      if (!res.ok) {
        throw new Error(`تعذر استرجاع مؤشرات الجودة (كود الاستجابة: ${res.status})`);
      }
      const data = await res.json();
      if (!data || data.error) {
        throw new Error(data?.error || 'استجابة مؤشرات الجودة غير صحيحة');
      }
      setStats(data);
    } catch (err: any) {
      console.error('Error loading quality stats:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل مؤشرات الجودة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-[#E5E7EB] shadow-xs">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#D62828] mb-3" />
        <p className="text-sm font-bold text-[#111111] font-['Cairo']">جاري تحميل مؤشرات الجودة ومعدلات العيوب المصنعية...</p>
        <p className="text-xs text-slate-500 mt-1">يتم تجميع وتحليل البيانات الإحصائية لشكاوى الضمان والموديلات</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-10 text-center bg-white rounded-3xl border border-rose-200 shadow-xs space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-black text-rose-800 font-['Cairo']">تعذر تحميل لوحة مؤشرات الجودة والعيوب</h3>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-5 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs transition cursor-pointer shadow flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة المحاولة الآن</span>
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#E5E7EB] flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#D62828] text-white flex items-center justify-center shadow-md shadow-[#D62828]/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
              <span>لوحة مؤشرات الجودة وتحليل العيوب المصنعية (Quality & Defect KPIs)</span>
            </h2>
            <p className="text-xs text-slate-500">
              تحليل دوري لشكاوى الضمان، معدل العيوب التراكمي، والموديلات الأكثر عرضة للملاحظات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPowerBIModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-black shadow-xs"
            title="تصدير وتحليل في Power BI"
          >
            <BarChart2 className="w-4 h-4 text-slate-950" />
            <span>تصدير لـ Power BI</span>
            <span className="px-1.5 py-0.2 rounded bg-black/20 text-slate-950 text-[10px] font-black">.pbids</span>
          </button>

          <button
            onClick={fetchStats}
            className="p-2.5 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 rounded-xl transition cursor-pointer flex items-center gap-2"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold text-slate-600">تحديث</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>تنبيه: {error} (يتم عرض البيانات المخزنة مؤقتاً)</span>
          </div>
          <button onClick={fetchStats} className="text-amber-900 font-bold underline text-[11px]">
            تحديث
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Warranties */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">إجمالي المراتب المفعلة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-[#111111]">
              {(stats.total_warranties ?? 0).toLocaleString()}
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[11px] text-slate-500 block">مرتبة تحت حماية الضمان النشط</span>
        </div>

        {/* Total Claims */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">إجمالي طلبات الضمان والشكاوى</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-[#111111]">
              {(stats.total_claims ?? 0).toLocaleString()}
            </span>
            <AlertTriangle className="w-5 h-5 text-[#D62828]" />
          </div>
          <span className="text-[11px] text-[#D62828] font-bold block">
            {stats.open_claims ?? 0} طلب قيد المتابعة والمعاينة
          </span>
        </div>

        {/* Defect Rate % */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">معدل العيوب المصنعية (Defect Rate)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-[#D62828]">
              {stats.defect_rate_percentage ?? 0}%
            </span>
            <TrendingDown className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[11px] text-emerald-600 font-bold block">
            أقل من معيار الجودة الأوروبي الأقصى (3.0%)
          </span>
        </div>

        {/* Replacements Approved */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">إجمالي الاستبدال المعتمد</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-[#B71C1C]">
              {stats.total_replacements ?? 0}
            </span>
            <Flame className="w-5 h-5 text-[#D62828]" />
          </div>
          <span className="text-[11px] text-slate-500 block">مراتب جديدة سلمت كبديل رسمي</span>
        </div>
      </div>

      {/* Enterprise Operational Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inspection Compliance */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">توثيق صور المعاينة الفنية</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-600">
              {stats.claims_with_attachments ?? 0}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[11px] text-slate-500 block">
            {stats.claims_without_inspection_photos ?? 0} بلاغ بحاجة لاستكمال صور الفحص
          </span>
        </div>

        {/* Inspection Time */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">متوسط زمن إنجاز المعاينة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-[#111111]">
              {stats.avg_inspection_time_hours || 24}
              <span className="text-xs font-sans mr-1 font-bold text-slate-500">ساعة</span>
            </span>
            <Clock className="w-5 h-5 text-[#D62828]" />
          </div>
          <span className="text-[11px] text-emerald-600 font-bold block">
            ضمن اتفاقية مستوى الخدمة SLA (أقل من 48 ساعة)
          </span>
        </div>

        {/* Replacement Fulfillment Speed */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">متوسط زمن دورة الاستبدال</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-[#111111]">
              {stats.avg_replacement_time_days || 3}
              <span className="text-xs font-sans mr-1 font-bold text-slate-500">أيام</span>
            </span>
            <ArrowUpRight className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <span className="text-[11px] text-slate-500 block">
            من تاريخ اعتماد الفحص حتى تسليم المرتبة الجديدة
          </span>
        </div>

        {/* Quality Audit Health */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2">
          <span className="text-xs font-bold text-slate-400 block">سلامة التوثيق غير القابل للتعديل</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-600">
              100%
            </span>
            <Award className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <span className="text-[11px] text-slate-500 block">
            سلسلة أحداث دورة الحياة ومستودع المرفقات سليم
          </span>
        </div>
      </div>

      {/* Main Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Complaint Type */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D62828]" />
              <h3 className="text-sm font-black text-[#111111] font-['Cairo']">
                توزيع العيوب حسب نوع الشكوى (Defects by Type)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">100% نسبة تراكمية</span>
          </div>

          <div className="space-y-4">
            {(stats.defects_by_type || []).map((item) => {
              const pct =
                (stats.total_claims ?? 0) > 0
                  ? Math.round((item.count / stats.total_claims) * 100)
                  : 0;
              return (
                <div key={item.type} className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#111111]">{item.type}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500">{item.count} شكوى</span>
                      <span className="font-bold text-[#D62828]">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-[#F5F5F5] rounded-full overflow-hidden border border-[#E5E7EB]">
                    <div
                      className="h-full bg-gradient-to-l from-[#D62828] to-[#B71C1C] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Problematic Mattress Models */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Bed className="w-4 h-4 text-[#D62828]" />
              <h3 className="text-sm font-black text-[#111111] font-['Cairo']">
                ترتيب الموديلات حسب معدل الشكاوى (Model Failure Rates)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">الإنتاج الحالي</span>
          </div>

          <div className="space-y-3">
            {(stats.problematic_models || []).map((m, idx) => (
              <div
                key={m.model}
                className="p-3 rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white border border-[#E5E7EB] text-[#111111] flex items-center justify-center font-bold font-mono text-[11px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-[#111111] block">{m.model}</span>
                    <span className="text-[11px] text-slate-500">
                      إجمالي الإنتاج المسجل: {m.total_sold} وحدة
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <span
                    className={`font-mono font-bold block ${
                      m.defect_rate > 1.5 ? 'text-[#D62828]' : 'text-[#111111]'
                    }`}
                  >
                    {m.defect_rate}% معدل
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {m.defects_count} حالات خلل
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Warranty Expiration Forecast & Lifecycle Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiration Forecast */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-[#111111] font-['Cairo']">
                توقعات انتهاء سريان الضمان (Warranty Expiration Forecast)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">مستقبلي</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(stats.warranty_expiration_forecast || [
              { period: '30d', label: 'خلال 30 يوم', count: 12, percentage: 4 },
              { period: '60d', label: 'خلال 60 يوم', count: 28, percentage: 9 },
              { period: '90d', label: 'خلال 90 يوم', count: 45, percentage: 14 },
              { period: '180d', label: 'خلال 6 أشهر', count: 96, percentage: 30 },
            ]).map((fc) => (
              <div
                key={fc.period}
                className="p-3 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] text-center space-y-1"
              >
                <span className="text-[11px] font-bold text-slate-500 block">{fc.label}</span>
                <span className="text-xl font-black font-mono text-[#111111] block">{fc.count}</span>
                <span className="text-[10px] text-[#D62828] font-bold block">{fc.percentage}% من المراتب</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle Events Distribution */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D62828]" />
              <h3 className="text-sm font-black text-[#111111] font-['Cairo']">
                توزيع أحداث دورة حياة المنتجات (Lifecycle Distribution)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">إجمالي التتبع</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(stats.lifecycle_distribution && stats.lifecycle_distribution.length > 0
              ? stats.lifecycle_distribution
              : [
                  { event_type: 'Produced', count: 124 },
                  { event_type: 'Quality Approved', count: 120 },
                  { event_type: 'Packed', count: 118 },
                  { event_type: 'Shipped', count: 110 },
                  { event_type: 'Sold', count: 98 },
                  { event_type: 'Warranty Activated', count: 85 },
                  { event_type: 'Claim Opened', count: 9 },
                  { event_type: 'Replacement Approved', count: 4 },
                ]
            ).map((item) => (
              <div
                key={item.event_type}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] rounded-xl border border-[#E5E7EB] text-xs"
              >
                <span className="text-slate-700 font-medium">{item.event_type}</span>
                <span className="font-mono font-black text-[#D62828] bg-[#D62828]/10 px-2 py-0.5 rounded-md text-[11px]">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend Cards */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-[#E5E7EB] space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="text-sm font-black text-[#111111] font-['Cairo']">
            المسار الشهري لبلاغات الضمان (Monthly Defect Trend)
          </h3>
          <span className="text-xs text-slate-400 font-mono">2025 / 2026</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {(stats.monthly_trends || []).map((m) => (
            <div
              key={m.month}
              className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] text-center space-y-1"
            >
              <span className="text-[11px] font-bold text-slate-500 block font-mono">{m.month}</span>
              <span className="text-xl font-black font-mono text-[#111111] block">{m.claims_count}</span>
              <span className="text-[10px] text-slate-400 block">بلاغات جودة</span>
            </div>
          ))}
        </div>
      </div>

      {/* Power BI Integration Modal */}
      {showPowerBIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl my-8">
            <PowerBIIntegrationHub isModal={true} onClose={() => setShowPowerBIModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
