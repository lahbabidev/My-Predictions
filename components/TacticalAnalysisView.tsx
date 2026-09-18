"use client";

import React from "react";
import { HorseAnalysisMetrics, TacticalRaceScenario } from "@/lib/analyticalEngine";
import { PMURace } from "@/types/pmu";
import { cn } from "@/lib/utils";
import { Compass, Flame, ShieldAlert, Sparkles, Zap, Trophy, ChevronRight, Activity, ArrowUpRight } from "lucide-react";
import PaceProfileChart from "@/components/PaceProfileChart";
import TacticalFatigueRiskRewardView from "@/components/TacticalFatigueRiskRewardView";
import { BatteryCharging, Scale, Gauge } from "lucide-react";

interface TacticalAnalysisViewProps {
  metrics: HorseAnalysisMetrics[];
  scenario: TacticalRaceScenario;
  raceInfo: PMURace;
  prediction?: {
    tacticalAnalysis?: string;
    prediction?: number[];
    goldenBase?: number;
    analysis?: string;
  } | null;
  onGeneratePrediction?: () => void;
  predictionLoading?: boolean;
  onNavigateToSpeedBenchmark?: () => void;
}

export default function TacticalAnalysisView({
  metrics,
  scenario,
  raceInfo,
  prediction,
  onGeneratePrediction,
  predictionLoading,
  onNavigateToSpeedBenchmark
}: TacticalAnalysisViewProps) {
  // Sort horses by tactical score
  const sortedByTactical = [...metrics].sort((a, b) => b.tacticalScore - a.tacticalScore);
  const d4Horses = metrics.filter(m => m.ferrageCode === "D4");
  const dpHorses = metrics.filter(m => m.ferrageCode === "DP" || m.ferrageCode === "DA");

  return (
    <div className="space-y-6">
      {/* 1. Header & Race Pace Projection (سيناريو وتيرة السباق) */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">التحليل التكتيكي وسيناريو الشوط الحركي</h2>
                <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                  محاكاة تكتيكية
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                تتبع مسار السباق، صراع الصدارة، تأثير تصفيف الحوافر D4، وحسم المنعطف الأخير (Dernier Tournant).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-neutral-800/80 px-4 py-2 rounded-xl border border-neutral-700/60 self-start md:self-auto">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs text-neutral-300 font-semibold">إيقاع الشوط المتوقع:</span>
            <span className={cn(
              "text-xs font-black px-2 py-0.5 rounded-md",
              scenario.paceType === "RAPIDE" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
              scenario.paceType === "TACTIQUE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
              "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            )}>
              {scenario.paceTitle}
            </span>
          </div>
        </div>

        {/* Narrative Scenario */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 space-y-2">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              السيناريو الحركي المتوقع للشوط:
            </span>
            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
              {scenario.paceDescription}
            </p>
            <div className="pt-2 text-xs text-neutral-400 flex items-center gap-2">
              <span className="font-bold text-amber-400">توجيه المحترفين:</span>
              <span>{scenario.tacticalAdvice}</span>
            </div>
          </div>

          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                الركيزة التكتيكية الأكثر أماناً (Base Tactique):
              </span>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500 text-neutral-950 font-black text-xl rounded-xl flex items-center justify-center shadow-lg">
                  {scenario.goldenBase.numPmu}
                </div>
                <div>
                  <h4 className="font-black text-white text-sm truncate max-w-[150px]">{scenario.goldenBase.nom}</h4>
                  <span className="text-[11px] text-emerald-400 block font-semibold">{scenario.goldenBase.ferrageLabel}</span>
                  <span className="text-[10px] text-neutral-400">معامل الأمان التكتيكي: {scenario.goldenBase.profitSafetyScore}%</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 mt-2 block border-t border-neutral-700/50 pt-1.5">
              * أفضل قدرة على تثبيت وتيرة السباق وضمان التواجد بالمراكز الأولى.
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tactical Running Styles (توزيع الأدوار التكتيكية للخيل) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Leaders / Animateurs */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900">المبادرون / متصدرو الإيقاع</h3>
                <span className="text-[10px] text-neutral-500 font-medium">Animateurs de Course</span>
              </div>
            </div>
            <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {metrics.filter(m => m.runningStyle === "ANIMATEUR").length} خيول
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            الخيول التي تنطلق بقوة منذ البوابة للسيطرة على الحبلة الداخلية وفرض السرعة على بقية المتسابقين.
          </p>
          <div className="space-y-2 pt-1">
            {metrics.filter(m => m.runningStyle === "ANIMATEUR").slice(0, 4).map((h) => (
              <div key={h.numPmu} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border hover:bg-red-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center">
                    {h.numPmu}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block truncate max-w-[130px]">{h.nom}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{h.speedRatingKm} • {h.ferrageCode}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-red-600 block">{h.tacticalScore}/100</span>
                  <span className="text-[9px] text-neutral-400">قوة تكتيكية</span>
                </div>
              </div>
            ))}
            {metrics.filter(m => m.runningStyle === "ANIMATEUR").length === 0 && (
              <p className="text-xs text-neutral-400 text-center py-3">لا توجد خيول هجومية صريحة (سباق تكتيكي هادئ)</p>
            )}
          </div>
        </div>

        {/* Stalkers / Attentistes */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900">المتربصون في ظهر المقدمة</h3>
                <span className="text-[10px] text-neutral-500 font-medium">Attentistes Stratégiques</span>
              </div>
            </div>
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {metrics.filter(m => m.runningStyle === "ATTENTISTE").length} خيول
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            الخيول الذكية التي تختبئ خلف الصدارة مباشرة لحفظ الجهد وتنتظر فتح ثغرة بالمنعطف الأخير.
          </p>
          <div className="space-y-2 pt-1">
            {metrics.filter(m => m.runningStyle === "ATTENTISTE").slice(0, 4).map((h) => (
              <div key={h.numPmu} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border hover:bg-indigo-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 text-white font-bold text-xs flex items-center justify-center">
                    {h.numPmu}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block truncate max-w-[130px]">{h.nom}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{h.speedRatingKm} • {h.ferrageCode}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-indigo-600 block">{h.tacticalScore}/100</span>
                  <span className="text-[9px] text-neutral-400">قوة تكتيكية</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Closers / Finisseurs */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900">القادمون بسرعة نهائية خارقة</h3>
                <span className="text-[10px] text-neutral-500 font-medium">Finisseurs Redoutables</span>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {metrics.filter(m => m.runningStyle === "FINISSEUR").length} خيول
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            الخيول التي تملك أعتى تسارع في آخر 300 متر، وتنقض على الصدارة عند استنزاف المتصدرين لطاقتهم.
          </p>
          <div className="space-y-2 pt-1">
            {metrics.filter(m => m.runningStyle === "FINISSEUR").slice(0, 4).map((h) => (
              <div key={h.numPmu} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border hover:bg-emerald-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 text-white font-bold text-xs flex items-center justify-center">
                    {h.numPmu}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block truncate max-w-[130px]">{h.nom}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{h.speedRatingKm} • {h.ferrageCode}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-600 block">{h.winProb}% فوز</span>
                  <span className="text-[9px] text-neutral-400">احتمالية مونتي كارلو</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Pace Profile Chart (توزيع السرعة عبر مراحل السباق) */}
      <PaceProfileChart metrics={metrics} scenario={scenario} />

      {/* 4. D4 Ferrage / Déferrage Matrix (تأثير نزع الحوافر على الفوز) */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-neutral-900 text-md">كاشف تصفيف الحوافر (Déferrage D4 / DP / DA Matrix)</h3>
              <p className="text-xs text-neutral-500">في سباقات الخيل الفرنسية، نزع الحوافر D4 يمنح الخيل زيادة تصل إلى 20-30% في خفة الدفع وسرعة الكيلومتر.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
              {d4Horses.length} خيول حافية D4
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* D4 Group */}
          <div className="bg-gradient-to-r from-amber-50/60 to-amber-50/10 p-4 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                خيول D4 (حافية الأقدام الأربعة - أقصى جاهزية وتنافس):
              </span>
              <span className="text-[10px] font-bold text-amber-700">+15% بونص تسارع</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {d4Horses.map(h => (
                <div key={h.numPmu} className="bg-white px-3 py-2 rounded-xl border border-amber-300 shadow-xs flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-500 text-white font-black text-xs rounded-md flex items-center justify-center">
                    {h.numPmu}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">{h.nom}</span>
                    <span className="text-[9px] text-neutral-500 font-mono">Chrono: {h.speedRatingKm}</span>
                  </div>
                </div>
              ))}
              {d4Horses.length === 0 && (
                <span className="text-xs text-neutral-500 italic">لا توجد خيول D4 مسجلة في هذا الشوط</span>
              )}
            </div>
          </div>

          {/* DP / DA Group */}
          <div className="bg-neutral-50 p-4 rounded-xl border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-neutral-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                خيول DP / DA (حافية الخلفيين أو الأماميين):
              </span>
              <span className="text-[10px] font-bold text-indigo-700">+8% بونص تكتيكي</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {dpHorses.map(h => (
                <div key={h.numPmu} className="bg-white px-3 py-2 rounded-xl border border-neutral-200 shadow-xs flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-900 text-white font-black text-xs rounded-md flex items-center justify-center">
                    {h.numPmu}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">{h.nom}</span>
                    <span className="text-[9px] text-neutral-500">{h.ferrageCode}</span>
                  </div>
                </div>
              ))}
              {dpHorses.length === 0 && (
                <span className="text-xs text-neutral-500 italic">لا توجد خيول DP/DA مسجلة</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Fatigue Metrics & Risk/Reward Tactical Analysis View */}
      <TacticalFatigueRiskRewardView metrics={metrics} raceInfo={raceInfo} />

      {/* 4.5 Speed Benchmark Callout Banner (وحدة مقارنة السرعة القصوى مع أرقام المضمار) */}
      {onNavigateToSpeedBenchmark && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-neutral-900 text-white rounded-2xl p-5 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Gauge className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-white">وحدة مقارنة السرعة القصوى مع أفضل أداء في المضمار (آخر 6 أشهر)</h4>
                <span className="bg-cyan-500 text-neutral-950 font-black text-[9px] px-1.5 py-0.2 rounded">جديد</span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                جدول مقارنة فوري يقيس فارق السرعة (Delta Vitesse) والتوقيت الكيلومتري لخيول التوقعات مع أفضل توقيتات سجلها الفائزون في نفس المضمار.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToSpeedBenchmark}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-indigo-400/40 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm self-start sm:self-auto"
          >
            <span>فتح جدول المقارنة الفوري</span>
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}

      {/* 5. Tactical Predicted Finish Order (توقع النتيجة التكتيكية) */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h3 className="font-extrabold text-neutral-900 text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              توقع الوصول التكتيكي الدقيق للشوط
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              ترتيب الوصول النهائي المتوقع بناءً على توافق السرعة الحركية ومسار المنعطف الأخير وتوازن الطاقة البدنية.
            </p>
          </div>
          {onGeneratePrediction && !prediction && (
            <button
              onClick={onGeneratePrediction}
              disabled={predictionLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>تحديث التحليل بالذكاء الاصطناعي</span>
            </button>
          )}
        </div>

        {/* AI Tactical Report if generated */}
        {prediction?.tacticalAnalysis && (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs sm:text-sm text-indigo-950 leading-relaxed">
            <span className="font-black text-indigo-900 block mb-1.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-600" />
              التقرير التكتيكي الميداني للذكاء الاصطناعي:
            </span>
            <p>{prediction.tacticalAnalysis}</p>
          </div>
        )}

        {/* Tactical Order Visualization */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {sortedByTactical.slice(0, 5).map((horse, idx) => (
            <div 
              key={horse.numPmu}
              className={cn(
                "p-4 rounded-xl border text-center relative overflow-hidden transition-all",
                idx === 0 ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/30" :
                idx === 1 ? "bg-slate-50 border-slate-300" :
                idx === 2 ? "bg-orange-50/60 border-orange-300" :
                "bg-neutral-50 border-neutral-200"
              )}
            >
              <div className="absolute top-1.5 right-2 text-[10px] font-black text-neutral-400">
                المركز {idx + 1}
              </div>
              <div className="mt-3 w-12 h-12 mx-auto rounded-xl bg-neutral-900 text-white font-black text-xl flex items-center justify-center shadow-md">
                {horse.numPmu}
              </div>
              <h4 className="font-black text-sm text-neutral-900 mt-2 truncate">{horse.nom}</h4>
              <span className="text-[10px] font-bold text-indigo-700 block mt-0.5">{horse.runningStyleLabel.split(" ")[0]}</span>
              
              <div className="mt-2 pt-2 border-t border-neutral-200/80 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="font-mono">{horse.speedRatingKm}</span>
                  <span className="font-bold text-neutral-700">{horse.ferrageCode}</span>
                </div>
                {horse.fatigueMetrics && (
                  <div className="flex items-center justify-between font-bold pt-0.5 border-t border-neutral-200/40">
                    <span className="flex items-center gap-1 text-emerald-700" title="مخزون الطاقة المتبقية">
                      <BatteryCharging className="w-3 h-3" />
                      <span>{horse.fatigueMetrics.energyReservePct}%</span>
                    </span>
                    <span className="flex items-center gap-1 text-indigo-700 font-mono" title="تقييم المخاطرة / العائد">
                      <Scale className="w-3 h-3" />
                      <span>{horse.riskRewardMetrics?.score?.toFixed(1) || "7.0"}/10</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
