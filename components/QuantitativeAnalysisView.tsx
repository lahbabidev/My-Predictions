"use client";

import React, { useState } from "react";
import { HorseAnalysisMetrics, TacticalRaceScenario } from "@/lib/analyticalEngine";
import { PMURace } from "@/types/pmu";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  Cpu, 
  Sparkles, 
  Percent, 
  Gauge, 
  ShieldCheck, 
  ArrowUpDown,
  Radio,
  Layers
} from "lucide-react";
import BayesianInferenceEngine from "@/components/BayesianInferenceEngine";
import ConditionalPositionMatrixTable from "@/components/ConditionalPositionMatrixTable";

interface QuantitativeAnalysisViewProps {
  metrics: HorseAnalysisMetrics[];
  raceInfo: PMURace;
  scenario?: TacticalRaceScenario | null;
  prediction?: {
    quantitativeAnalysis?: string;
    prediction?: number[];
    goldenBase?: number;
    profitStrategy?: string;
  } | null;
  onGeneratePrediction?: () => void;
  predictionLoading?: boolean;
}

export default function QuantitativeAnalysisView({
  metrics,
  raceInfo,
  scenario,
  prediction,
  onGeneratePrediction,
  predictionLoading
}: QuantitativeAnalysisViewProps) {
  const [subTab, setSubTab] = useState<"desordre_matrix" | "bayesian" | "matrix">("desordre_matrix");
  const [sortField, setSortField] = useState<keyof HorseAnalysisMetrics>("quantitativeScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sorted list
  const sortedMetrics = [...metrics].sort((a, b) => {
    const valA = a[sortField] ?? 0;
    const valB = b[sortField] ?? 0;
    if (typeof valA === "number" && typeof valB === "number") {
      return sortDirection === "desc" ? valB - valA : valA - valB;
    }
    return 0;
  });

  const handleSort = (field: keyof HorseAnalysisMetrics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Leaders in categories
  const bestSpeed = [...metrics].sort((a, b) => a.speedRatingKm.localeCompare(b.speedRatingKm))[0];
  const bestClass = [...metrics].sort((a, b) => b.classPowerIndex - a.classPowerIndex)[0];
  const bestEV = [...metrics].sort((a, b) => b.valueIndex - a.valueIndex)[0];
  const bestSafety = [...metrics].sort((a, b) => b.profitSafetyScore - a.profitSafetyScore)[0];

  return (
    <div className="space-y-6">
      {/* 1. Quantitative Benchmark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Best Speed / Chrono */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 block mb-1">أسرع معدل زمني (Chrono)</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-neutral-900 text-white font-black text-sm flex items-center justify-center">
                {bestSpeed.numPmu}
              </span>
              <div>
                <h4 className="font-extrabold text-neutral-900 text-sm truncate max-w-[120px]">{bestSpeed.nom}</h4>
                <span className="text-xs font-mono font-bold text-indigo-600">{bestSpeed.speedRatingKm}</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Best Class Power */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 block mb-1">أعلى تصنيف فئة (Class Power)</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-black text-sm flex items-center justify-center">
                {bestClass.numPmu}
              </span>
              <div>
                <h4 className="font-extrabold text-neutral-900 text-sm truncate max-w-[120px]">{bestClass.nom}</h4>
                <span className="text-xs font-black text-emerald-600">{bestClass.classPowerIndex}/100</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Highest Value (EV) */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 block mb-1">أعلى قيمة متوقعة (Value EV)</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-600 text-white font-black text-sm flex items-center justify-center">
                {bestEV.numPmu}
              </span>
              <div>
                <h4 className="font-extrabold text-neutral-900 text-sm truncate max-w-[120px]">{bestEV.nom}</h4>
                <span className="text-xs font-mono font-bold text-amber-600">x{bestEV.valueIndex} EV</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Safe Profit Score */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 block mb-1">الأمان المالي الأقصى للربح</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-900 text-white font-black text-sm flex items-center justify-center">
                {bestSafety.numPmu}
              </span>
              <div>
                <h4 className="font-extrabold text-neutral-900 text-sm truncate max-w-[120px]">{bestSafety.nom}</h4>
                <span className="text-xs font-black text-indigo-700">{bestSafety.profitSafetyScore}% ثقة</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Sub-tab Navigation for Bayesian Live Engine vs Master Matrix vs Conditional Position Matrix */}
      <div className="flex bg-neutral-100 p-1.5 rounded-2xl border gap-1 flex-wrap">
        <button
          onClick={() => setSubTab("desordre_matrix")}
          className={cn(
            "flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2",
            subTab === "desordre_matrix"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          )}
        >
          <Layers className="w-4 h-4 text-emerald-300" />
          <span>مصفوفة الاحتمالات الشرطية للمراكز (Quinté+ Désordre)</span>
          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            بايزي خماسي
          </span>
        </button>

        <button
          onClick={() => setSubTab("bayesian")}
          className={cn(
            "flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2",
            subTab === "bayesian"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          )}
        >
          <Radio className={cn("w-4 h-4", subTab === "bayesian" ? "text-indigo-400 animate-pulse" : "text-neutral-400")} />
          <span>محرك الاستدلال البايزي اللحظي (Live Checkpoints)</span>
          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-mono border border-indigo-400/30">
            مباشر LIVE
          </span>
        </button>

        <button
          onClick={() => setSubTab("matrix")}
          className={cn(
            "flex-1 min-w-[180px] py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2",
            subTab === "matrix"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          )}
        >
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>مصفوفة القياس الكمّي الشاملة ونطاق الثقة 95%</span>
        </button>
      </div>

      {subTab === "desordre_matrix" ? (
        <ConditionalPositionMatrixTable
          metrics={metrics}
          scenario={scenario}
        />
      ) : subTab === "bayesian" ? (
        <BayesianInferenceEngine
          metrics={metrics}
          raceInfo={raceInfo}
          scenario={scenario}
        />
      ) : (
        <>
          {/* AI Quantitative Report (if generated) */}
          {prediction?.quantitativeAnalysis && (
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className="text-md">التقرير الإحصائي الكمّي المتقدم (AI Quantitative Synthesis)</h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-xl border">
                {prediction.quantitativeAnalysis}
              </p>
              {prediction.profitStrategy && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <span className="font-bold shrink-0 text-emerald-700">💡 استراتيجية الربح الموصى بها:</span>
                  <span>{prediction.profitStrategy}</span>
                </div>
              )}
            </div>
          )}

          {/* Master Quantitative Matrix Table */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/70">
              <div>
                <h3 className="font-extrabold text-neutral-900 text-md flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  مصفوفة القياس الكمّي والإحصائي الكاملة
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  مقارنة رقمية دقيقة لمؤشرات السرعة، القوة، احتمالات مونتي كارلو، ومجال الثقة 95% لكافة المتسابقين.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                {onGeneratePrediction && (
                  <button
                    onClick={onGeneratePrediction}
                    disabled={predictionLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{predictionLoading ? "جارِ التحليل الحسابي..." : "توليد التوقعات الرقمية"}</span>
                  </button>
                )}
                <span className="text-xs text-neutral-400 font-medium">
                  انقر على أي عمود للترتيب
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-100/70 text-neutral-700 font-bold border-b select-none">
              <tr>
                <th className="py-3.5 px-4">الحصان</th>
                <th 
                  onClick={() => handleSort("speedRatingKm")}
                  className="py-3.5 px-3 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>معدل السرعة (Km)</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("classPowerIndex")}
                  className="py-3.5 px-3 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>مؤشر الفئة (Class)</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("winProb")}
                  className="py-3.5 px-3 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>احتمال الفوز %</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("top3Prob")}
                  className="py-3.5 px-3 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>المراكز 3 الأولى %</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3.5 px-3">مجال الثقة (95% CI)</th>
                <th 
                  onClick={() => handleSort("distanceSuitability")}
                  className="py-3.5 px-3 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ملاءمة المسافة</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("valueIndex")}
                  className="py-3.5 px-3 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>القيمة (EV)</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("profitSafetyScore")}
                  className="py-3.5 px-3 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>الأمان المالي</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("quantitativeScore")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-neutral-200 transition-colors text-left"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>التقييم الكمي</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedMetrics.map((m, idx) => (
                <tr key={m.numPmu} className={cn("hover:bg-indigo-50/40 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-neutral-50/40")}>
                  {/* Horse Info */}
                  <td className="py-3 px-4 flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-neutral-900 text-white rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {m.numPmu}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-neutral-900 block truncate max-w-[130px]">{m.nom}</span>
                      <span className="text-[10px] text-neutral-400">{m.ferrageCode} • {m.runningStyleLabel.split(" ")[0]}</span>
                    </div>
                  </td>

                  {/* Speed */}
                  <td className="py-3 px-3 font-mono font-bold text-neutral-700">
                    {m.speedRatingKm}
                  </td>

                  {/* Class Power */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${m.classPowerIndex}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-neutral-700">{m.classPowerIndex}</span>
                    </div>
                  </td>

                  {/* Win Prob */}
                  <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                    {m.winProb}%
                  </td>

                  {/* Top 3 Prob */}
                  <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                    {m.top3Prob}%
                  </td>

                  {/* 95% Confidence Interval */}
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border">
                      [{m.confidenceInterval[0]} - {m.confidenceInterval[1]}]
                    </span>
                  </td>

                  {/* Distance Suitability */}
                  <td className="py-3 px-3">
                    <span className={cn(
                      "font-mono font-bold text-[11px] px-2 py-0.5 rounded-full border",
                      (m.distanceSuitability || 50) >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      (m.distanceSuitability || 50) <= 40 ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-neutral-50 text-neutral-600 border-neutral-200"
                    )}>
                      {m.distanceSuitability || 50}/100
                    </span>
                  </td>

                  {/* Value Index */}
                  <td className="py-3 px-3 font-mono font-bold">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[11px]",
                      m.valueIndex >= 1.2 ? "bg-amber-100 text-amber-800" : "text-neutral-500"
                    )}>
                      {m.valueIndex}x
                    </span>
                  </td>

                  {/* Profit Safety Score */}
                  <td className="py-3 px-3">
                    <span className={cn(
                      "font-mono font-bold text-[11px] px-2 py-0.5 rounded-full",
                      m.profitSafetyScore >= 75 ? "bg-emerald-100 text-emerald-800 font-black" :
                      m.profitSafetyScore >= 50 ? "bg-indigo-100 text-indigo-800" :
                      "bg-neutral-100 text-neutral-600"
                    )}>
                      {m.profitSafetyScore}%
                    </span>
                  </td>

                  {/* Quantitative Score */}
                  <td className="py-3 px-4 text-left">
                    <span className="font-black text-sm text-indigo-900 font-mono">
                      {m.quantitativeScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
  );
}
