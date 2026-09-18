"use client";

import React, { useState, useMemo } from "react";
import { 
  HorseAnalysisMetrics, 
  RaceHistoricalPatternReport, 
  HorseHistoricalPattern,
  computeRaceHistoricalPatternReport,
  evaluateHorseHistoricalPattern
} from "@/lib/analyticalEngine";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  History, 
  Compass, 
  CloudRain, 
  Footprints, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Flame, 
  ArrowDownRight, 
  ArrowUpRight, 
  Sparkles, 
  Activity, 
  Layers, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";

interface Props {
  metrics: HorseAnalysisMetrics[];
  raceInfo?: any;
  userSelectedNumbers?: number[];
  onSelectHorse?: (numPmu: number) => void;
}

export default function HistoricalPatternAnalysisModule({
  metrics,
  raceInfo,
  userSelectedNumbers = [],
  onSelectHorse
}: Props) {
  const [filterMode, setFilterMode] = useState<"ALL" | "ALERTS_ONLY" | "CRITICAL" | "AFFINITY" | "MY_TICKET">("ALERTS_ONLY");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHorses, setExpandedHorses] = useState<Record<number, boolean>>({});
  const [ticketInspectorNumbers, setTicketInspectorNumbers] = useState<number[]>(
    userSelectedNumbers.length > 0 ? userSelectedNumbers : []
  );

  // Compute end-to-end race pattern report
  const report: RaceHistoricalPatternReport = useMemo(() => {
    return computeRaceHistoricalPatternReport(metrics, raceInfo);
  }, [metrics, raceInfo]);

  // Track & Terrain specs
  const trackName = report.hippodromeName;
  const cordeText = report.corde;
  const terrainCondition = report.trackCondition;
  const penetroVal = report.penetrometreValue;

  const toggleExpand = (numPmu: number) => {
    setExpandedHorses(prev => ({
      ...prev,
      [numPmu]: !prev[numPmu]
    }));
  };

  const toggleInspectorHorse = (num: number) => {
    setTicketInspectorNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].slice(0, 8)
    );
  };

  // Filtered horses list
  const filteredPatterns = useMemo(() => {
    return report.patterns.filter(item => {
      const matchSearch = searchQuery.trim() === "" || 
        item.horseName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.horseNum.toString() === searchQuery.trim();

      if (!matchSearch) return false;

      if (filterMode === "ALERTS_ONLY") {
        return item.pattern.hasUnderperformanceAlert;
      }
      if (filterMode === "CRITICAL") {
        return item.pattern.alertLevel === "CRITICAL_UNDERPERFORMANCE";
      }
      if (filterMode === "AFFINITY") {
        return item.pattern.alertLevel === "PROVEN_AFFINITY";
      }
      if (filterMode === "MY_TICKET") {
        return ticketInspectorNumbers.includes(item.horseNum);
      }
      return true; // ALL
    });
  }, [report, filterMode, searchQuery, ticketInspectorNumbers]);

  // Horses in user ticket that have warnings
  const userTicketWarnings = useMemo(() => {
    return ticketInspectorNumbers.map(num => {
      const found = report.patterns.find(p => p.horseNum === num);
      return found ? { num, ...found } : null;
    }).filter(Boolean);
  }, [ticketInspectorNumbers, report]);

  const userTicketCriticalAlerts = userTicketWarnings.filter(w => w?.pattern.alertLevel === "CRITICAL_UNDERPERFORMANCE");

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Main Header & Environmental Scanning Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-neutral-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30">
              <History className="w-3.5 h-3.5" />
              <span>وحدة مسح الأنماط التاريخية والظروف الجوية (Pattern Analysis Module)</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
              <span>تحليل الأنماط التاريخية والتيرين بمضمار {trackName}</span>
            </h2>
            <p className="text-xs md:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              مسح إحصائي تلقائي لسجلات الخيول السابقة في نفس المضمار ونفس طبيعة الأرضية (Terrain) لإنذارك بأي حصان يملك تاريخاً سلبياً موثقاً في هذه الظروف لتفادي خسارة الرهان.
            </p>
          </div>

          {/* Environmental telemetry pill */}
          <div className="flex flex-wrap gap-2.5 sm:self-center">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-right">
              <span className="text-[10px] text-neutral-400 block font-medium">المضمار والحبلة</span>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                {trackName} ({cordeText})
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-right">
              <span className="text-[10px] text-neutral-400 block font-medium">حالة الأرضية (Terrain)</span>
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                {terrainCondition} {penetroVal ? `(${penetroVal})` : ""}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-right">
              <span className="text-[10px] text-neutral-400 block font-medium">مستوى خطورة المسار</span>
              <span className={cn(
                "text-xs font-black px-2 py-0.5 rounded-full inline-block mt-0.5",
                report.overallTrackRiskLevel === "ELEVEE" 
                  ? "bg-red-500/30 text-red-300 border border-red-500/40" 
                  : report.overallTrackRiskLevel === "MODEREE"
                  ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
              )}>
                {report.overallTrackRiskLevel === "ELEVEE" ? "خطر مرتفع ⚠️" : report.overallTrackRiskLevel === "MODEREE" ? "متوسط الحذر 🟡" : "مستقر ومناسب 🟢"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Statistical Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div 
            onClick={() => setFilterMode("CRITICAL")}
            className={cn(
              "p-3.5 rounded-2xl border transition-all cursor-pointer",
              filterMode === "CRITICAL" 
                ? "bg-red-500/25 border-red-500 text-white shadow-lg" 
                : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-200"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                إخفاق حرج
              </span>
              <span className="text-lg font-black font-mono text-red-400">{report.criticalAlertCount}</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">خيول تملك سجل إقصاء أو انهيار متكرر في نفس الظروف</p>
          </div>

          <div 
            onClick={() => setFilterMode("ALERTS_ONLY")}
            className={cn(
              "p-3.5 rounded-2xl border transition-all cursor-pointer",
              filterMode === "ALERTS_ONLY" 
                ? "bg-amber-500/25 border-amber-500 text-white shadow-lg" 
                : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-200"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                حذر تكتيكي
              </span>
              <span className="text-lg font-black font-mono text-amber-400">{report.cautionAlertCount}</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">خيول غير مستقرة تعتمد نتائجها على مسار السباق</p>
          </div>

          <div 
            onClick={() => setFilterMode("AFFINITY")}
            className={cn(
              "p-3.5 rounded-2xl border transition-all cursor-pointer",
              filterMode === "AFFINITY" 
                ? "bg-emerald-500/25 border-emerald-500 text-white shadow-lg" 
                : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-200"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                تخصص وتوافق
              </span>
              <span className="text-lg font-black font-mono text-emerald-400">{report.provenAffinityCount}</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">خيول أثبتت تفوقها وسرعتها في نفس المضمار والأرضية</p>
          </div>

          <div 
            onClick={() => setFilterMode("ALL")}
            className={cn(
              "p-3.5 rounded-2xl border transition-all cursor-pointer",
              filterMode === "ALL" 
                ? "bg-indigo-500/25 border-indigo-500 text-white shadow-lg" 
                : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-200"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                <Layers className="w-4 h-4 text-indigo-400" />
                إجمالي الخيول
              </span>
              <span className="text-lg font-black font-mono text-indigo-300">{report.patterns.length}</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">عرض ملفات جميع المشاركين في السباق</p>
          </div>
        </div>
      </div>

      {/* 3. Interactive Ticket Inspector (فحص تذكرة المستخدم في هذا التيرين) */}
      <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Footprints className="w-5 h-5 text-indigo-600" />
              فاحص تذكرة المستخدم (Live Ticket Ground Inspector)
            </h3>
            <p className="text-xs text-neutral-500">
              انقر على أرقام الخيول التي تنوي المراهنة عليها لفحص ما إذا كان أي منها قد عانى سابقاً من إخفاقات حادة في هذا المضمار أو التيرين.
            </p>
          </div>

          {ticketInspectorNumbers.length > 0 && (
            <button
              onClick={() => setTicketInspectorNumbers([])}
              className="text-xs text-neutral-400 hover:text-red-600 transition-colors self-start sm:self-auto"
            >
              مسح التحديد
            </button>
          )}
        </div>

        {/* Quick selector pins */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 ml-1">خيول السباق:</span>
          {metrics.map(m => {
            const isSelected = ticketInspectorNumbers.includes(m.numPmu);
            const isCritical = m.historicalPattern?.alertLevel === "CRITICAL_UNDERPERFORMANCE";
            const isCaution = m.historicalPattern?.alertLevel === "CAUTION_VARIABLE";
            const isAffinity = m.historicalPattern?.alertLevel === "PROVEN_AFFINITY";

            return (
              <button
                key={m.numPmu}
                onClick={() => toggleInspectorHorse(m.numPmu)}
                className={cn(
                  "relative w-9 h-9 rounded-xl font-mono font-bold text-sm flex items-center justify-center transition-all shadow-sm border",
                  isSelected 
                    ? "bg-neutral-900 text-white border-neutral-900 ring-2 ring-indigo-500 scale-105" 
                    : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                )}
                title={`${m.numPmu} - ${m.nom} (${m.historicalPattern?.alertLevelLabel})`}
              >
                {m.numPmu}
                {isCritical && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                )}
                {isCaution && !isCritical && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-white" />
                )}
                {isAffinity && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Ticket Diagnostic Results */}
        {ticketInspectorNumbers.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800">
                تشخيص تذكرتك المختارة ({ticketInspectorNumbers.length} خيول):
              </span>
              <button
                onClick={() => setFilterMode("MY_TICKET")}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg font-bold transition-all",
                  filterMode === "MY_TICKET" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                )}
              >
                عرض بطاقات تذكرتي فقط
              </button>
            </div>

            {userTicketCriticalAlerts.length > 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    تحذير خطير: تذكرتك تحتوي على {userTicketCriticalAlerts.length} خيل بسجل إخفاق حاد في هذا التيرين!
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {userTicketCriticalAlerts.map(w => (
                    <div key={w!.num} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-red-300 rounded-lg text-xs">
                      <span className="w-5 h-5 rounded-md bg-red-600 text-white font-mono font-bold flex items-center justify-center text-[10px]">
                        {w!.num}
                      </span>
                      <span className="font-bold text-neutral-900">{w!.horseName}</span>
                      <span className="text-[10px] text-red-600 font-medium">({w!.pattern.alertTitle})</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  💡 <strong>نصيحة المنظومة لحماية رأس المال:</strong> لا تعتمد على هذه الخيول كركائز منفردة (Bases) في Tiercé Ordre أو Quinté+، واستبدلها بالخيول ذات التوافق الأخضر الموثق لتفادي سقوط التذكرة.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ممتاز! لا توجد مؤشرات إخفاق حرج بين الخيول التي قمت باختيارها في تذكرتك الحالية.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-white p-1 rounded-2xl border shadow-sm overflow-x-auto gap-1">
          <button
            onClick={() => setFilterMode("ALERTS_ONLY")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              filterMode === "ALERTS_ONLY" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>الخيول المحذرة فقط ({report.criticalAlertCount + report.cautionAlertCount})</span>
          </button>

          <button
            onClick={() => setFilterMode("CRITICAL")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              filterMode === "CRITICAL" ? "bg-red-600 text-white" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>إخفاق حرج 🔴 ({report.criticalAlertCount})</span>
          </button>

          <button
            onClick={() => setFilterMode("AFFINITY")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              filterMode === "AFFINITY" ? "bg-emerald-600 text-white" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>خيول التخصص 🟢 ({report.provenAffinityCount})</span>
          </button>

          <button
            onClick={() => setFilterMode("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
              filterMode === "ALL" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            الجميع ({report.patterns.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالرقم أو الاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-white border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 5. Detailed Cards Grid */}
      <div className="space-y-4">
        {filteredPatterns.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border shadow-sm space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-neutral-800">لا توجد خيول مطابقة لهذا الفلتر</h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              اضغط على &laquo;الجميع&raquo; للاطلاع على كامل المشاركين أو غيّر كلمات البحث لمشاهدة الملفات الأخرى.
            </p>
            <button
              onClick={() => setFilterMode("ALL")}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800"
            >
              عرض جميع الخيول
            </button>
          </div>
        ) : (
          filteredPatterns.map(({ horseNum, horseName, pattern }) => {
            const isExpanded = !!expandedHorses[horseNum];
            const metric = metrics.find(m => m.numPmu === horseNum);
            const isCritical = pattern.alertLevel === "CRITICAL_UNDERPERFORMANCE";
            const isCaution = pattern.alertLevel === "CAUTION_VARIABLE";
            const isAffinity = pattern.alertLevel === "PROVEN_AFFINITY";

            return (
              <div 
                key={horseNum}
                className={cn(
                  "bg-white rounded-2xl border shadow-sm transition-all overflow-hidden",
                  isCritical 
                    ? "border-red-300 hover:border-red-400 ring-1 ring-red-100" 
                    : isCaution 
                    ? "border-amber-300 hover:border-amber-400"
                    : isAffinity
                    ? "border-emerald-300 hover:border-emerald-400 bg-emerald-50/20"
                    : "border-neutral-200"
                )}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl font-mono font-black text-xl flex items-center justify-center shrink-0 shadow-sm",
                      isCritical 
                        ? "bg-red-600 text-white" 
                        : isCaution 
                        ? "bg-amber-500 text-neutral-950" 
                        : isAffinity 
                        ? "bg-emerald-600 text-white" 
                        : "bg-neutral-900 text-white"
                    )}>
                      {horseNum}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-neutral-900 text-base truncate">
                          {horseName}
                        </h4>
                        
                        {/* Status Badge */}
                        <span className={cn(
                          "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1",
                          isCritical 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : isCaution 
                            ? "bg-amber-50 text-amber-800 border-amber-200" 
                            : isAffinity 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                            : "bg-neutral-100 text-neutral-600 border-neutral-200"
                        )}>
                          {isCritical && <ShieldAlert className="w-3 h-3 text-red-600" />}
                          {isCaution && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                          {isAffinity && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                          {pattern.alertLevelLabel}
                        </span>

                        {metric?.ferrageCode && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-600 font-bold">
                            {metric.ferrageCode}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-neutral-600 line-clamp-1">
                        {pattern.alertTitle}
                      </p>
                    </div>
                  </div>

                  {/* Key Stats Pill */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-neutral-100">
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block font-medium">سجل الخيل في الظروف المشابهة</span>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-neutral-800">
                        <span>{pattern.similarRacesCount} مشاركات</span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-emerald-600">{pattern.similarWins} فوز</span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-neutral-600">{pattern.similarPlaces} مراكز</span>
                        {pattern.similarDisqualifications > 0 && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span className="text-red-600 font-black">{pattern.similarDisqualifications} Da</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-left border-r pr-3 border-neutral-200">
                      <span className="text-[10px] text-neutral-400 block font-medium">نسبة الإخفاق</span>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "font-mono font-black text-sm",
                          pattern.failureRateInConditions >= 60 ? "text-red-600" : pattern.failureRateInConditions <= 25 ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {pattern.failureRateInConditions}%
                        </span>
                        {pattern.performanceDropPercentage < 0 ? (
                          <span className="text-[10px] font-bold text-red-600 flex items-center">
                            <ArrowDownRight className="w-3 h-3" />
                            {pattern.performanceDropPercentage}%
                          </span>
                        ) : pattern.performanceDropPercentage > 0 ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                            <ArrowUpRight className="w-3 h-3" />
                            +{pattern.performanceDropPercentage}%
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(horseNum)}
                      className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
                      title={isExpanded ? "طي التفاصيل" : "عرض التفاصيل الكاملة"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Dossier Section */}
                {isExpanded && (
                  <div className="border-t border-neutral-150 bg-neutral-50/70 p-5 space-y-4">
                    {/* Diagnosis & Tactical Advice Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Biomechanical Root Cause Diagnosis */}
                      <div className="p-4 rounded-xl bg-white border border-neutral-200 space-y-2">
                        <h5 className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-indigo-600" />
                          التشخيص الفني والفيزيائي لحركة الخيل (Biomechanical Diagnosis):
                        </h5>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          {pattern.rootCauseDiagnosis}
                        </p>
                      </div>

                      {/* Betting Ticket Tactical Impact */}
                      <div className={cn(
                        "p-4 rounded-xl border space-y-2",
                        isCritical 
                          ? "bg-red-50/60 border-red-200" 
                          : isCaution 
                          ? "bg-amber-50/60 border-amber-200"
                          : "bg-emerald-50/60 border-emerald-200"
                      )}>
                        <h5 className="text-xs font-black flex items-center gap-1.5 text-neutral-900">
                          <Compass className="w-4 h-4 text-amber-600" />
                          التوصية التكتيكية لحماية وتوجيه الرهان:
                        </h5>
                        <p className="text-xs text-neutral-700 leading-relaxed">
                          {pattern.tacticalCorrectionRecommendation}
                        </p>
                        <div className="pt-1 text-[11px] font-medium text-neutral-500 border-t border-black/5">
                          <strong>أثر الرهان:</strong> {pattern.tacticalImpactOnBets}
                        </div>
                      </div>
                    </div>

                    {/* Historical Race Excerpts (سجل السباقات المشابهة بالتفصيل) */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-black text-neutral-800 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-neutral-500" />
                        عينات موثقة من سباقات الخيل السابقة في ظروف مماثلة:
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {pattern.historicalRaceExcerpts.map((excerpt, eIdx) => (
                          <div 
                            key={eIdx}
                            className="bg-white p-3 rounded-xl border border-neutral-200/90 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between border-b pb-1.5 border-neutral-100">
                              <div className="flex items-center gap-1.5 font-bold text-neutral-700">
                                <span>{excerpt.dateText}</span>
                                <span className="text-neutral-300">•</span>
                                <span>{excerpt.hippodrome}</span>
                                <span className="text-neutral-400 font-mono text-[10px]">({excerpt.distance}م)</span>
                              </div>
                              <span className={cn(
                                "font-mono font-black text-xs px-2 py-0.5 rounded",
                                excerpt.isNegativeFinish 
                                  ? "bg-red-100 text-red-700 font-bold" 
                                  : "bg-emerald-100 text-emerald-800 font-bold"
                              )}>
                                {excerpt.positionFinish}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-neutral-500">
                              <span>الأرضية: <strong>{excerpt.conditionText}</strong></span>
                              <span className="text-neutral-600 font-medium">{excerpt.marginOrDisqualification}</span>
                            </div>

                            <p className="text-[11px] text-neutral-600 leading-snug bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                              💬 {excerpt.stewardsNote}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
