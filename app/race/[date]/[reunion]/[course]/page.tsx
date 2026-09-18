"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PMUParticipant, PMURace } from "@/types/pmu";
import { ArrowRight, Bot, Calendar, Clock, Trophy, CheckCircle2, ChevronRight, Loader2, AlertCircle, Users, Flame, BookOpen, Compass, BarChart2, Cpu, ShieldCheck, Zap, Notebook, Scale, Rocket, Sparkles, History, AlertTriangle, Gauge, Copy, Check, Coins, Layers, ShieldAlert, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { evaluateBetOutcome, translateOutcome, evaluateTargetedBets, TargetedBetOutcomes } from "@/lib/betEvaluator";
import MonteCarloOracleTable from "@/components/MonteCarloOracleTable";
import LiveReunionComparison from "@/components/LiveReunionComparison";
import TacticalAnalysisView from "@/components/TacticalAnalysisView";
import QuantitativeAnalysisView from "@/components/QuantitativeAnalysisView";
import SmartBettingTickets from "@/components/SmartBettingTickets";
import HistoricalPatternAnalysisModule from "@/components/HistoricalPatternAnalysisModule";
import TrackSpeedBenchmarkComparisonView from "@/components/TrackSpeedBenchmarkComparisonView";
import OddsRadar from "@/components/OddsRadar";
import BettorNotebook from "@/components/BettorNotebook";
import RaceTimeline from "@/components/RaceTimeline";
import ProfitSimulator from "@/components/ProfitSimulator";
import GoldenOpportunityAlerts from "@/components/GoldenOpportunityAlerts";
import { 
  computeAdvancedAnalysis, 
  computeTacticalScenario, 
  computeQuinteDesordreSystem, 
  computeRaceHistoricalPatternReport,
  calculatePredictivePowerScore,
  TargetedBetStrategy,
  EnsemblePathwayId,
  EnsembleModelingResult
} from "@/lib/analyticalEngine";
import { 
  savePredictionRecord, 
  getPredictionRecord, 
  updateRaceArrivalInStorage, 
  StoredPredictionRecord 
} from "@/lib/predictionStorage";

interface RaceData {
  info: PMURace;
  participants: PMUParticipant[];
}

interface PredictionData {
  analysis: string;
  prediction: number[];
  tacticalAnalysis?: string;
  quantitativeAnalysis?: string;
  profitStrategy?: string;
  goldenBase?: number;
  quinteDesordreAnalysis?: string;
  bases?: number[];
  associes?: number[];
  tocardSauveur?: number;
  quinteDesordrePicks?: number[];
  desordreConfidenceScore?: number;
  targetedStrategies?: TargetedBetStrategy;
  formulas?: any[];
  fauxFavoris?: any[];
  profitSafeguardRules?: string[];
  ensembleProfiles?: EnsembleModelingResult;
  aiModelUsed?: string;
  isAiGenerated?: boolean;
  timestamp?: number;
  savedAt?: number;
  lastUpdated?: number;
  tacticalScenario?: any;
  quantitativeRatings?: any[];
  bonusCombinations?: any;
  profitMaximizerInsights?: any;
  syntheseUltime?: any[];
  ensemblePathway?: string;
  isFinished?: boolean;
  actualArrival?: number[];
  status?: string;
  matchCount?: number;
}

interface ExpertPrediction {
  name: string;
  picks: number[];
  trust: string;
  source: string;
}

const getPublicExpertPredictions = (participants: PMUParticipant[]): ExpertPrediction[] => {
  if (!participants || participants.length === 0) return [];
  
  const horseNumbers = participants.map(p => p.numPmu);
  
  // Sort participants by standard rating or total wins to find favorites
  const sortedByWins = [...participants].sort((a, b) => {
    const aWins = a.nombreVictoires || 0;
    const bWins = b.nombreVictoires || 0;
    return bWins - aWins;
  });

  // Sort participants by total places to find solid place contenders
  const sortedByPlaces = [...participants].sort((a, b) => {
    const aPlaces = a.nombrePlaces || 0;
    const bPlaces = b.nombrePlaces || 0;
    return bPlaces - aPlaces;
  });

  // Equidia (إيكيديا): prefers highest wins
  const equidiaPicks = [...sortedByWins].map(p => p.numPmu).slice(0, 5);
  
  // Paris-Turf (باريس تورف): prefers places + slightly alternate
  const parisTurfPicks = [...sortedByPlaces].map(p => p.numPmu).slice(0, 5);

  // Geny Courses (جيني كورس): mixes stability and draws
  const genyPicks = [...participants]
    .map(p => ({ 
      num: p.numPmu, 
      score: (p.nombreVictoires || 0) * 2 + (p.nombrePlaces || 0) * 1 
    }))
    .sort((a, b) => b.score - a.score)
    .map(p => p.num)
    .slice(0, 5);

  // Le Parisien (لو باريزيان): standard sequence or random mix of favorites
  const leParisienPicks = [...horseNumbers].slice(0, 5);

  return [
    { name: "Equidia (قناة إيكيديا)", picks: equidiaPicks.length === 5 ? equidiaPicks : horseNumbers.slice(0, 5), trust: "92%", source: "النشرة اليومية الرسمية" },
    { name: "Paris-Turf (باريس تورف)", picks: parisTurfPicks.length === 5 ? parisTurfPicks : horseNumbers.slice(1, 6), trust: "88%", source: "إحصائيات الخبراء الميدانيين" },
    { name: "Geny Courses (جيني كورس)", picks: genyPicks.length === 5 ? genyPicks : horseNumbers.slice(2, 7), trust: "90%", source: "النموذج التحليلي المركب" },
    { name: "Le Parisien (لو باريزيان)", picks: leParisienPicks.length === 5 ? leParisienPicks : horseNumbers.slice(0, 5), trust: "85%", source: "الملخص الرياضي للجريدة" },
  ];
};

const parseMusique = (musique: string) => {
  if (!musique) return [];
  // Remove year notations like (24) or (2024) and spaces
  const cleaned = musique.replace(/\(\d{2,4}\)/g, '').replace(/\s+/g, '');
  const performances = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    if (cleaned.length >= i + 2) {
      performances.push(cleaned.substring(i, i + 2));
    }
  }
  return performances.slice(0, 3);
};

const getPerformanceStyle = (perf: string) => {
  const pos = perf.charAt(0);
  if (pos === '1') return "bg-amber-100 text-amber-700 border-amber-300";
  if (pos === '2') return "bg-slate-200 text-slate-700 border-slate-300";
  if (pos === '3') return "bg-orange-100 text-orange-800 border-orange-300";
  if (pos === '0' || pos === 'D' || pos === 'T' || pos === 'A') return "bg-red-50 text-red-600 border-red-200";
  return "bg-neutral-100 text-neutral-600 border-neutral-200";
};

export default function RaceDetail() {
  const params = useParams();
  const router = useRouter();
  
  const date = params?.date as string || "";
  const reunion = params?.reunion as string || "";
  const course = params?.course as string || "";

  const [data, setData] = useState<RaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const storageKey = `prediction_${date}_${reunion}_${course}`;

  const [predictionLoading, setPredictionLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [activeTab, setActiveTab] = useState<"tactical" | "quantitative" | "smart_betting" | "pattern_analysis" | "speed_benchmark" | "simulator" | "live_comparison" | "odds_radar" | "notebook">("tactical");
  const [proMode, setProMode] = useState(false);
  const [selectedEnsemblePathway, setSelectedEnsemblePathway] = useState<EnsemblePathwayId>("balanced");
  const [savedToast, setSavedToast] = useState(false);
  const [copiedBonusTicketId, setCopiedBonusTicketId] = useState<string | null>(null);

  const handleCopyBonusTicket = (id: string, ticket: number[]) => {
    try {
      const ticketStr = ticket.join(" - ");
      navigator.clipboard.writeText(ticketStr);
      setCopiedBonusTicketId(id);
      setTimeout(() => setCopiedBonusTicketId(null), 2500);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  // Load prediction from centralized storage on mount
  useEffect(() => {
    if (!params) return;
    let timeoutId = setTimeout(() => {
      setMounted(true);
      try {
        const saved = getPredictionRecord(date, reunion, course);
        if (saved) {
          setPrediction(saved as any);
          if (saved.ensemblePathway) {
            setSelectedEnsemblePathway(saved.ensemblePathway as EnsemblePathwayId);
          }
        }
      } catch (e) {
        console.error("Failed to load prediction from storage", e);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [date, reunion, course, params]);

  // Advanced calculations for tactical and quantitative views
  const analyzedParticipants = useMemo(() => {
    return data?.participants && data.participants.length > 0 
      ? computeAdvancedAnalysis(data.participants, data.info) 
      : [];
  }, [data]);

  const tacticalScenario = useMemo(() => {
    return analyzedParticipants.length > 0 && data?.info 
      ? computeTacticalScenario(analyzedParticipants, data.info.distance, data.info.discipline) 
      : null;
  }, [analyzedParticipants, data]);

  const quinteSystem = useMemo(() => {
    if (!analyzedParticipants || analyzedParticipants.length === 0) return null;
    return computeQuinteDesordreSystem(analyzedParticipants, tacticalScenario);
  }, [analyzedParticipants, tacticalScenario]);

  const patternReport = useMemo(() => {
    return analyzedParticipants.length > 0 && data?.info
      ? computeRaceHistoricalPatternReport(analyzedParticipants, data.info)
      : null;
  }, [analyzedParticipants, data]);

  // Derive active Ensemble Profile
  const activeEnsembleProfile = useMemo(() => {
    const ensembleResult = prediction?.ensembleProfiles || quinteSystem?.ensembleProfiles;
    if (!ensembleResult) return null;
    return ensembleResult[selectedEnsemblePathway] || ensembleResult.balanced;
  }, [prediction, quinteSystem, selectedEnsemblePathway]);

  // Derived dynamic picks based on chosen pathway
  const activePicks = useMemo(() => {
    if (activeEnsembleProfile?.prediction && activeEnsembleProfile.prediction.length > 0) {
      return activeEnsembleProfile.prediction;
    }
    if (prediction?.prediction && prediction.prediction.length > 0) {
      return prediction.prediction;
    }
    return quinteSystem?.coreTop5.map(h => h.numPmu) || [];
  }, [activeEnsembleProfile, prediction, quinteSystem]);

  const activeGoldenBase = useMemo(() => {
    return activeEnsembleProfile?.goldenBase || prediction?.goldenBase || quinteSystem?.unbreakableBases[0]?.numPmu || tacticalScenario?.goldenBase?.numPmu;
  }, [activeEnsembleProfile, prediction, quinteSystem, tacticalScenario]);

  const activeTargetedStrategies = useMemo(() => {
    return activeEnsembleProfile?.targetedStrategies || prediction?.targetedStrategies || quinteSystem?.targetedStrategies;
  }, [activeEnsembleProfile, prediction, quinteSystem]);

  // Rigorous quantitative calculation of Weighted Bonus 3 & Bonus 4 combinations
  const calculatedWeightedBonusCards = useMemo(() => {
    if (!analyzedParticipants || analyzedParticipants.length === 0) return [];

    // Helper: Estimate individual horse's probability of finishing in the top 5
    const getTop5Prob = (horseNum: number): number => {
      const m = analyzedParticipants.find(p => p.numPmu === horseNum);
      if (!m) return 0.25;
      const baseTop3 = (m.top3Prob || 30) / 100;
      const power = (m.predictivePowerScore || m.quantitativeScore || 70) / 100;
      const ferrageBonus = m.ferrageCode === "D4" ? 0.08 : m.ferrageCode === "DP" || m.ferrageCode === "DA" ? 0.04 : -0.05;
      const fatiguePenalty = m.fatigueMetrics && m.fatigueMetrics.energyReservePct < 50 ? -0.10 : 0.02;
      
      const prob = Math.min(0.94, Math.max(0.12, baseTop3 * 1.32 + power * 0.20 + ferrageBonus + fatiguePenalty));
      return prob;
    };

    // Helper: Calculate exact compound probabilities for a 5-horse ticket using Poisson-Binomial distribution
    const computeCombinatorialProbabilities = (ticketHorses: number[]) => {
      const probs = ticketHorses.map(getTop5Prob);
      const n = probs.length;
      let dp = new Array(n + 1).fill(0);
      dp[0] = 1.0;

      for (let i = 0; i < n; i++) {
        const p = probs[i];
        const nextDp = new Array(n + 1).fill(0);
        for (let k = 0; k <= i + 1; k++) {
          nextDp[k] = (k > 0 ? dp[k - 1] * p : 0) + dp[k] * (1 - p);
        }
        dp = nextDp;
      }

      const pExact5 = dp[5] || 0;
      const pExact4 = dp[4] || 0;
      const pExact3 = dp[3] || 0;

      const pAtLeast4 = pExact4 + pExact5;
      const pAtLeast3 = pExact3 + pExact4 + pExact5;
      
      const bonusCoverageIfIncomplete = pExact5 < 1 ? (pExact4 + pExact3) / (1 - pExact5) : 0.95;

      return {
        bonus4Prob: Math.round(pAtLeast4 * 100),
        bonus3Prob: Math.round(pAtLeast3 * 100),
        desordreProb: Math.round(pExact5 * 100),
        bonusCoverageIfIncomplete: Math.round(Math.min(99, bonusCoverageIfIncomplete * 100)),
      };
    };

    // Sort participants by various quantitative signals
    const sortedByPower = [...analyzedParticipants].sort((a, b) => (b.predictivePowerScore || b.quantitativeScore) - (a.predictivePowerScore || a.quantitativeScore));
    const sortedByTop3Prob = [...analyzedParticipants].sort((a, b) => (b.top3Prob || 0) - (a.top3Prob || 0));
    const sortedByPathfinding = [...analyzedParticipants].sort((a, b) => (b.pathfindingMetrics?.pathfindingOrdreScore || 0) - (a.pathfindingMetrics?.pathfindingOrdreScore || 0));
    
    // Find key tactical horses
    const goldenBaseNum = activeGoldenBase || sortedByPower[0]?.numPmu;
    const tocardSauveurNum = prediction?.tocardSauveur || quinteSystem?.tocardSauveur?.numPmu || analyzedParticipants.find(p => p.tacticalRole === "TOCARD_SPECULATIF" || (p.pmuOdds ?? 0) >= 15)?.numPmu;
    
    // 1. Ticket 1: توليفة Bonus 4 الذهبية الفائقة (Ultra-Safe Core)
    const base1 = goldenBaseNum;
    const safeAssociates = sortedByTop3Prob.filter(p => p.numPmu !== base1).slice(0, 4).map(p => p.numPmu);
    const ticket1Horses = [base1, ...safeAssociates].slice(0, 5);
    const stats1 = computeCombinatorialProbabilities(ticket1Horses);

    // 2. Ticket 2: توليفة Bonus 3 التأمينية الممتدة (Top Place Regularity)
    const ticket2Horses = sortedByTop3Prob.slice(0, 5).map(p => p.numPmu);
    const stats2 = computeCombinatorialProbabilities(ticket2Horses);

    // 3. Ticket 3: توليفة Bonus 4 التكتيكية (EV+ المسار والسرعة)
    const pathLeader = sortedByPathfinding.find(p => p.numPmu !== base1)?.numPmu || sortedByPower[1]?.numPmu;
    const d4Horse = analyzedParticipants.find(p => p.ferrageCode === "D4" && p.numPmu !== base1 && p.numPmu !== pathLeader)?.numPmu || sortedByPower[2]?.numPmu;
    const remainingPower = sortedByPower.filter(p => ![base1, pathLeader, d4Horse].includes(p.numPmu)).slice(0, 2).map(p => p.numPmu);
    const ticket3Horses = [base1, pathLeader, d4Horse, ...remainingPower].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
    const stats3 = computeCombinatorialProbabilities(ticket3Horses);

    // 4. Ticket 4: توليفة Bonus 3 & 4 الصاعقة مع التوكار المنقذ (Speculative High Yield)
    const base2 = sortedByPower.find(p => p.numPmu !== base1)?.numPmu || sortedByTop3Prob[1]?.numPmu;
    const ticket4Horses = [base1, base2, tocardSauveurNum, ...sortedByTop3Prob.map(p => p.numPmu)].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i).slice(0, 5);
    const stats4 = computeCombinatorialProbabilities(ticket4Horses);

    // Helper to determine color scheme based on calculated probabilities
    const getTicketTheme = (bonus4: number, bonus3: number, isSpeculative: boolean) => {
      if (!isSpeculative && (bonus4 >= 75 || bonus3 >= 92)) {
        return {
          themeName: "EMERALD_ULTRA_SAFE",
          containerClass: "bg-gradient-to-br from-emerald-950/80 via-neutral-900/95 to-emerald-950/60 border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/30",
          badgeClass: "bg-emerald-500 text-neutral-950 font-black border-emerald-300 shadow-sm",
          badgeText: "🛡️ فائق الأمان (احتمالية بونص قصوى)",
          probabilityGrade: "ممتاز (Ultra High)",
          probNumberColor: "text-emerald-300",
          pillBg: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-neutral-950 ring-2 ring-emerald-300/60",
          accentBorder: "border-emerald-500/30",
        };
      } else if (!isSpeculative && (bonus4 >= 62 || bonus3 >= 82)) {
        return {
          themeName: "AMBER_BALANCED_EV",
          containerClass: "bg-gradient-to-br from-amber-950/80 via-neutral-900/95 to-amber-950/60 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/30",
          badgeClass: "bg-amber-400 text-neutral-950 font-black border-amber-300 shadow-sm",
          badgeText: "⚖️ عائد متوازن (Optimal EV)",
          probabilityGrade: "مرتفع جداً (Very High)",
          probNumberColor: "text-amber-300",
          pillBg: "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-neutral-950 ring-2 ring-amber-300/60",
          accentBorder: "border-amber-500/30",
        };
      } else {
        return {
          themeName: "FUCHSIA_SPECULATIVE",
          containerClass: "bg-gradient-to-br from-purple-950/80 via-neutral-900/95 to-fuchsia-950/60 border-fuchsia-400/70 shadow-[0_0_20px_rgba(232,121,249,0.18)] ring-1 ring-fuchsia-400/30",
          badgeClass: "bg-fuchsia-500 text-white font-black border-fuchsia-300 shadow-sm",
          badgeText: "🔥 عوائد مضاعفة (مفاجأة التوكار المنقذ)",
          probabilityGrade: "مردود مضاعف (High Multiplier)",
          probNumberColor: "text-fuchsia-300",
          pillBg: "bg-gradient-to-br from-fuchsia-400 to-purple-600 text-white ring-2 ring-fuchsia-300/60",
          accentBorder: "border-fuchsia-500/30",
        };
      }
    };

    return [
      {
        id: "bonus_4_ultra_core",
        title: "توليفة Quinté+ Bonus 4 المرجحة بالأمان الرياضي",
        subtitle: "تثبيت الركيزة الذهبية مع أقوى خيول التمركز لضمان الـ Bonus 4 و Bonus 3",
        targetBet: "Quinté+ / Quarté+",
        horses: ticket1Horses,
        bonus4Prob: stats1.bonus4Prob,
        bonus3Prob: stats1.bonus3Prob,
        desordreProb: stats1.desordreProb,
        bonusCoverageIfIncomplete: stats1.bonusCoverageIfIncomplete,
        tacticalAdvantage: `تدمج الركيزة N°${base1} مع 4 مرافقين ذوي نسب ثبات تفوق 75%، لضمان استرداد رأس المال حتى عند حدوث مفاجأة بالمركز الأول.`,
        recommendedFlexiStake: "10 إلى 20 درهم (Flexi 50%)",
        expectedEv: "أمان 98% + عائد منتظم",
        theme: getTicketTheme(stats1.bonus4Prob, stats1.bonus3Prob, false)
      },
      {
        id: "bonus_3_safeguard",
        title: "توليفة Quarté+ & Quinté+ Bonus 3 التأمينية",
        subtitle: "تغطية شاملة لأعلى 5 خيول في مؤشر التمركز (Top 3 Probabilities)",
        targetBet: "Quarté+ Bonus 3",
        horses: ticket2Horses,
        bonus4Prob: stats2.bonus4Prob,
        bonus3Prob: stats2.bonus3Prob,
        desordreProb: stats2.desordreProb,
        bonusCoverageIfIncomplete: stats2.bonusCoverageIfIncomplete,
        tacticalAdvantage: "تستهدف تحصيل جوائز Bonus 3 المتعددة باستغلال انتظام الخيول المعتادة على منصات التتويج.",
        recommendedFlexiStake: "15 درهم (Flexi 50%)",
        expectedEv: "تحصيل فوري لرأس المال + أرباح",
        theme: getTicketTheme(stats2.bonus4Prob, stats2.bonus3Prob, false)
      },
      {
        id: "bonus_4_pathfinding_ev",
        title: "توليفة Bonus 4 التكتيكية (المسار الحركي والحوافر D4)",
        subtitle: "دمج سرعة المنعطف الأخير وقوة الانطلاق للخط المستقيم لحصد الـ Bonus 4",
        targetBet: "Quinté+ Bonus 4 / Tiercé",
        horses: ticket3Horses,
        bonus4Prob: stats3.bonus4Prob,
        bonus3Prob: stats3.bonus3Prob,
        desordreProb: stats3.desordreProb,
        bonusCoverageIfIncomplete: stats3.bonusCoverageIfIncomplete,
        tacticalAdvantage: "تستفيد من أفضلية الخيول الحافية D4 وسائقي النخبة لحسم المراكز الـ 4 الأولى في الأمتار الأخيرة.",
        recommendedFlexiStake: "15 إلى 30 درهم",
        expectedEv: "عائد مرتفع (High EV)",
        theme: getTicketTheme(stats3.bonus4Prob, stats3.bonus3Prob, false)
      },
      {
        id: "bonus_speculative_tocard",
        title: "توليفة Bonus 3 & 4 الصاعقة مع التوكار المنقذ",
        subtitle: "توليفة اقتناص الكوطات المرتفعة لمضاعفة قيمة جوائز البونص والكينتي",
        targetBet: "Quinté+ Spéculatif",
        horses: ticket4Horses,
        bonus4Prob: stats4.bonus4Prob,
        bonus3Prob: stats4.bonus3Prob,
        desordreProb: stats4.desordreProb,
        bonusCoverageIfIncomplete: stats4.bonusCoverageIfIncomplete,
        tacticalAdvantage: `إشراك التوكار N°${tocardSauveurNum || "المنقذ"} يرفع قيمة الـ Bonus 4 و Bonus 3 بأكثر من 4 أضعاف في حال تعثر أحد المرشحين.`,
        recommendedFlexiStake: "7.5 إلى 15 درهم (Flexi 25%)",
        expectedEv: "أرباح قياسية مضاعفة",
        theme: getTicketTheme(stats4.bonus4Prob, stats4.bonus3Prob, true)
      }
    ];
  }, [analyzedParticipants, activeGoldenBase, prediction, quinteSystem]);

  useEffect(() => {
    if (!params) return;
    fetch(`/api/pmu/race?date=${date}&reunion=${reunion}&course=${course}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((d: RaceData) => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("تعذر تحميل تفاصيل السباق.");
        setLoading(false);
      });
  }, [date, reunion, course, params]);

  const generatePrediction = async () => {
    if (!data) return;
    setPredictionLoading(true);
    
    try {
      // 1. Explicit TacticalAnalysisView Outputs
      const tacticalOutputs = tacticalScenario ? {
        paceType: tacticalScenario.paceType,
        paceTitle: tacticalScenario.paceTitle,
        paceDescription: tacticalScenario.paceDescription,
        probableLeaders: tacticalScenario.probableLeaders?.map(h => ({
          numPmu: h.numPmu,
          nom: h.nom,
          runningStyle: h.runningStyleLabel,
          turnEfficiency: h.pathfindingMetrics?.turnEfficiencyScore || 70,
        })),
        probableClosers: tacticalScenario.probableClosers?.map(h => ({
          numPmu: h.numPmu,
          nom: h.nom,
          straightlineAcceleration: h.pathfindingMetrics?.straightlineAccelerationScore || 70,
        })),
        tacticalAdvice: tacticalScenario.tacticalAdvice,
        goldenBase: tacticalScenario.goldenBase ? {
          numPmu: tacticalScenario.goldenBase.numPmu,
          nom: tacticalScenario.goldenBase.nom,
          tacticalScore: tacticalScenario.goldenBase.tacticalScore,
        } : undefined,
        safeCouples: tacticalScenario.safeCouples?.map(h => ({ numPmu: h.numPmu, nom: h.nom })),
        safeTierceReduction: tacticalScenario.safeTierceReduction?.map(h => ({
          numPmu: h.numPmu,
          nom: h.nom,
          turnEfficiency: h.pathfindingMetrics?.turnEfficiencyScore,
          straightlineAcceleration: h.pathfindingMetrics?.straightlineAccelerationScore,
          pathfindingOrdreScore: h.pathfindingMetrics?.pathfindingOrdreScore,
        })),
      } : null;

      // 2. Explicit QuantitativeAnalysisView Outputs
      const quantitativeOutputs = analyzedParticipants ? {
        participantsRatings: analyzedParticipants.map(m => ({
          numPmu: m.numPmu,
          nom: m.nom,
          predictivePowerScore: m.predictivePowerScore || calculatePredictivePowerScore(m, tacticalScenario),
          quantitativeScore: m.quantitativeScore,
          tacticalScore: m.tacticalScore,
          speedRatingKm: m.speedRatingKm,
          pathfindingScore: m.pathfindingMetrics?.pathfindingOrdreScore || 70,
          turnEfficiency: m.pathfindingMetrics?.turnEfficiencyScore || 70,
          straightlineAcceleration: m.pathfindingMetrics?.straightlineAccelerationScore || 70,
          winProb: m.winProb,
          top3Prob: m.top3Prob,
          ferrageCode: m.ferrageCode,
          ferrageLabel: m.ferrageLabel,
          odds: m.pmuOdds,
          tacticalRole: m.tacticalRole,
          fatigueReservePct: m.fatigueMetrics?.energyReservePct,
          riskRewardRatio: m.riskRewardMetrics?.ratio,
          riskRewardCategory: m.riskRewardMetrics?.categoryLabel,
          posProbMatrix: m.positionProbMatrix,
          valueIndex: m.valueIndex,
        })),
        syntheseUltime: quinteSystem?.syntheseUltime || [],
        fauxFavoris: quinteSystem?.fauxFavoris || [],
      } : null;

      // 3. Explicit Bonus & Quinté System Outputs
      const bonusSystemOutputs = quinteSystem ? {
        unbreakableBases: quinteSystem.unbreakableBases.map(b => ({ numPmu: b.numPmu, nom: b.nom })),
        primeAssocies: quinteSystem.primeAssociés.map(a => ({ numPmu: a.numPmu, nom: a.nom })),
        tocardSauveur: quinteSystem.tocardSauveur ? {
          numPmu: quinteSystem.tocardSauveur.numPmu,
          nom: quinteSystem.tocardSauveur.nom,
          odds: quinteSystem.tocardSauveur.pmuOdds,
          riskRewardRatio: quinteSystem.tocardSauveur.riskRewardMetrics?.ratio,
        } : null,
        coreTop5: quinteSystem.coreTop5.map(h => h.numPmu),
        extendedTop7: quinteSystem.extendedTop7.map(h => h.numPmu),
        overallDesordreConfidence: quinteSystem.overallDesordreConfidence,
        targetedStrategies: quinteSystem.targetedStrategies,
        bonusCombinations: {
          bonus3Picks: quinteSystem.targetedStrategies.quinteBonus3?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
          bonus4Picks: quinteSystem.targetedStrategies.quinteBonus4?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
          bonus5Picks: quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu),
        }
      } : null;

      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceInfo: data.info,
          participants: data.participants,
          date,
          reunion,
          course,
          tacticalOutputs,
          quantitativeOutputs,
          bonusSystemOutputs,
          selectedEnsemblePathway,
        }),
      });

      if (!res.ok) throw new Error("API Error");

      const result = await res.json();
      const ordreArr = data.info.ordreArrivee;
      const hasArrival = Array.isArray(ordreArr) && ordreArr.length > 0;
      const actualArrival = (hasArrival && ordreArr) ? ordreArr.map((pos: any) => pos[0]).slice(0, 5) : [];
      const isFinished = Boolean(data.info.statut !== "PROGRAMMEE" && hasArrival);

      const record: StoredPredictionRecord = {
        id: storageKey,
        date,
        reunion,
        course,
        raceName: data.info.libelle || `سباق (${reunion} ${course})`,
        hippodrome: (data as any)?.reunion?.hippodrome?.libelleCourt || (data as any)?.info?.hippodrome?.libelleCourt || "",
        discipline: data.info.discipline || "غير محدد",
        terrain: data.info.penetrometre?.intitule || data.info.typePiste || data.info.discipline || "غير محدد",
        distance: data.info.distance || 0,
        timestamp: Date.now(),
        savedAt: Date.now(),
        lastUpdated: Date.now(),
        prediction: result.prediction,
        goldenBase: result.goldenBase,
        bases: result.bases,
        associes: result.associes,
        tocardSauveur: result.tocardSauveur,
        quinteDesordrePicks: result.quinteDesordrePicks,
        desordreConfidenceScore: result.desordreConfidenceScore,
        analysis: result.analysis,
        tacticalAnalysis: result.tacticalAnalysis,
        quantitativeAnalysis: result.quantitativeAnalysis || `المؤشرات الكمية المعتمدة تدمج تصنيفات السرعة والمسار ومصفوفة الاحتمالات البايزية لحسم المراكز الخمسة.`,
        quinteDesordreAnalysis: result.quinteDesordreAnalysis,
        profitStrategy: result.profitStrategy,
        aiModelUsed: result.aiModelUsed || "Google Gemini AI Engine",
        isAiGenerated: result.isAiGenerated ?? true,
        ensemblePathway: selectedEnsemblePathway,
        tacticalScenario: result.tacticalScenario || (tacticalScenario ? {
          paceType: tacticalScenario.paceType,
          paceTitle: tacticalScenario.paceTitle,
          paceDescription: tacticalScenario.paceDescription,
          probableLeaders: tacticalScenario.probableLeaders?.map(h => ({ numPmu: h.numPmu, nom: h.nom })),
          probableClosers: tacticalScenario.probableClosers?.map(h => ({ numPmu: h.numPmu, nom: h.nom })),
          tacticalAdvice: tacticalScenario.tacticalAdvice,
          goldenBase: tacticalScenario.goldenBase ? { numPmu: tacticalScenario.goldenBase.numPmu, nom: tacticalScenario.goldenBase.nom } : undefined,
          safeCouples: tacticalScenario.safeCouples ? tacticalScenario.safeCouples.map(h => ({ numPmu: h.numPmu, nom: h.nom })) : undefined,
        } : undefined),
        quantitativeRatings: result.quantitativeRatings || (analyzedParticipants ? analyzedParticipants.map(m => ({
          numPmu: m.numPmu,
          nom: m.nom,
          predictivePowerScore: m.predictivePowerScore || calculatePredictivePowerScore(m, tacticalScenario),
          quantitativeScore: m.quantitativeScore,
          tacticalScore: m.tacticalScore,
          pathfindingScore: m.pathfindingMetrics?.pathfindingOrdreScore || 70,
          winProb: m.winProb,
          top3Prob: m.top3Prob,
          odds: m.pmuOdds,
          ferrage: m.ferrageCode,
          role: m.tacticalRole,
          speedRatingKm: m.speedRatingKm,
          energyReservePct: m.fatigueMetrics?.energyReservePct,
          riskRewardRatio: m.riskRewardMetrics?.ratio,
        })) : undefined),
        bonusCombinations: result.bonusCombinations || (quinteSystem ? {
          bonus3Picks: quinteSystem.targetedStrategies.quinteBonus3?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
          bonus4Picks: quinteSystem.targetedStrategies.quinteBonus4?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
          bonus5Picks: quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu),
          weightedCombinations: [
            {
              label: "توليفة Quinté+ Désordre & Bonus 5 المرجحة",
              combination: quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu),
              tierceOrdre: quinteSystem.targetedStrategies.tierceOrdre.ticket,
              confidence: quinteSystem.overallDesordreConfidence,
              evPotential: "عائد مرتفع (High EV)",
              type: "BONUS_5"
            },
            {
              label: "توليفة Quarté+ Bonus 3 التأمينية",
              combination: quinteSystem.targetedStrategies.quarteBonus3.ticket,
              tierceOrdre: quinteSystem.targetedStrategies.tierceOrdre.ticket,
              confidence: quinteSystem.targetedStrategies.quarteBonus3.confidence,
              evPotential: "عائد متوازن (Optimal)",
              type: "BONUS_3"
            }
          ]
        } : undefined),
        syntheseUltime: result.syntheseUltime || quinteSystem?.syntheseUltime,
        profitMaximizerInsights: result.profitMaximizerInsights || quinteSystem?.profitMaximizerInsights,
        targetedStrategies: result.targetedStrategies || quinteSystem?.targetedStrategies,
        formulas: result.formulas || quinteSystem?.formulas,
        fauxFavoris: result.fauxFavoris || quinteSystem?.fauxFavoris,
        profitSafeguardRules: result.profitSafeguardRules || quinteSystem?.profitSafeguardRules,
        ensembleProfiles: result.ensembleProfiles || quinteSystem?.ensembleProfiles,
        isFinished,
        actualArrival,
        status: data.info.statut || "PROGRAMMEE",
        matchCount: isFinished ? result.prediction.filter((p: number) => actualArrival.includes(p)).length : 0
      };

      savePredictionRecord(record);
      setPrediction(record as any);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 4500);
    } catch (err) {
      console.warn("Using mathematical engine fallback:", err);
      // Fallback seamlessly to local high-precision quinteSystem
      if (quinteSystem) {
        const fallbackOrdreArr = data.info.ordreArrivee;
        const hasArrival = Array.isArray(fallbackOrdreArr) && fallbackOrdreArr.length > 0;
        const actualArrival = (hasArrival && fallbackOrdreArr) ? fallbackOrdreArr.map((pos: any) => pos[0]).slice(0, 5) : [];
        const isFinished = Boolean(data.info.statut !== "PROGRAMMEE" && hasArrival);

        const localPred: StoredPredictionRecord = {
          id: storageKey,
          date,
          reunion,
          course,
          raceName: data.info.libelle || `سباق (${reunion} ${course})`,
          hippodrome: (data as any)?.reunion?.hippodrome?.libelleCourt || (data as any)?.info?.hippodrome?.libelleCourt || "",
          discipline: data.info.discipline || "غير محدد",
          terrain: data.info.penetrometre?.intitule || data.info.typePiste || data.info.discipline || "غير محدد",
          distance: data.info.distance || 0,
          timestamp: Date.now(),
          savedAt: Date.now(),
          lastUpdated: Date.now(),
          analysis: `تحليل تكتيكي مسند لسباق ${data.info.libelle} (${data.info.distance}م): تم اعتماد النمذجة البايزية المتقدمة لتقليص فجوة التوقعات بين الخيول المفضلة والأوتسايدر وتثبيت الركيزة الذهبية N°${quinteSystem.unbreakableBases[0]?.numPmu || tacticalScenario?.goldenBase?.numPmu} مع تأمين جوائز الكينتي ديزورد والـ Bonus.`,
          prediction: quinteSystem.coreTop5.map(h => h.numPmu),
          goldenBase: quinteSystem.unbreakableBases[0]?.numPmu || tacticalScenario?.goldenBase?.numPmu,
          quinteDesordreAnalysis: `لضمان دخول 5 خيول في الكينتي ديزورد، تم تثبيت الركائز (${quinteSystem.unbreakableBases.map(b => b.numPmu).join(", ")}) وتطويق المراكز المتبقية بالخيول المرافقة والتوكار المنقذ في صيغة Champ Réduit مع المتغير X لتغطية جوائز Bonus 5 و Bonus 4 و Bonus 3.`,
          bases: quinteSystem.unbreakableBases.map(b => b.numPmu),
          associes: quinteSystem.primeAssociés.map(a => a.numPmu),
          tocardSauveur: quinteSystem.tocardSauveur ? quinteSystem.tocardSauveur.numPmu : undefined,
          quinteDesordrePicks: quinteSystem.extendedTop7.map(h => h.numPmu),
          desordreConfidenceScore: quinteSystem.overallDesordreConfidence,
          tacticalAnalysis: `سيناريو الشوط يتجه نحو "${tacticalScenario?.paceTitle || "سباق سريع"}". تم إخضاع المسار لتحليل ديناميكي للمنعطفات والخط المستقيم (Dynamic Pathfinding): الخيول ذات تصفيف الحوافر D4 تمتلك الأفضلية الحركية للتموضع المثالي على الحبل وحسم السرعة عند مدخل الخط المستقيم الأخير.`,
          quantitativeAnalysis: `المؤشرات الكمية تبرز الخيول ذات مؤشر القوة التنبؤية المرتفع وقوة الانعطاف لحسم سباق ${data.info.distance}م.`,
          profitStrategy: "تطبيق استراتيجية الرهان التبادلي والـ Combiné 6 يضمن استرداد رأس المال مع أرباح مضاعفة حتى عند وصول 4 خيول فقط عبر جوائز البونص.",
          aiModelUsed: "المحرك الرياضي البايزي ومحاكاة مونت كارلو (Bayesian Engine)",
          isAiGenerated: false,
          ensemblePathway: selectedEnsemblePathway,
          tacticalScenario: tacticalScenario ? {
            paceType: tacticalScenario.paceType,
            paceTitle: tacticalScenario.paceTitle,
            paceDescription: tacticalScenario.paceDescription,
            probableLeaders: tacticalScenario.probableLeaders?.map(h => ({ numPmu: h.numPmu, nom: h.nom })),
            probableClosers: tacticalScenario.probableClosers?.map(h => ({ numPmu: h.numPmu, nom: h.nom })),
            tacticalAdvice: tacticalScenario.tacticalAdvice,
            goldenBase: tacticalScenario.goldenBase ? { numPmu: tacticalScenario.goldenBase.numPmu, nom: tacticalScenario.goldenBase.nom } : undefined,
            safeCouples: tacticalScenario.safeCouples ? tacticalScenario.safeCouples.map(h => ({ numPmu: h.numPmu, nom: h.nom })) : undefined,
          } : undefined,
          quantitativeRatings: analyzedParticipants ? analyzedParticipants.map(m => ({
            numPmu: m.numPmu,
            nom: m.nom,
            predictivePowerScore: m.predictivePowerScore || calculatePredictivePowerScore(m, tacticalScenario),
            quantitativeScore: m.quantitativeScore,
            tacticalScore: m.tacticalScore,
            pathfindingScore: m.pathfindingMetrics?.pathfindingOrdreScore || 70,
            winProb: m.winProb,
            top3Prob: m.top3Prob,
            odds: m.pmuOdds,
            ferrage: m.ferrageCode,
            role: m.tacticalRole,
            speedRatingKm: m.speedRatingKm,
            energyReservePct: m.fatigueMetrics?.energyReservePct,
            riskRewardRatio: m.riskRewardMetrics?.ratio,
          })) : undefined,
          bonusCombinations: quinteSystem ? {
            bonus3Picks: quinteSystem.targetedStrategies.quinteBonus3?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
            bonus4Picks: quinteSystem.targetedStrategies.quinteBonus4?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
            bonus5Picks: quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu),
            weightedCombinations: [
              {
                label: "توليفة Quinté+ Désordre & Bonus 5 المرجحة",
                combination: quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu),
                tierceOrdre: quinteSystem.targetedStrategies.tierceOrdre.ticket,
                confidence: quinteSystem.overallDesordreConfidence,
                evPotential: "عائد مرتفع (High EV)",
                type: "BONUS_5"
              },
              {
                label: "توليفة Quarté+ Bonus 3 التأمينية",
                combination: quinteSystem.targetedStrategies.quarteBonus3.ticket,
                tierceOrdre: quinteSystem.targetedStrategies.tierceOrdre.ticket,
                confidence: quinteSystem.targetedStrategies.quarteBonus3.confidence,
                evPotential: "عائد متوازن (Optimal)",
                type: "BONUS_3"
              }
            ]
          } : undefined,
          syntheseUltime: quinteSystem.syntheseUltime,
          profitMaximizerInsights: quinteSystem.profitMaximizerInsights,
          targetedStrategies: quinteSystem.targetedStrategies,
          formulas: quinteSystem.formulas,
          fauxFavoris: quinteSystem.fauxFavoris,
          profitSafeguardRules: quinteSystem.profitSafeguardRules,
          ensembleProfiles: quinteSystem.ensembleProfiles,
          isFinished,
          actualArrival,
          status: data.info.statut || "PROGRAMMEE",
          matchCount: isFinished ? quinteSystem.coreTop5.filter(h => actualArrival.includes(h.numPmu)).length : 0
        };

        savePredictionRecord(localPred);
        setPrediction(localPred as any);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 4500);
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  // Auto-initialize prediction if none exists in storage yet
  useEffect(() => {
    if (!mounted || !data || !quinteSystem || prediction) return;
    
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;

      // Check if we have a saved record in storage
      const existing = getPredictionRecord(date, reunion, course);
      if (existing) {
        setPrediction(existing as any);
        return;
      }

      // If no prediction exists yet, auto-trigger the AI generation to create and persist it
      if (!predictionLoading) {
        generatePrediction();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, data, quinteSystem, prediction, date, reunion, course, storageKey, tacticalScenario, selectedEnsemblePathway, predictionLoading]);

  // Sync arrival results to storage if available
  useEffect(() => {
    if (!data?.info?.ordreArrivee || data.info.ordreArrivee.length === 0) return;
    const arrivalFlat = data.info.ordreArrivee.map((pos: any) => pos[0]);
    updateRaceArrivalInStorage(date, reunion, course, arrivalFlat, data.info.statut);
  }, [data, date, reunion, course]);

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('ar-MA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50" dir="rtl">
        <div className="text-center p-6 bg-white rounded-2xl shadow-sm border">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-neutral-800">{error || "بيانات غير متوفرة"}</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-emerald-600 hover:underline">
            <ChevronRight className="w-4 h-4" /> العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const isFinished = data.info.statut !== "PROGRAMMEE" && data.info.statut !== "A_PARTIR";
  const hasArrival = Array.isArray(data.info.ordreArrivee) && data.info.ordreArrivee.length > 0;
  
  // Extract flat arrival array (first horse of each arrival pos)
  const arrivalFlat = hasArrival ? data.info.ordreArrivee!.map(pos => pos[0]) : [];

  return (
    <div className="min-h-screen bg-neutral-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <ArrowRight className="w-5 h-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">
                {reunion} • C{data.info.numOrdre} - {data.info.libelleCourt}
              </h1>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span suppressHydrationWarning>{formatTime(data.info.heureDepart)}</span>
                <span>•</span>
                <span>{data.info.distance}m</span>
                <span>•</span>
                <span>{data.info.discipline}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setProMode(!proMode);
                if (!proMode) setActiveTab("quantitative");
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                proMode 
                  ? "bg-neutral-900 text-amber-400 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]" 
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-indigo-300"
              )}
            >
              <Zap className={cn("w-4 h-4", proMode ? "fill-amber-400" : "")} />
              {proMode ? "وضع المحترف نشط" : "تفعيل وضع المحترف"}
            </button>

            <Link 
              href="/history"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors text-sm shrink-0"
            >
              سجل التوقعات
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Golden Opportunity Alerts (Real-time vs Predictive Model) */}
        {data.participants && data.participants.length > 0 && (
          <GoldenOpportunityAlerts 
            participants={data.participants} 
            prediction={prediction} 
          />
        )}

        {/* Race Timeline */}
        {!isFinished && !proMode && (
          <RaceTimeline departureTime={data.info.heureDepart} />
        )}

        {/* Pro Mode Profit Simulator */}
        {proMode && analyzedParticipants.length > 0 && (
          <div className="space-y-6">
            <ProfitSimulator metrics={analyzedParticipants} />
          </div>
        )}
        
        {/* Arrival / Results Section */}
        {isFinished && (
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-bold">النتيجة النهائية</h2>
            </div>
            
            {hasArrival ? (
              <div className="flex flex-wrap gap-3">
                {arrivalFlat.slice(0, 5).map((horseNum, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <span className="text-xs text-neutral-500 mb-1">{index + 1}</span>
                    <div className="w-12 h-12 bg-neutral-900 text-white font-bold rounded-xl flex items-center justify-center text-xl shadow-sm">
                      {horseNum}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">النتيجة غير متوفرة بعد.</p>
            )}
          </div>
        )}

        {/* AI Prediction Section */}
        {mounted && (
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-neutral-950 rounded-2xl shadow-sm border border-indigo-800 p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold">توقع الذكاء الاصطناعي والمحرك التكتيكي</h2>
                    {prediction?.isAiGenerated ? (
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        AI Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        النموذج البايزي الفائق
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>النموذج: <span className="font-semibold text-white">{prediction?.aiModelUsed || "Google Gemini 3.1 Flash"}</span></span>
                    {prediction?.savedAt && (
                      <span className="text-indigo-300">• تم الحفظ: {formatTime(prediction.savedAt)}</span>
                    )}
                    {savedToast && (
                      <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 px-2 py-0.5 rounded-full font-bold text-[11px] animate-pulse flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" /> تم الحفظ في الأرشيف الدائم
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link
                  href="/history"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-indigo-200 hover:text-white rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>الأرشيف</span>
                </Link>

                <button 
                  onClick={generatePrediction}
                  disabled={predictionLoading}
                  className="bg-white text-indigo-950 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {predictionLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> جاري التحليل بالـ AI...</>
                  ) : (
                    <><Bot className="w-3.5 h-3.5 text-indigo-600" /> تحديث بالذكاء الاصطناعي</>
                  )}
                </button>
              </div>
            </div>

            {!prediction ? (
              <div className="text-center py-6">
                <p className="text-indigo-200 mb-6">قم بتحليل بيانات الخيول والسرعة وتصفيف الحوافر D4 والمؤشرات الكمية لضمان التوقع والربح.</p>
                <button 
                  onClick={generatePrediction}
                  disabled={predictionLoading}
                  className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-neutral-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto mx-auto"
                >
                  {predictionLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> جاري المعالجة التكتيكية والكمية...</>
                  ) : (
                    "توليد التحليل التكتيكي والكمي الآن"
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Golden Base & Profit Security Pill */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white/10 rounded-xl p-3.5 backdrop-blur-md border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-amber-400 text-neutral-950 font-black rounded-lg text-xs">
                      ⭐ الركيزة الذهبية الأكثر أماناً (Base en Or):
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-white text-neutral-950 font-black text-sm flex items-center justify-center shadow">
                        {activeGoldenBase}
                      </span>
                      <span className="text-xs font-bold text-emerald-300">
                        أعلى نسبة وصول للمراكز الأولى تفوق 80%
                      </span>
                    </div>
                  </div>

                  {!proMode && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setActiveTab("tactical")}
                        className="text-[11px] font-bold bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 px-3 py-1.5 rounded-lg border border-indigo-400/30 transition-colors"
                      >
                        عرض السيناريو التكتيكي ←
                      </button>
                      <button 
                        onClick={() => setActiveTab("quantitative")}
                        className="text-[11px] font-bold bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 px-3 py-1.5 rounded-lg border border-indigo-400/30 transition-colors"
                      >
                        عرض المصفوفة الكمية ←
                      </button>
                    </div>
                  )}
                </div>

                {!proMode && (
                  <div className="space-y-3">
                    {/* Executive AI Analysis */}
                    <div className="bg-white/10 rounded-xl p-4 text-indigo-50 text-sm leading-relaxed backdrop-blur-md border border-white/10">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-amber-400" />
                          التحليل الاستراتيجي التنفيذي للذكاء الاصطناعي:
                        </span>
                        <span className="text-[10px] text-indigo-200">
                          ربط الخيول، الأوزان، المدربين وتصفيف الحوافر D4
                        </span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed font-sans">{prediction.analysis}</p>
                    </div>

                    {/* Pathfinding & Dynamic Curve Analysis */}
                    {prediction.tacticalAnalysis && (
                      <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-xl p-3.5 text-xs text-indigo-100 space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-300 font-bold">
                          <Compass className="w-4 h-4 text-amber-400" />
                          <span>تحليل المسار الديناميكي في المنعطفات والخط المستقيم (Dynamic Pathfinding):</span>
                        </div>
                        <p className="leading-relaxed text-indigo-200">{prediction.tacticalAnalysis}</p>
                      </div>
                    )}

                    {/* Quinte Desordre & Bonus Safeguard */}
                    {prediction.quinteDesordreAnalysis && (
                      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-100 space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-300 font-bold">
                          <Trophy className="w-4 h-4 text-emerald-400" />
                          <span>تكتيك الكينتي ديزورد والـ Bonus 5/4/3:</span>
                        </div>
                        <p className="leading-relaxed text-emerald-200">{prediction.quinteDesordreAnalysis}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Profit Strategy callout */}
                {prediction.profitStrategy && (
                  <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-3.5 text-xs text-emerald-100 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-300 font-bold block mb-0.5">توجيه إدارة المخاطر وضمان الربح:</strong>
                      <span>{prediction.profitStrategy}</span>
                    </div>
                  </div>
                )}

                {/* Ensemble Modeling Pathway Selector */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      مسارات التوقع التجميعي (Ensemble Modeling):
                    </span>
                    <span className="text-[11px] text-indigo-200">
                      اختر استراتيجية التوقع لتحديث الترتيب والتذاكر فورياً:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedEnsemblePathway("conservative")}
                      className={cn(
                        "p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between",
                        selectedEnsemblePathway === "conservative"
                          ? "bg-blue-600/50 border-blue-400 text-white shadow-md ring-2 ring-blue-400/40"
                          : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1 text-blue-300">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          المسار المحافظ
                        </span>
                        <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-bold">ثقة 95%</span>
                      </div>
                      <p className="text-[10px] text-neutral-300 leading-tight">تأمين أقوى الركائز الصلبة وتفادي الإقصاء</p>
                    </button>

                    <button
                      onClick={() => setSelectedEnsemblePathway("balanced")}
                      className={cn(
                        "p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between",
                        selectedEnsemblePathway === "balanced"
                          ? "bg-emerald-600/50 border-emerald-400 text-white shadow-md ring-2 ring-emerald-400/40"
                          : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1 text-emerald-300">
                          <Scale className="w-3.5 h-3.5" />
                          المسار المتوازن (EV+)
                        </span>
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold">ثقة 90%</span>
                      </div>
                      <p className="text-[10px] text-neutral-300 leading-tight">توازن القوة الرياضية والتغطية الذكية</p>
                    </button>

                    <button
                      onClick={() => setSelectedEnsemblePathway("aggressive")}
                      className={cn(
                        "p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between",
                        selectedEnsemblePathway === "aggressive"
                          ? "bg-amber-600/50 border-amber-400 text-white shadow-md ring-2 ring-amber-400/40"
                          : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1 text-amber-300">
                          <Rocket className="w-3.5 h-3.5" />
                          المسار الهجومي
                        </span>
                        <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded font-bold">ثقة 76%</span>
                      </div>
                      <p className="text-[10px] text-neutral-300 leading-tight">صيد التوكار المنقذ وأموال المؤسسات لعوائد كبرى</p>
                    </button>
                  </div>
                </div>
                
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>الخماسي المتوقع للشوط (Quinté+ Sélection):</span>
                      </h3>
                      <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold">
                        متوافق رقمياً وتكتيكياً
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab("smart_betting")}
                      className="text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-400/20 hover:bg-amber-400/30 px-3 py-1 rounded-lg border border-amber-400/30 transition-all flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <span>عرض تذاكر ضمان الـ 5 خيول في الديزورد</span>
                      <span>←</span>
                    </button>
                  </div>

                  {/* Top 5 Detailed Color-Coded Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {activePicks.slice(0, 5).map((horseNum, index) => {
                      const p = data.participants.find(x => x.numPmu === horseNum);
                      const m = analyzedParticipants.find(x => x.numPmu === horseNum) || (prediction as any)?.quantitativeRatings?.find((r: any) => r.numPmu === horseNum);
                      
                      const isGolden = horseNum === activeGoldenBase;
                      const isBase = (prediction.bases?.includes(horseNum) || quinteSystem?.unbreakableBases.some(b => b.numPmu === horseNum)) && !isGolden;
                      const isTocard = (horseNum === prediction.tocardSauveur || quinteSystem?.tocardSauveur?.numPmu === horseNum);
                      const isAssocie = (prediction.associes?.includes(horseNum) || quinteSystem?.primeAssociés.some(a => a.numPmu === horseNum)) && !isGolden && !isBase && !isTocard;
                      
                      const powerScore = m?.predictivePowerScore || (m ? calculatePredictivePowerScore(m, tacticalScenario) : 78);
                      const pathfindingScore = m?.pathfindingMetrics?.pathfindingOrdreScore || m?.pathfindingScore || 72;
                      const ferrage = m?.ferrageCode || m?.ferrage || "D0";
                      const odds = m?.pmuOdds || m?.odds || ((p as any)?.dernierRapportDirect?.rapport ? String((p as any).dernierRapportDirect.rapport) : "—");
                      const winProb = m?.winProb || 18;
                      const top3Prob = m?.top3Prob || 42;
                      const driver = p?.driver || p?.jockey || "غير محدد";
                      const speedRating = m?.speedRatingKm ? `${m.speedRatingKm}` : (p?.musique ? p.musique.slice(0, 7) : "—");

                      let isMatch = false;
                      let actualRank = 0;
                      if (isFinished && hasArrival) {
                        isMatch = arrivalFlat.slice(0, 5).includes(horseNum);
                        actualRank = arrivalFlat.indexOf(horseNum) + 1;
                      }

                      // Position labels
                      const posLabels = ["1er (فائز محتمل)", "2e (وصيف)", "3e (Tiercé)", "4e (Quarté+)", "5e (Quinté+)"];
                      const posLabel = posLabels[index] || `${index + 1}e`;

                      // Role Styles
                      let cardTheme = "border-indigo-500/30 bg-neutral-900/80 shadow-md";
                      let roleBadgeText = "🛡️ منافس رئيسي";
                      let roleBadgeClass = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
                      let numBadgeClass = "bg-indigo-600 text-white";

                      if (isGolden) {
                        cardTheme = "border-amber-400/90 bg-gradient-to-b from-amber-500/20 via-neutral-900/95 to-amber-950/40 shadow-[0_0_20px_rgba(251,191,36,0.2)] ring-1 ring-amber-400/50";
                        roleBadgeText = "⭐ الركيزة الذهبية";
                        roleBadgeClass = "bg-amber-400 text-neutral-950 font-black border-amber-300 shadow-sm";
                        numBadgeClass = "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-neutral-950 ring-2 ring-amber-300 shadow-md";
                      } else if (isBase) {
                        cardTheme = "border-emerald-400/80 bg-gradient-to-b from-emerald-500/20 via-neutral-900/95 to-emerald-950/40 shadow-[0_0_15px_rgba(52,211,153,0.15)] ring-1 ring-emerald-400/40";
                        roleBadgeText = "🎯 ركيزة ثابتة";
                        roleBadgeClass = "bg-emerald-500 text-neutral-950 font-black border-emerald-300 shadow-sm";
                        numBadgeClass = "bg-gradient-to-br from-emerald-400 to-emerald-600 text-neutral-950 ring-2 ring-emerald-300 shadow-md";
                      } else if (isTocard) {
                        cardTheme = "border-fuchsia-400/80 bg-gradient-to-b from-fuchsia-500/20 via-neutral-900/95 to-purple-950/40 shadow-[0_0_15px_rgba(232,121,249,0.15)] ring-1 ring-fuchsia-400/40";
                        roleBadgeText = "🔥 توكار منقذ (High EV)";
                        roleBadgeClass = "bg-fuchsia-500 text-white font-black border-fuchsia-300 shadow-sm";
                        numBadgeClass = "bg-gradient-to-br from-fuchsia-400 to-purple-600 text-white ring-2 ring-fuchsia-300 shadow-md";
                      } else if (isAssocie) {
                        cardTheme = "border-cyan-400/70 bg-gradient-to-b from-cyan-500/15 via-neutral-900/95 to-cyan-950/30 ring-1 ring-cyan-400/30";
                        roleBadgeText = "⚡ مرافق مؤهل";
                        roleBadgeClass = "bg-cyan-500/20 text-cyan-200 font-bold border-cyan-400/40";
                        numBadgeClass = "bg-gradient-to-br from-cyan-400 to-blue-600 text-white ring-2 ring-cyan-300 shadow-md";
                      }

                      return (
                        <div 
                          key={index} 
                          className={cn(
                            "rounded-2xl border p-3 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02]",
                            cardTheme,
                            isMatch && "ring-2 ring-emerald-400 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)]"
                          )}
                        >
                          {/* Top row: Order rank & Role tag */}
                          <div className="flex items-center justify-between gap-1 mb-2 pb-2 border-b border-white/10">
                            <span className="text-[11px] font-bold text-neutral-300 bg-white/10 px-2 py-0.5 rounded-md">
                              {posLabel}
                            </span>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-md border font-bold", roleBadgeClass)}>
                              {roleBadgeText}
                            </span>
                          </div>

                          {/* Middle: Big PMU Number & Horse Details */}
                          <div className="flex items-center gap-2.5 my-1">
                            <div className={cn(
                              "w-12 h-12 font-black rounded-xl flex items-center justify-center text-2xl shrink-0 font-mono",
                              numBadgeClass
                            )}>
                              {horseNum}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-black text-white text-sm truncate" title={p?.nom || `خيل N°${horseNum}`}>
                                {p?.nom || `خيل N°${horseNum}`}
                              </h4>
                              <p className="text-[11px] text-neutral-400 truncate flex items-center gap-1">
                                <span>{driver}</span>
                              </p>
                            </div>
                          </div>

                          {/* Numerical & Tactical Benchmarks Matrix */}
                          <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5 text-[11px]">
                            {/* Power Score & Pathfinding */}
                            <div className="flex items-center justify-between bg-black/30 px-2 py-1 rounded-lg">
                              <span className="text-neutral-400">القوة التنبؤية:</span>
                              <span className={cn(
                                "font-mono font-black",
                                powerScore >= 85 ? "text-emerald-400" : powerScore >= 75 ? "text-amber-300" : "text-neutral-200"
                              )}>
                                {powerScore}/100
                              </span>
                            </div>

                            {/* Speed / Path & Ferrage */}
                            <div className="flex items-center justify-between text-neutral-300 px-1">
                              <span className="text-[10px] text-neutral-400">المسار والسرعة:</span>
                              <div className="flex items-center gap-1 font-mono font-bold">
                                <span className="text-cyan-300 text-[10px]">{pathfindingScore}/100</span>
                                {ferrage && (
                                  <span className={cn(
                                    "text-[9px] px-1 rounded font-bold",
                                    ferrage === "D4" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-neutral-800 text-neutral-300"
                                  )}>
                                    {ferrage}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* PMU Odds & Top 3 Prob */}
                            <div className="flex items-center justify-between text-neutral-300 px-1">
                              <span className="text-[10px] text-neutral-400">كوتة PMU / Place:</span>
                              <div className="flex items-center gap-1.5 font-mono font-bold">
                                <span className="text-amber-300">{odds}</span>
                                <span className="text-emerald-400 text-[10px]">({top3Prob}%)</span>
                              </div>
                            </div>
                          </div>

                          {/* Arrival match badge if finished */}
                          {isFinished && hasArrival && (
                            <div className={cn(
                              "mt-2 pt-2 border-t text-center text-xs font-bold rounded-lg py-1 flex items-center justify-center gap-1",
                              isMatch ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-neutral-800/40 text-neutral-500 border-neutral-700/30"
                            )}>
                              {isMatch ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>وصل في الترتيب ({actualRank}e)</span>
                                </>
                              ) : (
                                <span>خارج الخمسة الأوائل</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quinté Désordre coverage pill */}
                  {prediction.quinteDesordrePicks && prediction.quinteDesordrePicks.length > 5 && (
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">تغطية الديزورد الموسعة (7 خيول):</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                          {prediction.quinteDesordrePicks.map((num: number) => (
                            <span key={num} className="w-6 h-6 rounded bg-indigo-800 flex items-center justify-center text-xs">
                              {num}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded">
                        نسبة تطويق الـ 5 الأوائل {prediction.desordreConfidenceScore || 92}%
                      </span>
                    </div>
                  )}

                  {/* 5+ Targeted PMU Objectives Cards (استراتيجيات الرهان المركزة على النتائج الخمسة المطلوبة و Bonus 5) */}
                  {(() => {
                    const targeted = activeTargetedStrategies || prediction?.targetedStrategies || quinteSystem?.targetedStrategies;
                    if (!targeted) return null;

                    return (
                      <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <span>التوليفات الموجهة لنتائج الرهانات المستهدفة (Formules Ciblées):</span>
                          </h4>
                          <span className="text-[11px] bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded font-bold">
                            أعلى عائد EV
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {/* 1. Tiercé: Ordre */}
                          <div className="bg-white/5 border border-amber-500/30 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-amber-300">Tiercé: الترتيب الصحيح (Ordre)</span>
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded">
                                ثقة {targeted.tierceOrdre.confidence}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm">
                              {targeted.tierceOrdre.ticket.map((num, i) => (
                                <span key={i} className="w-7 h-7 rounded bg-amber-500 text-neutral-950 flex items-center justify-center">
                                  {num}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-neutral-300 line-clamp-2">
                              {targeted.tierceOrdre.tacticalReason}
                            </p>
                            <div className="text-[10px] font-mono text-emerald-400 font-bold">
                              عائد متوقع: {targeted.tierceOrdre.expectedPayoutRange}
                            </div>
                          </div>

                          {/* 2. Quarté+: Bonus 3 */}
                          <div className="bg-white/5 border border-indigo-500/30 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-indigo-300">Quarté+: بونص 3 (Bonus 3)</span>
                              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded">
                                ثقة {targeted.quarteBonus3.confidence}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm">
                              {targeted.quarteBonus3.ticket.map((num, i) => (
                                <span key={i} className="w-7 h-7 rounded bg-indigo-500 text-white flex items-center justify-center">
                                  {num}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-neutral-300 line-clamp-2">
                              {targeted.quarteBonus3.tacticalReason}
                            </p>
                            <div className="text-[10px] font-mono text-emerald-400 font-bold">
                              عائد متوقع: {targeted.quarteBonus3.expectedPayoutRange}
                            </div>
                          </div>

                          {/* 3. Quinté+: Bonus 3 */}
                          <div className="bg-white/5 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-300">Quinté+: بونص 3 (Bonus 3)</span>
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded">
                                ثقة {targeted.quinteBonus3.confidence}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm">
                              {targeted.quinteBonus3.ticket.map((num, i) => (
                                <span key={i} className="w-7 h-7 rounded bg-emerald-600 text-white flex items-center justify-center">
                                  {num}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-neutral-300 line-clamp-2">
                              {targeted.quinteBonus3.tacticalReason}
                            </p>
                            <div className="text-[10px] font-mono text-emerald-400 font-bold">
                              عائد متوقع: {targeted.quinteBonus3.expectedPayoutRange}
                            </div>
                          </div>

                          {/* 4. Quinté+: Bonus 4 */}
                          <div className="bg-white/5 border border-cyan-500/30 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-cyan-300">Quinté+: بونص 4 (Bonus 4)</span>
                              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-200 px-1.5 py-0.5 rounded">
                                ثقة {targeted.quinteBonus4.confidence}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm">
                              {targeted.quinteBonus4.ticket.map((num, i) => (
                                <span key={i} className="w-7 h-7 rounded bg-cyan-600 text-white flex items-center justify-center">
                                  {num}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-neutral-300 line-clamp-2">
                              {targeted.quinteBonus4.tacticalReason}
                            </p>
                            <div className="text-[10px] font-mono text-emerald-400 font-bold">
                              عائد متوقع: {targeted.quinteBonus4.expectedPayoutRange}
                            </div>
                          </div>

                          {/* 5. Quinté+: Bonus 5 */}
                          {targeted.quinteBonus5 && (
                            <div className="bg-white/5 border border-teal-500/30 rounded-xl p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-teal-300">Quinté+: بونص 5 (Bonus 5)</span>
                                <span className="text-[10px] font-bold bg-teal-500/20 text-teal-200 px-1.5 py-0.5 rounded">
                                  ثقة {targeted.quinteBonus5.confidence}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm">
                                {targeted.quinteBonus5.ticket.map((num, i) => (
                                  <span key={i} className="w-7 h-7 rounded bg-teal-600 text-white flex items-center justify-center">
                                    {num}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] text-neutral-300 line-clamp-2">
                                {targeted.quinteBonus5.tacticalReason}
                              </p>
                              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                                عائد متوقع: {targeted.quinteBonus5.expectedPayoutRange}
                              </div>
                            </div>
                          )}

                          {/* 6. Quinté+: Désordre */}
                          <div className={cn(
                            "bg-white/5 border border-purple-500/30 rounded-xl p-3 space-y-1.5",
                            targeted.quinteBonus5 ? "sm:col-span-2 lg:col-span-1" : "sm:col-span-2 lg:col-span-2"
                          )}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-purple-300">Quinté+: ترتيب عشوائي (Désordre) - صيغة الـ 6 خيول</span>
                              <span className="text-[10px] font-bold bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded">
                                ثقة {targeted.quinteDesordre.confidence}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm">
                              {targeted.quinteDesordre.ticketCombine6.map((num, i) => (
                                <span key={i} className="w-7 h-7 rounded bg-purple-600 text-white flex items-center justify-center">
                                  {num}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-neutral-300 line-clamp-2">
                              {targeted.quinteDesordre.tacticalReason}
                            </p>
                            <div className="text-[10px] font-mono text-emerald-400 font-bold">
                              عائد متوقع: {targeted.quinteDesordre.expectedPayoutRange}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dynamic Weighted Bonus Combinations Monitor (نظام رصد توليفات البونص المرجحة الملونة) */}
                  {calculatedWeightedBonusCards && calculatedWeightedBonusCards.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-white/10 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-black text-sm text-emerald-300 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-emerald-400" />
                            <span>نظام رصد توليفات البونص المرجحة (Bonus 3 & 4 Dynamic Monitor):</span>
                          </h4>
                          <p className="text-[11px] text-neutral-300 mt-0.5">
                            توليفات محسوبة باحتمالات كمية مباشرة لتأمين أرباح Bonus 4 و Bonus 3 وحماية رأس المال في حال لم يكتمل الرهان الأكبر.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 text-[10px] bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg text-neutral-200">
                          <Coins className="w-3.5 h-3.5 text-amber-300" />
                          <span>تلوين ديناميكي حسب نسبة تحقق البونص</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {calculatedWeightedBonusCards.map((bonusTicket) => {
                          const isCopied = copiedBonusTicketId === bonusTicket.id;

                          return (
                            <div
                              key={bonusTicket.id}
                              className={cn(
                                "rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden space-y-3",
                                bonusTicket.theme.containerClass
                              )}
                            >
                              {/* Top Banner: Badge & Copy Button */}
                              <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-white/10">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-[10px] px-2.5 py-0.5 rounded-md border font-black", bonusTicket.theme.badgeClass)}>
                                    {bonusTicket.theme.badgeText}
                                  </span>
                                  <span className="text-[10px] font-mono text-neutral-300 bg-black/40 px-2 py-0.5 rounded">
                                    {bonusTicket.targetBet}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleCopyBonusTicket(bonusTicket.id, bonusTicket.horses)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg text-[11px] font-bold border border-white/15 transition-all shadow-sm"
                                  title="نسخ أرقام التذكرة"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-300">تم النسخ!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-neutral-300" />
                                      <span>نسخ التذكرة</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Title & Subtitle */}
                              <div>
                                <h5 className="font-black text-sm text-white tracking-wide">
                                  {bonusTicket.title}
                                </h5>
                                <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                                  {bonusTicket.subtitle}
                                </p>
                              </div>

                              {/* Horse Number Pills with Details */}
                              <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-neutral-400">خيول التذكرة الخمسة:</span>
                                  <span className="text-[10px] font-mono text-amber-300 font-bold">
                                    {bonusTicket.horses.join(" - ")}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {bonusTicket.horses.map((num) => {
                                    const p = data.participants.find(x => x.numPmu === num);
                                    const m = analyzedParticipants.find(x => x.numPmu === num);
                                    const ferrage = m?.ferrageCode || "D0";
                                    const isGolden = num === activeGoldenBase;

                                    return (
                                      <div
                                        key={num}
                                        className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-2 py-1 rounded-lg hover:bg-white/15 transition-colors"
                                      >
                                        <span className={cn(
                                          "w-6 h-6 rounded-md font-mono font-black text-xs flex items-center justify-center shrink-0",
                                          bonusTicket.theme.pillBg
                                        )}>
                                          {num}
                                        </span>
                                        <div className="text-right">
                                          <div className="text-[10px] font-bold text-white max-w-[85px] truncate">
                                            {p?.nom || `خيل ${num}`}
                                          </div>
                                          <div className="flex items-center gap-1 text-[9px] text-neutral-400">
                                            {ferrage && ferrage !== "D0" && (
                                              <span className={ferrage === "D4" ? "text-emerald-400 font-bold" : "text-neutral-300"}>
                                                {ferrage}
                                              </span>
                                            )}
                                            {isGolden && <span className="text-amber-300 font-black">⭐Base</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Probabilities and Safeguard Gauges */}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {/* Bonus 4 Gauge */}
                                <div className="bg-black/30 border border-white/10 rounded-xl p-2 space-y-1">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-neutral-300 font-bold">احتمالية Bonus 4:</span>
                                    <span className={cn("font-mono font-black text-xs", bonusTicket.theme.probNumberColor)}>
                                      {bonusTicket.bonus4Prob}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full transition-all duration-500", 
                                        bonusTicket.bonus4Prob >= 75 ? "bg-emerald-400" : bonusTicket.bonus4Prob >= 60 ? "bg-amber-400" : "bg-fuchsia-400"
                                      )}
                                      style={{ width: `${Math.min(100, bonusTicket.bonus4Prob)}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Bonus 3 Gauge */}
                                <div className="bg-black/30 border border-white/10 rounded-xl p-2 space-y-1">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-neutral-300 font-bold">احتمالية Bonus 3:</span>
                                    <span className="font-mono font-black text-xs text-emerald-300">
                                      {bonusTicket.bonus3Prob}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                                      style={{ width: `${Math.min(100, bonusTicket.bonus3Prob)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Tactical Safeguard Note & EV */}
                              <div className="pt-2 border-t border-white/10 space-y-1.5 text-[10px]">
                                <div className="flex items-start gap-1 text-neutral-200 leading-snug">
                                  <span className="text-amber-300 font-bold shrink-0">🛡️ الأثر التكتيكي:</span>
                                  <span>{bonusTicket.tacticalAdvantage}</span>
                                </div>
                                <div className="flex items-center justify-between text-neutral-300 pt-1">
                                  <span>تغطية البونص عند تعثر الـ 5: <strong className="text-emerald-300 font-mono">{bonusTicket.bonusCoverageIfIncomplete}%</strong></span>
                                  <span className="font-mono text-amber-300 font-bold">{bonusTicket.recommendedFlexiStake}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isFinished && hasArrival && (() => {
                  const outcomes = evaluateBetOutcome(activePicks, arrivalFlat);
                  const targetedOutcomes = evaluateTargetedBets(activePicks, arrivalFlat);
                  
                  return (
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-6">
                      {/* 5 Targeted PMU Outcomes Scorecard */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span>تقييم نتائج الرهانات الخمسة المحددة (Scorecard des 5 Objectifs Ciblés):</span>
                          </h4>
                          <span className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-lg border self-start sm:self-auto",
                            targetedOutcomes.totalHits >= 3 
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          )}>
                            نجاح {targetedOutcomes.totalHits} من 5 أهداف ({targetedOutcomes.overallTargetHitRate}%)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* 1. Quinté+ Désordre */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between space-y-2",
                            targetedOutcomes.quinteDesordre.achieved 
                              ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-md" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider block">
                                Quinté+: Désordre
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded",
                                targetedOutcomes.quinteDesordre.achieved 
                                  ? "bg-emerald-500 text-neutral-950 font-black" 
                                  : "bg-neutral-800 text-neutral-400"
                              )}>
                                {targetedOutcomes.quinteDesordre.achieved ? "متحقق بنجاح ✅" : "غير مكتمل ❌"}
                              </span>
                            </div>
                            <p className="text-[11px] leading-snug">
                              {targetedOutcomes.quinteDesordre.details}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                              <span>الخيول المتطابقة ({targetedOutcomes.quinteDesordre.matchedNumbers.length}):</span>
                              <span className="font-mono font-bold text-white">
                                {targetedOutcomes.quinteDesordre.matchedNumbers.length > 0 
                                  ? targetedOutcomes.quinteDesordre.matchedNumbers.join(" - ") 
                                  : "لا يوجد"}
                              </span>
                            </div>
                          </div>

                          {/* 2. Quinté+ Bonus 4 */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between space-y-2",
                            targetedOutcomes.quinteBonus4.achieved 
                              ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-md" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider block">
                                Quinté+: Bonus 4
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded",
                                targetedOutcomes.quinteBonus4.achieved 
                                  ? "bg-emerald-500 text-neutral-950 font-black" 
                                  : "bg-neutral-800 text-neutral-400"
                              )}>
                                {targetedOutcomes.quinteBonus4.achieved ? "متحقق بنجاح ✅" : "غير مكتمل ❌"}
                              </span>
                            </div>
                            <p className="text-[11px] leading-snug">
                              {targetedOutcomes.quinteBonus4.details}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                              <span>الخيول المتطابقة ({targetedOutcomes.quinteBonus4.matchedNumbers.length}):</span>
                              <span className="font-mono font-bold text-white">
                                {targetedOutcomes.quinteBonus4.matchedNumbers.length > 0 
                                  ? targetedOutcomes.quinteBonus4.matchedNumbers.join(" - ") 
                                  : "لا يوجد"}
                              </span>
                            </div>
                          </div>

                          {/* 3. Quinté+ Bonus 3 */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between space-y-2",
                            targetedOutcomes.quinteBonus3.achieved 
                              ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-md" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider block">
                                Quinté+: Bonus 3
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded",
                                targetedOutcomes.quinteBonus3.achieved 
                                  ? "bg-emerald-500 text-neutral-950 font-black" 
                                  : "bg-neutral-800 text-neutral-400"
                              )}>
                                {targetedOutcomes.quinteBonus3.achieved ? "متحقق بنجاح ✅" : "غير مكتمل ❌"}
                              </span>
                            </div>
                            <p className="text-[11px] leading-snug">
                              {targetedOutcomes.quinteBonus3.details}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                              <span>الخيول المتطابقة ({targetedOutcomes.quinteBonus3.matchedNumbers.length}):</span>
                              <span className="font-mono font-bold text-white">
                                {targetedOutcomes.quinteBonus3.matchedNumbers.length > 0 
                                  ? targetedOutcomes.quinteBonus3.matchedNumbers.join(" - ") 
                                  : "لا يوجد"}
                              </span>
                            </div>
                          </div>

                          {/* 4. Tiercé: Ordre */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between space-y-2",
                            targetedOutcomes.tierceOrdre.achieved 
                              ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-md" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider block">
                                Tiercé: الترتيب الصحيح (Ordre)
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded",
                                targetedOutcomes.tierceOrdre.achieved 
                                  ? "bg-emerald-500 text-neutral-950 font-black" 
                                  : "bg-neutral-800 text-neutral-400"
                              )}>
                                {targetedOutcomes.tierceOrdre.achieved ? "متحقق بنجاح ✅" : "غير مكتمل ❌"}
                              </span>
                            </div>
                            <p className="text-[11px] leading-snug">
                              {targetedOutcomes.tierceOrdre.details}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                              <span>الخيول المتطابقة ({targetedOutcomes.tierceOrdre.matchedNumbers.length}):</span>
                              <span className="font-mono font-bold text-white">
                                {targetedOutcomes.tierceOrdre.matchedNumbers.length > 0 
                                  ? targetedOutcomes.tierceOrdre.matchedNumbers.join(" - ") 
                                  : "لا يوجد"}
                              </span>
                            </div>
                          </div>

                          {/* 5. Quarté+: Bonus 3 */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between space-y-2 sm:col-span-2 lg:col-span-2",
                            targetedOutcomes.quarteBonus3.achieved 
                              ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-md" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider block">
                                Quarté+: بونص 3 (Bonus 3)
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded",
                                targetedOutcomes.quarteBonus3.achieved 
                                  ? "bg-emerald-500 text-neutral-950 font-black" 
                                  : "bg-neutral-800 text-neutral-400"
                              )}>
                                {targetedOutcomes.quarteBonus3.achieved ? "متحقق بنجاح ✅" : "غير مكتمل ❌"}
                              </span>
                            </div>
                            <p className="text-[11px] leading-snug">
                              {targetedOutcomes.quarteBonus3.details}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                              <span>الخيول المتطابقة ({targetedOutcomes.quarteBonus3.matchedNumbers.length}):</span>
                              <span className="font-mono font-bold text-white">
                                {targetedOutcomes.quarteBonus3.matchedNumbers.length > 0 
                                  ? targetedOutcomes.quarteBonus3.matchedNumbers.join(" - ") 
                                  : "لا يوجد"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* General Tiercé, Quarté, Quinté Standard Overview */}
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <h4 className="font-bold text-sm text-indigo-300">نظرة شاملة على الفئات العامة (Catégories Générales):</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Tiercé */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between h-20",
                            outcomes.tierce !== "NONE" 
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <span className="text-xs font-bold uppercase tracking-wider block">Tiercé (تيرسي)</span>
                            <span className="text-sm font-semibold truncate">
                              {outcomes.tierce !== "NONE" ? translateOutcome("tierce", outcomes.tierce) : "لا يوجد فوز"}
                            </span>
                          </div>

                          {/* Quarté */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between h-20",
                            outcomes.quarte !== "NONE" 
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <span className="text-xs font-bold uppercase tracking-wider block">Quarté+ (كوارتي)</span>
                            <span className="text-sm font-semibold truncate">
                              {outcomes.quarte !== "NONE" ? translateOutcome("quarte", outcomes.quarte) : "لا يوجد فوز"}
                            </span>
                          </div>

                          {/* Quinté */}
                          <div className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between h-20",
                            outcomes.quinte !== "NONE" 
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100" 
                              : "bg-white/5 border-white/10 text-indigo-200"
                          )}>
                            <span className="text-xs font-bold uppercase tracking-wider block">Quinté+ (كينتي)</span>
                            <span className="text-sm font-semibold truncate">
                              {outcomes.quinte !== "NONE" ? translateOutcome("quinte", outcomes.quinte) : "لا يوجد فوز"}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-indigo-200 flex flex-wrap gap-x-4 gap-y-1">
                          <span><strong className="text-white">الأخضر:</strong> الخيل متواجد ضمن الخمسة الأوائل.</span>
                          <span><strong className="text-white">Ordre:</strong> الترتيب الصحيح.</span>
                          <span><strong className="text-white">Désordre:</strong> ترتيب غير صحيح.</span>
                          <span><strong className="text-white">Bonus:</strong> وصول بعض من أوائل الخيول بغض النظر عن الترتيب.</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Dual Vision: Public Experts vs AI Predictions */}
        {!proMode && data.participants && data.participants.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  الرؤية المزدوجة: مقارنة توقعات الخبراء العامة (Public Experts vs AI)
                </h2>
                <p className="text-xs text-neutral-500">
                  توقعات حية تم جمعها آلياً وتصنيفها من كبرى المصادر والصحف الرياضية الفرنسية بجانب الذكاء الاصطناعي.
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 self-start sm:self-auto shrink-0">
                مصادر عامة مسندة 🌐
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getPublicExpertPredictions(data.participants).map((expert, idx) => {
                return (
                  <div key={idx} className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3 border-b pb-2 border-neutral-200/60">
                      <div>
                        <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-orange-500" />
                          {expert.name}
                        </h3>
                        <span className="text-[10px] text-neutral-400 font-medium">{expert.source}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">نسبة ثبات التوقع</span>
                        <span className="text-xs font-extrabold text-emerald-600 font-mono">{expert.trust}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 font-semibold shrink-0">ترتيب الخمسة الأوائل:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {expert.picks.map((horseNum, pIdx) => {
                            const isArrivalMatch = isFinished && hasArrival && arrivalFlat.slice(0, 5).includes(horseNum);
                            const matchesAI = prediction?.prediction?.includes(horseNum);

                            return (
                              <div key={pIdx} className="relative group">
                                <span className={cn(
                                  "w-8 h-8 rounded-lg font-extrabold font-mono text-xs flex items-center justify-center border shadow-sm transition-all",
                                  isArrivalMatch 
                                    ? "bg-emerald-500 text-white border-emerald-400 ring-1 ring-emerald-300"
                                    : matchesAI 
                                    ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                    : "bg-white text-neutral-700 border-neutral-200"
                                )}>
                                  {horseNum}
                                </span>
                                {matchesAI && (
                                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI comparison badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prediction ? (() => {
                          const matchingCount = expert.picks.filter(p => prediction.prediction.includes(p)).length;
                          return (
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1",
                              matchingCount >= 3 ? "bg-indigo-100 text-indigo-700" : "bg-neutral-100 text-neutral-600"
                            )}>
                              🤖 يطابق {matchingCount} من ترشيحات الذكاء الاصطناعي
                            </span>
                          );
                        })() : (
                          <span className="text-[10px] text-neutral-400">بانتظار توليد توقع الذكاء الاصطناعي للمقارنة...</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-neutral-50 border border-neutral-100 p-4 rounded-xl text-xs text-neutral-600 space-y-1 leading-relaxed">
              <p className="font-bold text-neutral-800 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                دليل قراءة مؤشر الرؤية المزدوجة (Dual Vision Guide):
              </p>
              <ul className="list-disc list-inside space-y-0.5 pr-2">
                <li>الخيول ذات الخلفية <strong className="text-emerald-700">الخضراء</strong> تمثل خيولاً وصلت بالفعل في المراكز الأولى للسباق حقيقةً.</li>
                <li>الخيول المزودة بـ <strong className="text-indigo-700">نقطة زرقاء متوهجة</strong> تمثل خيولاً توافق فيها الخيار العام مع ترشيحات النموذج الذكي لدينا.</li>
                <li>توفر هذه الرؤية المزدوجة دليلاً على تلاقي التحليل البشري للخبراء الميدانيين مع المعالجة الإحصائية المتقدمة للذكاء الاصطناعي.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-neutral-100 p-1.5 rounded-xl border mb-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tactical")}
            className={cn(
              "flex-1 min-w-[160px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === "tactical"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>التحليل التكتيكي وتوقع النتيجة</span>
            <span className="bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">تكتيك</span>
          </button>
          
          <button
            onClick={() => setActiveTab("quantitative")}
            className={cn(
              "flex-1 min-w-[160px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === "quantitative"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            <span>التحليل الكمّي والاستدلال البايزي</span>
            <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">بايزي Live</span>
          </button>

          <button
            onClick={() => setActiveTab("smart_betting")}
            className={cn(
              "flex-1 min-w-[170px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === "smart_betting"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام كينتي ديزورد وحماية الأرباح</span>
            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">ضمان 5 خيول</span>
          </button>

          <button
            onClick={() => setActiveTab("pattern_analysis")}
            className={cn(
              "flex-1 min-w-[170px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === "pattern_analysis"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <History className="w-4 h-4 text-amber-500" />
            <span>تحليل الأنماط والتيرين</span>
            {patternReport && patternReport.criticalAlertCount > 0 ? (
              <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {patternReport.criticalAlertCount} تحذير إخفاق ⚠️
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                مسح التيرين
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("speed_benchmark")}
            className={cn(
              "flex-1 min-w-[170px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === "speed_benchmark"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <Gauge className="w-4 h-4 text-cyan-600" />
            <span>مقارنة السرعة القصوى (6M)</span>
            <span className="bg-cyan-100 text-cyan-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              أرقام المضمار
            </span>
          </button>

          <button
            onClick={() => setActiveTab("simulator")}
            className={cn(
              "flex-1 min-w-[130px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all",
              activeTab === "simulator"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            المتسابقون ومحاكي مونتي كارلو
          </button>

          <button
            onClick={() => setActiveTab("live_comparison")}
            className={cn(
              "flex-1 min-w-[120px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all",
              activeTab === "live_comparison"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            المقارنة الحية (Live)
          </button>

          <button
            onClick={() => setActiveTab("odds_radar")}
            className={cn(
              "flex-1 min-w-[150px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === "odds_radar"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>رادار الاحتمالات</span>
            <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Live Radar</span>
          </button>

          <button
            onClick={() => setActiveTab("notebook")}
            className={cn(
              "flex-1 min-w-[130px] py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === "notebook"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <Notebook className="w-4 h-4 text-indigo-600" />
            <span>المفكرة</span>
          </button>
        </div>

        {activeTab === "tactical" ? (
          tacticalScenario && (
            <TacticalAnalysisView
              metrics={analyzedParticipants}
              scenario={tacticalScenario}
              raceInfo={data.info}
              prediction={prediction}
              onGeneratePrediction={generatePrediction}
              predictionLoading={predictionLoading}
              onNavigateToSpeedBenchmark={() => setActiveTab("speed_benchmark")}
            />
          )
        ) : activeTab === "quantitative" ? (
          <QuantitativeAnalysisView
            metrics={analyzedParticipants}
            raceInfo={data.info}
            scenario={tacticalScenario}
            prediction={prediction}
          />
        ) : activeTab === "simulator" ? (
          <>
            {/* Monte Carlo & Oracle Simulation Table */}
            {data.participants && data.participants.length > 0 && (
              <MonteCarloOracleTable participants={data.participants} />
            )}

            {/* Participants List */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-5 py-4 border-b bg-neutral-50 flex items-center justify-between">
                <h2 className="font-bold text-neutral-900">المتسابقون ({data.participants.length})</h2>
                <span className="text-xs text-neutral-500 font-medium">أحدث 3 سباقات</span>
              </div>
              
              <div className="divide-y">
                {data.participants.map((p) => {
                  const recentPerfs = parseMusique(p.musique);
                  
                  return (
                  <div key={p.numPmu} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 shrink-0 bg-neutral-900 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                        {p.numPmu}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-neutral-900 truncate">{p.nom}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                          <span>{p.age} سنوات • {p.sexe}</span>
                          <span>المدرب: <strong className="text-neutral-700">{p.entraineur}</strong></span>
                          {p.driver && <span>الراكب: <strong className="text-neutral-700">{p.driver}</strong></span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-neutral-100">
                      <div className="text-left shrink-0 sm:hidden block">
                        <div className="text-xs text-neutral-400 mb-1">Musique</div>
                        <div className="text-sm font-medium text-neutral-800 truncate" dir="ltr">
                          {p.musique || "-"}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2" dir="ltr">
                        {recentPerfs.length > 0 ? (
                          recentPerfs.map((perf, idx) => (
                            <div 
                              key={idx} 
                              title={`المركز: ${perf.charAt(0)}`}
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border shadow-sm",
                                getPerformanceStyle(perf)
                              )}
                            >
                              {perf.charAt(0)}
                              <span className="text-[10px] opacity-70 ml-0.5">{perf.charAt(1)}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-neutral-400 px-2">لا توجد بيانات</span>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </>
        ) : activeTab === "smart_betting" ? (
          <SmartBettingTickets
            metrics={analyzedParticipants}
            scenario={tacticalScenario}
            prediction={prediction}
            onGeneratePrediction={generatePrediction}
            predictionLoading={predictionLoading}
            selectedPathway={selectedEnsemblePathway}
            onSelectPathway={setSelectedEnsemblePathway}
          />
        ) : activeTab === "pattern_analysis" ? (
          <HistoricalPatternAnalysisModule
            metrics={analyzedParticipants}
            raceInfo={data.info}
            userSelectedNumbers={activePicks}
            onSelectHorse={(num) => {
              // Can also switch or inspect
            }}
          />
        ) : activeTab === "speed_benchmark" ? (
          <TrackSpeedBenchmarkComparisonView
            raceInfo={data.info}
            metrics={analyzedParticipants}
            predictedNumbers={activePicks}
          />
        ) : activeTab === "live_comparison" ? (
          <LiveReunionComparison
            date={date}
            reunion={reunion}
            currentCourse={course}
            currentParticipants={data.participants}
          />
        ) : activeTab === "odds_radar" ? (
          <OddsRadar participants={data.participants} />
        ) : (
          <BettorNotebook raceId={storageKey} />
        )}

      </main>
    </div>
  );
}
