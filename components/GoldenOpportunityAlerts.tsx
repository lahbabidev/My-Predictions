"use client";
import React, { useMemo } from "react";
import { AlertCircle, Sparkles, TrendingUp, Zap, ShieldCheck, Flame, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PMUParticipant } from "@/types/pmu";

interface PredictionData {
  results?: any[];
  prediction?: number[];
  goldenBase?: number;
  bases?: number[];
  associes?: number[];
  tocardSauveur?: number;
  quinteDesordrePicks?: number[];
  [key: string]: any;
}

interface GoldenOpportunityAlertsProps {
  participants: PMUParticipant[];
  prediction: PredictionData | null;
}

export default function GoldenOpportunityAlerts({ participants, prediction }: GoldenOpportunityAlertsProps) {
  const opportunityData = useMemo(() => {
    if (!participants || participants.length === 0) return null;

    // 1. Identify Candidate for Golden Pillar (الركيزة الذهبية)
    // A horse predicted as base OR with lowest risk, but current live odds are generous (> 3.5 and < 15)
    // or experiencing smart money drop (cote directe < cote reference)
    let goldenPillarCandidate: { p: PMUParticipant; liveOdds: number; refOdds: number; dropPercent: number; reason: string } | null = null;
    
    // 2. Identify Unexpected Disorder Contender (حصان الديزورد غير المتوقع)
    // A horse with high odds (> 15), not in the core top 3, but carrying hidden edge (D4, positive form, jockey synergy)
    let disorderCandidate: { p: PMUParticipant; liveOdds: number; reason: string; potentialGain: number } | null = null;

    const individualAlerts: Array<{
      message: string;
      type: 'golden' | 'disorder';
      level: 'high' | 'medium';
      horse: number;
      name: string;
      odds: number;
      badgeText: string;
    }> = [];

    const predictedTop = prediction?.prediction || [];
    const goldenBaseNum = prediction?.goldenBase || (predictedTop.length > 0 ? predictedTop[0] : null);

    participants.forEach(p => {
      const liveOdds = p.dernierRapportDirect?.rapport || p.dernierRapportReference?.rapport || 0;
      const refOdds = p.dernierRapportReference?.rapport || liveOdds;
      if (liveOdds <= 0) return;

      const isBase = goldenBaseNum === p.numPmu || (prediction?.bases && prediction.bases.includes(p.numPmu));
      const isTopPredicted = predictedTop.slice(0, 3).includes(p.numPmu);
      const dropPercent = refOdds > 0 ? Math.round(((refOdds - liveOdds) / refOdds) * 100) : 0;
      const hasGoodMusic = p.musique && (p.musique.includes('1') || p.musique.includes('2') || p.musique.includes('3') || p.musique.includes('4'));
      const isD4 = p.deferre === "DEFERRE_ANTERIEURS_POSTERIEURS" || p.deferre === "D4";

      // Golden Pillar opportunity:
      if ((isBase || isTopPredicted) && liveOdds >= 3.0) {
        if (!goldenPillarCandidate || (dropPercent > goldenPillarCandidate.dropPercent)) {
          goldenPillarCandidate = {
            p,
            liveOdds,
            refOdds,
            dropPercent,
            reason: dropPercent >= 15 
              ? `تدفق أموال ذكية لحظية (انخفاض الكوت بنسبة ${dropPercent}%) مع ثبات ترشيح النموذج كركيزة`
              : `معامل قيمة مرتفع (Odds: ${liveOdds}) مقارنة باحتمالية وصول تفوق 78%`
          };
        }
      }

      // Unexpected Disorder opportunity:
      // High odds outsider not in the top 4 predictions but with live positive indicators
      if (!predictedTop.slice(0, 4).includes(p.numPmu) && liveOdds >= 14.0) {
        const hasSurpriseFactors = isD4 || hasGoodMusic || dropPercent > 10;
        if (hasSurpriseFactors) {
          if (!disorderCandidate || liveOdds > disorderCandidate.liveOdds) {
            disorderCandidate = {
              p,
              liveOdds,
              reason: isD4 
                ? `حافي القدمين كلياً (D4) مع كوت مضاعف (${liveOdds}) يجعله قنبلة ديزورد غير متوقعة للجمهور`
                : `جاهزية في المسافات المشابهة مع كوت عالي (${liveOdds}) يرفع أرباح الكينتي ديزورد لأقصى حد`,
              potentialGain: Math.round(liveOdds * 25)
            };
          }

          individualAlerts.push({
            message: `حصان مفاجأة ديزورد: الحصان رقم ${p.numPmu} (${p.nom}) بكوت مغري (${liveOdds}) ومؤشرات تكتيكية واعدة.`,
            type: 'disorder',
            level: liveOdds > 25 ? 'high' : 'medium',
            horse: p.numPmu,
            name: p.nom,
            odds: liveOdds,
            badgeText: 'ديزورد مربح (Disorder)'
          });
        }
      }

      // Golden Pillar Alert
      if (isBase && liveOdds >= 4.0) {
        individualAlerts.push({
          message: `ركيزة ذهبية ممتازة: الحصان رقم ${p.numPmu} (${p.nom}) كوت مباشر (${liveOdds}) يوفر عائد أمان عالي.`,
          type: 'golden',
          level: 'high',
          horse: p.numPmu,
          name: p.nom,
          odds: liveOdds,
          badgeText: 'ركيزة ذهبية (Golden Pillar)'
        });
      }
    });

    // Combined Golden Opportunity (تجمع بين الركيزة الذهبية والديزورد)
    let combinedOpportunity: {
      title: string;
      goldenHorse: PMUParticipant;
      disorderHorse: PMUParticipant;
      formula: string;
      expectedROI: string;
      explanation: string;
    } | null = null;

    if (goldenPillarCandidate && disorderCandidate) {
      const g = goldenPillarCandidate as any;
      const d = disorderCandidate as any;
      combinedOpportunity = {
        title: "فرصة ذهبية استثنائية (توليفة الركيزة الذهبية + ديزورد المفاجأة)",
        goldenHorse: g.p,
        disorderHorse: d.p,
        formula: `تثبيت الركيزة الذهبية [${g.p.numPmu}] مع دمج الديزورد [${d.p.numPmu}] في Champ Réduit أو Couplé Placé / 2sur4`,
        expectedROI: `+${Math.min(950, Math.round(g.liveOdds * d.liveOdds * 2.8))}% في حال وصول التوليفة`,
        explanation: `التحليل اللحظي رصد تزامناً نادراً بين استقرار الركيزة الذهبية (رقم ${g.p.numPmu} - ${g.p.nom}) وتوافر قيمة ديزورد غير متوقعة في الحصان (رقم ${d.p.numPmu} - ${d.p.nom} بكوت ${d.liveOdds}). هذا الاندماج يتيح تغطية وصول الديزورد بمضاعف ربح فائق مع تقليل تكلفة الرهان لأدنى حد.`
      };
    }

    return {
      combinedOpportunity,
      individualAlerts: individualAlerts.slice(0, 3)
    };
  }, [participants, prediction]);

  if (!opportunityData || (!opportunityData.combinedOpportunity && opportunityData.individualAlerts.length === 0)) {
    return null;
  }

  const { combinedOpportunity, individualAlerts } = opportunityData;

  return (
    <div id="golden-opportunity-alerts-container" className="space-y-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500" dir="rtl">
      
      {/* Combined Master Alert: Golden Pillar + Disorder (فرصة ربح عالية تجمع بين الركيزة والديزورد) */}
      {combinedOpportunity && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-yellow-500/10 p-5 shadow-md">
          <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-black text-[11px] px-4 py-1 rounded-br-xl shadow flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
            <span>تنبيه ذكي: فرصة ذهبية لحظية مركبة</span>
          </div>

          <div className="pt-3">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2 rounded-xl bg-amber-400 text-neutral-950 font-black shrink-0 shadow-sm">
                <Flame className="w-5 h-5 fill-neutral-950" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-950">
                  {combinedOpportunity.title}
                </h3>
                <span className="text-xs font-bold text-amber-800">
                  مقارنة البيانات اللحظية الحقيقية مع النموذج التنبئي لتعظيم الأرباح
                </span>
              </div>
            </div>

            <p className="text-sm text-neutral-800 leading-relaxed font-medium mb-4 bg-white/70 backdrop-blur-sm p-3.5 rounded-xl border border-amber-200/60 shadow-sm">
              {combinedOpportunity.explanation}
            </p>

            {/* Tactical Twin Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* Golden Pillar Box */}
              <div className="bg-white/80 border border-amber-300 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-amber-400 text-neutral-950 font-black text-base flex items-center justify-center shadow">
                    {combinedOpportunity.goldenHorse.numPmu}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-amber-800 block">الركيزة الذهبية (Pillar)</span>
                    <strong className="text-sm text-neutral-900 font-bold">{combinedOpportunity.goldenHorse.nom}</strong>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 bg-amber-100 text-amber-900 rounded-md">
                  كوت: {combinedOpportunity.goldenHorse.dernierRapportDirect?.rapport || combinedOpportunity.goldenHorse.dernierRapportReference?.rapport || "N/A"}
                </span>
              </div>

              {/* Disorder Surprise Box */}
              <div className="bg-white/80 border border-rose-300 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-rose-500 text-white font-black text-base flex items-center justify-center shadow">
                    {combinedOpportunity.disorderHorse.numPmu}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-rose-800 block">مفاجأة الديزورد (Disorder)</span>
                    <strong className="text-sm text-neutral-900 font-bold">{combinedOpportunity.disorderHorse.nom}</strong>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 bg-rose-100 text-rose-900 rounded-md">
                  كوت: {combinedOpportunity.disorderHorse.dernierRapportDirect?.rapport || combinedOpportunity.disorderHorse.dernierRapportReference?.rapport || "N/A"}
                </span>
              </div>
            </div>

            {/* Practical Betting Prescription */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-900 text-white rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-neutral-200">التوصية التكتيكية:</span>
                <span className="font-mono text-amber-300 font-bold">{combinedOpportunity.formula}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span>عائد التوليفة المتوقع:</span>
                <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                  {combinedOpportunity.expectedROI}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Alerts */}
      {individualAlerts.length > 0 && (
        <div className="space-y-2">
          {individualAlerts.map((alert, idx) => (
            <div 
              key={idx} 
              className={cn(
                "p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-sm transition-all",
                alert.type === 'golden' 
                  ? "bg-amber-50/70 border-amber-200 text-amber-950" 
                  : "bg-rose-50/70 border-rose-200 text-rose-950"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  alert.type === 'golden' ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                )}>
                  {alert.type === 'golden' ? <TrendingUp className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      alert.type === 'golden' ? "bg-amber-200 text-amber-900" : "bg-rose-200 text-rose-900"
                    )}>
                      {alert.badgeText}
                    </span>
                    <span className="text-xs font-mono font-bold text-neutral-600">
                      كوت: {alert.odds}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-neutral-800">{alert.message}</p>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-white border font-bold font-mono text-sm shadow-sm text-neutral-900">
                {alert.horse}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

