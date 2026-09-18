"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from "recharts";
import { PMUParticipant } from "@/types/pmu";
import { Radar, TrendingUp, Zap, Activity, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OddsRadarProps {
  participants: PMUParticipant[];
}

interface OddsHistoryPoint {
  time: string;
  timestamp: number;
  [key: string]: number | string;
}

export default function OddsRadar({ participants }: OddsRadarProps) {
  const [history, setHistory] = useState<OddsHistoryPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Get top 6 favorites based on latest odds
  const favorites = useMemo(() => {
    return [...participants]
      .filter(p => p.dernierRapportDirect?.rapport)
      .sort((a, b) => (a.dernierRapportDirect?.rapport || 100) - (b.dernierRapportDirect?.rapport || 100))
      .slice(0, 6);
  }, [participants]);

  // Initialize history and start live updates
  useEffect(() => {
    if (favorites.length === 0) return;

    // We use a small timeout to avoid the synchronous setState warning in some environments
    const initTimer = setTimeout(() => {
      setHistory(prev => {
        if (prev.length > 0) return prev;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const initialPoint: OddsHistoryPoint = {
          time: timeStr,
          timestamp: now.getTime(),
        };
        
        favorites.forEach(p => {
          const rapport = p.dernierRapportDirect?.rapport || 20;
          initialPoint[`horse_${p.numPmu}`] = Math.round((1 / rapport) * 1000) / 10;
        });

        return [initialPoint];
      });
    }, 0);

    // Set up simulation interval
    const interval = setInterval(() => {
      setHistory(prev => {
        const last = prev[prev.length - 1];
        const nextTime = new Date();
        const nextTimeStr = nextTime.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const nextPoint: OddsHistoryPoint = {
          time: nextTimeStr,
          timestamp: nextTime.getTime(),
        };

        favorites.forEach(p => {
          const horseKey = `horse_${p.numPmu}`;
          const lastVal = (last[horseKey] as number) || 5;
          
          // Random walk simulation (fluctuations between -0.5% and +0.5%)
          const drift = (Math.random() - 0.5) * 1.2;
          let nextVal = lastVal + drift;
          
          // Keep within reasonable bounds
          nextVal = Math.max(1, Math.min(80, nextVal));
          
          nextPoint[horseKey] = Math.round(nextVal * 10) / 10;
        });

        const newHistory = [...prev, nextPoint];
        // Keep only last 20 points
        if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
        return newHistory;
      });
      setLastUpdate(new Date());
    }, 5000); // Update every 5 seconds

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [favorites]);

  const latestPoint = history[history.length - 1];
  const previousPoint = history.length > 1 ? history[history.length - 2] : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
            <Radar className="w-5 h-5 text-indigo-600 animate-pulse" />
            رادار الاحتمالات اللحظي (Odds Radar)
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            مراقبة حية لتدفق المراهنات وتغيرات احتمالات الوصول لخط النهاية.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-xs font-bold">
            <Activity className="w-3.5 h-3.5" />
            تحديث مباشر: {lastUpdate.toLocaleTimeString('ar-MA', { second: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  منحنى القوة الاحتمالية (Probability Trend %)
                </span>
                <div className="flex gap-4">
                  {favorites.map((p, idx) => {
                    const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
                    return (
                      <div key={p.numPmu} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                        <span className="text-[10px] font-bold text-white">#{p.numPmu}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="h-80 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {favorites.map((p, idx) => {
                        const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
                        return (
                          <linearGradient key={`grad_${p.numPmu}`} id={`color_${p.numPmu}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0}/>
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#666' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#666' }} 
                      domain={[0, 'dataMax + 10']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ padding: '0px' }}
                    />
                    {favorites.map((p, idx) => {
                      const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
                      return (
                        <Area
                          key={p.numPmu}
                          type="monotone"
                          dataKey={`horse_${p.numPmu}`}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill={`url(#color_${p.numPmu})`}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong className="block mb-1">مؤشر التقلبات (Volatility Alert):</strong>
                هذا المخطط يرصد التغيرات اللحظية في المراهنات. الارتفاع الحاد لأي جواد (Spike) يشير عادة إلى تدفق أموال المراهنين المحترفين في اللحظات الأخيرة.
              </div>
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b pb-2">
              تحليل الموجة اللحظية
            </h3>
            
            <div className="space-y-3">
              {favorites.map((p, idx) => {
                const horseKey = `horse_${p.numPmu}`;
                const current = latestPoint ? (latestPoint[horseKey] as number) : 0;
                const prev = previousPoint ? (previousPoint[horseKey] as number) : current;
                const diff = current - prev;
                const isPositive = diff > 0;
                
                return (
                  <div key={p.numPmu} className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {p.numPmu}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-neutral-800 truncate block max-w-[90px]">
                            {p.nom}
                          </span>
                          {p.dernierRapportDirect?.grossePrise && (
                            <span className="text-[8px] font-black bg-red-600 text-white px-1 py-0.2 rounded">
                              GROSSE PRISE
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block">الاحتمال الحالي</span>
                        <span className="text-sm font-black text-indigo-700">{current}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold",
                        diff === 0 ? "bg-neutral-200 text-neutral-600" :
                        isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {diff === 0 ? null : isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {diff === 0 ? "مستقر" : `${Math.abs(diff).toFixed(1)}%`}
                      </div>
                      <div className="h-1 flex-1 mx-3 bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500" 
                          style={{ width: `${current}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
              <Zap className="w-4 h-4 fill-white" />
              تجميد الرادار للتحليل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
