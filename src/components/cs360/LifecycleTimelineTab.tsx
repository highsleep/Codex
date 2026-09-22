import React, { useState } from 'react';
import { Clock, History, CheckCircle2, Layers } from 'lucide-react';
import { UnifiedTimeline } from '../UnifiedTimeline';
import { LifecycleTimeline } from '../LifecycleTimeline';
import { CustomerService360 } from '../../types';

interface LifecycleTimelineTabProps {
  data: CustomerService360;
  onRefresh: () => void;
}

export const LifecycleTimelineTab: React.FC<LifecycleTimelineTabProps> = ({
  data,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'detailed'>('unified');

  return (
    <div className="space-y-6 text-right font-sans">
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
                السجل الزمني الكامل للحالة ودورة حياة المرتبة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع كامل متسلسل للأحداث: التصنيع، البيع، تفعيل الضمان، الشكاوى، المعاينات، والاستبدال
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-[#D62828] text-white shadow-xs'
                  : 'bg-[#F5F5F5] text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>المخطط الزمني الموحد ({data.unified_timeline?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-[#D62828] text-white shadow-xs'
                  : 'bg-[#F5F5F5] text-slate-700 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>محطات دورة الحياة ({data.lifecycle?.length || 0})</span>
            </button>
          </div>
        </div>

        <div className="pt-6">
          {viewMode === 'unified' ? (
            <UnifiedTimeline
              serialNumber={data.product.serial_number}
              events={data.unified_timeline || []}
            />
          ) : (
            <LifecycleTimeline
              serialNumber={data.product.serial_number}
              events={data.lifecycle || []}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
};
