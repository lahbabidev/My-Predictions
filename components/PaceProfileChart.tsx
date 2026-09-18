"use client";

import React, { useState, useMemo } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  HorseAnalysisMetrics, 
  TacticalRaceScenario, 
  computePaceProfiles, 
  HorsePaceProfile 
} from "@/lib/analyticalEngine";
import { cn } from "@/lib/utils";
import { 
  Gauge, 
  Flame, 
  Zap, 
  TrendingUp, 
  Activity, 
  Check, 
  Info, 
  Compass, 
  BatteryCharging 
} from "lucide-react";

interface PaceProfileChartProps {
  metrics: HorseAnalysisMetrics[];
  scenario?: TacticalRaceScenario | null;
}

const HORSE_COLORS = [
  "#4f46e5", // Indigo (Top 1)
  "#059669", // Emerald (Top 2)
  "#d97706", // Amber (Top 3)
  "#e11d48", // Rose (Top 4)
  "#7c3aed", // Purple (Top 5)
  "#0284c7", // Sky
  "#ea580c", // Orange
  "#475569"  // Slate
];

export default function PaceProfileChart({
  metrics,
  scenario
}: PaceProfileChartProps) {
  // Sort horses by tactical strength to pick top 5 by default
  const sortedHorses = useMemo(() => {
    return [...metrics].sort((a, b) => b.tacticalScore - a.tacticalScore);
  }, [metrics]);

  // Compute Pace Profiles for all horses
  const allProfiles = useMemo(() => {
    return computePaceProfiles(sortedHorses, scenario);
  }, [sortedHorses, scenario]);

  // Selected horse numbers (defaults to top 5)
  const [selectedNums, setSelectedNums] = useState<number[]>(() => {
    return sortedHorses.slice(0, 5).map(h => h.numPmu);
  });

  // Display mode: Real km/h vs Relative Index %
  const [viewMode, setViewMode] = useState<"kmh" | "index">("kmh");

  // Filter profiles for selected horses (max 5)
  const activeProfiles = useMemo(() => {
    return allProfiles.filter(p => selectedNums.includes(p.numPmu));
  }, [allProfiles, selectedNums]);

  // Transform data for Recharts (3 X-axis points: البداية, المنتصف, النهاية)
  const chartData = useMemo(() => {
    const stages: Array<{
      key: "start" | "middle" | "finish";
      name: string;
      sub: string;
    }> = [
      { key: "start", name: "البداية (الانطلاق)", sub: "0 - 30% من المسار" },
      { key: "middle", name: "المنتصف (المسار)", sub: "30% - 75% وتيرة الرحلة" },
      { key: "finish", name: "النهاية (الحسم)", sub: "آخر 400م السرعة القصوى" }
    ];

    return stages.map(st => {
      const dataPoint: Record<string, any> = {
        stageName: st.name,
        stageSub: st.sub,
        stageKey: st.key
      };

      activeProfiles.forEach(profile => {
        const stageData = profile.stages.find(s => s.stageKey === st.key);
        if (stageData) {
          dataPoint[`horse_${profile.numPmu}`] = viewMode === "kmh" 
            ? stageData.speedKmh 
            : stageData.speedIndex;
          dataPoint[`horse_${profile.numPmu}_info`] = {
            nom: profile.nom,
            style: profile.runningStyleLabel,
            note: stageData.tacticalNote,
            reserve: stageData.staminaReserve,
            kmh: stageData.speedKmh,
            index: stageData.speedIndex
          };
        }
      });

      return dataPoint;
    });
  }, [activeProfiles, viewMode]);

  // Toggle horse selection (limit to 5)
  const toggleHorseSelection = (num: number) => {
    if (selectedNums.includes(num)) {
      if (selectedNums.length > 1) {
        setSelectedNums(selectedNums.filter(n => n !== num));
      }
    } else {
      if (selectedNums.length < 5) {
        setSelectedNums([...selectedNums, num]);
      } else {
        // Replace last
        setSelectedNums([...selectedNums.slice(1), num]);
      }
    }
  };

  // Find standout pace performers among active profiles
  const fastestStarter = useMemo(() => {
    return [...activeProfiles].sort((a, b) => {
      const aStart = a.stages.find(s => s.stageKey === "start")?.speedKmh || 0;
      const bStart = b.stages.find(s => s.stageKey === "start")?.speedKmh || 0;
      return bStart - aStart;
    })[0];
  }, [activeProfiles]);

  const strongestFinisher = useMemo(() => {
    return [...activeProfiles].sort((a, b) => {
      const aFin = a.stages.find(s => s.stageKey === "finish")?.speedKmh || 0;
      const aStart = a.stages.find(s => s.stageKey === "start")?.speedKmh || 0;
      const bFin = b.stages.find(s => s.stageKey === "finish")?.speedKmh || 0;
      const bStart = b.stages.find(s => s.stageKey === "start")?.speedKmh || 0;
      return (bFin - bStart) - (aFin - aStart);
    })[0];
  }, [activeProfiles]);

  const bestEfficiency = useMemo(() => {
    return [...activeProfiles].sort((a, b) => b.staminaEfficiency - a.staminaEfficiency)[0];
  }, [activeProfiles]);

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6 space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-neutral-900 text-base sm:text-lg">
              منحنى توزيع السرعة التكتيكي (Pace Profile)
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
              3 Stages
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500">
            تحليل ديناميكي لسرعة الخيول الخمسة الأولى عبر مراحل السباق الثلاث (الانطلاقة، منتصف المسار، والحسم النهائي).
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl border self-start lg:self-auto">
          <button
            onClick={() => setViewMode("kmh")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              viewMode === "kmh" 
                ? "bg-white text-neutral-900 shadow-xs" 
                : "text-neutral-500 hover:text-neutral-800"
            )}
          >
            سرعة حقيقية (كم/س)
          </button>
          <button
            onClick={() => setViewMode("index")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              viewMode === "index" 
                ? "bg-white text-neutral-900 shadow-xs" 
                : "text-neutral-500 hover:text-neutral-800"
            )}
          >
            مؤشر التسارع النسبي (%)
          </button>
        </div>
      </div>

      {/* 2. Top 5 Horse Selector Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="font-semibold">الخيول المحددة في الرسم البياني (الخيول الـ 5 الأبرز تكتيكياً):</span>
          <span className="text-[11px]">محدد {selectedNums.length}/5 خيول</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedHorses.slice(0, 10).map((h) => {
            const isSelected = selectedNums.includes(h.numPmu);
            const colorIdx = selectedNums.indexOf(h.numPmu);
            const color = isSelected && colorIdx !== -1 ? HORSE_COLORS[colorIdx % HORSE_COLORS.length] : undefined;

            return (
              <button
                key={h.numPmu}
                onClick={() => toggleHorseSelection(h.numPmu)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                  isSelected
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                )}
              >
                <span 
                  className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[10px] font-black text-white shrink-0"
                  style={{ backgroundColor: color || "#737373" }}
                >
                  {h.numPmu}
                </span>
                <span className="truncate max-w-[100px]">{h.nom}</span>
                <span className="text-[10px] opacity-75 font-normal">({h.runningStyleLabel.split(" ")[0]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Recharts Line Chart Container */}
      <div className="h-[320px] sm:h-[350px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="stageName" 
              tick={{ fill: "#374151", fontSize: 12, fontWeight: "bold" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={false}
            />
            <YAxis 
              domain={viewMode === "kmh" ? ["dataMin - 1.5", "dataMax + 1.5"] : [90, 115]}
              tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "monospace" }}
              unit={viewMode === "kmh" ? " كم/س" : "%"}
              axisLine={false}
              tickLine={false}
              orientation="right"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-neutral-900 text-white rounded-xl p-3.5 shadow-xl border border-neutral-700 text-xs space-y-2.5 max-w-xs dir-rtl text-right">
                    <div className="border-b border-neutral-700 pb-1.5">
                      <span className="font-extrabold text-sm text-indigo-300 block">{label}</span>
                      <span className="text-[10px] text-neutral-400">
                        {payload[0]?.payload?.stageSub}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {payload.map((entry, index) => {
                        const horseNum = String(entry.dataKey || "").replace("horse_", "");
                        const info = entry.payload[`horse_${horseNum}_info`];
                        if (!info) return null;

                        return (
                          <div key={`entry-${horseNum}-${index}`} className="flex items-start justify-between gap-3 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="font-bold text-white truncate">
                                #{horseNum} {info.nom}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-emerald-400 shrink-0">
                              {viewMode === "kmh" ? `${info.kmh} كم/س` : `${info.index}%`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: any) => {
                const horseNum = String(value || "").replace("horse_", "");
                const profile = activeProfiles.find(p => p.numPmu.toString() === horseNum);
                return (
                  <span className="text-xs font-bold text-neutral-700 mx-1">
                    #{horseNum} {profile?.nom}
                  </span>
                );
              }}
            />
            {activeProfiles.map((profile, idx) => (
              <Line
                key={profile.numPmu}
                type="monotone"
                dataKey={`horse_${profile.numPmu}`}
                name={`horse_${profile.numPmu}`}
                stroke={HORSE_COLORS[idx % HORSE_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 5, fill: HORSE_COLORS[idx % HORSE_COLORS.length], strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7, strokeWidth: 0 }}
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Tactical Standout Benchmark Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Card 1: Strongest Finish Burst */}
        {strongestFinisher && (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                أقوى تسارع ختامي (Sprint Final):
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Finisseur
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-emerald-700 text-white font-mono font-black text-sm flex items-center justify-center shrink-0">
                {strongestFinisher.numPmu}
              </span>
              <div className="min-w-0">
                <h4 className="font-extrabold text-neutral-900 text-sm truncate">{strongestFinisher.nom}</h4>
                <p className="text-[11px] text-emerald-800 font-medium leading-snug mt-0.5">
                  سرعة الحسم: <strong className="font-mono">{strongestFinisher.stages[2].speedKmh} كم/س</strong> ({strongestFinisher.ferrageCode})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card 2: Fastest Early Pace */}
        {fastestStarter && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                أسرع انطلاقة ومبادرة (Fast Starter):
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Animateur
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-amber-600 text-white font-mono font-black text-sm flex items-center justify-center shrink-0">
                {fastestStarter.numPmu}
              </span>
              <div className="min-w-0">
                <h4 className="font-extrabold text-neutral-900 text-sm truncate">{fastestStarter.nom}</h4>
                <p className="text-[11px] text-amber-800 font-medium leading-snug mt-0.5">
                  سرعة الانطلاق: <strong className="font-mono">{fastestStarter.stages[0].speedKmh} كم/س</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Best Energy Efficiency */}
        {bestEfficiency && (
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-indigo-600" />
                أفضل إدارة واقتصاد للطاقة:
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Attentiste
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-indigo-700 text-white font-mono font-black text-sm flex items-center justify-center shrink-0">
                {bestEfficiency.numPmu}
              </span>
              <div className="min-w-0">
                <h4 className="font-extrabold text-neutral-900 text-sm truncate">{bestEfficiency.nom}</h4>
                <p className="text-[11px] text-indigo-800 font-medium leading-snug mt-0.5">
                  كفاءة الطاقة: <strong className="font-mono">{bestEfficiency.staminaEfficiency}%</strong> (حفظ المخزون)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detailed Tactical Breakdown Grid for Top 5 */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-right text-xs">
          <thead className="bg-neutral-100 text-neutral-700 font-bold border-b">
            <tr>
              <th className="py-3 px-4">الحصان</th>
              <th className="py-3 px-3">الأسلوب التكتيكي</th>
              <th className="py-3 px-3">الانطلاق (Départ)</th>
              <th className="py-3 px-3">المنتصف (Croisière)</th>
              <th className="py-3 px-3">الحسم (Sprint)</th>
              <th className="py-3 px-3">فارق التسارع (Δ)</th>
              <th className="py-3 px-4">التقييم التكتيكي للمراحل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {activeProfiles.map((p, idx) => {
              const startSpd = p.stages[0].speedKmh;
              const midSpd = p.stages[1].speedKmh;
              const finSpd = p.stages[2].speedKmh;
              const delta = Math.round((finSpd - startSpd) * 10) / 10;

              return (
                <tr key={p.numPmu} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-2.5">
                    <span 
                      className="w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: HORSE_COLORS[idx % HORSE_COLORS.length] }}
                    >
                      {p.numPmu}
                    </span>
                    <span className="font-bold text-neutral-900 truncate max-w-[130px]">{p.nom}</span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-neutral-700">
                    {p.runningStyleLabel.split(" ")[0]}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-neutral-800">
                    {startSpd} <span className="text-[10px] text-neutral-400 font-normal">كم/س</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-neutral-800">
                    {midSpd} <span className="text-[10px] text-neutral-400 font-normal">كم/س</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-indigo-700">
                    {finSpd} <span className="text-[10px] text-neutral-400 font-normal">كم/س</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-0.5",
                      delta > 0 ? "text-emerald-700 bg-emerald-50" : 
                      delta < 0 ? "text-rose-700 bg-rose-50" : "text-neutral-600 bg-neutral-100"
                    )}>
                      {delta > 0 ? `+${delta}` : delta} كم/س
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 text-[11px] max-w-xs leading-relaxed">
                    {p.tacticalSummary}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
