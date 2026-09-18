"use client";

import { useState, useMemo } from "react";
import { Calculator, TrendingUp, DollarSign, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { HorseAnalysisMetrics } from "@/lib/analyticalEngine";

interface ProfitSimulatorProps {
  metrics: HorseAnalysisMetrics[];
}

export default function ProfitSimulator({ metrics }: ProfitSimulatorProps) {
  const [betAmount, setBetAmount] = useState<number>(10);
  
  const simulationData = useMemo(() => {
    return metrics
      .sort((a, b) => b.quantitativeScore - a.quantitativeScore)
      .map(m => {
        // Estimate odds based on win probability
        // Usually, odds are inversely proportional to probability
        // Here we simulate some "fair odds" based on the probability score
        const fairOdds = Math.max(1.1, (1 / (m.winProb / 100)) * 0.85); // 15% bookmaker margin
        const estimatedPayout = betAmount * fairOdds;
        const netProfit = estimatedPayout - betAmount;
        
        return {
          ...m,
          fairOdds,
          estimatedPayout,
          netProfit
        };
      });
  }, [metrics, betAmount]);

  return (
    <div className="bg-neutral-900 text-white rounded-2xl shadow-xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold">محاكي الأرباح المتوقعة (Profit Simulator)</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">مبلغ الرهان الأساسي:</span>
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 py-1">
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="bg-transparent w-16 text-right outline-none font-mono font-bold text-emerald-400 text-sm"
            />
            <span className="text-[10px] text-neutral-500 mr-1">€</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block font-bold">أعلى ربح محتمل</span>
              <span className="text-xl font-black text-emerald-400">
                {Math.max(...simulationData.map(d => d.netProfit)).toFixed(2)} €
              </span>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block font-bold">متوسط العائد المتوقع</span>
              <span className="text-xl font-black text-indigo-300">
                {(simulationData.reduce((acc, curr) => acc + curr.estimatedPayout, 0) / simulationData.length).toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-indigo-200/70 leading-relaxed">
              هذه المحاكاة تعتمد على &quot;الاحتمالات العادلة&quot; المستمدة من التحليل الكمي للذكاء الاصطناعي وتفترض عمولة رهان قدرها 15%.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-[10px] text-neutral-500 uppercase font-bold border-b border-white/5">
                <th className="pb-3 pr-2">الخيل</th>
                <th className="pb-3">القوة الشرائية (%)</th>
                <th className="pb-3 text-center">الاحتمال المتوقع</th>
                <th className="pb-3 text-left">إجمالي العائد</th>
                <th className="pb-3 text-left pl-2">صافي الربح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {simulationData.map((d, idx) => (
                <tr key={idx} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4 pr-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white text-black font-black flex items-center justify-center shadow-md">
                        {d.numPmu}
                      </span>
                      <span className="font-bold text-xs truncate max-w-[120px]">{d.nom}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[60px]">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${d.winProb}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-neutral-400">{d.winProb}%</span>
                    </div>
                  </td>
                  <td className="py-4 text-center font-mono font-bold text-amber-400">
                    {d.fairOdds.toFixed(2)}
                  </td>
                  <td className="py-4 text-left font-mono font-bold text-indigo-300">
                    {d.estimatedPayout.toFixed(2)} €
                  </td>
                  <td className="py-4 text-left pl-2">
                    <span className={cn(
                      "font-mono font-black text-sm px-2 py-1 rounded-lg",
                      d.netProfit > betAmount ? "text-emerald-400 bg-emerald-400/10" : "text-neutral-300 bg-white/5"
                    )}>
                      +{d.netProfit.toFixed(2)} €
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
