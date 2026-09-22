import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Bed,
  ShieldCheck,
  AlertTriangle,
  ArrowLeftRight,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';

interface OmniSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: 'product' | 'warranty' | 'claim' | 'replacement', item: any) => void;
}

export const OmniSearchModal: React.FC<OmniSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    products: any[];
    warranties: any[];
    claims: any[];
    replacements: any[];
  }>({
    products: [],
    warranties: [],
    claims: [],
    replacements: [],
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], warranties: [], claims: [], replacements: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/omni?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('Omni-search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.products.length +
    results.warranties.length +
    results.claims.length +
    results.replacements.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden text-right font-sans flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center gap-3 bg-[#F5F5F5]">
          <Search className="w-5 h-5 text-[#D62828] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="البحث الشامل: رقم تسلسلي، وثيقة ضمان، اسم عميل، هاتف، شكوى، أو إذن استبدال..."
            className="flex-1 bg-transparent border-none text-sm text-[#111111] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-[#D62828] text-xs px-1.5 py-0.5 cursor-pointer"
            >
              مسح
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#E5E7EB] hover:bg-[#D62828] hover:text-white flex items-center justify-center text-slate-600 transition text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {loading && (
            <div className="text-center py-8 text-xs text-slate-400">
              جاري البحث في قاعدة البيانات المصنعية...
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="text-center py-10 text-slate-400 space-y-1">
              <p className="text-sm font-bold text-slate-600">لا توجد نتائج مطابقة</p>
              <p className="text-xs">جرب البحث برقم هاتف، رقم تسلسلي مثل SLP-2026، أو اسم العميل</p>
            </div>
          )}

          {!query && (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-[#D4AF37] mx-auto" />
              <p className="text-xs font-bold text-[#111111]">البحث الذكي الشامل في منظومة سليبي</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                اكتب أي كلمة بحث للاطلاع الفوري على المنتجات، وثائق الضمان، بلاغات الجودة، وأذونات الاستبدال
              </p>
            </div>
          )}

          {/* Warranties */}
          {results.warranties.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                وثائق الضمان المعتمدة ({results.warranties.length})
              </span>
              {results.warranties.map((w) => (
                <div
                  key={w.warranty_id}
                  onClick={() => {
                    onSelectResult('warranty', w);
                    onClose();
                  }}
                  className="p-3 bg-[#F5F5F5] hover:bg-white border border-[#E5E7EB] hover:border-[#D62828] rounded-xl cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111111]">{w.customer_name}</span>
                        <span className="font-mono text-[11px] text-[#D62828] bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                          {w.warranty_id}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        مسلسل: {w.serial_number} | هاتف: {w.phone}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}

          {/* Claims */}
          {results.claims.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                طلبات الضمان والشكاوى ({results.claims.length})
              </span>
              {results.claims.map((c) => (
                <div
                  key={c.claim_id}
                  onClick={() => {
                    onSelectResult('claim', c);
                    onClose();
                  }}
                  className="p-3 bg-[#F5F5F5] hover:bg-white border border-[#E5E7EB] hover:border-[#D62828] rounded-xl cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#D62828]">{c.claim_id}</span>
                        <span className="font-bold text-[#111111]">{c.complaint_type}</span>
                        <span className="text-[10px] px-2 py-0.2 bg-[#E5E7EB] text-slate-700 rounded-full font-bold">
                          {c.claim_status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        العميل: {c.customer_name} ({c.serial_number})
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}

          {/* Replacements */}
          {results.replacements.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                أذونات الاستبدال ({results.replacements.length})
              </span>
              {results.replacements.map((r) => (
                <div
                  key={r.replacement_id}
                  onClick={() => {
                    onSelectResult('replacement', r);
                    onClose();
                  }}
                  className="p-3 bg-[#F5F5F5] hover:bg-white border border-[#E5E7EB] hover:border-[#D62828] rounded-xl cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#D62828]">{r.replacement_id}</span>
                        <span className="text-[#111111]">{r.replacement_reason}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {r.old_serial_number} ➔ {r.new_serial_number}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                المراتب والإنتاج المصنعي ({results.products.length})
              </span>
              {results.products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectResult('product', p);
                    onClose();
                  }}
                  className="p-3 bg-[#F5F5F5] hover:bg-white border border-[#E5E7EB] hover:border-[#D62828] rounded-xl cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 text-[#111111] flex items-center justify-center">
                      <Bed className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#D62828]">{p.serial_number}</span>
                        <span className="font-bold text-[#111111]">{p.model}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        المقاس: {p.size} | التشغيلة: {p.batch_no}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
