import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw } from 'lucide-react';
import { ActivationLog } from '../../types';

interface ActivityLogsTabProps {
  currentLogs?: ActivationLog[];
  currentSerial?: string;
  onLoadCase?: (serial: string) => void;
}

export const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({
  currentLogs = [],
  currentSerial,
  onLoadCase,
}) => {
  const [allLogs, setAllLogs] = useState<ActivationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'case'>('all');
  const [logSearch, setLogSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setAllLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs in CS360:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const logsToFilter = filterMode === 'case' && currentSerial
    ? allLogs.filter((l) => l.serial_number === currentSerial)
    : allLogs;

  const filteredLogs = logsToFilter.filter((l) => {
    const q = logSearch.toLowerCase();
    return (
      (l.serial_number && l.serial_number.toLowerCase().includes(q)) ||
      (l.warranty_id && l.warranty_id.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.created_at && l.created_at.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 text-right font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
                سجل تدقيق وتتبع حركات النظام (Activation & Audit Logs)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                سجل زمني شامل لجميع العمليات والحركات المنفذة على النظام وتوثيق تفعيل الضمانات
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {currentSerial && (
              <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-xl border border-[#E5E7EB] text-xs font-bold">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white text-[#D62828] shadow-xs'
                      : 'text-slate-600 hover:text-[#111111]'
                  }`}
                >
                  جميع الحركات ({allLogs.length})
                </button>
                <button
                  onClick={() => setFilterMode('case')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    filterMode === 'case'
                      ? 'bg-white text-[#D62828] shadow-xs'
                      : 'text-slate-600 hover:text-[#111111]'
                  }`}
                >
                  حركات هذه الحالة ({allLogs.filter(l => l.serial_number === currentSerial).length})
                </button>
              </div>
            )}

            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="بحث بالسيريال، الوثيقة، الإجراء..."
                className="w-full px-4 py-2 pr-10 text-xs rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            <button
              onClick={fetchLogs}
              disabled={loading}
              title="تحديث السجل"
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
                <th className="p-3 font-bold">الوقت والتاريخ</th>
                <th className="p-3 font-bold">الرقم التسلسلي</th>
                <th className="p-3 font-bold">رقم الوثيقة</th>
                <th className="p-3 font-bold">الإجراء المسجل في النظام</th>
                {onLoadCase && <th className="p-3 font-bold text-center">الإجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={onLoadCase ? 5 : 4} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#D62828]" />
                      <span>جاري تحميل سجل النشاطات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={onLoadCase ? 5 : 4} className="p-8 text-center text-slate-500">
                    لا توجد حركات مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr
                    key={l.id}
                    className={`hover:bg-[#F5F5F5]/80 transition ${
                      currentSerial && l.serial_number === currentSerial ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(l.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#111111]">{l.serial_number}</td>
                    <td className="p-3 font-mono font-bold text-[#D62828]">{l.warranty_id || '-'}</td>
                    <td className="p-3 text-[#111111] font-semibold">{l.action}</td>
                    {onLoadCase && (
                      <td className="p-3 text-center">
                        {l.serial_number ? (
                          <button
                            type="button"
                            onClick={() => onLoadCase(l.serial_number)}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold transition shadow-xs text-[11px] cursor-pointer"
                            title="فتح هذه الحالة في خدمة العملاء 360"
                          >
                            فتح في 360
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
