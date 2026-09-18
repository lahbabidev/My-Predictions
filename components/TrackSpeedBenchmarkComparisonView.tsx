"use client";

import React, { useState, useMemo } from "react";
import { 
  getTrackBenchmarkAndComparison, 
  HorseSpeedBenchmarkComparison, 
  TrackSpeedBenchmarkReport,
  HorseAnalysisMetrics 
} from "@/lib/analyticalEngine";
import { PMURace } from "@/types/pmu";
import { 
  Gauge, 
  Trophy, 
  Zap, 
  Clock, 
  Filter, 
  ArrowUpDown, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Compass, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  BarChart3,
  Calendar,
  User,
  Info,
  Layers,
  TrendingUp,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackSpeedBenchmarkComparisonViewProps {
  raceInfo: PMURace | any;
  metrics: HorseAnalysisMetrics[];
  predictedNumbers?: number[];
  onSelectHorse?: (numPmu: number) => void;
}

export default function TrackSpeedBenchmarkComparisonView({
  raceInfo,
  metrics,
  predictedNumbers = [],
  onSelectHorse
}: TrackSpeedBenchmarkComparisonViewProps) {
  // 1. Generate real-time benchmark report
  const report: TrackSpeedBenchmarkReport = useMemo(() => {
    return getTrackBenchmarkAndComparison(raceInfo, metrics, predictedNumbers);
  }, [raceInfo, metrics, predictedNumbers]);

  // 2. Interactive state
  const [filterMode, setFilterMode] = useState<"predictions_only" | "all_runners">("predictions_only");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"maxPeakSpeedKmh" | "reductionSec" | "deltaToRecordSec" | "efficiencyIndex" | "predictionRank">("maxPeakSpeedKmh");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedHorseNum, setSelectedHorseNum] = useState<number | null>(
    predictedNumbers.length > 0 ? predictedNumbers[0] : (metrics[0]?.numPmu || null)
  );
  const [showBenchmarkRaces, setShowBenchmarkRaces] = useState(false);

  // 3. Filter and sort horses
  const displayedHorses = useMemo(() => {
    let list = [...report.horseComparisons];

    // Filter by prediction picks or all
    if (filterMode === "predictions_only") {
      list = list.filter(h => h.isPredictionPick);
    }

    // Filter by tier
    if (tierFilter !== "ALL") {
      list = list.filter(h => h.tier === tierFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(h => 
        h.nom.toLowerCase().includes(q) || 
        h.numPmu.toString() === q ||
        (h.driver && h.driver.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA: number;
      let valB: number;

      if (sortBy === "predictionRank") {
        valA = a.predictionRank ?? 999;
        valB = b.predictionRank ?? 999;
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }

      if (sortOrder === "asc") {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });

    return list;
  }, [report.horseComparisons, filterMode, tierFilter, searchQuery, sortBy, sortOrder]);

  // Selected horse for head-to-head comparison
  const selectedHorse = useMemo(() => {
    return report.horseComparisons.find(h => h.numPmu === selectedHorseNum) || report.horseComparisons[0];
  }, [report.horseComparisons, selectedHorseNum]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      // For seconds / delta, lower is faster/better so default to asc
      if (column === "reductionSec" || column === "deltaToRecordSec" || column === "predictionRank") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  const { benchmark, summary } = report;

  return (
    <div className="space-y-6 text-neutral-900" dir="rtl">
      
      {/* 1. Header & Main Hero Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-neutral-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 px-3 py-1 rounded-full text-xs font-black">
              <Gauge className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>وحدة تحليلات السرعة القصوى ومقارنة توقيتات المضمار (Track Speed Benchmark)</span>
              <span className="bg-cyan-500 text-slate-950 px-1.5 py-0.2 rounded font-black text-[10px]">آخر 6 أشهر</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>مقارنة السرعة القصوى لخيول التوقعات مع أرقام مضمار {benchmark.hippodromeName}</span>
            </h2>
            
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              تحليل حركي فوري يقارن السرعة القصوى اللحظية (<span className="text-cyan-300 font-bold font-mono">Vitesse de Pointe</span>) والتوقيت الكيلومتري (<span className="text-amber-300 font-bold font-mono">Réduction Km</span>) لترشيحات السباق المحددة، مع أداء الخيول الأسرع التي حققت أفضل توقيتات في نفس المضمار والمسافة خلال الأشهر الستة الماضية.
            </p>
          </div>

          {/* Quick Track Record Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shrink-0 flex flex-col justify-between sm:min-w-[280px]">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>الرقم القياسي للمضمار (6 أشهر):</span>
              </span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                {benchmark.periodText}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-lg font-black text-white font-mono">{benchmark.recordReductionKm}</div>
                <div className="text-xs text-neutral-300 font-bold">{benchmark.recordHorseName} ({benchmark.recordHorseAgeSex})</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-400">السرعة القصوى</div>
                <div className="text-base font-black text-cyan-400 font-mono">{benchmark.recordPeakSpeedKmh} <span className="text-[10px] text-neutral-300 font-sans">كم/س</span></div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-300">
              <span>متوسط أفضل 5 فائزين:</span>
              <span className="font-mono font-bold text-amber-300">{benchmark.top5WinnersAvgReductionKm} ({benchmark.top5WinnersPeakSpeedKmh} كم/س)</span>
            </div>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 block mb-1">أسرع خيل في التوقعات</span>
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-white truncate">#{summary.fastestPredictionNum} {summary.fastestPredictionName}</span>
              <span className="text-xs font-mono font-black text-cyan-400">{summary.fastestHorsePeakSpeed} كم/س</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 block mb-1">الأقرب لرقم المضمار القياسي</span>
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-white truncate">#{summary.closestToRecordHorseNum} {summary.closestToRecordName}</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {summary.closestDeltaSec > 0 ? `+${summary.closestDeltaSec}s` : `${summary.closestDeltaSec}s`}
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 block mb-1">متوسط سرعة خيول التوقع</span>
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-white font-mono">{summary.averagePredictionSpeedKmh} كم/س</span>
              <span className="text-[10px] font-bold text-neutral-300">
                {summary.predictionPicksCount} ترشيحات
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 block mb-1">خيول في النطاق الذهبي (Podium Zone)</span>
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-amber-300 font-mono">{summary.podiumReadyCount} من أصل {summary.totalEvaluated}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">جاهزية قياسية</span>
            </div>
          </div>
        </div>

        {/* Tactical Verdict Alert */}
        <div className="mt-4 bg-indigo-900/40 border border-indigo-400/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-100">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-cyan-300 font-bold ml-1">الخلاصة التكتيكية للسرعة:</strong>
            {summary.analysisVerdict}
          </p>
        </div>
      </div>

      {/* 2. Track Record Detail Collapsible Card */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>معايير أفضل أداء قياسي في مضمار {benchmark.hippodromeName}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              السجل التاريخي المعتمد لسباقات آخر 6 أشهر (المسافة: {benchmark.distance}م • {benchmark.discipline})
            </p>
          </div>

          <button
            onClick={() => setShowBenchmarkRaces(!showBenchmarkRaces)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>{showBenchmarkRaces ? "إخفاء سباقات المقارنة الـ 6 أشهر" : "عرض قائمة أفضل 4 سباقات للمضمار (6 أشهر)"}</span>
            {showBenchmarkRaces ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Benchmark Comparison Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-100">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="text-xs text-amber-800 font-bold flex items-center justify-between">
              <span>الرقم القياسي المطلق (Record)</span>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 rounded">الأول</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-amber-950 font-mono">{benchmark.recordReductionKm}</span>
              <span className="text-xs font-bold font-mono text-amber-900">{benchmark.recordPeakSpeedKmh} كم/س</span>
            </div>
            <div className="text-[10px] text-amber-700 mt-1 truncate">
              {benchmark.recordHorseName} • {benchmark.recordDriver} ({benchmark.recordDate})
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="text-xs text-emerald-800 font-bold flex items-center justify-between">
              <span>متوسط أفضل 5 فائزين (Top 5 Avg)</span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 rounded">المعيار الذهبي</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-emerald-950 font-mono">{benchmark.top5WinnersAvgReductionKm}</span>
              <span className="text-xs font-bold font-mono text-emerald-900">{benchmark.top5WinnersPeakSpeedKmh} كم/س</span>
            </div>
            <div className="text-[10px] text-emerald-700 mt-1">
              المستوى القياسي المطلوب للفوز بأشواط الفئة الأولى
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="text-xs text-blue-800 font-bold flex items-center justify-between">
              <span>عتبة الصعود للمنصة (Podium Tier)</span>
              <span className="text-[10px] bg-blue-200/80 text-blue-900 px-1.5 rounded">المراكز 1 - 3</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-blue-950 font-mono">{benchmark.podiumThresholdReductionKm}</span>
              <span className="text-xs font-bold font-mono text-blue-900">{benchmark.podiumThresholdSpeedKmh} كم/س</span>
            </div>
            <div className="text-[10px] text-blue-700 mt-1">
              السرعة الدنيا المطلوبة لانتزاع مكان في التيرسي أو الكوارتي
            </div>
          </div>
        </div>

        {/* Collapsible table of 4 top benchmark runs */}
        {showBenchmarkRaces && (
          <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2">
            <h4 className="text-xs font-black text-neutral-800">
              قائمة أفضل التوقيتات الموثقة في مضمار {benchmark.hippodromeName} خلال الـ 6 أشهر الماضية:
            </h4>
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-xs text-right">
                <thead className="bg-neutral-100 text-neutral-600 font-bold border-b">
                  <tr>
                    <th className="py-2 px-3">الخيل المسجل</th>
                    <th className="py-2 px-3">تاريخ السباق</th>
                    <th className="py-2 px-3">السائق / الفارس</th>
                    <th className="py-2 px-3 text-center">المركز</th>
                    <th className="py-2 px-3 text-center">التوقيت الكيلومتري</th>
                    <th className="py-2 px-3 text-center">السرعة القصوى</th>
                    <th className="py-2 px-3">عنوان الشوط المرجعي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {benchmark.top6MonthPerformances.map((perf, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 font-medium">
                      <td className="py-2.5 px-3 font-bold text-neutral-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{perf.horseName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{perf.date}</td>
                      <td className="py-2.5 px-3 text-neutral-700">{perf.driver}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          المركز {perf.finishPosition}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-900">
                        {perf.reductionKm}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-700">
                        {perf.peakSpeedKmh} كم/س
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 truncate max-w-[200px]">
                        {perf.raceName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Interactive Filters & Instant Comparison Controls */}
      <div className="bg-white rounded-2xl border p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Main Toggle: Predictions Only vs All Runners */}
          <div className="flex bg-neutral-100 p-1 rounded-xl border max-w-md shrink-0">
            <button
              onClick={() => setFilterMode("predictions_only")}
              className={cn(
                "flex-1 py-2 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                filterMode === "predictions_only"
                  ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>خيول التوقعات المحددة ({report.summary.predictionPicksCount})</span>
            </button>
            <button
              onClick={() => setFilterMode("all_runners")}
              className={cn(
                "flex-1 py-2 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                filterMode === "all_runners"
                  ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>جميع المشاركين في الشوط ({report.summary.totalEvaluated})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="ابحث باسم الخيل أو رقمه أو الراكب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-neutral-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tier Status Quick Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-neutral-500 text-[11px] font-bold ml-2 shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية النطاق الحركي:</span>
          </span>
          
          <button
            onClick={() => setTierFilter("ALL")}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all shrink-0",
              tierFilter === "ALL" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            الكل ({filterMode === "predictions_only" ? report.summary.predictionPicksCount : report.summary.totalEvaluated})
          </button>

          <button
            onClick={() => setTierFilter("ELITE_RECORD_BREAKER")}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1",
              tierFilter === "ELITE_RECORD_BREAKER" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 border border-amber-200"
            )}
          >
            <span>🏆 محطم/معادل للرقم القياسي</span>
          </button>

          <button
            onClick={() => setTierFilter("PODIUM_CONTENDER")}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1",
              tierFilter === "PODIUM_CONTENDER" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            )}
          >
            <span>🥇 النطاق الذهبي (Top 5 Avg)</span>
          </button>

          <button
            onClick={() => setTierFilter("COMPETITIVE_ZONE")}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1",
              tierFilter === "COMPETITIVE_ZONE" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-800 border border-indigo-200"
            )}
          >
            <span>⚡ فارق سرعة تنافسي</span>
          </button>

          <button
            onClick={() => setTierFilter("DEFICIT_ZONE")}
            className={cn(
              "px-3 py-1 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1",
              tierFilter === "DEFICIT_ZONE" ? "bg-red-600 text-white" : "bg-red-50 text-red-800 border border-red-200"
            )}
          >
            <span>⚠️ عجز حركي عن سرعة المضمار</span>
          </button>
        </div>
      </div>

      {/* 4. Instant Real-Time Comparison Table (جدول المقارنة الفوري) */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-neutral-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-600" />
              <span>جدول المقارنة الفوري للسرعة والتوقيت القياسي</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                {displayedHorses.length} خيول معروضة
              </span>
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              اضغط على أي عمود لإعادة الترتيب فورياً، أو انقر على أي خيل لمشاهدة المقارنة المباشرة مع بطل المضمار.
            </p>
          </div>

          <div className="text-[11px] text-neutral-500 font-medium">
            مقياس الألوان: <span className="text-emerald-700 font-bold">أخضر = تفوق/تطابق</span> • <span className="text-amber-700 font-bold">أصفر = قريب</span> • <span className="text-red-700 font-bold">أحمر = فارق كبير</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right divide-y divide-neutral-200">
            <thead className="bg-neutral-100/80 text-neutral-700 font-bold select-none">
              <tr>
                <th className="py-3 px-3 text-center w-14">
                  <button 
                    onClick={() => handleSort("predictionRank")}
                    className="flex items-center justify-center gap-1 hover:text-indigo-600 w-full"
                  >
                    <span>#</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                
                <th className="py-3 px-3">الخيل والراكب</th>

                <th className="py-3 px-3 text-center">
                  <button 
                    onClick={() => handleSort("maxPeakSpeedKmh")}
                    className="inline-flex items-center justify-center gap-1 hover:text-indigo-600 font-black"
                  >
                    <span>السرعة القصوى</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <span className="block text-[9px] text-neutral-400 font-normal">Vitesse Pointe</span>
                </th>

                <th className="py-3 px-3 text-center">
                  <button 
                    onClick={() => handleSort("reductionSec")}
                    className="inline-flex items-center justify-center gap-1 hover:text-indigo-600"
                  >
                    <span>التوقيت الكيلومتري</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <span className="block text-[9px] text-neutral-400 font-normal">Réduction Km</span>
                </th>

                <th className="py-3 px-3 text-center">
                  <span className="block">رقم المضمار (6M)</span>
                  <span className="block text-[9px] text-neutral-400 font-normal">{benchmark.recordReductionKm}</span>
                </th>

                <th className="py-3 px-3 text-center">
                  <button 
                    onClick={() => handleSort("deltaToRecordSec")}
                    className="inline-flex items-center justify-center gap-1 hover:text-indigo-600"
                  >
                    <span>فارق التوقيت</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <span className="block text-[9px] text-neutral-400 font-normal">Delta RK (s/km)</span>
                </th>

                <th className="py-3 px-3 text-center">
                  <span className="block">فارق السرعة</span>
                  <span className="block text-[9px] text-neutral-400 font-normal">Delta (كم/س)</span>
                </th>

                <th className="py-3 px-3 text-center">
                  <button 
                    onClick={() => handleSort("efficiencyIndex")}
                    className="inline-flex items-center justify-center gap-1 hover:text-indigo-600"
                  >
                    <span>مؤشر المطابقة</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <span className="block text-[9px] text-neutral-400 font-normal">Speed Index %</span>
                </th>

                <th className="py-3 px-3">تصنيف النطاق والتوافق</th>

                <th className="py-3 px-3 text-center">مقارنة</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200 bg-white">
              {displayedHorses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-neutral-400">
                    لا توجد خيول مطابقة لخيارات التصفية الحالية.
                  </td>
                </tr>
              ) : (
                displayedHorses.map((horse) => {
                  const isSelected = selectedHorseNum === horse.numPmu;
                  const isFastestInPrediction = horse.numPmu === summary.fastestPredictionNum;
                  
                  // Color coding for delta
                  const deltaSecBadgeClass = horse.deltaToRecordSec <= 0
                    ? "text-emerald-700 bg-emerald-100 border-emerald-300 font-black"
                    : horse.deltaToRecordSec <= 0.6
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold"
                    : horse.deltaToRecordSec <= 1.4
                    ? "text-amber-700 bg-amber-50 border-amber-200 font-bold"
                    : "text-red-700 bg-red-50 border-red-200 font-bold";

                  const deltaKmhBadgeClass = horse.deltaToRecordKmh >= 0
                    ? "text-emerald-700 font-black"
                    : horse.deltaToRecordKmh >= -0.8
                    ? "text-emerald-600 font-bold"
                    : horse.deltaToRecordKmh >= -1.8
                    ? "text-amber-600 font-bold"
                    : "text-red-600 font-bold";

                  return (
                    <tr 
                      key={horse.numPmu}
                      onClick={() => {
                        setSelectedHorseNum(horse.numPmu);
                        if (onSelectHorse) onSelectHorse(horse.numPmu);
                      }}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-neutral-50/80",
                        isSelected && "bg-indigo-50/60 ring-1 ring-inset ring-indigo-300"
                      )}
                    >
                      {/* PMU Number */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black font-mono text-sm shadow-sm",
                            horse.isPredictionPick 
                              ? "bg-indigo-950 text-white ring-2 ring-indigo-400/50" 
                              : "bg-neutral-200 text-neutral-800"
                          )}>
                            {horse.numPmu}
                          </span>
                          {horse.isPredictionPick && horse.predictionRank && (
                            <span className="text-[9px] font-black text-indigo-700 mt-0.5">
                              #{horse.predictionRank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Horse Name & Entourage */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-black text-sm text-neutral-900 flex items-center gap-1.5">
                              <span>{horse.nom}</span>
                              {isFastestInPrediction && (
                                <span className="bg-amber-400 text-neutral-950 text-[9px] font-black px-1.5 py-0.2 rounded-md inline-flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5 fill-current" />
                                  الأسرع
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                              <span>{horse.driver || horse.entraineur || "—"}</span>
                              <span>•</span>
                              <span className="font-bold text-neutral-700">{horse.ferrageCode}</span>
                              <span>•</span>
                              <span className="text-neutral-400">{horse.runningStyle.split(" ")[0]}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Max Peak Speed (km/h) */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-black font-mono text-sm text-cyan-700">
                          {horse.maxPeakSpeedKmh} <span className="text-[10px] text-neutral-500 font-sans font-normal">كم/س</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          مستقيم: {horse.finalStraightSpeedKmh} كم/س
                        </div>
                      </td>

                      {/* Horse RK */}
                      <td className="py-3 px-3 text-center font-mono font-black text-neutral-800 text-sm">
                        {horse.reductionKm}
                      </td>

                      {/* Track Record RK */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-neutral-500 text-xs">
                        {benchmark.recordReductionKm}
                      </td>

                      {/* Delta to Record Seconds */}
                      <td className="py-3 px-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded-lg text-xs font-mono border", deltaSecBadgeClass)}>
                          {horse.deltaToRecordSec <= 0 ? `${horse.deltaToRecordSec}s` : `+${horse.deltaToRecordSec}s`}
                        </span>
                      </td>

                      {/* Delta to Record Km/h */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-xs">
                        <span className={deltaKmhBadgeClass}>
                          {horse.deltaToRecordKmh >= 0 ? `+${horse.deltaToRecordKmh}` : `${horse.deltaToRecordKmh}`} كم/س
                        </span>
                      </td>

                      {/* Speed Efficiency % */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-black text-xs text-neutral-900">
                            {horse.efficiencyIndex}%
                          </span>
                          <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-1 border">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                horse.efficiencyIndex >= 100 ? "bg-amber-500" :
                                horse.efficiencyIndex >= 98 ? "bg-emerald-500" :
                                horse.efficiencyIndex >= 95 ? "bg-indigo-500" : "bg-red-400"
                              )}
                              style={{ width: `${Math.min(100, Math.max(20, (horse.efficiencyIndex - 85) * 6.6))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Tier Badge & Verdict */}
                      <td className="py-3 px-3">
                        <span className={cn(
                          "inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                          horse.tierBadgeColor
                        )}>
                          {horse.tierLabel}
                        </span>
                        <div className="text-[10px] text-neutral-500 mt-1 line-clamp-1 max-w-[220px]">
                          {horse.tacticalAdvantage}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHorseNum(horse.numPmu);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                            isSelected 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-200"
                          )}
                        >
                          {isSelected ? "معروض رأس برأس ✓" : "مقارنة مباشرة"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Head-to-Head Detailed Comparative Card (المقارنة الرأسية المباشرة بين الخيل المختار وبطل المضمار) */}
      {selectedHorse && (
        <div className="bg-gradient-to-br from-neutral-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 border border-indigo-500/30 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>المواجهة الرأسية المباشرة للسرعة (Head-to-Head Speed Matchup)</span>
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                مقارنة #{selectedHorse.numPmu} {selectedHorse.nom} مع بطل المضمار ({benchmark.recordHorseName})
              </h3>
            </div>
            
            <span className={cn("px-3 py-1 rounded-xl text-xs font-bold border self-start sm:self-auto", selectedHorse.tierBadgeColor)}>
              {selectedHorse.tierLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: The Selected Horse */}
            <div className="bg-white/5 border border-indigo-400/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black font-mono text-lg flex items-center justify-center">
                    {selectedHorse.numPmu}
                  </span>
                  <div>
                    <h4 className="font-black text-base text-white">{selectedHorse.nom}</h4>
                    <span className="text-xs text-indigo-300">
                      {selectedHorse.isPredictionPick ? `ترشيح التوقع #${selectedHorse.predictionRank}` : "مشارك في الشوط"}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs bg-white/10 px-2 py-0.5 rounded text-neutral-300">
                  {selectedHorse.ferrageCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">السرعة القصوى المحققة</span>
                  <span className="font-mono font-black text-lg text-cyan-400">{selectedHorse.maxPeakSpeedKmh} كم/س</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">التوقيت الكيلومتري</span>
                  <span className="font-mono font-black text-lg text-white">{selectedHorse.reductionKm}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">سرعة آخر 500 متر</span>
                  <span className="font-mono font-bold text-sm text-neutral-200">{selectedHorse.finalStraightSpeedKmh} كم/س</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">معدل التوافق الحركي</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">{selectedHorse.trackCompatibilityScore}/100</span>
                </div>
              </div>

              <div className="text-xs text-neutral-300 bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-cyan-300">التشخيص الحركي للخيل:</div>
                <p className="leading-relaxed text-[11px] text-neutral-300">
                  {selectedHorse.speedAssessment}
                </p>
              </div>
            </div>

            {/* Right: The Track Benchmark Holder */}
            <div className="bg-white/5 border border-amber-400/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 font-black text-lg flex items-center justify-center">
                    🏆
                  </span>
                  <div>
                    <h4 className="font-black text-base text-amber-300">{benchmark.recordHorseName}</h4>
                    <span className="text-xs text-neutral-300">
                      بطل مضمار {benchmark.hippodromeCode} ({benchmark.recordDate})
                    </span>
                  </div>
                </div>
                <span className="font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                  الرقم القياسي المرجعي
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">السرعة القصوى القياسية</span>
                  <span className="font-mono font-black text-lg text-amber-300">{benchmark.recordPeakSpeedKmh} كم/س</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">توقيت المضمار المرجعي</span>
                  <span className="font-mono font-black text-lg text-white">{benchmark.recordReductionKm}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">السباق المرجعي</span>
                  <span className="font-bold text-xs text-neutral-200 truncate">{benchmark.recordRaceTitle}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-neutral-400 block">ظروف المضمار المرجعي</span>
                  <span className="font-bold text-xs text-neutral-300 truncate">{benchmark.recordTrackCondition}</span>
                </div>
              </div>

              {/* Head to Head Delta Box */}
              <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                  <span>فارق السرعة المباشر بين الخيل وبطل المضمار:</span>
                  <span className="font-mono text-cyan-300 font-black">
                    {selectedHorse.deltaToRecordKmh >= 0 ? `+${selectedHorse.deltaToRecordKmh}` : `${selectedHorse.deltaToRecordKmh}`} كم/س
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>فارق التوقيت الكيلومتري:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {selectedHorse.deltaToRecordSec <= 0 ? `${selectedHorse.deltaToRecordSec} ثانية/كم` : `+${selectedHorse.deltaToRecordSec} ثانية/كم`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>نسبة مطابقة السرعة القياسية:</span>
                  <span className="font-mono font-black text-emerald-400">
                    {selectedHorse.efficiencyIndex}%
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
