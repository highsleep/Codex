import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  CalendarClock,
  Timer,
  CheckSquare,
  Square,
  Plus,
  ArrowRight,
  Flame,
  Filter,
  RefreshCw,
  MessageSquare,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  CalendarDays,
  Sparkles,
  Info
} from 'lucide-react';
import { WarrantyClaim, ClaimTask, CustomerCommunication, SLAStatus } from '../types';

interface SLATrackingBoardProps {
  claims: WarrantyClaim[];
  serialNumber: string;
  customerName?: string;
  customerPhone?: string;
  communications?: CustomerCommunication[];
  onOpenNewClaim?: () => void;
  onNavigateToCommunications?: () => void;
  onUpdateClaimSLA?: (claimId: string, updates: Partial<WarrantyClaim>) => Promise<void>;
}

export const SLATrackingBoard: React.FC<SLATrackingBoardProps> = ({
  claims,
  serialNumber,
  customerName,
  customerPhone,
  communications = [],
  onOpenNewClaim,
  onNavigateToCommunications,
  onUpdateClaimSLA,
}) => {
  // Status filter state
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BREACHED' | 'NEARING_DUE' | 'WITHIN_SLA'>('ALL');
  
  // Selected claim for inline editing or task adding
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [newFollowUpDate, setNewFollowUpDate] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [expandedClaimIds, setExpandedClaimIds] = useState<Record<string, boolean>>({});

  // Current simulated or system date
  const now = useMemo(() => new Date(), []);

  // Helper: Format date nicely in Arabic locale
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'غير محدد';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'غير محدد';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Helper: Calculate days between
  const getDaysBetween = (fromStr?: string | null, toStr?: string | null) => {
    if (!fromStr) return 0;
    try {
      const from = new Date(fromStr);
      const to = toStr ? new Date(toStr) : now;
      const diffMs = to.getTime() - from.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  };

  // Helper: Determine effective last action date
  const getEffectiveLastAction = (claim: WarrantyClaim) => {
    // Collect potential dates
    const dates: { date: Date; desc: string; source: string }[] = [];
    
    if (claim.last_action_date) {
      dates.push({ date: new Date(claim.last_action_date), desc: 'إجراء مسجل بالنظام', source: 'النظام' });
    }
    if (claim.inspection_date) {
      dates.push({ date: new Date(claim.inspection_date), desc: 'معاينة فنية ميدانية', source: 'الفحص الفني' });
    }
    if (claim.resolution_date) {
      dates.push({ date: new Date(claim.resolution_date), desc: 'اعتماد القرار / الإغلاق', source: 'إدارة الجودة' });
    }

    // Find any related customer communications
    const relatedComms = communications.filter(
      (c) => c.related_reference === claim.claim_id || c.serial_number === claim.serial_number
    );
    for (const comm of relatedComms) {
      dates.push({
        date: new Date(comm.date_time),
        desc: `${comm.communication_type}: ${comm.details.slice(0, 30)}...`,
        source: comm.responsible_user || 'خدمة العملاء'
      });
    }

    if (dates.length === 0) {
      return {
        dateStr: claim.created_at,
        desc: 'تسجيل وبلاغ الشكوى الأولي',
        source: 'خدمة العملاء'
      };
    }

    // Sort descending by date
    dates.sort((a, b) => b.date.getTime() - a.date.getTime());
    const latest = dates[0];
    return {
      dateStr: latest.date.toISOString(),
      desc: latest.desc,
      source: latest.source
    };
  };

  // Helper: Calculate SLA Metrics per claim
  const getClaimSLAMetrics = (claim: WarrantyClaim) => {
    const targetDays = claim.target_resolution_days || 7;
    const isClosed = claim.claim_status === 'Closed' || claim.claim_status === 'Approved' || claim.claim_status === 'Rejected';
    
    const daysOpen = isClosed && claim.resolution_date
      ? getDaysBetween(claim.created_at, claim.resolution_date)
      : getDaysBetween(claim.created_at);

    const lastAction = getEffectiveLastAction(claim);
    const daysSinceLastAction = getDaysBetween(lastAction.dateStr);

    // Next follow up check
    const nextFollowUp = claim.next_follow_up_date;
    const isFollowUpOverdue = nextFollowUp && new Date(nextFollowUp) < now && !isClosed;

    // SLA Status
    let status: SLAStatus = 'WITHIN_SLA';
    if (!isClosed) {
      if (daysOpen > targetDays || isFollowUpOverdue) {
        status = 'BREACHED'; // أحمر = تجاوز المدة المستهدفة
      } else if (daysOpen >= targetDays - 2 || (nextFollowUp && getDaysBetween(now.toISOString(), nextFollowUp) <= 1)) {
        status = 'NEARING_DUE'; // أصفر = اقترب موعد الاستحقاق
      } else {
        status = 'WITHIN_SLA'; // أخضر = ضمن المدة المستهدفة
      }
    } else {
      // For resolved claims, was it on time?
      if (daysOpen <= targetDays) {
        status = 'WITHIN_SLA';
      } else {
        status = 'BREACHED';
      }
    }

    // Pending tasks count
    const tasks = claim.pending_tasks || [];
    const pendingTasksCount = tasks.filter((t) => !t.is_completed).length;
    const completedTasksCount = tasks.filter((t) => t.is_completed).length;

    // Progress percentage
    const progressPercent = Math.min(100, Math.round((daysOpen / targetDays) * 100));

    return {
      daysOpen,
      targetDays,
      daysOverdue: Math.max(0, daysOpen - targetDays),
      lastAction,
      daysSinceLastAction,
      nextFollowUp,
      isFollowUpOverdue,
      status,
      isClosed,
      pendingTasksCount,
      completedTasksCount,
      tasks,
      progressPercent
    };
  };

  // Process all claims with SLA metrics
  const analyzedClaims = useMemo(() => {
    return (claims || []).map((claim) => {
      const sla = getClaimSLAMetrics(claim);
      return {
        ...claim,
        sla
      };
    });
  }, [claims, communications, now]);

  // Summary Counters
  const summary = useMemo(() => {
    const safeAnalyzed = analyzedClaims || [];
    const totalClaims = safeAnalyzed.length;
    const openClaims = safeAnalyzed.filter((c) => !c.sla.isClosed).length;
    const breachedClaims = safeAnalyzed.filter((c) => c.sla.status === 'BREACHED' && !c.sla.isClosed);
    const nearingDueClaims = safeAnalyzed.filter((c) => c.sla.status === 'NEARING_DUE' && !c.sla.isClosed);
    const withinSlaClaims = safeAnalyzed.filter((c) => c.sla.status === 'WITHIN_SLA' && !c.sla.isClosed);
    
    // Total pending tasks across active claims
    const totalPendingTasks = safeAnalyzed.reduce((acc, c) => acc + c.sla.pendingTasksCount, 0);
    const totalCompletedTasks = safeAnalyzed.reduce((acc, c) => acc + c.sla.completedTasksCount, 0);

    return {
      totalClaims,
      openClaims,
      breachedCount: breachedClaims.length,
      breachedList: breachedClaims,
      nearingDueCount: nearingDueClaims.length,
      withinSlaCount: withinSlaClaims.length,
      totalPendingTasks,
      totalCompletedTasks
    };
  }, [analyzedClaims]);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    const safeAnalyzed = analyzedClaims || [];
    if (filterStatus === 'ALL') return safeAnalyzed;
    return safeAnalyzed.filter((c) => c.sla.status === filterStatus);
  }, [analyzedClaims, filterStatus]);

  // Toggle task completion
  const handleToggleTask = async (claimId: string, taskId: string, currentStatus: boolean) => {
    const claim = (claims || []).find((c) => c.claim_id === claimId);
    if (!claim || !onUpdateClaimSLA) return;

    const currentTasks = claim.pending_tasks || [];
    const updatedTasks = currentTasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            is_completed: !currentStatus,
            completed_at: !currentStatus ? new Date().toISOString() : undefined,
          }
        : t
    );

    setIsSaving(claimId);
    try {
      await onUpdateClaimSLA(claimId, {
        pending_tasks: updatedTasks,
        last_action_date: new Date().toISOString(),
      });
    } finally {
      setIsSaving(null);
    }
  };

  // Add new task to claim
  const handleAddNewTask = async (claimId: string) => {
    if (!newTaskTitle.trim() || !onUpdateClaimSLA) return;
    const claim = claims.find((c) => c.claim_id === claimId);
    if (!claim) return;

    const currentTasks = claim.pending_tasks || [];
    const newTask: ClaimTask = {
      id: `task-${Date.now().toString().slice(-6)}`,
      title: newTaskTitle.trim(),
      due_date: newTaskDue || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_completed: false,
      assigned_to: 'خدمة العملاء',
    };

    setIsSaving(claimId);
    try {
      await onUpdateClaimSLA(claimId, {
        pending_tasks: [...currentTasks, newTask],
        last_action_date: new Date().toISOString(),
      });
      setNewTaskTitle('');
      setNewTaskDue('');
    } finally {
      setIsSaving(null);
    }
  };

  // Update next follow up date
  const handleSaveFollowUpDate = async (claimId: string) => {
    if (!newFollowUpDate || !onUpdateClaimSLA) return;
    setIsSaving(claimId);
    try {
      await onUpdateClaimSLA(claimId, {
        next_follow_up_date: newFollowUpDate,
        last_action_date: new Date().toISOString(),
      });
      setEditingClaimId(null);
      setNewFollowUpDate('');
    } finally {
      setIsSaving(null);
    }
  };

  const toggleExpandClaim = (id: string) => {
    setExpandedClaimIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6" id="sla-tracking-board">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E5E7EB] p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D62828] flex items-center justify-center font-bold border border-red-100 flex-shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#111111] font-['Cairo']">
                  لوحة متابعة زمن الخدمة (SLA) وسرعة الاستجابة
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                  Sleepee Standard SLA: 7 Days
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                نظام الرصد الزمني لمؤشرات زمن استجابة بلاغات الضمان وتنبيهات التأخير وجدولة المتابعات القادمة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenNewClaim && (
              <button
                type="button"
                onClick={onOpenNewClaim}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#D62828] hover:bg-[#B71C1C] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة شكوى جديدة</span>
              </button>
            )}
            {onNavigateToCommunications && (
              <button
                type="button"
                onClick={onNavigateToCommunications}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#D62828] bg-slate-100 hover:bg-red-50 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>سجل التواصل مع العميل</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PROMINENT OVERDUE ALERT BANNER (تنبيه واضح للحالات المتأخرة) */}
      {summary.breachedCount > 0 && (
        <div
          id="sla-breached-alert"
          className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-black uppercase">
                  تنبيه عاجل: تجاوز زمن الخدمة المستهدف (SLA Breach)
                </span>
                <span className="text-xs font-bold text-rose-900">
                  يوجد عدد ({summary.breachedCount}) شكوى بحاجة إلى تدخل فوري!
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                تجاوزت هذه الحالات المهلة الزمنية القياسية المحددة لمعالجة الشكاوى (7 أيام) دون إغلاق أو اعتماد نهائي. يرجى مراجعة الحالة الميدانية أو التواصل المباشر مع العميل لتفادي تدني مؤشر رضا العملاء.
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {summary.breachedList.map((bc) => (
                  <span
                    key={bc.claim_id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 text-xs font-mono font-bold border border-rose-200"
                  >
                    <span>{bc.claim_id}</span>
                    <span className="text-rose-600 font-sans font-normal">
                      (تأخر بمقدار {bc.sla.daysOverdue} يوم)
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 self-end md:self-center">
            <button
              type="button"
              onClick={() => setFilterStatus('BREACHED')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>عرض المتأخرات فقط</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SLA STATS & PENDING TASKS COUNTERS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Pending Tasks & Follow-ups (عداد المهام والمتابعات المعلقة) */}
        <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">المهام والمتابعات المعلقة</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700 font-mono">
                {summary.totalPendingTasks}
              </span>
              <span className="text-xs text-slate-400 font-bold">مهمة قيد الانتظار</span>
            </div>
            <div className="text-[10px] text-indigo-600 mt-1 font-semibold">
              تم إنجاز {summary.totalCompletedTasks} مهمة متابعة
            </div>
          </div>
        </div>

        {/* Card 2: Breached / Overdue (أحمر = تجاوز المدة المستهدفة) */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'BREACHED' ? 'ALL' : 'BREACHED')}
          className={`text-right rounded-2xl p-4 border shadow-xs transition cursor-pointer flex flex-col justify-between ${
            filterStatus === 'BREACHED'
              ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400'
              : 'bg-white border-rose-200 hover:bg-rose-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700">تجاوز المدة المستهدفة</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700 font-mono">
                {summary.breachedCount}
              </span>
              <span className="text-xs text-rose-600 font-bold">شكوى متأخرة</span>
            </div>
            <div className="text-[10px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block animate-ping" />
              <span>تتطلب إجراءً تصعيدياً فورياً</span>
            </div>
          </div>
        </button>

        {/* Card 3: Nearing Due (أصفر = اقترب موعد الاستحقاق) */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'NEARING_DUE' ? 'ALL' : 'NEARING_DUE')}
          className={`text-right rounded-2xl p-4 border shadow-xs transition cursor-pointer flex flex-col justify-between ${
            filterStatus === 'NEARING_DUE'
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400'
              : 'bg-white border-amber-200 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800">اقترب موعد الاستحقاق</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700 font-mono">
                {summary.nearingDueCount}
              </span>
              <span className="text-xs text-amber-600 font-bold">حالة وشيكة</span>
            </div>
            <div className="text-[10px] text-amber-700 mt-1 font-semibold">
              استحقاق الإجراء خلال 24-48 ساعة
            </div>
          </div>
        </button>

        {/* Card 4: Within Target (أخضر = ضمن المدة المستهدفة) */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'WITHIN_SLA' ? 'ALL' : 'WITHIN_SLA')}
          className={`text-right rounded-2xl p-4 border shadow-xs transition cursor-pointer flex flex-col justify-between ${
            filterStatus === 'WITHIN_SLA'
              ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400'
              : 'bg-white border-emerald-200 hover:bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800">ضمن المدة المستهدفة</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {summary.withinSlaCount}
              </span>
              <span className="text-xs text-emerald-600 font-bold">في النطاق الآمن</span>
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
              تسير وفق الخطة الزمنية المقررة
            </div>
          </div>
        </button>

        {/* Card 5: Total Active / Resolved */}
        <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">إجمالي بلاغات الشكاوى</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 font-mono">
                {summary.totalClaims}
              </span>
              <span className="text-xs text-slate-500 font-bold">شكوى مسجلة</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">
              {summary.openClaims} قيد المتابعة النشطة
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & LEGEND TOOLBAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E7EB] text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-600">تصفية حالات الشكاوى:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({analyzedClaims.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('BREACHED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                filterStatus === 'BREACHED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>تجاوزت المدة ({summary.breachedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('NEARING_DUE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                filterStatus === 'NEARING_DUE'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>اقترب الاستحقاق ({summary.nearingDueCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('WITHIN_SLA')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                filterStatus === 'WITHIN_SLA'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>ضمن المدة ({summary.withinSlaCount})</span>
            </button>
          </div>
        </div>

        {/* Color Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>أخضر = ضمن المدة المستهدفة</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>أصفر = اقترب موعد الاستحقاق</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>أحمر = تجاوز المدة المستهدفة</span>
          </span>
        </div>
      </div>

      {/* CLAIMS SLA CARDS LIST */}
      {filteredClaims.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">لا توجد أي شكاوى في هذه التصفية</h4>
          <p className="text-xs text-slate-500">
            كافة طلبات الضمان تسير وفق معايير الجودة وزمن الخدمة المعتمدة لدى سليبي.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const sla = claim.sla;
            const isExpanded = expandedClaimIds[claim.claim_id] !== false; // Default expanded

            // Color scheme styling depending on SLA Status
            const colorScheme =
              sla.status === 'BREACHED'
                ? {
                    border: 'border-rose-300',
                    bg: 'bg-rose-50/40',
                    badgeBg: 'bg-rose-600 text-white',
                    lightBadge: 'bg-rose-100 text-rose-800 border border-rose-200',
                    barColor: 'bg-rose-600',
                    indicatorDot: 'bg-rose-600',
                    titleColor: 'text-rose-900',
                    statusText: 'تجاوز المدة المستهدفة (متأخرة)',
                    icon: <AlertOctagon className="w-4 h-4 text-rose-600" />,
                  }
                : sla.status === 'NEARING_DUE'
                ? {
                    border: 'border-amber-300',
                    bg: 'bg-amber-50/40',
                    badgeBg: 'bg-amber-500 text-white',
                    lightBadge: 'bg-amber-100 text-amber-800 border border-amber-200',
                    barColor: 'bg-amber-500',
                    indicatorDot: 'bg-amber-500',
                    titleColor: 'text-amber-900',
                    statusText: 'اقترب موعد الاستحقاق (استباقي)',
                    icon: <Clock className="w-4 h-4 text-amber-600" />,
                  }
                : {
                    border: 'border-emerald-300',
                    bg: 'bg-emerald-50/30',
                    badgeBg: 'bg-emerald-600 text-white',
                    lightBadge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
                    barColor: 'bg-emerald-500',
                    indicatorDot: 'bg-emerald-500',
                    titleColor: 'text-emerald-900',
                    statusText: 'ضمن المدة المستهدفة (ممتاز)',
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
                  };

            return (
              <div
                key={claim.claim_id}
                className={`bg-white rounded-2xl border ${colorScheme.border} shadow-xs overflow-hidden transition hover:shadow-sm`}
              >
                {/* CLAIM SLA HEADER */}
                <div className={`p-4 border-b ${colorScheme.border} ${colorScheme.bg} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full animate-ping inline-block" style={{ backgroundColor: sla.status === 'BREACHED' ? '#E11D48' : sla.status === 'NEARING_DUE' ? '#F59E0B' : '#10B981' }} />
                      <span className="font-mono font-black text-sm text-[#111111] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {claim.claim_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {claim.complaint_type}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-600">
                        العميل: {claim.customer_name}
                      </span>
                    </div>

                    {/* Operational Status */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        claim.claim_status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : claim.claim_status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : claim.claim_status === 'Under Inspection'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : claim.claim_status === 'Closed'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}
                    >
                      {claim.claim_status === 'Open'
                        ? 'مفتوحة حديثاً'
                        : claim.claim_status === 'Under Inspection'
                        ? 'قيد المعاينة الفنية'
                        : claim.claim_status === 'Approved'
                        ? 'تم اعتماد الاستبدال/الإصلاح'
                        : claim.claim_status === 'Closed'
                        ? 'مغلقة ومستوفاة'
                        : claim.claim_status}
                    </span>
                  </div>

                  {/* SLA Colored Status Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs ${colorScheme.badgeBg}`}>
                      {colorScheme.icon}
                      <span>{colorScheme.statusText}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandClaim(claim.claim_id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition cursor-pointer"
                      title={isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* THE 4 REQUIRED SLA INDICATORS GRID */}
                <div className="p-4 bg-slate-50/50 border-b border-[#E5E7EB]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* INDICATOR 1: تاريخ فتح الشكوى */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[11px] font-bold text-slate-500">تاريخ فتح الشكوى</span>
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {formatDate(claim.created_at)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatDateTime(claim.created_at).split(' ')[1] || '00:00'}
                      </div>
                    </div>

                    {/* INDICATOR 2: عدد الأيام منذ فتح الشكوى */}
                    <div className={`bg-white p-3 rounded-xl border shadow-2xs ${
                      sla.status === 'BREACHED'
                        ? 'border-rose-300 bg-rose-50/20'
                        : sla.status === 'NEARING_DUE'
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-emerald-300 bg-emerald-50/20'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-500">الأيام منذ فتح الشكوى</span>
                        <Timer className={`w-3.5 h-3.5 ${
                          sla.status === 'BREACHED' ? 'text-rose-600' : sla.status === 'NEARING_DUE' ? 'text-amber-600' : 'text-emerald-600'
                        }`} />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-lg font-black font-mono ${
                          sla.status === 'BREACHED' ? 'text-rose-700' : sla.status === 'NEARING_DUE' ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {sla.daysOpen} يوم
                        </span>
                        <span className="text-[10px] text-slate-400">
                          من أصل {sla.targetDays} أيام مستهدفة
                        </span>
                      </div>
                      {/* SLA Progress Bar */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colorScheme.barColor}`}
                          style={{ width: `${Math.min(100, (sla.daysOpen / sla.targetDays) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* INDICATOR 3: تاريخ آخر إجراء */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[11px] font-bold text-slate-500">تاريخ آخر إجراء</span>
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {formatDate(sla.lastAction.dateStr)}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5" title={sla.lastAction.desc}>
                        منذ {sla.daysSinceLastAction} يوم ({sla.lastAction.source})
                      </div>
                    </div>

                    {/* INDICATOR 4: تاريخ المتابعة القادمة */}
                    <div className={`bg-white p-3 rounded-xl border shadow-2xs ${
                      sla.isFollowUpOverdue ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[11px] font-bold text-slate-500">تاريخ المتابعة القادمة</span>
                        <CalendarClock className={`w-3.5 h-3.5 ${sla.isFollowUpOverdue ? 'text-rose-600' : 'text-indigo-600'}`} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-sm font-black font-mono ${
                            sla.isFollowUpOverdue ? 'text-rose-700' : 'text-slate-900'
                          }`}>
                            {sla.nextFollowUp ? formatDate(sla.nextFollowUp) : 'لم يحدد بعد'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {sla.isFollowUpOverdue ? (
                              <span className="text-rose-600 font-bold">متأخر عن الموعد!</span>
                            ) : sla.nextFollowUp ? (
                              <span>محدد ومجدول</span>
                            ) : (
                              <span>يلزم جدولة موعد</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingClaimId(claim.claim_id);
                            setNewFollowUpDate(claim.next_follow_up_date ? claim.next_follow_up_date.split('T')[0] : new Date().toISOString().split('T')[0]);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition cursor-pointer"
                        >
                          تعديل
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Follow-up Date Editor Modal / Bar */}
                  {editingClaimId === claim.claim_id && (
                    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-indigo-950">تحديد موعد المتابعة القادمة للشكوى:</span>
                        <input
                          type="date"
                          value={newFollowUpDate}
                          onChange={(e) => setNewFollowUpDate(e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-indigo-300 bg-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSaving === claim.claim_id}
                          onClick={() => handleSaveFollowUpDate(claim.claim_id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>حفظ الموعد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingClaimId(null)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-300"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* EXPANDABLE SECTION: DESCRIPTION & PENDING TASKS CHECKLIST */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Complaint Description */}
                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-900 block mb-1">وصف العيب المقدم من العميل:</span>
                      <p className="leading-relaxed">{claim.complaint_description}</p>
                      {claim.inspection_result && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-slate-800">
                          <span className="font-bold text-amber-800">نتيجة الفحص والمعاينة الفنية: </span>
                          <span>{claim.inspection_result}</span>
                        </div>
                      )}
                      {claim.resolution && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-slate-800">
                          <span className="font-bold text-emerald-800">القرار المعتمد: </span>
                          <span>{claim.resolution}</span>
                        </div>
                      )}
                    </div>

                    {/* SECTION: PENDING TASKS & FOLLOW-UP CHECKLIST (المهام والمتابعات المعلقة) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-xs font-black text-slate-900 font-['Cairo']">
                            قائمة المهام والمتابعات المعلقة ({sla.pendingTasksCount} معلقة / {sla.tasks.length} إجمالي)
                          </h5>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {sla.completedTasksCount} مهمة منجزة
                        </span>
                      </div>

                      {/* Tasks List */}
                      {sla.tasks.length === 0 ? (
                        <div className="p-3 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                          لا توجد مهام متابعة مسجلة لهذه الشكوى. يمكنك إضافة مهمة بالأسفل.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {sla.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 text-xs ${
                                task.is_completed
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTask(claim.claim_id, task.id, task.is_completed)}
                                  className="text-indigo-600 hover:text-indigo-800 flex-shrink-0 cursor-pointer"
                                  title={task.is_completed ? 'إلغاء الإتمام' : 'تحديد كمكتمل'}
                                >
                                  {task.is_completed ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                  )}
                                </button>
                                <span className="font-semibold truncate">{task.title}</span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] flex-shrink-0">
                                {task.assigned_to && (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {task.assigned_to}
                                  </span>
                                )}
                                {task.due_date && (
                                  <span className={`font-mono ${
                                    !task.is_completed && new Date(task.due_date) < now
                                      ? 'text-rose-600 font-bold'
                                      : 'text-slate-400'
                                  }`}>
                                    الاستحقاق: {task.due_date}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ADD NEW TASK FORM */}
                      <div className="p-2.5 bg-slate-100/70 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2 text-xs">
                        <input
                          type="text"
                          placeholder="إضافة مهمة أو متابعة جديدة (مثلاً: الاتصال بالعميل لتأكيد الحضور)..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="flex-1 w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                          type="date"
                          value={newTaskDue}
                          onChange={(e) => setNewTaskDue(e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs w-full sm:w-auto"
                          title="تاريخ استحقاق المهمة"
                        />
                        <button
                          type="button"
                          disabled={!newTaskTitle.trim() || isSaving === claim.claim_id}
                          onClick={() => handleAddNewTask(claim.claim_id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer flex-shrink-0 w-full sm:w-auto justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة مهمة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
