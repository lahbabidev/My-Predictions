"use client";

import React, { useState, useMemo } from "react";
import { HorseAnalysisMetrics, FatigueStatus, RiskRewardCategory } from "@/lib/analyticalEngine";
import { PMURace } from "@/types/pmu";
import { cn } from "@/lib/utils";
import { 
  Battery, 
  BatteryCharging, 
  BatteryMedium, 
  BatteryWarning, 
  BatteryLow,
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Scale, 
  Filter, 
  ArrowUpDown, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Gauge, 
  Flame, 
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";

interface TacticalFatigueRiskRewardViewProps {
  metrics: HorseAnalysisMetrics[];
  raceInfo?: PMURace;
}

export default function TacticalFatigueRiskRewardView({
  metrics,
  raceInfo
}: TacticalFatigueRiskRewardViewProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "EXCELLENT_VALUE" | "FRESH" | "HIGH_FATIGUE">("ALL");
  const [sortBy, setSortBy] = useState<"RISK_REWARD" | "ENERGY_RESERVE" | "NUM_PMU" | "ODDS">("RISK_REWARD");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHorses, setExpandedHorses] = useState<Record<number, boolean>>({});

  const toggleExpand = (numPmu: number) => {
    setExpandedHorses(prev => ({ ...prev, [numPmu]: !prev[numPmu] }));
  };

  // Environment & Track context
  const trackName = typeof (raceInfo as any)?.hippodrome === "string" 
    ? (raceInfo as any).hippodrome 
    : (raceInfo as any)?.hippodrome?.libelleCourt || raceInfo?.libelleCourt || "المضمار";
  const penetroVal = raceInfo?.penetrometre?.valeurMesure 
    ? raceInfo.penetrometre.valeurMesure.replace(",", ".") 
    : "3.4";
  const penetroNum = parseFloat(penetroVal) || 3.4;
  const penetroTitle = raceInfo?.penetrometre?.intitule || (penetroNum >= 4.0 ? "Lourd (ثقيلة)" : "Bon Souple (جيدة/مرنة)");
  const distance = raceInfo?.distance || 2700;
  const discipline = raceInfo?.discipline || "ATTELE";

  // High-level race fatigue insights
  const {
    avgEnergyReserve,
    freshHorsesCount,
    moderateHorsesCount,
    fatiguedHorsesCount,
    bestRiskRewardHorse,
    freshestLongshotHorse,
    highestFatigueHorse
  } = useMemo(() => {
    if (!metrics || metrics.length === 0) {
      return {
        avgEnergyReserve: 50,
        freshHorsesCount: 0,
        moderateHorsesCount: 0,
        fatiguedHorsesCount: 0,
        bestRiskRewardHorse: null,
        freshestLongshotHorse: null,
        highestFatigueHorse: null
      };
    }

    let totalEnergy = 0;
    let fresh = 0;
    let mod = 0;
    let fatigued = 0;

    let bestRR: HorseAnalysisMetrics | null = null;
    let freshLongshot: HorseAnalysisMetrics | null = null;
    let worstFatigue: HorseAnalysisMetrics | null = null;

    for (const h of metrics) {
      const f = h.fatigueMetrics;
      const rr = h.riskRewardMetrics;
      const energy = f?.energyReservePct ?? 50;
      totalEnergy += energy;

      if (f?.status === "OPTIMAL_FRESH") fresh++;
      else if (f?.status === "MODERATE_STRAIN") mod++;
      else fatigued++;

      if (!bestRR || (rr?.score || 0) > (bestRR.riskRewardMetrics?.score || 0)) {
        bestRR = h;
      }

      const odds = h.pmuOdds || 0;
      if (odds >= 12 && energy >= 60) {
        if (!freshLongshot || (freshLongshot.fatigueMetrics?.energyReservePct || 0) < energy) {
          freshLongshot = h;
        }
      }

      if (!worstFatigue || (worstFatigue.fatigueMetrics?.fatigueScore || 0) < (f?.fatigueScore || 0)) {
        worstFatigue = h;
      }
    }

    return {
      avgEnergyReserve: Math.round(totalEnergy / metrics.length),
      freshHorsesCount: fresh,
      moderateHorsesCount: mod,
      fatiguedHorsesCount: fatigued,
      bestRiskRewardHorse: bestRR,
      freshestLongshotHorse: freshLongshot,
      highestFatigueHorse: worstFatigue
    };
  }, [metrics]);

  // Filter and sort horses
  const processedHorses = useMemo(() => {
    return metrics
      .filter(h => {
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const matchNum = h.numPmu.toString() === query;
          const matchNom = h.nom.toLowerCase().includes(query);
          if (!matchNum && !matchNom) return false;
        }

        if (filterMode === "EXCELLENT_VALUE") {
          return (h.riskRewardMetrics?.score || 0) >= 7.0 || h.riskRewardMetrics?.category === "EXCELLENT_VALUE";
        }
        if (filterMode === "FRESH") {
          return (h.fatigueMetrics?.energyReservePct || 0) >= 60 || h.fatigueMetrics?.status === "OPTIMAL_FRESH";
        }
        if (filterMode === "HIGH_FATIGUE") {
          return (h.fatigueMetrics?.fatigueScore || 0) >= 60 || h.fatigueMetrics?.status === "HIGH_FATIGUE" || h.fatigueMetrics?.status === "EXHAUSTION_ALERT";
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "RISK_REWARD") {
          return (b.riskRewardMetrics?.score || 0) - (a.riskRewardMetrics?.score || 0);
        }
        if (sortBy === "ENERGY_RESERVE") {
          return (b.fatigueMetrics?.energyReservePct || 0) - (a.fatigueMetrics?.energyReservePct || 0);
        }
        if (sortBy === "ODDS") {
          return (a.pmuOdds || 999) - (b.pmuOdds || 999);
        }
        return a.numPmu - b.numPmu;
      });
  }, [metrics, filterMode, sortBy, searchQuery]);

  return (
    <div id="tactical-fatigue-risk-reward-view" className="space-y-6">
      {/* 1. Header & Environmental Fatigue Context Strip */}
      <div className="bg-gradient-to-br from-slate-900 via-neutral-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <BatteryCharging className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  رادار الإجهاد البدني ونسبة المخاطرة / العائد (Risk & Reward)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  ديناميكية حية
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                تحليل فسيولوجي دقيق يربط تتابع المشاركات وضغط السباقات الأخيرة مع طبيعة التيرين (Pénétromètre {penetroVal}) والمسافة ({distance}م) لتحديد الخيول المنهكة والخيول ذات القيمة الاستثمارية الأعلى.
              </p>
            </div>
          </div>

          {/* Environmental Strain Meter */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 sm:px-4 sm:py-2.5 flex items-center gap-4 self-start lg:self-auto shrink-0">
            <div className="space-y-0.5">
              <span className="text-[10px] text-neutral-400 font-bold block">مجهود التيرين والمسافة:</span>
              <div className="flex items-center gap-1.5">
                <Gauge className={cn("w-4 h-4", penetroNum >= 4.0 ? "text-red-400" : penetroNum >= 3.6 ? "text-amber-400" : "text-emerald-400")} />
                <span className="text-xs font-black text-white">
                  {penetroNum >= 4.0 ? "استنزاف عضلي حاد (أرضية ثقيلة)" : penetroNum >= 3.6 ? "احتكاك مرتفع (تيرين لزج)" : "استنزاف طبيعي (أرضية مواتية)"}
                </span>
              </div>
            </div>
            <div className="border-r border-slate-700 h-8"></div>
            <div className="text-center space-y-0.5">
              <span className="text-[10px] text-neutral-400 font-bold block">متوسط طاقة الشوط</span>
              <span className="text-xs font-black text-emerald-400">{avgEnergyReserve}%</span>
            </div>
          </div>
        </div>

        {/* 3 Key Tactical Insights Spotlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5">
          {/* 1. Best Risk/Reward Horse */}
          <div className="bg-slate-800/50 hover:bg-slate-800/80 transition-all rounded-xl p-3.5 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-emerald-400 block truncate">
                🏆 أعلى عائد استثماري متوقع (Best Risk/Reward)
              </span>
              {bestRiskRewardHorse ? (
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-5 h-5 bg-emerald-500 text-slate-950 font-black text-xs rounded flex items-center justify-center shrink-0">
                      {bestRiskRewardHorse.numPmu}
                    </span>
                    <span className="font-bold text-xs text-white truncate">{bestRiskRewardHorse.nom}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-300 font-mono shrink-0">
                    {bestRiskRewardHorse.riskRewardMetrics?.score || 8.5}/10
                  </span>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">جاري الحساب...</span>
              )}
            </div>
          </div>

          {/* 2. Freshest Speculative Longshot */}
          <div className="bg-slate-800/50 hover:bg-slate-800/80 transition-all rounded-xl p-3.5 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-black shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-purple-300 block truncate">
                ⚡ مفاجأة طازجة (Fresh Longshot Tocard)
              </span>
              {freshestLongshotHorse ? (
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-5 h-5 bg-purple-500 text-white font-black text-xs rounded flex items-center justify-center shrink-0">
                      {freshestLongshotHorse.numPmu}
                    </span>
                    <span className="font-bold text-xs text-white truncate">{freshestLongshotHorse.nom}</span>
                  </div>
                  <span className="text-xs font-black text-purple-300 font-mono shrink-0">
                    @{freshestLongshotHorse.pmuOdds || 18} • {freshestLongshotHorse.fatigueMetrics?.energyReservePct}% طاقة
                  </span>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">لا يوجد توكارد طازج بارز</span>
              )}
            </div>
          </div>

          {/* 3. Fatigue Warning */}
          <div className="bg-slate-800/50 hover:bg-slate-800/80 transition-all rounded-xl p-3.5 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center font-black shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-red-400 block truncate">
                ⚠️ أكثر الخيول عرضة للإجهاد (Fatigue Alert)
              </span>
              {highestFatigueHorse ? (
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-5 h-5 bg-red-600 text-white font-black text-xs rounded flex items-center justify-center shrink-0">
                      {highestFatigueHorse.numPmu}
                    </span>
                    <span className="font-bold text-xs text-white truncate">{highestFatigueHorse.nom}</span>
                  </div>
                  <span className="text-xs font-black text-red-300 font-mono shrink-0">
                    إجهاد {highestFatigueHorse.fatigueMetrics?.fatigueScore || 75}%
                  </span>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">مستويات إجهاد متوازنة</span>
              )}
            </div>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-4 text-neutral-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>كامل الحيوية: <strong>{freshHorsesCount}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>إجهاد معتدل: <strong>{moderateHorsesCount}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>تحذير إجهاد: <strong>{fatiguedHorsesCount}</strong></span>
            </span>
          </div>

          <div className="text-[11px] text-neutral-400">
            * يتم تحديث مؤشرات الإجهاد رياضياً وفق خوارزميات الموسيقى وتحمل التيرين الفرنسي
          </div>
        </div>
      </div>

      {/* 2. Interactive Controls: Filters, Sorting & Search */}
      <div className="bg-white rounded-2xl p-4 border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterMode("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                filterMode === "ALL" 
                  ? "bg-neutral-900 text-white shadow-xs" 
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              <span>جميع المشاركين</span>
              <span className="text-[10px] opacity-75 font-mono">({metrics.length})</span>
            </button>
            <button
              onClick={() => setFilterMode("EXCELLENT_VALUE")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                filterMode === "EXCELLENT_VALUE" 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>أعلى عائد استثماري</span>
            </button>
            <button
              onClick={() => setFilterMode("FRESH")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                filterMode === "FRESH" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
              )}
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>طاقة ونضارة عالية (≥60%)</span>
            </button>
            <button
              onClick={() => setFilterMode("HIGH_FATIGUE")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                filterMode === "HIGH_FATIGUE" 
                  ? "bg-red-600 text-white shadow-xs" 
                  : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>تحذيرات الإجهاد المرتفع</span>
            </button>
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث برقم أو اسم الخيل..."
                className="pr-8 pl-3 py-1.5 text-xs bg-neutral-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-44"
              />
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 mr-1" />
              <button
                onClick={() => setSortBy("RISK_REWARD")}
                className={cn(
                  "px-2 py-1 rounded-lg font-bold transition-all text-[11px]",
                  sortBy === "RISK_REWARD" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                )}
                title="الترتيب حسب مؤشر المخاطرة والعائد"
              >
                المخاطرة/العائد
              </button>
              <button
                onClick={() => setSortBy("ENERGY_RESERVE")}
                className={cn(
                  "px-2 py-1 rounded-lg font-bold transition-all text-[11px]",
                  sortBy === "ENERGY_RESERVE" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                )}
                title="الترتيب حسب مخزون الطاقة"
              >
                الطاقة
              </button>
              <button
                onClick={() => setSortBy("NUM_PMU")}
                className={cn(
                  "px-2 py-1 rounded-lg font-bold transition-all text-[11px]",
                  sortBy === "NUM_PMU" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                )}
                title="الترتيب حسب رقم الخيل"
              >
                الرقم
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Horse Fatigue & Risk/Reward Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processedHorses.map(h => {
          const f = h.fatigueMetrics;
          const rr = h.riskRewardMetrics;
          const isExpanded = !!expandedHorses[h.numPmu];

          const energy = f?.energyReservePct ?? 50;
          const fatigue = f?.fatigueScore ?? 50;
          const rrScore = rr?.score ?? 5.0;

          // Battery icon & color logic
          const isOptimal = f?.status === "OPTIMAL_FRESH";
          const isModerate = f?.status === "MODERATE_STRAIN";
          const isHighFatigue = f?.status === "HIGH_FATIGUE";
          const isExhaustion = f?.status === "EXHAUSTION_ALERT";

          const energyColor = isOptimal 
            ? "text-emerald-600 bg-emerald-50 border-emerald-200" 
            : isModerate 
            ? "text-blue-700 bg-blue-50 border-blue-200" 
            : isHighFatigue 
            ? "text-amber-700 bg-amber-50 border-amber-200" 
            : "text-red-700 bg-red-50 border-red-200";

          const energyBarColor = isOptimal 
            ? "bg-emerald-500" 
            : isModerate 
            ? "bg-blue-500" 
            : isHighFatigue 
            ? "bg-amber-500" 
            : "bg-red-500";

          // Risk/Reward Category badges
          const rrCategory = rr?.category || "BALANCED_OPPORTUNITY";
          const rrCategoryStyle = 
            rrCategory === "EXCELLENT_VALUE" ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30" :
            rrCategory === "SPECULATIVE_TOCARD" ? "bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400/30" :
            rrCategory === "HIGH_RISK_TRAP" ? "bg-red-50 text-red-900 border-red-300 ring-1 ring-red-400/30" :
            "bg-slate-50 text-slate-800 border-slate-300";

          return (
            <div
              key={h.numPmu}
              id={`horse-fatigue-card-${h.numPmu}`}
              className={cn(
                "bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs flex flex-col justify-between",
                rrCategory === "EXCELLENT_VALUE" ? "border-emerald-300 shadow-sm" :
                rrCategory === "HIGH_RISK_TRAP" ? "border-red-200" :
                "border-neutral-200 hover:border-neutral-300"
              )}
            >
              <div className="space-y-4">
                {/* Header Row: Num PMU, Name, Style, Ferrage & Odds */}
                <div className="flex items-start justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-11 h-11 rounded-xl text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0",
                      rrCategory === "EXCELLENT_VALUE" ? "bg-emerald-600 ring-2 ring-emerald-300" :
                      rrCategory === "SPECULATIVE_TOCARD" ? "bg-purple-700 ring-2 ring-purple-300" :
                      rrCategory === "HIGH_RISK_TRAP" ? "bg-red-700" :
                      "bg-neutral-900"
                    )}>
                      {h.numPmu}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-neutral-900 text-sm sm:text-base leading-tight">
                          {h.nom}
                        </h4>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                          h.ferrageCode === "D4" ? "bg-amber-50 text-amber-800 border-amber-300" :
                          h.ferrageCode === "DP" || h.ferrageCode === "DA" ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                          "bg-neutral-50 text-neutral-600 border-neutral-200"
                        )}>
                          {h.ferrageCode || "F"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                        <span>{h.runningStyleLabel?.split(" ")[0]}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-neutral-600">كوطة: @{h.pmuOdds || "10.0"}</span>
                        {h.musique && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[100px]" title={h.musique}>
                              {h.musique}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Risk / Reward Score Badge */}
                  <div className="text-left shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Scale className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] font-bold text-neutral-500">Risk/Reward</span>
                    </div>
                    <div className="flex items-baseline gap-1 justify-end mt-0.5">
                      <span className={cn(
                        "text-lg sm:text-xl font-black font-mono leading-none",
                        rrScore >= 7.5 ? "text-emerald-600" :
                        rrScore >= 5.0 ? "text-indigo-600" :
                        rrScore >= 3.5 ? "text-amber-600" : "text-red-600"
                      )}>
                        {rrScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold">/10</span>
                    </div>
                  </div>
                </div>

                {/* 2. Visual Energy Reserve & Fatigue Gauge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-700">
                      {isOptimal ? <BatteryCharging className="w-4 h-4 text-emerald-600" /> :
                       isModerate ? <BatteryMedium className="w-4 h-4 text-blue-600" /> :
                       isHighFatigue ? <BatteryWarning className="w-4 h-4 text-amber-600" /> :
                       <BatteryLow className="w-4 h-4 text-red-600" />}
                      <span>مخزون الطاقة والجاهزية البدنية:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-neutral-900">{energy}%</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", energyColor)}>
                        {f?.statusLabel || "إجهاد معتدل"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar with Segments */}
                  <div className="relative w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500 shadow-xs", energyBarColor)}
                      style={{ width: `${Math.max(5, Math.min(100, energy))}%` }}
                    />
                  </div>

                  {/* Three Contributing Factors Micro-Indicators */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100 text-center">
                      <span className="text-[10px] text-neutral-400 block">حمل المشاركات</span>
                      <span className="text-xs font-black text-neutral-800 font-mono">
                        {f?.recentRunsLoad ?? 35}%
                      </span>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100 text-center">
                      <span className="text-[10px] text-neutral-400 block">استنزاف التيرين</span>
                      <span className="text-xs font-black text-neutral-800 font-mono">
                        {f?.trackStrainFactor ?? 40}%
                      </span>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100 text-center">
                      <span className="text-[10px] text-neutral-400 block">الاستنزاف التكتيكي</span>
                      <span className={cn(
                        "text-xs font-black",
                        f?.tacticalDrainRisk === "ELEVE" ? "text-red-600" :
                        f?.tacticalDrainRisk === "MODERE" ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {f?.tacticalDrainRisk === "ELEVE" ? "مرتفع" : f?.tacticalDrainRisk === "MODERE" ? "معتدل" : "منخفض"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Risk / Reward Profile Breakdown */}
                <div className={cn("p-3 rounded-xl border space-y-2", rrCategoryStyle)}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" />
                      {rr?.categoryLabel || "فرصة متوازنة"}
                    </span>
                    <span className="text-[11px] font-mono font-bold">
                      النسبة: {rr?.ratio ?? 1.2}x
                    </span>
                  </div>

                  {/* Dual Bar: Reward Potential vs Risk Factor */}
                  <div className="space-y-1 text-[11px] pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">مؤشر العائد المتوقع:</span>
                      <span className="font-bold text-emerald-700 font-mono">{rr?.rewardScore ?? 50}% ({rr?.rewardPotentialLabel})</span>
                    </div>
                    <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${rr?.rewardScore ?? 50}%` }} />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-neutral-600">مؤشر المخاطرة التكتيكية:</span>
                      <span className="font-bold text-red-700 font-mono">{rr?.riskScore ?? 45}% ({rr?.riskLevelLabel})</span>
                    </div>
                    <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${rr?.riskScore ?? 45}%` }} />
                    </div>
                  </div>

                  {/* Tactical Bettor Recommendation */}
                  <p className="text-[11px] font-medium leading-relaxed pt-1 text-neutral-800 border-t border-black/10">
                    💡 <strong>توصية الرهان:</strong> {rr?.recommendation}
                  </p>
                </div>

                {/* 4. Expandable Physiological & Tactical Diagnosis */}
                {isExpanded && f?.fatigueDiagnosis && (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-xs text-neutral-700 space-y-1.5 animate-fadeIn">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-600" />
                      التشخيص الفسيولوجي وحالة التعافي العضلي:
                    </span>
                    <p className="leading-relaxed text-[11px] text-neutral-600">
                      {f.fatigueDiagnosis}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-neutral-500 border-t border-neutral-200/60">
                      <span>مؤشر الاستشفاء والراحة: <strong>{f.recoveryIndex}%</strong></span>
                      <span>•</span>
                      <span>تأثير أسلوب الركض: <strong>{f.tacticalDrainRiskLabel}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Expand Button */}
              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <button
                  onClick={() => toggleExpand(h.numPmu)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>{isExpanded ? "إخفاء التفاصيل الفسيولوجية" : "عرض التشخيص الفسيولوجي الكامل"}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                  <span>Win: {h.winProb}%</span>
                  <span>Top3: {h.top3Prob}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {processedHorses.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border text-center space-y-2">
          <HelpCircle className="w-8 h-8 text-neutral-400 mx-auto" />
          <h4 className="font-bold text-neutral-800 text-sm">لا توجد خيول تطابق معايير التصفية الحالية</h4>
          <p className="text-xs text-neutral-500">جرب تغيير الفلتر أو مسح نص البحث لعرض جميع المشاركين.</p>
        </div>
      )}

      {/* 4. Strategic Bet Integration Guide (دليل تطبيق مؤشرات الإجهاد في التذاكر) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-white">
              كيف توظف مؤشرات الإجهاد و Risk/Reward في بناء تذاكرك الرابحة؟
            </h4>
            <p className="text-xs text-neutral-400">
              قواعد ذهبية مستخلصة من واقع سباقات PMU الفرنسية لتجنب مفاجآت الأمتار الأخيرة.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-xs">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
            <span className="font-bold text-emerald-400 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              في رهان Quinté+ Désordre:
            </span>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              عندما تكون الأرضية ثقيلة (Lourd)، استبدل الخيول المفضلة المنهكة (طاقة &lt; 50%) بخيول خارج التوقعات تمتلك نضارة بدنية (طاقة &gt; 65%). هذا التكتيك هو السر في صيد نسب الديزورد الضخمة!
            </p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
            <span className="font-bold text-amber-400 block flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              في رهان Tiercé Ordre:
            </span>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              تجنب وضع الخيول المصنفة كـ (Animateur) في المركز الأول إذا كانت نسبة إجهادها تفوق 60%؛ فالمنعطف الأخير والمسار المستقيم سيكلفها التراجع لحساب الخيول المتربصة (Attentistes).
            </p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
            <span className="font-bold text-purple-400 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              تأمين بونص 3 وبونص 4:
            </span>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              اعتمد فقط على الخيول ذات تقييم Risk/Reward أعلى من 7.0 كقواعد ثابتة (Bases)، وضع الخيول الطازجة كخيول تغطية مرافقة (Associés) لضمان تحقيق البونص في حال حدوث مفاجأة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
