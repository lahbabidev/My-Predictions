"use client";

import React, { useState, useMemo } from "react";
import { 
  HorseAnalysisMetrics, 
  TacticalRaceScenario,
  HorsePositionProbabilities,
  DesordreRole,
  getConditionalPositionMatrixReport,
  computeLivePositionProbabilityMatrix,
  LiveHorseEvidence,
  BayesianCheckpointId,
  EnvironmentConditions,
  DEFAULT_ENVIRONMENT,
  TRACK_DEFINITIONS,
  WEATHER_DEFINITIONS
} from "@/lib/analyticalEngine";
import { cn } from "@/lib/utils";
import { 
  ShieldCheck, 
  Flame, 
  Sparkles, 
  Zap, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  HelpCircle,
  Layers, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  BarChart3,
  Sliders,
  Compass,
  CloudRain,
  Sun,
  Thermometer,
  Wind
} from "lucide-react";

interface ConditionalPositionMatrixTableProps {
  metrics: HorseAnalysisMetrics[];
  scenario?: TacticalRaceScenario | null;
  liveEvidences?: Record<number, LiveHorseEvidence>;
  currentCheckpoint?: BayesianCheckpointId;
  onSelectHorse?: (numPmu: number) => void;
  selectedHorseNum?: number;
  environment?: EnvironmentConditions;
}

const ROLE_BADGES: Record<DesordreRole, { label: string; bg: string; text: string; border: string; desc: string }> = {
  PILIER_BASE: {
    label: "ركيزة صلبة (Pilier)",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
    desc: "ركيزة محورية لا تستغني عنها تذاكر الكينتي؛ احتمال فائق للحلول في المركزين الأول أو الثاني."
  },
  PLACE_SECURE: {
    label: "متمركز مضمون (Placé Sûr)",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-300",
    desc: "أعلى نسبة وصول لمنصة التتويج (المراكز 2 و 3) لحماية الرهان عند تعثر المرشح الأول."
  },
  REGULATEUR_4_5: {
    label: "ضابط المراكز 4-5 (Régulateur)",
    bg: "bg-neutral-100",
    text: "text-neutral-700",
    border: "border-neutral-300",
    desc: "خيل منتظم الأداء يملك أعلى احتمال شرطي لإقفال المركزين الرابع والخامس وضمان الديزورد."
  },
  TOCARD_EXPLOSIF: {
    label: "مفاجأة الديزورد (Tocard)",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    desc: "خيل خارجي سريع وغير متوقع؛ يقتنص المراكز 3 إلى 5 ليرفع عوائد الديزورد إلى أرقام قياسية."
  }
};

export default function ConditionalPositionMatrixTable({
  metrics,
  scenario,
  liveEvidences,
  currentCheckpoint,
  onSelectHorse,
  selectedHorseNum,
  environment
}: ConditionalPositionMatrixTableProps) {
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"top5" | "pos1" | "pos2" | "pos3" | "pos4" | "pos5">("top5");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedHorse, setExpandedHorse] = useState<number | null>(null);

  // Compute live matrix incorporating live evidences and independent environmental conditions
  const activeMatrixMap = useMemo(() => {
    return computeLivePositionProbabilityMatrix(
      metrics,
      liveEvidences || {},
      currentCheckpoint || "T0_PRE",
      scenario?.paceType || "EQUILIBRE",
      environment || DEFAULT_ENVIRONMENT
    );
  }, [metrics, liveEvidences, currentCheckpoint, scenario, environment]);

  // Generate complete report with top 3 Quinté+ combinations
  const report = useMemo(() => {
    return getConditionalPositionMatrixReport(metrics);
  }, [metrics]);

  // Process rows with sorting and filtering
  const processedRows = useMemo(() => {
    const list = metrics.map(m => {
      const pMat = activeMatrixMap[m.numPmu] || m.positionProbMatrix;
      return {
        metric: m,
        matrix: pMat
      };
    });

    const filtered = list.filter(item => {
      if (roleFilter === "ALL") return true;
      return item.matrix?.desordreRole === roleFilter;
    });

    filtered.sort((a, b) => {
      const mA = a.matrix;
      const mB = b.matrix;
      if (!mA || !mB) return 0;

      let valA = 0;
      let valB = 0;

      if (sortBy === "top5") {
        valA = mA.top5Desordre;
        valB = mB.top5Desordre;
      } else if (sortBy === "pos1") {
        valA = mA.pos1;
        valB = mB.pos1;
      } else if (sortBy === "pos2") {
        valA = mA.pos2;
        valB = mB.pos2;
      } else if (sortBy === "pos3") {
        valA = mA.pos3;
        valB = mB.pos3;
      } else if (sortBy === "pos4") {
        valA = mA.pos4;
        valB = mB.pos4;
      } else if (sortBy === "pos5") {
        valA = mA.pos5;
        valB = mB.pos5;
      }

      return sortOrder === "desc" ? valB - valA : valA - valB;
    });

    return filtered;
  }, [metrics, activeMatrixMap, roleFilter, sortBy, sortOrder]);

  const handleHeaderSort = (columnKey: "top5" | "pos1" | "pos2" | "pos3" | "pos4" | "pos5") => {
    if (sortBy === columnKey) {
      setSortOrder(prev => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(columnKey);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-br from-neutral-900 via-indigo-950 to-neutral-900 text-white rounded-2xl p-6 border border-neutral-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">
                  مصفوفة الاحتمالات الشرطية للمراكز (Conditional Position Probability Matrix)
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  محرك Quinté+ Désordre
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                تكامل الاستدلال البايزي خماسي الأبعاد: احتمالات السوابق التاريخية (Priors) مضروبة في معاملات الظروف والسرعة اللحظية (Likelihoods) لضبط مقاعد الوصول 1 إلى 5.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-neutral-800/80 px-4 py-2.5 rounded-xl border border-neutral-700/60 text-xs">
            <span className="text-neutral-400">عدد الخيول بالتحليل:</span>
            <span className="font-bold text-indigo-400 text-sm">{metrics.length} خيول</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-400">حالة التحديث:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {currentCheckpoint ? `نقطة ${currentCheckpoint}` : "ثابت (T0)"}
            </span>
          </div>
        </div>

        {/* 2. Top 3 Mathematically Guaranteed Désordre Combinations */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.topDesordreCombinations.map((combo, idx) => {
            const isSafe = idx === 0;
            const isOptimal = idx === 1;
            return (
              <div 
                key={idx}
                className={cn(
                  "rounded-xl p-4 border flex flex-col justify-between transition-all",
                  isSafe ? "bg-emerald-950/40 border-emerald-800/60" :
                  isOptimal ? "bg-indigo-950/40 border-indigo-800/60" :
                  "bg-amber-950/40 border-amber-800/60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
                    <span className={cn(
                      "text-xs font-black flex items-center gap-1.5",
                      isSafe ? "text-emerald-400" : isOptimal ? "text-indigo-300" : "text-amber-400"
                    )}>
                      {isSafe && <ShieldCheck className="w-4 h-4" />}
                      {isOptimal && <Award className="w-4 h-4" />}
                      {!isSafe && !isOptimal && <Sparkles className="w-4 h-4" />}
                      {combo.riskCategory}
                    </span>
                    <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-white">
                      ثقة {combo.jointProbability}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3" dir="ltr">
                    {combo.horseNumbers.map((num, nIdx) => (
                      <div 
                        key={nIdx}
                        className={cn(
                          "w-9 h-9 rounded-lg font-black text-sm flex items-center justify-center shadow-md",
                          nIdx < 2 
                            ? "bg-amber-400 text-neutral-950 ring-2 ring-amber-300/60" 
                            : "bg-white text-neutral-950"
                        )}
                      >
                        {num}
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    {combo.rationale}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">متوسط عائد الديزورد:</span>
                  <span className="font-bold text-white font-mono">
                    ~{combo.expectedPayoutDesordre}€ ({combo.expectedPayoutDesordre * 10} MAD)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Filter and Sorting Controls */}
      <div className="bg-white rounded-2xl p-4 border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-neutral-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            تصفية حسب الدور التكتيكي في الكينتي:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "ALL", label: "جميع الخيول" },
              { key: "PILIER_BASE", label: "الركائز الصلبة" },
              { key: "PLACE_SECURE", label: "المتمركزون للمنصة" },
              { key: "REGULATEUR_4_5", label: "ضوابط المراكز 4-5" },
              { key: "TOCARD_EXPLOSIF", label: "مفاجآت الديزورد" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-bold transition-all",
                  roleFilter === tab.key
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-neutral-500 font-medium">
          يُعرض <strong className="text-neutral-900">{processedRows.length}</strong> من إجمالي {metrics.length}
        </div>
      </div>

      {/* 4. Full Matrix Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-50 border-b text-neutral-700 font-bold select-none">
              <tr>
                <th className="p-3.5 w-14 text-center">#</th>
                <th className="p-3.5 min-w-[160px]">الخيل والتفاصيل التكتيكية</th>
                <th className="p-3.5 min-w-[150px]">الدور التكتيكي للديزورد</th>
                
                {/* 1st to 5th Column Probability */}
                <th 
                  onClick={() => handleHeaderSort("pos1")}
                  className="p-3.5 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>1er (فوز)</span>
                    {sortBy === "pos1" && (sortOrder === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
                  </div>
                </th>

                <th 
                  onClick={() => handleHeaderSort("pos2")}
                  className="p-3.5 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>2ème</span>
                    {sortBy === "pos2" && (sortOrder === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
                  </div>
                </th>

                <th 
                  onClick={() => handleHeaderSort("pos3")}
                  className="p-3.5 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>3ème</span>
                    {sortBy === "pos3" && (sortOrder === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
                  </div>
                </th>

                <th 
                  onClick={() => handleHeaderSort("pos4")}
                  className="p-3.5 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>4ème</span>
                    {sortBy === "pos4" && (sortOrder === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
                  </div>
                </th>

                <th 
                  onClick={() => handleHeaderSort("pos5")}
                  className="p-3.5 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>5ème</span>
                    {sortBy === "pos5" && (sortOrder === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
                  </div>
                </th>

                {/* Top 5 Quinté Désordre Probability */}
                <th 
                  onClick={() => handleHeaderSort("top5")}
                  className="p-3.5 text-center cursor-pointer hover:bg-neutral-100 transition-colors bg-emerald-50/50"
                >
                  <div className="flex items-center justify-center gap-1 text-emerald-800 font-black">
                    <span>Quinté Désordre %</span>
                    {sortBy === "top5" && (sortOrder === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
                  </div>
                </th>

                <th className="p-3.5 text-center min-w-[100px]">المركز الأنسب</th>
                <th className="p-3.5 text-center w-12">تفصيل</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-neutral-100">
              {processedRows.map(({ metric: m, matrix: pMat }) => {
                if (!pMat) return null;
                const isSelected = selectedHorseNum === m.numPmu;
                const isExpanded = expandedHorse === m.numPmu;
                const roleConfig = ROLE_BADGES[pMat.desordreRole] || ROLE_BADGES.REGULATEUR_4_5;

                return (
                  <React.Fragment key={m.numPmu}>
                    <tr 
                      onClick={() => onSelectHorse && onSelectHorse(m.numPmu)}
                      className={cn(
                        "hover:bg-indigo-50/40 transition-colors cursor-pointer",
                        isSelected ? "bg-indigo-50/70 border-r-4 border-r-indigo-600" : ""
                      )}
                    >
                      {/* Number */}
                      <td className="p-3 text-center">
                        <div className={cn(
                          "w-8 h-8 mx-auto rounded-lg flex items-center justify-center font-black text-xs shadow-xs",
                          pMat.top5Desordre >= 65 
                            ? "bg-amber-400 text-neutral-950 ring-2 ring-amber-300" 
                            : "bg-neutral-900 text-white"
                        )}>
                          {m.numPmu}
                        </div>
                      </td>

                      {/* Name and Style */}
                      <td className="p-3">
                        <div className="font-extrabold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                          <span>{m.nom}</span>
                          {m.grossePrise && (
                            <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs" title="Grosse Prise: رهان مؤسساتي استثنائي مرصود في سجلات PMU">
                              GROSSE PRISE 💰
                            </span>
                          )}
                          {m.trainerOpinion === "POSITIF" && (
                            <span className="bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.2 rounded" title="Avis Entraîneur: تصريح إيجابي متفائل">
                              مدرب متفائل 🟢
                            </span>
                          )}
                          {m.trainerOpinion === "NEGATIF" && (
                            <span className="bg-rose-100 text-rose-700 font-bold text-[9px] px-1.5 py-0.2 rounded" title="Avis Entraîneur: تصريح سلبي متحفظ">
                              مدرب متحفظ 🔴
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500 flex-wrap">
                          <span className={cn(
                            "px-1.5 py-0.2 rounded font-semibold",
                            m.ferrageCode === "D4" ? "bg-amber-100 text-amber-800 font-bold" : "bg-neutral-100 text-neutral-600"
                          )}>
                            {m.ferrageCode}
                          </span>
                          <span>•</span>
                          <span>{m.runningStyleLabel}</span>
                          <span>•</span>
                          <span className="font-mono text-neutral-700">{m.speedRatingKm}</span>
                          {m.distanceHandicapMeters && m.distanceHandicapMeters > 0 ? (
                            <>
                              <span>•</span>
                              <span className="font-bold text-amber-800 bg-amber-100 px-1 rounded">+{m.distanceHandicapMeters}م إرجاع</span>
                            </>
                          ) : null}
                          {m.handicapWeightKg ? (
                            <>
                              <span>•</span>
                              <span className="font-mono text-neutral-600">{m.handicapWeightKg} كغ</span>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* Tactical Role */}
                      <td className="p-3">
                        <span className={cn(
                          "inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-2xs",
                          roleConfig.bg,
                          roleConfig.text,
                          roleConfig.border
                        )}>
                          {pMat.desordreRoleLabel}
                        </span>
                      </td>

                      {/* Pos 1 */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          pMat.pos1 >= 20 ? "bg-emerald-100 text-emerald-800 font-black" : "text-neutral-800"
                        )}>
                          {pMat.pos1}%
                        </span>
                      </td>

                      {/* Pos 2 */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          pMat.pos2 >= 18 ? "bg-emerald-100 text-emerald-800 font-black" : "text-neutral-800"
                        )}>
                          {pMat.pos2}%
                        </span>
                      </td>

                      {/* Pos 3 */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          pMat.pos3 >= 16 ? "bg-indigo-100 text-indigo-800 font-black" : "text-neutral-800"
                        )}>
                          {pMat.pos3}%
                        </span>
                      </td>

                      {/* Pos 4 */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          pMat.pos4 >= 15 ? "bg-indigo-100 text-indigo-800 font-black" : "text-neutral-800"
                        )}>
                          {pMat.pos4}%
                        </span>
                      </td>

                      {/* Pos 5 */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          pMat.pos5 >= 14 ? "bg-indigo-100 text-indigo-800 font-black" : "text-neutral-800"
                        )}>
                          {pMat.pos5}%
                        </span>
                      </td>

                      {/* Overall Top 5 Quinté Désordre Probability */}
                      <td className="p-3 text-center bg-emerald-50/40">
                        <div className="flex items-center justify-center gap-2">
                          <span className={cn(
                            "font-black font-mono text-sm",
                            pMat.top5Desordre >= 65 ? "text-emerald-700" :
                            pMat.top5Desordre >= 45 ? "text-indigo-700" :
                            "text-neutral-700"
                          )}>
                            {pMat.top5Desordre}%
                          </span>
                          <div className="w-12 bg-neutral-200 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                pMat.top5Desordre >= 65 ? "bg-emerald-500" :
                                pMat.top5Desordre >= 45 ? "bg-indigo-500" :
                                "bg-neutral-400"
                              )}
                              style={{ width: `${Math.min(100, pMat.top5Desordre)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Optimal Slot */}
                      <td className="p-3 text-center">
                        <span className="bg-neutral-100 text-neutral-800 font-bold px-2 py-1 rounded text-xs">
                          {pMat.optimalSlot === 1 ? "1er (البطل)" :
                           pMat.optimalSlot === 2 ? "2ème (وصيف)" :
                           pMat.optimalSlot === 3 ? "3ème (منصة)" :
                           pMat.optimalSlot === 4 ? "4ème (شرف)" : "5ème (إقفال)"}
                        </span>
                      </td>

                      {/* Toggle Breakdown */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedHorse(prev => prev === m.numPmu ? null : m.numPmu);
                          }}
                          className="p-1 rounded-md hover:bg-neutral-200 text-neutral-500"
                          title="عرض تفكيك بايزي لحظي"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Bayesian Detail Drawer */}
                    {isExpanded && (
                      <tr className="bg-neutral-50/80 border-b">
                        <td colSpan={11} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                            <div className="bg-white p-3 rounded-xl border space-y-1.5">
                              <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                                <span>التوجيه التكتيكي للديزورد:</span>
                              </div>
                              <p className="text-neutral-600 leading-relaxed text-[11px]">
                                {pMat.tacticalNote}
                              </p>
                            </div>

                            <div className="bg-white p-3 rounded-xl border space-y-1.5">
                              <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>متجه السوابق التاريخية P(Pos k | History):</span>
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px] pt-1">
                                <div><div className="text-neutral-400">P1</div><strong>{pMat.priors[0]}%</strong></div>
                                <div><div className="text-neutral-400">P2</div><strong>{pMat.priors[1]}%</strong></div>
                                <div><div className="text-neutral-400">P3</div><strong>{pMat.priors[2]}%</strong></div>
                                <div><div className="text-neutral-400">P4</div><strong>{pMat.priors[3]}%</strong></div>
                                <div><div className="text-neutral-400">P5</div><strong>{pMat.priors[4]}%</strong></div>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-xl border space-y-1.5">
                              <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-600" />
                                <span>مضاعف الظروف اللحظية L(Evidence | Pos k):</span>
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px] pt-1">
                                <div><div className="text-neutral-400">L1</div><strong className="text-amber-700">x{pMat.likelihoods[0]}</strong></div>
                                <div><div className="text-neutral-400">L2</div><strong className="text-amber-700">x{pMat.likelihoods[1]}</strong></div>
                                <div><div className="text-neutral-400">L3</div><strong className="text-amber-700">x{pMat.likelihoods[2]}</strong></div>
                                <div><div className="text-neutral-400">L4</div><strong className="text-amber-700">x{pMat.likelihoods[3]}</strong></div>
                                <div><div className="text-neutral-400">L5</div><strong className="text-amber-700">x{pMat.likelihoods[4]}</strong></div>
                              </div>
                            </div>

                            {/* Environmental Impact (Weather & Terrain) */}
                            <div className="bg-white p-3 rounded-xl border space-y-2">
                              <div className="font-bold text-neutral-800 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                                  <span>تأثير الأرضية والطقس اللحظي:</span>
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                  مستقلان L_env
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                                <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200/60">
                                  <div className="text-neutral-500 text-[10px] flex items-center justify-between">
                                    <span>نوع الأرضية</span>
                                    <span className="font-mono font-bold text-neutral-800">
                                      {pMat.terrainAptitudeScore ?? 75}/100
                                    </span>
                                  </div>
                                  <div className="font-mono font-extrabold text-sm text-indigo-700 mt-0.5">
                                    ×{pMat.terrainFactor ?? 1.0}
                                  </div>
                                </div>

                                <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200/60">
                                  <div className="text-neutral-500 text-[10px] flex items-center justify-between">
                                    <span>حالة الطقس</span>
                                    <span className="font-mono font-bold text-neutral-800">
                                      {pMat.weatherToleranceScore ?? 75}/100
                                    </span>
                                  </div>
                                  <div className="font-mono font-extrabold text-sm text-amber-700 mt-0.5">
                                    ×{pMat.weatherFactor ?? 1.0}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
