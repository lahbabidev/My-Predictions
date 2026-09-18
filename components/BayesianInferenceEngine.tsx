"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  HorseAnalysisMetrics, 
  TacticalRaceScenario, 
  BayesianCheckpointId, 
  BAYESIAN_CHECKPOINTS,
  LiveHorseEvidence,
  LiveBayesianState,
  InRacePosition,
  InRaceEnergy,
  InRaceStrideStatus,
  POSITION_DEFINITIONS,
  ENERGY_DEFINITIONS,
  STRIDE_DEFINITIONS,
  updateBayesianInference,
  generatePresetCheckpointEvidence,
  EnvironmentConditions,
  DEFAULT_ENVIRONMENT,
  ENVIRONMENT_PRESETS,
  TRACK_DEFINITIONS,
  WEATHER_DEFINITIONS,
  TrackConditionType,
  WeatherConditionType
} from "@/lib/analyticalEngine";
import { PMURace } from "@/types/pmu";
import { cn } from "@/lib/utils";
import { 
  Radio, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert,
  Flame,
  Info,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Sun,
  CloudRain,
  Thermometer,
  Droplets,
  Wind
} from "lucide-react";
import ConditionalPositionMatrixTable from "@/components/ConditionalPositionMatrixTable";

interface BayesianInferenceEngineProps {
  metrics: HorseAnalysisMetrics[];
  raceInfo: PMURace;
  scenario?: TacticalRaceScenario | null;
}

export default function BayesianInferenceEngine({
  metrics,
  raceInfo,
  scenario
}: BayesianInferenceEngineProps) {
  const [activeEngineView, setActiveEngineView] = useState<"matrix" | "telemetry">("matrix");
  const [currentCheckpoint, setCurrentCheckpoint] = useState<BayesianCheckpointId>("T0_PRE");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [customEvidences, setCustomEvidences] = useState<Record<number, LiveHorseEvidence>>(() => 
    generatePresetCheckpointEvidence(metrics, "T0_PRE", scenario)
  );
  const [selectedHorseNum, setSelectedHorseNum] = useState<number>(metrics[0]?.numPmu || 1);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [environment, setEnvironment] = useState<EnvironmentConditions>(DEFAULT_ENVIRONMENT);

  // Playback stream timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep a map of prior probabilities; at T0 it's baseline ensembleProb
  const baselinePriorMap = useMemo(() => {
    const map: Record<number, number> = {};
    metrics.forEach(m => {
      map[m.numPmu] = m.ensembleProb;
    });
    return map;
  }, [metrics]);

  // Handle checkpoint transitions
  const handleCheckpointSelect = (checkpointId: BayesianCheckpointId) => {
    setCurrentCheckpoint(checkpointId);
    setCustomEvidences(generatePresetCheckpointEvidence(metrics, checkpointId, scenario));
  };

  // Run Bayesian inference calculation for the current state incorporating independent environmental factors
  const bayesianStates: Record<number, LiveBayesianState> = useMemo(() => {
    return updateBayesianInference(
      metrics,
      baselinePriorMap,
      customEvidences,
      currentCheckpoint,
      scenario?.paceType || "EQUILIBRE",
      environment
    );
  }, [metrics, baselinePriorMap, customEvidences, currentCheckpoint, scenario, environment]);

  // Sorted horses by current posterior / win probability
  const rankedHorses = useMemo(() => {
    return Object.values(bayesianStates).sort((a, b) => b.posteriorProb - a.posteriorProb);
  }, [bayesianStates]);

  // Live streaming simulation playback
  useEffect(() => {
    if (isPlaying) {
      const order: BayesianCheckpointId[] = ["T0_PRE", "T1_START", "T2_MID", "T3_TURN", "T4_FINAL"];
      const currentIndex = order.indexOf(currentCheckpoint);

      timerRef.current = setTimeout(() => {
        if (currentIndex < order.length - 1) {
          const nextCp = order[currentIndex + 1];
          setCurrentCheckpoint(nextCp);
          setCustomEvidences(generatePresetCheckpointEvidence(metrics, nextCp, scenario));
        } else {
          setIsPlaying(false);
        }
      }, 3200);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentCheckpoint, metrics, scenario]);

  // Direct Evidence Incident Triggers
  const applyQuickIncident = (numPmu: number, type: "DISQUALIFY" | "FULL_ATTACK" | "BOXED" | "RESET") => {
    setCustomEvidences(prev => {
      const current = prev[numPmu] || {
        numPmu,
        position: "MID_PACK_WAITING",
        energy: "COMFORTABLE",
        stride: "REGULAR_PERFECT"
      };

      if (type === "DISQUALIFY") {
        return {
          ...prev,
          [numPmu]: {
            ...current,
            stride: "DISQUALIFIED",
            energy: "EXHAUSTED",
            liveIncidentNote: "🛑 إقصاء فوري لارتكاب خطأ في الخطوة (DAI / Galop)"
          }
        };
      } else if (type === "FULL_ATTACK") {
        return {
          ...prev,
          [numPmu]: {
            ...current,
            position: "POCKET_COVERED",
            energy: "FULL_RESOURCES",
            stride: "REGULAR_PERFECT",
            liveIncidentNote: "⚡ هجوم كاسح وتسارع استثنائي بكامل طاقة الدفع"
          }
        };
      } else if (type === "BOXED") {
        return {
          ...prev,
          [numPmu]: {
            ...current,
            position: "TRAPPED_BOXED",
            energy: "EARLY_PRESSURE",
            liveIncidentNote: "🔒 محاصر ومغلق عليه تماماً على الحبلة الداخلية"
          }
        };
      } else {
        const resetPresets = generatePresetCheckpointEvidence(metrics, currentCheckpoint, scenario);
        return {
          ...prev,
          [numPmu]: resetPresets[numPmu]
        };
      }
    });
  };

  const selectedHorseState = bayesianStates[selectedHorseNum] || rankedHorses[0];
  const selectedMetric = metrics.find(m => m.numPmu === selectedHorseNum) || metrics[0];

  return (
    <div className="space-y-6">
      {/* Header Banner & Live Stream Controls */}
      <div className="bg-neutral-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-neutral-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">
                <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                BAYESIAN INFERENCE ENGINE v3.2
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {raceInfo.discipline} • {raceInfo.distance}m
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              محرك الاستدلال البايزي اللحظي أثناء السباق
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
              تحديث ديناميكي للاحتمالات الرياضية عند كل منعرج ونقطة قياس عبر معادلة بايز:
              <span className="text-indigo-300 font-mono font-bold mx-1.5 text-xs inline-block dir-ltr">
                P(H|E) = [P(H) × L(E|H)] / P(E)
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm",
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>إيقاف البث الحي المؤقت</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>بدء محاكاة البث اللحظي (Live Stream)</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                handleCheckpointSelect("T0_PRE");
              }}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-bold transition-colors flex items-center gap-1.5"
              title="إعادة ضبط إلى نقطة البداية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>

            <button
              onClick={() => setShowFormulaModal(!showFormulaModal)}
              className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-300 text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5" />
              <span>المعادلة البايزية</span>
            </button>
          </div>
        </div>

        {/* Checkpoint Milestone Selector Timeline */}
        <div className="mt-6 pt-5 border-t border-neutral-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {BAYESIAN_CHECKPOINTS.map((cp, idx) => {
              const isActive = currentCheckpoint === cp.id;
              return (
                <button
                  key={cp.id}
                  onClick={() => {
                    setIsPlaying(false);
                    handleCheckpointSelect(cp.id);
                  }}
                  className={cn(
                    "p-3 rounded-xl text-right transition-all border text-xs relative",
                    isActive
                      ? "bg-indigo-600/90 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-500/40"
                      : "bg-neutral-800/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-neutral-400">
                      T{idx} • {Math.round(cp.fractionRemaining * 100)}% متبقي
                    </span>
                    {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                  </div>
                  <h4 className="font-extrabold text-sm">{cp.label}</h4>
                  <p className="text-[11px] text-neutral-300 truncate mt-0.5">{cp.subLabel}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-neutral-400 flex items-center gap-2 bg-neutral-800/40 p-2.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
            <span>
              {BAYESIAN_CHECKPOINTS.find(c => c.id === currentCheckpoint)?.description}
            </span>
          </div>
        </div>
      </div>

      {/* Formula Explanation Callout (Togglable) */}
      {showFormulaModal && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-2xl p-5 text-neutral-200 text-xs sm:text-sm leading-relaxed space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-indigo-300 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              كيف يعمل الاستدلال البايزي في تحديث احتمالات فوز كل حصان؟
            </h4>
            <button 
              onClick={() => setShowFormulaModal(false)}
              className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5"
            >
              إغلاق ✕
            </button>
          </div>
          <p>
            تعتمد المنظومة على نظرية الاحتمال الشرطي لتحديث الاعتقاد الرياضي (<span className="font-mono text-indigo-300 font-bold">Posterior</span>) فور رصد أي دليل أو واقعة ميدانية (<span className="font-mono text-indigo-300 font-bold">Evidence E</span>):
          </p>
          <div className="bg-neutral-950 p-3.5 rounded-xl font-mono text-xs text-center text-emerald-400 border border-neutral-800 dir-ltr">
            P(H_i | E_t) = [ P(H_i | E_t-1) × L(E_t | H_i) ] ÷ ∑ [ P(H_j | E_t-1) × L(E_t | H_j) ]
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
              <strong className="text-white block mb-0.5">1. الاحتمال القبلي P(H):</strong>
              <span>معدل جاهزية الخيل التأسيسية من نماذج التعلم الآلي وقوة الفئة.</span>
            </div>
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
              <strong className="text-white block mb-0.5">2. دالة الإمكان L(E|H):</strong>
              <span>مضروب دالات التموضع التكتيكي، وفرة الأكسجين، وسلامة الخطوة.</span>
            </div>
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
              <strong className="text-white block mb-0.5">3. الاحتمال البعدي P(H|E):</strong>
              <span>الاحتمال المعاير بعد توحيد مجموع الاحتمالات لجميع المتسابقين إلى 100%.</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Independent Environmental Control Center (Weather & Track Station) */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-black text-sm text-neutral-900">
                لوحة التحكم بالمتغيرات البيئية المستقلة (Weather & Track Station)
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                تعديل العوامل المناخية وميكانيكا التربة لتحديث دالات الإمكان والاضطرار الرياضي لكل جواد بشكل فوري
              </p>
            </div>
          </div>
          <span className="bg-indigo-50 text-indigo-700 font-mono text-[10px] font-black px-2.5 py-1 rounded-lg border border-indigo-200 self-start sm:self-auto">
            مستقلة بالكامل • Independent Bayesian Variables
          </span>
        </div>

        {/* Quick Presets row */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-neutral-400 block">
            سيناريوهات جوية ومضمارية جاهزة (Quick Presets):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ENVIRONMENT_PRESETS.map((preset) => {
              const isActive = environment.presetName === preset.name;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setEnvironment({ ...preset.env, presetName: preset.name })}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl font-extrabold transition-all border flex items-center gap-1.5",
                    isActive
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                      : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  {preset.name.includes("ربيعي") && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  {preset.name.includes("أمطار") && <CloudRain className="w-3.5 h-3.5 text-blue-500" />}
                  {preset.name.includes("حرارة") && <Thermometer className="w-3.5 h-3.5 text-rose-500" />}
                  {preset.name.includes("رياح") && <Wind className="w-3.5 h-3.5 text-slate-500" />}
                  {preset.name.includes("رملي") && <Layers className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time slider and selector grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          {/* Track Condition Select */}
          <div className="space-y-1.5 bg-neutral-50 p-3 rounded-xl border">
            <label className="text-[11px] font-extrabold text-neutral-600 block">
              نوع وحالة الأرضية (Track Soil Type):
            </label>
            <select
              value={environment.track}
              onChange={(e) => {
                const val = e.target.value as TrackConditionType;
                setEnvironment(prev => ({
                  ...prev,
                  track: val,
                  presetName: "مخصص 🛠️"
                }));
              }}
              className="w-full text-xs font-bold bg-white border rounded-lg p-2 text-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {Object.entries(TRACK_DEFINITIONS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label} (Pén: {item.penetrometreRange})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-500 leading-relaxed pt-1">
              {TRACK_DEFINITIONS[environment.track]?.description}
            </p>
          </div>

          {/* Weather Condition Select */}
          <div className="space-y-1.5 bg-neutral-50 p-3 rounded-xl border">
            <label className="text-[11px] font-extrabold text-neutral-600 block">
              الطقس السائد (Atmospheric State):
            </label>
            <select
              value={environment.weather}
              onChange={(e) => {
                const val = e.target.value as WeatherConditionType;
                setEnvironment(prev => ({
                  ...prev,
                  weather: val,
                  presetName: "مخصص 🛠️"
                }));
              }}
              className="w-full text-xs font-bold bg-white border rounded-lg p-2 text-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {Object.entries(WEATHER_DEFINITIONS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-500 leading-relaxed pt-1">
              {WEATHER_DEFINITIONS[environment.weather]?.description}
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2 bg-neutral-50 p-3 rounded-xl border">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-neutral-600">
              <span>درجة الحرارة (°C):</span>
              <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                {environment.temperatureC}°C
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="38"
              value={environment.temperatureC}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setEnvironment(prev => ({
                  ...prev,
                  temperatureC: val,
                  presetName: "مخصص 🛠️"
                }));
              }}
              className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
              <span>بارد (4°C)</span>
              <span>لاهب (38°C)</span>
            </div>
          </div>

          {/* Humidity Slider */}
          <div className="space-y-2 bg-neutral-50 p-3 rounded-xl border">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-neutral-600">
              <span>نسبة الرطوبة (%):</span>
              <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                {environment.humidityPercent}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="95"
              value={environment.humidityPercent}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setEnvironment(prev => ({
                  ...prev,
                  humidityPercent: val,
                  presetName: "مخصص 🛠️"
                }));
              }}
              className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
              <span>جاف جداً (20%)</span>
              <span>مشبع (95%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Engine View Switcher: Matrix vs In-Race Telemetry */}
      <div className="flex bg-neutral-100 p-1.5 rounded-2xl border gap-1.5 shadow-xs">
        <button
          onClick={() => setActiveEngineView("matrix")}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2",
            activeEngineView === "matrix"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900 bg-transparent"
          )}
        >
          <Layers className="w-4 h-4 text-emerald-300" />
          <span>مصفوفة الاحتمالات الشرطية للمراكز (Quinté+ Désordre Matrix)</span>
          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            ترقية بايزية خماسية
          </span>
        </button>

        <button
          onClick={() => setActiveEngineView("telemetry")}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2",
            activeEngineView === "telemetry"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900 bg-transparent"
          )}
        >
          <Radio className={cn("w-4 h-4", activeEngineView === "telemetry" ? "text-indigo-400 animate-pulse" : "text-neutral-400")} />
          <span>محاكاة مسار السباق اللحظي وتعديل الأدلة (Telemetry & Incidents)</span>
        </button>
      </div>

      {activeEngineView === "matrix" ? (
        <ConditionalPositionMatrixTable
          metrics={metrics}
          scenario={scenario}
          liveEvidences={customEvidences}
          currentCheckpoint={currentCheckpoint}
          selectedHorseNum={selectedHorseNum}
          onSelectHorse={(num) => setSelectedHorseNum(num)}
          environment={environment}
        />
      ) : (
        <>
          {/* Live Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rankedHorses.slice(0, 3).map((horse, idx) => {
          const metric = metrics.find(m => m.numPmu === horse.numPmu);
          const isWinner = idx === 0;
          return (
            <div 
              key={horse.numPmu}
              className={cn(
                "rounded-2xl p-5 border relative overflow-hidden transition-all",
                isWinner 
                  ? "bg-gradient-to-br from-amber-50 to-white border-amber-300 shadow-md"
                  : "bg-white border-neutral-200 shadow-sm"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl font-black text-base flex items-center justify-center font-mono shadow-sm",
                    isWinner ? "bg-amber-400 text-neutral-950" : "bg-neutral-900 text-white"
                  )}>
                    {horse.numPmu}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block">
                      {idx === 0 ? "🥇 المركز الأول البايزي" : idx === 1 ? "🥈 المركز الثاني البايزي" : "🥉 المركز الثالث البايزي"}
                    </span>
                    <h3 className="font-extrabold text-neutral-900 text-sm truncate max-w-[130px]">
                      {horse.nom}
                    </h3>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-xs font-mono font-black text-indigo-700 block">
                    {horse.winProb}%
                  </span>
                  <span className={cn(
                    "text-[10px] font-mono font-bold flex items-center gap-0.5 justify-end",
                    horse.probDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {horse.probDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {horse.probDelta >= 0 ? `+${horse.probDelta}%` : `${horse.probDelta}%`}
                  </span>
                </div>
              </div>

              {/* Progress Bar of Posterior */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                  <span>احتمال الوصول الثلاثي</span>
                  <span className="font-mono font-bold text-neutral-700">{horse.top3Prob}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isWinner ? "bg-amber-500" : "bg-indigo-600"
                    )}
                    style={{ width: `${Math.min(100, horse.top3Prob)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">التموضع اللحظي:</span>
                <span className="font-bold text-neutral-800">
                  {POSITION_DEFINITIONS[horse.evidence.position]?.label.split("(")[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Bayesian Interactive Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Bayesian Participant Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/70">
            <div>
              <h3 className="font-black text-neutral-900 text-sm sm:text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                تحديث الاحتمالات البايزية اللحظية لجميع الخيول
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                انقر على أي حصان لتعديل أدلة أدائه أو تجربة سيناريو واقعة ميدانية.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-[11px]">LIVE SYNC</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-100/80 text-neutral-700 font-bold border-b select-none">
                <tr>
                  <th className="py-3.5 px-4">الحصان</th>
                  <th className="py-3.5 px-3">الترتيب البايزي</th>
                  <th className="py-3.5 px-3">الاحتمال القبلي P(H)</th>
                  <th className="py-3.5 px-3">دالة الإمكان L(E|H)</th>
                  <th className="py-3.5 px-3">الاحتمال البعدي P(H|E)</th>
                  <th className="py-3.5 px-3">الفارق التراكمي (Δ)</th>
                  <th className="py-3.5 px-4 text-left">قيمة الرهان (EV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rankedHorses.map((horse) => {
                  const isSelected = horse.numPmu === selectedHorseNum;
                  const isDisqualified = horse.evidence.stride === "DISQUALIFIED";

                  return (
                    <tr 
                      key={horse.numPmu}
                      onClick={() => setSelectedHorseNum(horse.numPmu)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-indigo-50/70 font-semibold" 
                          : "hover:bg-neutral-50/70",
                        isDisqualified && "opacity-50 line-through bg-rose-50/30"
                      )}
                    >
                      {/* Horse Number & Name */}
                      <td className="py-3 px-4 flex items-center gap-2.5">
                        <span className={cn(
                          "w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0",
                          isSelected ? "bg-indigo-700 text-white" : "bg-neutral-900 text-white"
                        )}>
                          {horse.numPmu}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-neutral-900 block truncate max-w-[120px]">
                            {horse.nom}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {horse.evidence.position === "TRAPPED_BOXED" ? "🔒 محاصر" :
                             horse.evidence.position === "LEADER_RAIL" ? "⭐ متصدر" :
                             horse.evidence.position === "POCKET_COVERED" ? "🎯 في الظهر" :
                             horse.evidence.energy === "FULL_RESOURCES" ? "⚡ طاقة وافرة" : "عادي"}
                          </span>
                        </div>
                      </td>

                      {/* Live Rank */}
                      <td className="py-3 px-3">
                        <span className={cn(
                          "font-mono font-bold px-2 py-0.5 rounded text-[11px]",
                          horse.liveRank === 1 ? "bg-amber-100 text-amber-900 font-black" :
                          horse.liveRank <= 3 ? "bg-emerald-100 text-emerald-800" :
                          "bg-neutral-100 text-neutral-600"
                        )}>
                          #{horse.liveRank}
                        </span>
                      </td>

                      {/* Prior Prob P(H) */}
                      <td className="py-3 px-3 font-mono text-neutral-600">
                        {Math.round(horse.priorProb * 1000) / 10}%
                      </td>

                      {/* Likelihood L(E|H) */}
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[11px]",
                          horse.likelihood >= 1.3 ? "text-emerald-700 bg-emerald-50" :
                          horse.likelihood <= 0.5 ? "text-rose-700 bg-rose-50" :
                          "text-neutral-700 bg-neutral-100"
                        )}>
                          x{horse.likelihood}
                        </span>
                      </td>

                      {/* Posterior Prob P(H|E) */}
                      <td className="py-3 px-3 font-mono font-black text-sm text-neutral-900">
                        {horse.winProb}%
                      </td>

                      {/* Prob Delta */}
                      <td className="py-3 px-3 font-mono text-xs">
                        <span className={cn(
                          "inline-flex items-center gap-0.5 font-bold",
                          horse.probDelta > 0 ? "text-emerald-600" : 
                          horse.probDelta < 0 ? "text-rose-600" : "text-neutral-400"
                        )}>
                          {horse.probDelta > 0 ? `+${horse.probDelta}%` : `${horse.probDelta}%`}
                        </span>
                      </td>

                      {/* Live Value Index */}
                      <td className="py-3 px-4 text-left font-mono">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-bold",
                          horse.liveValueIndex >= 1.25 ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          horse.liveValueIndex <= 0.8 ? "text-neutral-400" :
                          "bg-neutral-100 text-neutral-700"
                        )}>
                          {horse.liveValueIndex}x EV
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Interactive Telemetry & Incident Studio */}
        <div className="space-y-4">
          {/* Active Horse Telemetry Inspector */}
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-neutral-900 text-sm">
                  معدِّل الأدلة اللحظية (Live Evidence)
                </h3>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-900 text-white px-2 py-1 rounded-lg text-xs font-mono font-bold">
                #{selectedHorseState.numPmu} {selectedHorseState.nom}
              </div>
            </div>

            {/* Note banner if present */}
            {selectedHorseState.evidence.liveIncidentNote && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium leading-relaxed">
                {selectedHorseState.evidence.liveIncidentNote}
              </div>
            )}

            {/* In-Race Position Selector */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">
                موقع الحصان في المضمار (Position Factor):
              </label>
              <select
                value={selectedHorseState.evidence.position}
                onChange={(e) => {
                  const newPos = e.target.value as InRacePosition;
                  setCustomEvidences(prev => ({
                    ...prev,
                    [selectedHorseNum]: {
                      ...prev[selectedHorseNum],
                      position: newPos
                    }
                  }));
                }}
                className="w-full text-xs font-bold bg-neutral-50 border rounded-xl p-2.5 text-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {Object.entries(POSITION_DEFINITIONS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label} (×{val.factor})
                  </option>
                ))}
              </select>
            </div>

            {/* Energy Reserves */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">
                حالة مخزون الطاقة والجهد (Energy Factor):
              </label>
              <select
                value={selectedHorseState.evidence.energy}
                onChange={(e) => {
                  const newEnergy = e.target.value as InRaceEnergy;
                  setCustomEvidences(prev => ({
                    ...prev,
                    [selectedHorseNum]: {
                      ...prev[selectedHorseNum],
                      energy: newEnergy
                    }
                  }));
                }}
                className="w-full text-xs font-bold bg-neutral-50 border rounded-xl p-2.5 text-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {Object.entries(ENERGY_DEFINITIONS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label} (×{val.factor})
                  </option>
                ))}
              </select>
            </div>

            {/* Stride Status */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">
                سلامة الخطوة والإيقاع (Stride Factor):
              </label>
              <select
                value={selectedHorseState.evidence.stride}
                onChange={(e) => {
                  const newStride = e.target.value as InRaceStrideStatus;
                  setCustomEvidences(prev => ({
                    ...prev,
                    [selectedHorseNum]: {
                      ...prev[selectedHorseNum],
                      stride: newStride
                    }
                  }));
                }}
                className="w-full text-xs font-bold bg-neutral-50 border rounded-xl p-2.5 text-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {Object.entries(STRIDE_DEFINITIONS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label} (×{val.factor})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick In-Race Incident Buttons */}
            <div className="pt-2 border-t space-y-2">
              <span className="text-[11px] font-bold text-neutral-400 block">
                تطبيق وقائع ميدانية سريعة على #{selectedHorseNum}:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyQuickIncident(selectedHorseNum, "FULL_ATTACK")}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Flame className="w-3.5 h-3.5 text-emerald-600" />
                  <span>هجوم كاسح</span>
                </button>

                <button
                  onClick={() => applyQuickIncident(selectedHorseNum, "BOXED")}
                  className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition-colors flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>محاصرة تامة</span>
                </button>

                <button
                  onClick={() => applyQuickIncident(selectedHorseNum, "DISQUALIFY")}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold border border-rose-200 transition-colors flex items-center justify-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>إقصاء (DAI)</span>
                </button>

                <button
                  onClick={() => applyQuickIncident(selectedHorseNum, "RESET")}
                  className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة التلقائي</span>
                </button>
              </div>
            </div>
          </div>

          {/* Likelihood Decomposition Card */}
          <div className="bg-neutral-900 text-white rounded-2xl p-5 border border-neutral-800 space-y-3">
            <h4 className="font-extrabold text-xs text-neutral-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              تفكيك دالة الإمكان اللحظية L(E|H)
            </h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-neutral-300">
                <span>معامل التموضع التكتيكي:</span>
                <span className="font-mono font-bold text-white">
                  ×{selectedHorseState.likelihoodBreakdown.positionFactor}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span>معامل كفاءة الطاقة:</span>
                <span className="font-mono font-bold text-white">
                  ×{selectedHorseState.likelihoodBreakdown.energyFactor}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span>معامل سلامة الخطوة:</span>
                <span className="font-mono font-bold text-white">
                  ×{selectedHorseState.likelihoodBreakdown.strideFactor}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span>الملاءمة مع نسق السباق:</span>
                <span className="font-mono font-bold text-white">
                  ×{selectedHorseState.likelihoodBreakdown.tacticalSynergy}
                </span>
              </div>
              
              {/* Independent Environmental Variables */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>ملاءمة نوع الأرضية (Terrain L_t):</span>
                  </span>
                  <span className="font-mono font-bold text-blue-300">
                    ×{selectedHorseState.likelihoodBreakdown.terrainFactor ?? 1.0}
                  </span>
                </div>
                {selectedHorseState.environmentImpact?.terrainExplanation && (
                  <p className="text-[10px] text-neutral-400 leading-relaxed text-right pr-4 italic">
                    {selectedHorseState.environmentImpact.terrainExplanation}
                  </p>
                )}

                <div className="flex justify-between items-center text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>ملاءمة حالة الطقس (Weather L_w):</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    ×{selectedHorseState.likelihoodBreakdown.weatherFactor ?? 1.0}
                  </span>
                </div>
                {selectedHorseState.environmentImpact?.weatherExplanation && (
                  <p className="text-[10px] text-neutral-400 leading-relaxed text-right pr-4 italic">
                    {selectedHorseState.environmentImpact.weatherExplanation}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-neutral-800 flex justify-between items-center font-bold">
                <span className="text-amber-300">مجموع الإمكان الإجمالي L:</span>
                <span className="font-mono text-sm text-emerald-400">
                  ×{selectedHorseState.likelihood}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
}
