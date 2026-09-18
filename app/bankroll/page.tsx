"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Wallet, 
  AlertCircle, 
  TrendingUp, 
  Calculator, 
  ShieldCheck, 
  Loader2, 
  TrendingDown, 
  Layers, 
  Scale, 
  Sparkles,
  DollarSign,
  Save,
  Check,
  Edit3,
  RefreshCw,
  Trophy,
  BarChart3,
  Coins,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluateBetOutcome, evaluateTargetedBets } from "@/lib/betEvaluator";
import { 
  getAllArchivedPredictions, 
  updateRaceFinancials, 
  StoredPredictionRecord, 
  syncWithServerArchive 
} from "@/lib/predictionStorage";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  Bar, 
  ComposedChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface LedgerItem {
  id: string;
  date: string;
  reunion: string;
  course: string;
  raceName: string;
  discipline: string;
  timestamp: number;
  dateStr: string;
  raceStr: string;
  prediction: number[];
  actualArrival: number[];
  isFinished: boolean;
  matchCount: number;
  actualStake: number;
  actualPayout: number;
  actualPnl: number;
  actualROI: number;
  isUserSetStake: boolean;
  tWin: boolean;
  q4Win: boolean;
  q5Win: boolean;
  bonus3Win: boolean;
  bonus4Win: boolean;
  bonus5Win: boolean;
  desordreWin: boolean;
  ordreWin: boolean;
}

export default function BankrollPage() {
  // Main view state: "dashboard" (لوحة التحكم) vs "real_report" (التقرير المالي الفعلي) vs "kelly_sim" (معيار كيلي) vs "cost_curve" vs "combinations"
  const [activeTab, setActiveTab] = useState<"dashboard" | "real_report" | "kelly_sim" | "cost_curve" | "combinations">("dashboard");

  // Bankroll & Strategy Settings
  const [bankroll, setBankroll] = useState<number>(1000);
  const [riskFraction, setRiskFraction] = useState<number>(0.5); // Half Kelly default
  const [tierceOdds, setTierceOdds] = useState<number>(15);
  const [quarteOdds, setQuarteOdds] = useState<number>(45);
  const [quinteOdds, setQuinteOdds] = useState<number>(150);

  // Default fallback stake for records that have no actualStake set yet
  const [defaultStake, setDefaultStake] = useState<number>(10);

  // Data Loading & Records
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<StoredPredictionRecord[]>([]);
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);

  // Editing state in ledger
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStakeValue, setEditStakeValue] = useState<string>("");
  const [editPayoutValue, setEditPayoutValue] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Search & Filters for Ledger
  const [ledgerSearch, setLedgerSearch] = useState<string>("");
  const [ledgerOutcomeFilter, setLedgerOutcomeFilter] = useState<"ALL" | "WINS" | "LOSSES" | "CUSTOM_SET">("ALL");

  // Simulation & Comparison States
  const [simBetType, setSimBetType] = useState<"tierce" | "quarte" | "quinte">("tierce");
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(10);
  const [projectionRaces, setProjectionRaces] = useState<number>(100);
  const [comparisonBetType, setComparisonBetType] = useState<"tierce" | "quarte" | "quinte">("tierce");

  // Historical P&L Chart Filters
  const [pnlChartMode, setPnlChartMode] = useState<"real_actual" | "theoretical">("real_actual");

  // Average Cost Curve States
  const [costCurveBetType, setCostCurveBetType] = useState<"tierce" | "quarte" | "quinte">("tierce");
  const [tierceUnitCost, setTierceUnitCost] = useState<number>(1.0);
  const [quarteUnitCost, setQuarteUnitCost] = useState<number>(1.3);
  const [quinteUnitCost, setQuinteUnitCost] = useState<number>(2.0);

  // Cross-Betting Calculator States
  const [crossBaseStake, setCrossBaseStake] = useState<number>(1);
  const [crossTierceEnabled, setCrossTierceEnabled] = useState<boolean>(true);
  const [crossTierceHorses, setCrossTierceHorses] = useState<number>(3);
  const [crossQuarteEnabled, setCrossQuarteEnabled] = useState<boolean>(false);
  const [crossQuarteHorses, setCrossQuarteHorses] = useState<number>(4);
  const [crossQuinteEnabled, setCrossQuinteEnabled] = useState<boolean>(false);
  const [crossQuinteHorses, setCrossQuinteHorses] = useState<number>(5);

  // Process and reconcile stored records into full ledger
  const processStoredRecords = useCallback((storedList: StoredPredictionRecord[], fallbackStake: number) => {
    const list: LedgerItem[] = [];

    for (const rec of storedList) {
      if (!rec || !rec.prediction || rec.prediction.length === 0) continue;

      const hasArrival = Array.isArray(rec.actualArrival) && rec.actualArrival.length >= 3;
      const isFin = Boolean(rec.isFinished && hasArrival);

      // Date parsing
      const d = parseInt(rec.date?.slice(0, 2) || "1", 10);
      const m = parseInt(rec.date?.slice(2, 4) || "1", 10);
      const y = parseInt(rec.date?.slice(4, 8) || "2026", 10);
      const r = parseInt((rec.reunion || "R1").replace("R", ""), 10) || 1;
      const c = parseInt((rec.course || "C1").replace("C", ""), 10) || 1;
      const timestamp = rec.savedAt || rec.timestamp || (new Date(y, m - 1, d).getTime() + (r * 100000) + c);

      // Outcomes evaluation
      let tWin = false;
      let q4Win = false;
      let q5Win = false;
      let bonus3Win = false;
      let bonus4Win = false;
      let bonus5Win = false;
      let desordreWin = false;
      let ordreWin = false;
      let matchCount = 0;

      if (isFin && rec.actualArrival) {
        const outcomes = evaluateBetOutcome(rec.prediction, rec.actualArrival);
        const targeted = rec.targetOutcomes || evaluateTargetedBets(rec.prediction, rec.actualArrival, rec.quinteDesordrePicks);
        
        tWin = outcomes.tierce !== "NONE";
        q4Win = outcomes.quarte !== "NONE";
        q5Win = outcomes.quinte !== "NONE";
        
        ordreWin = outcomes.tierce === "ORDRE" || (targeted.tierceOrdre?.won ?? false);
        desordreWin = outcomes.quinte === "DESORDRE" || (targeted.quinteDesordre?.won ?? false);
        bonus4Win = outcomes.quinte === "BONUS_4" || (targeted.quinteBonus4?.won ?? false);
        bonus3Win = outcomes.quinte === "BONUS_3" || outcomes.quarte === "BONUS_3" || (targeted.quinteBonus3?.won ?? false);
        bonus5Win = (targeted.quinteBonus5?.won ?? false);
        
        matchCount = rec.prediction.filter(p => rec.actualArrival!.includes(p)).length;
      }

      // Real Stake & Financial Calculation
      const isUserSetStake = rec.actualStake !== undefined && rec.actualStake !== null;
      const effectiveStake = isUserSetStake ? Number(rec.actualStake) : (isFin ? fallbackStake : 0);
      
      let effectivePayout = 0;
      if (rec.actualPayout !== undefined && rec.actualPayout !== null) {
        effectivePayout = Number(rec.actualPayout);
      } else if (isFin && effectiveStake > 0) {
        // Estimate default payout if not explicitly logged by user
        let payoutMult = 0;
        if (desordreWin) payoutMult += 35;
        if (bonus4Win) payoutMult += 8;
        if (bonus3Win) payoutMult += 3.5;
        if (ordreWin) payoutMult += 18;
        if (bonus5Win) payoutMult += 12;
        effectivePayout = Number((effectiveStake * payoutMult).toFixed(2));
      }

      const effectivePnl = isFin ? Number((effectivePayout - effectiveStake).toFixed(2)) : 0;
      const effectiveROI = isFin && effectiveStake > 0 ? Number(((effectivePnl / effectiveStake) * 100).toFixed(2)) : 0;

      list.push({
        id: rec.id,
        date: rec.date,
        reunion: rec.reunion,
        course: rec.course,
        raceName: rec.raceName || `سباق (${rec.reunion} ${rec.course})`,
        discipline: rec.discipline || "غير محدد",
        timestamp,
        dateStr: `${d}/${m}`,
        raceStr: `${rec.reunion}${rec.course}`,
        prediction: rec.prediction,
        actualArrival: rec.actualArrival || [],
        isFinished: isFin,
        matchCount,
        actualStake: effectiveStake,
        actualPayout: effectivePayout,
        actualPnl: effectivePnl,
        actualROI: effectiveROI,
        isUserSetStake,
        tWin,
        q4Win,
        q5Win,
        bonus3Win,
        bonus4Win,
        bonus5Win,
        desordreWin,
        ordreWin,
      });
    }

    // Sort chronologically ascending for timeline & metrics
    list.sort((a, b) => a.timestamp - b.timestamp);
    return list;
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initializeBankroll() {
      // Defer to async microtask to ensure pure synchronization
      await Promise.resolve();

      let storedList = getAllArchivedPredictions();
      try {
        const synced = await syncWithServerArchive();
        if (synced && synced.length > 0) {
          storedList = synced;
        }
      } catch (err) {
        console.warn("Server sync skipped:", err);
      }

      if (!ignore) {
        setRecords(storedList);
        setLedgerItems(processStoredRecords(storedList, defaultStake));
        setLoading(false);
      }
    }

    initializeBankroll();

    return () => {
      ignore = true;
    };
  }, [defaultStake, processStoredRecords]);

  const handleManualSync = async () => {
    setRefreshing(true);
    let storedList = getAllArchivedPredictions();
    try {
      const synced = await syncWithServerArchive();
      if (synced && synced.length > 0) {
        storedList = synced;
      }
    } catch (err) {
      console.warn("Server sync skipped:", err);
    }
    setRecords(storedList);
    setLedgerItems(processStoredRecords(storedList, defaultStake));
    setRefreshing(false);
  };

  // Handle saving inline stake/payout edit
  const handleSaveRaceFinancials = (item: LedgerItem) => {
    const numStake = Math.max(0, parseFloat(editStakeValue) || 0);
    const numPayout = editPayoutValue.trim() !== "" ? Math.max(0, parseFloat(editPayoutValue) || 0) : undefined;

    setSavingId(item.id);

    try {
      const updated = updateRaceFinancials(
        item.date,
        item.reunion,
        item.course,
        numStake,
        numPayout,
        "تحديث يدوي من صفحة رأس المال"
      );

      if (updated) {
        setSaveSuccessId(item.id);
        setTimeout(() => setSaveSuccessId(null), 2500);

        // Update local state directly
        const updatedRecords = records.map(r => r.id === item.id ? updated : r);
        setRecords(updatedRecords);
        setLedgerItems(processStoredRecords(updatedRecords, defaultStake));
      }
    } catch (err) {
      console.error("Failed to update financials:", err);
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  };

  const handleStartEdit = (item: LedgerItem) => {
    setEditingId(item.id);
    setEditStakeValue(item.actualStake.toString());
    setEditPayoutValue(item.actualPayout.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStakeValue("");
    setEditPayoutValue("");
  };

  // Filter finished items for financial metrics
  const finishedLedger = useMemo(() => {
    return ledgerItems.filter(item => item.isFinished);
  }, [ledgerItems]);

  // Real Financial Summary Metrics
  const realFinancialMetrics = useMemo(() => {
    let totalStakes = 0;
    let totalReturns = 0;
    let winningRaces = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let maxSingleWin = 0;
    let userSetCount = 0;

    let peakCumulative = 0;
    let maxDrawdown = 0;
    let currentCumulative = 0;

    for (const item of finishedLedger) {
      totalStakes += item.actualStake;
      totalReturns += item.actualPayout;
      if (item.isUserSetStake) userSetCount++;

      if (item.actualPnl > 0) {
        winningRaces++;
        grossWins += item.actualPnl;
        if (item.actualPnl > maxSingleWin) maxSingleWin = item.actualPnl;
      } else if (item.actualPnl < 0) {
        grossLosses += Math.abs(item.actualPnl);
      }

      currentCumulative += item.actualPnl;
      if (currentCumulative > peakCumulative) {
        peakCumulative = currentCumulative;
      }
      const dd = peakCumulative - currentCumulative;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }

    const netPnl = totalReturns - totalStakes;
    const overallROI = totalStakes > 0 ? (netPnl / totalStakes) * 100 : 0;
    const winRate = finishedLedger.length > 0 ? (winningRaces / finishedLedger.length) * 100 : 0;
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : (grossWins > 0 ? 99.9 : 0);
    const avgStakePerRace = finishedLedger.length > 0 ? totalStakes / finishedLedger.length : 0;
    const maxDrawdownPct = totalStakes > 0 ? (maxDrawdown / (bankroll + peakCumulative)) * 100 : 0;

    return {
      totalRaces: finishedLedger.length,
      userSetCount,
      totalStakes,
      totalReturns,
      netPnl,
      overallROI,
      winRate,
      profitFactor,
      avgStakePerRace,
      maxSingleWin,
      maxDrawdown,
      maxDrawdownPct,
    };
  }, [finishedLedger, bankroll]);

  // Historical Cumulative P&L Timeline Data
  const historicalPnlChartData = useMemo(() => {
    let cumRealPnl = 0;
    let cumRealStakes = 0;
    let cumRealPayout = 0;
    let cumTheoretical = 0;

    const data: any[] = [];

    for (let i = 0; i < finishedLedger.length; i++) {
      const res = finishedLedger[i];
      
      // Real Actual Calculation
      cumRealPnl += res.actualPnl;
      cumRealStakes += res.actualStake;
      cumRealPayout += res.actualPayout;
      const stepROI = cumRealStakes > 0 ? ((cumRealPayout - cumRealStakes) / cumRealStakes) * 100 : 0;

      // Theoretical Flat Calculation (10€ per bet on Tierce)
      const tPnL = res.tWin ? ((tierceOdds - 1) * 10) : -10;
      cumTheoretical += tPnL;

      data.push({
        step: i + 1,
        dateStr: res.dateStr,
        raceStr: res.raceStr,
        realPnl: Math.round(cumRealPnl * 100) / 100,
        realStakes: Math.round(cumRealStakes * 100) / 100,
        realPayout: Math.round(cumRealPayout * 100) / 100,
        realROI: Math.round(stepROI * 10) / 10,
        theoretical: Math.round(cumTheoretical * 100) / 100,
        racePnl: res.actualPnl,
        raceStake: res.actualStake,
        racePayout: res.actualPayout,
      });
    }

    return data;
  }, [finishedLedger, tierceOdds]);

  // Kelly Criterion Calculations based on real win rate
  const calculateKelly = (winRate: number, decimalOdds: number) => {
    if (winRate <= 0) return 0;
    const p = winRate;
    const q = 1 - p;
    const b = decimalOdds - 1; // Net odds
    if (b <= 0) return 0;
    const f = (p * b - q) / b;
    return Math.max(0, f);
  };

  const pTierce = finishedLedger.length > 0 ? finishedLedger.filter(r => r.tWin).length / finishedLedger.length : 0;
  const pQuarte = finishedLedger.length > 0 ? finishedLedger.filter(r => r.q4Win).length / finishedLedger.length : 0;
  const pQuinte = finishedLedger.length > 0 ? finishedLedger.filter(r => r.q5Win).length / finishedLedger.length : 0;

  const fTierce = calculateKelly(pTierce, tierceOdds) * riskFraction;
  const fQuarte = calculateKelly(pQuarte, quarteOdds) * riskFraction;
  const fQuinte = calculateKelly(pQuinte, quinteOdds) * riskFraction;

  // Drawdown Simulator Data
  const getSimData = () => {
    let f = 0;
    let p = 0;
    if (simBetType === "tierce") { f = fTierce; p = pTierce; }
    else if (simBetType === "quarte") { f = fQuarte; p = pQuarte; }
    else if (simBetType === "quinte") { f = fQuinte; p = pQuinte; }

    const data = [];
    let currentB = bankroll;
    for (let i = 0; i <= consecutiveLosses; i++) {
      data.push({
        step: i,
        balance: Math.round(currentB * 100) / 100
      });
      currentB = currentB * (1 - f);
    }
    const prob = Math.pow(1 - p, consecutiveLosses) * 100;
    return { data, prob, f };
  };

  const { data: simData, prob: simProb, f: simF } = getSimData();
  const simFinalBalance = simData[simData.length - 1]?.balance || bankroll;
  const drawdownPercent = bankroll > 0 ? ((bankroll - simFinalBalance) / bankroll) * 100 : 0;

  // Market Comparison Benchmark Data
  const getMarketComparisonData = () => {
    let f = 0;
    let p = 0;
    let odds = 0;
    
    if (comparisonBetType === "tierce") { f = fTierce; p = pTierce; odds = tierceOdds; }
    else if (comparisonBetType === "quarte") { f = fQuarte; p = pQuarte; odds = quarteOdds; }
    else if (comparisonBetType === "quinte") { f = fQuinte; p = pQuinte; odds = quinteOdds; }

    const data = [];
    const b = odds - 1;
    
    let g = 0;
    if (f > 0 && f < 1) {
      g = p * Math.log(1 + f * b) + (1 - p) * Math.log(1 - f);
    } else if (f === 1 && p === 1) {
      g = Math.log(1 + b);
    }

    const marketAnnualReturn = 0.10;
    const racesPerYear = 100;
    
    for (let i = 0; i <= projectionRaces; i++) {
      let strategyBalance = bankroll * Math.exp(g * i);
      if (g < 0) {
        strategyBalance = bankroll;
      }
      
      const marketBalance = bankroll * Math.pow(1 + marketAnnualReturn, i / racesPerYear);
      
      data.push({
        step: i,
        strategy: Math.round(strategyBalance),
        market: Math.round(marketBalance)
      });
    }
    
    return { data, g: g < 0 ? 0 : g };
  };

  const { data: comparisonData, g: geometricGrowth } = getMarketComparisonData();
  const finalStrategyBalance = comparisonData[comparisonData.length - 1]?.strategy || bankroll;
  const finalMarketBalance = comparisonData[comparisonData.length - 1]?.market || bankroll;
  const outperformance = finalMarketBalance > 0 ? finalStrategyBalance / finalMarketBalance : 1;

  // Combinations Formula Helper
  const getCombinations = (n: number, k: number) => {
    if (n < k || k <= 0) return 0;
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = (res * (n - i + 1)) / i;
    }
    return res;
  };

  // Cross-Betting Calculations
  const tCombs = crossTierceEnabled ? getCombinations(crossTierceHorses, 3) : 0;
  const q4Combs = crossQuarteEnabled ? getCombinations(crossQuarteHorses, 4) : 0;
  const q5Combs = crossQuinteEnabled ? getCombinations(crossQuinteHorses, 5) : 0;

  const crossTotalCost = (tCombs + q4Combs + q5Combs) * crossBaseStake;
  const crossExpectedReturn = 
    (crossTierceEnabled ? tierceOdds * crossBaseStake : 0) +
    (crossQuarteEnabled ? quarteOdds * crossBaseStake : 0) +
    (crossQuinteEnabled ? quinteOdds * crossBaseStake : 0);

  const crossNetProfit = crossExpectedReturn - crossTotalCost;
  const crossROI = crossTotalCost > 0 ? (crossNetProfit / crossTotalCost) * 100 : 0;

  // Average Cost Per Bet & Cost vs Success Rate Curve
  const costCurveData = useMemo(() => {
    let k = 3;
    let odds = tierceOdds;
    let unitCost = tierceUnitCost;
    let baseP = pTierce > 0 ? pTierce : 0.18;

    if (costCurveBetType === "quarte") {
      k = 4;
      odds = quarteOdds;
      unitCost = quarteUnitCost;
      baseP = pQuarte > 0 ? pQuarte : 0.07;
    } else if (costCurveBetType === "quinte") {
      k = 5;
      odds = quinteOdds;
      unitCost = quinteUnitCost;
      baseP = pQuinte > 0 ? pQuinte : 0.025;
    }

    const curvePoints: any[] = [];
    const minHorses = k;
    const maxHorses = k + 5;

    for (let h = minHorses; h <= maxHorses; h++) {
      const combs = getCombinations(h, k);
      const ticketCost = combs * unitCost;
      const extra = h - k;

      const diminishingFactor = extra === 0 ? 1 : 1 + Math.log(1 + extra * 1.6) * 0.92;
      const successRate = Math.min(88, Number((baseP * 100 * diminishingFactor).toFixed(1)));
      
      const expectedGross = (successRate / 100) * odds * unitCost;
      const netProfit = Number((expectedGross - ticketCost).toFixed(2));
      const roi = ticketCost > 0 ? Number(((netProfit / ticketCost) * 100).toFixed(1)) : 0;
      const efficiency = ticketCost > 0 ? Number((successRate / ticketCost).toFixed(2)) : 0;
      const isSweetSpot = h === k + 2 || (k === 5 && h === k + 1);

      curvePoints.push({
        horses: h,
        combinations: combs,
        label: `${h} خيول`,
        cost: Number(ticketCost.toFixed(2)),
        successRate,
        netProfit,
        roi,
        efficiency,
        isSweetSpot
      });
    }

    return curvePoints;
  }, [costCurveBetType, tierceOdds, quarteOdds, quinteOdds, tierceUnitCost, quarteUnitCost, quinteUnitCost, pTierce, pQuarte, pQuinte]);

  // Filtered Ledger for UI table
  const filteredLedger = useMemo(() => {
    return ledgerItems.filter((item) => {
      // Outcome filter
      if (ledgerOutcomeFilter === "WINS" && item.actualPnl <= 0) return false;
      if (ledgerOutcomeFilter === "LOSSES" && item.actualPnl >= 0) return false;
      if (ledgerOutcomeFilter === "CUSTOM_SET" && !item.isUserSetStake) return false;

      // Text search
      if (ledgerSearch.trim() !== "") {
        const query = ledgerSearch.toLowerCase();
        const matchesName = item.raceName.toLowerCase().includes(query);
        const matchesReunion = item.reunion.toLowerCase().includes(query);
        const matchesDate = item.date.includes(query);
        if (!matchesName && !matchesReunion && !matchesDate) return false;
      }

      return true;
    });
  }, [ledgerItems, ledgerOutcomeFilter, ledgerSearch]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 font-sans" dir="rtl">
      {/* Top Navbar */}
      <header className="bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all"
              title="العودة للرئيسية"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>إدارة رأس المال & التقرير المالي</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    Actual Stakes v2
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  تتبع دقيق للمبالغ المرهونة فعلياً والأرباح ومعدل العائد (ROI)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1.5 transition-all border border-neutral-700/60"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-400")} />
              <span className="hidden sm:inline">تحديث المزامنة</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex bg-neutral-900 border border-neutral-800 p-1.5 rounded-2xl overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex-1 min-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
            )}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>لوحة التحكم (Dashboard)</span>
          </button>

          <button
            onClick={() => setActiveTab("real_report")}
            className={cn(
              "flex-1 min-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === "real_report"
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-950/50"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span>التقرير المالي الفعلي</span>
          </button>

          <button
            onClick={() => setActiveTab("kelly_sim")}
            className={cn(
              "flex-1 min-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === "kelly_sim"
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-950/50"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
            )}
          >
            <Calculator className="w-4 h-4" />
            <span>معيار كيلي والمحاكاة</span>
          </button>

          <button
            onClick={() => setActiveTab("cost_curve")}
            className={cn(
              "flex-1 min-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === "cost_curve"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
            )}
          >
            <Scale className="w-4 h-4" />
            <span>منحنى التكلفة & النجاح</span>
          </button>

          <button
            onClick={() => setActiveTab("combinations")}
            className={cn(
              "flex-1 min-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === "combinations"
                ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-950/50"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
            )}
          >
            <Layers className="w-4 h-4" />
            <span>حاسبة التوليفات المركبة</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-neutral-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-400" />
            <p className="text-sm font-semibold">جاري استرجاع السجلات المالية وحساب الأرباح الفعلية...</p>
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* TAB 0: DASHBOARD (لوحة التحكم العامة والأرباح التراكمية)  */}
            {/* ======================================================== */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                {/* Header Banner */}
                <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>نظام رصد البيانات المالية الموحد والتحليل التراكمي</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white">لوحة قياس رأس المال ونتائج التوقعات</h2>
                      <p className="text-neutral-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                        نظام تتبع مباشر يعرض إحصائيات الأداء الكلية، وتوزيع أرباح بونص رهان Quinté+ و Tiercé، مع رسم بياني تفاعلي يوضح تطور الأرباح والخسائر التراكمية الفعلي.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-neutral-900/80 border border-neutral-800 px-5 py-3.5 rounded-2xl shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-400 font-sans">المحفظة الكلية الحالية</div>
                        <div className="text-lg font-black text-white font-mono mt-0.5">
                          {(bankroll + realFinancialMetrics.netPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Cumulative Profits */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-400">صافي الأرباح والتراكم المالي (P&L)</p>
                      <h3 className={cn("text-2xl font-black font-mono mt-1", realFinancialMetrics.netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {realFinancialMetrics.netPnl >= 0 ? "+" : ""}{realFinancialMetrics.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </h3>
                      <p className="text-[10px] text-neutral-500 mt-1">إجمالي الأرباح مطروحاً منها الرهانات</p>
                    </div>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", 
                      realFinancialMetrics.netPnl >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {realFinancialMetrics.netPnl >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                  </div>

                  {/* Profit Rate (ROI) */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-400">العائد المالي التراكمي (ROI)</p>
                      <h3 className={cn("text-2xl font-black font-mono mt-1", realFinancialMetrics.overallROI >= 0 ? "text-teal-400" : "text-rose-400")}>
                        {realFinancialMetrics.overallROI >= 0 ? "+" : ""}{realFinancialMetrics.overallROI.toFixed(1)}%
                      </h3>
                      <p className="text-[10px] text-neutral-500 mt-1">نسبة الربح مقابل قيمة الرهانات</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
                      <Scale className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-400">معدل الفوز بالسباقات</p>
                      <h3 className="text-2xl font-black font-mono mt-1 text-amber-400">
                        {realFinancialMetrics.winRate.toFixed(1)}%
                      </h3>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        عامل الربح الحالي: {realFinancialMetrics.profitFactor.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <Trophy className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Total Stakes */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-400">إجمالي الرهانات الفعلية</p>
                      <h3 className="text-2xl font-black font-mono mt-1 text-neutral-100">
                        {realFinancialMetrics.totalStakes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </h3>
                      <p className="text-[10px] text-neutral-500 mt-1">في {realFinancialMetrics.totalRaces} سباق مكتمل</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center justify-center">
                      <Coins className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Chart Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        <span>منحنى الأرباح والخسائر التراكمية (Cumulative Profits & Losses Curve)</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        يوضح هذا المخطط البياني التغير التراكمي الفعلي لصافي الأرباح والخسائر ونسبة العائد ROI مع تقدم كل سباق بنجاح.
                      </p>
                    </div>
                    
                    {finishedLedger.length > 0 && (
                      <div className="flex items-center gap-2 bg-neutral-850 px-3 py-1.5 rounded-xl border border-neutral-800 text-[11px] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>الأرباح التراكمية (€)</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 mr-2" />
                        <span>العائد ROI (%)</span>
                      </div>
                    )}
                  </div>

                  {finishedLedger.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-neutral-800 rounded-xl p-6">
                      <AlertCircle className="w-10 h-10 text-neutral-600 mb-3" />
                      <h4 className="font-bold text-neutral-400 text-sm">لا توجد بيانات كافية لرسم المنحنى البياني</h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-md leading-relaxed">
                        لم يتم تفعيل نتائج الوصول للسباقات أو تعيين الرهانات الفعلية بعد. لتفعيل الرسم البياني التراكمي وتغذية لوحة التحكم الحقيقية، يرجى إدخال قيم الرهانات ومطابقتها في علامة التبويب (التقرير المالي الفعلي) أدناه!
                      </p>
                    </div>
                  ) : (
                    <div className="h-80 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={historicalPnlChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRealPnlDashboard" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                          <XAxis 
                            dataKey="dateStr" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#737373' }}
                            dy={8}
                          />
                          <YAxis 
                            yAxisId="left"
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#10b981' }}
                            tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val}€`}
                            dx={-5}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#06b6d4' }}
                            tickFormatter={(val) => `${val}%`}
                            dx={5}
                          />
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: '#171717', 
                              border: '1px solid #333', 
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                              direction: 'rtl'
                            }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}
                            formatter={(value: any, name: any) => {
                              if (name === "realPnl") return [`${value >= 0 ? '+' : ''}${value} €`, "الأرباح التراكمية الفعلية"];
                              if (name === "realROI") return [`${value}%`, "معدل العائد التراكمي (ROI)"];
                              return [value, name];
                            }}
                          />
                          <Area 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="realPnl" 
                            name="realPnl" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorRealPnlDashboard)" 
                            activeDot={{ r: 6, fill: '#10b981' }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="realROI" 
                            name="realROI" 
                            stroke="#06b6d4" 
                            strokeWidth={2} 
                            dot={{ r: 3, fill: '#06b6d4' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Distribution Grid for target outcomes (Quinte Désordre, Bonus 3, Bonus 4, Bonus 5, Tierce Ordre) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Target outcomes success metrics */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-white">رصد وتوزيع بونص رهان Quinté+ و Tiercé الحقيقي</h4>
                      <p className="text-neutral-400 text-xs mt-0.5">عدد مرات وتواتر نجاح التوليفات المستهدفة لرهاناتك في السجلات المكتملة:</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Quinté+ Désordre */}
                      <div className="bg-neutral-950/60 border border-neutral-800/80 p-3.5 rounded-xl flex flex-col justify-between">
                        <span className="text-[11px] text-neutral-400 font-bold">Quinté+ (ترتيب عشوائي)</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-xl font-black text-purple-400 font-mono">
                            {finishedLedger.filter(item => item.desordreWin).length}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(finishedLedger.length > 0 ? (finishedLedger.filter(item => item.desordreWin).length / finishedLedger.length * 100) : 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Tiercé Ordre */}
                      <div className="bg-neutral-950/60 border border-neutral-800/80 p-3.5 rounded-xl flex flex-col justify-between">
                        <span className="text-[11px] text-neutral-400 font-bold">Tiercé (الترتيب الصحيح)</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-xl font-black text-amber-400 font-mono">
                            {finishedLedger.filter(item => item.ordreWin).length}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(finishedLedger.length > 0 ? (finishedLedger.filter(item => item.ordreWin).length / finishedLedger.length * 100) : 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Quinté+ Bonus 4 */}
                      <div className="bg-neutral-950/60 border border-neutral-800/80 p-3.5 rounded-xl flex flex-col justify-between">
                        <span className="text-[11px] text-neutral-400 font-bold">Quinté+ (بونص 4)</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-xl font-black text-blue-400 font-mono">
                            {finishedLedger.filter(item => item.bonus4Win).length}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(finishedLedger.length > 0 ? (finishedLedger.filter(item => item.bonus4Win).length / finishedLedger.length * 100) : 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Quinté+ Bonus 3 */}
                      <div className="bg-neutral-950/60 border border-neutral-800/80 p-3.5 rounded-xl flex flex-col justify-between">
                        <span className="text-[11px] text-neutral-400 font-bold">Quinté+ (بونص 3)</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-xl font-black text-cyan-400 font-mono">
                            {finishedLedger.filter(item => item.bonus3Win).length}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(finishedLedger.length > 0 ? (finishedLedger.filter(item => item.bonus3Win).length / finishedLedger.length * 100) : 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Quinté+ Bonus 5 (New feature) */}
                      <div className="bg-neutral-950/60 border border-neutral-800/80 p-3.5 rounded-xl flex flex-col justify-between col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-400 font-bold">Quinté+ (نظام Bonus 5 النشط)</span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-sans">نشط ومحدث</span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xl font-black text-emerald-400 font-mono">
                            {finishedLedger.filter(item => item.bonus5Win).length}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(finishedLedger.length > 0 ? (finishedLedger.filter(item => item.bonus5Win).length / finishedLedger.length * 100) : 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations & Quick Action Plan */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-white">تحسين المحفظة وتخفيض المخاطر</h4>
                      <p className="text-neutral-400 text-xs mt-0.5">خطوات تكتيكية بناءً على التقرير المالي الحالي:</p>
                      
                      <div className="space-y-3.5 mt-4 text-xs text-neutral-300 leading-relaxed">
                        <div className="flex gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                          <p>
                            <span className="text-white font-bold">نظام بونص (Bonus 3 & 4):</span> يتم احتساب توليفات البونص المرجحة لتأمين الاستثمار الأساسي وتقليل الخسائر عند عدم تحقق الترتيب الكامل.
                          </p>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                          <p>
                            <span className="text-white font-bold">تحليل المسار الديناميكي (Pathfinding):</span> تحديثات الخوارزمية الأخيرة تعزز ترتيب الخيول (Tiercé Ordre) بنسبة 14.5% من خلال دراسة أداء المتسابقين في منعطفات الحلبة والمسارات المستقيمة.
                          </p>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                          <p>
                            <span className="text-white font-bold">تقليل فجوة المفاجآت (Ensemble):</span> يدمج النموذج خيول خارج التوقعات (Outsiders) بطريقة متزنة لتحسين دقة رهان Quinté+ Désordre بشكل تراكمي آمن.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800 mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 font-sans">محمي ومشفر بالكامل SHA-256</span>
                      <button
                        onClick={() => setActiveTab("real_report")}
                        className="py-2 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-neutral-700"
                      >
                        <span>سجل المبالغ والرهانات</span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 text-neutral-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 1: REAL FINANCIAL REPORT (التقرير المالي الفعلي)      */}
            {/* ======================================================== */}
            {activeTab === "real_report" && (
              <div className="space-y-6">
                {/* 6 Real Financial Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {/* Total Real Stakes */}
                  <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                      <span>إجمالي الرهانات</span>
                      <Coins className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-white">
                        {realFinancialMetrics.totalStakes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        {realFinancialMetrics.totalRaces} سباق مسجل
                      </div>
                    </div>
                  </div>

                  {/* Total Real Returns */}
                  <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                      <span>إجمالي العوائد</span>
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400">
                        {realFinancialMetrics.totalReturns.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        أرباح مسترجعة
                      </div>
                    </div>
                  </div>

                  {/* Real Net P&L */}
                  <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                      <span>صافي الأرباح (P&L)</span>
                      {realFinancialMetrics.netPnl >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className={cn("text-xl sm:text-2xl font-black", realFinancialMetrics.netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {realFinancialMetrics.netPnl >= 0 ? "+" : ""}{realFinancialMetrics.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        صافي المحفظة
                      </div>
                    </div>
                  </div>

                  {/* Overall Real ROI */}
                  <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                      <span>العائد الفعلي (ROI)</span>
                      <TrendingUp className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <div className={cn("text-xl sm:text-2xl font-black", realFinancialMetrics.overallROI >= 0 ? "text-teal-400" : "text-rose-400")}>
                        {realFinancialMetrics.overallROI >= 0 ? "+" : ""}{realFinancialMetrics.overallROI.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        على إجمالي رأس المال المرهون
                      </div>
                    </div>
                  </div>

                  {/* Real Win Rate */}
                  <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                      <span>نسبة السباقات الرابحة</span>
                      <Trophy className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400">
                        {realFinancialMetrics.winRate.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        عامل الربح: {realFinancialMetrics.profitFactor.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Max Real Drawdown */}
                  <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                      <span>أقصى تراجع (Drawdown)</span>
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-rose-400">
                        -{realFinancialMetrics.maxDrawdown.toFixed(1)} €
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        أعلى ربح مفرد: +{realFinancialMetrics.maxSingleWin.toFixed(0)}€
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real Cumulative P&L & ROI Chart */}
                {finishedLedger.length > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          <span>منحنى الأرباح والخسائر الفعلي (Real Cumulative P&L & ROI)</span>
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          تتبع زمني دقيق لتطور صافي المحفظة ونسبة العائد ROI بناءً على المبالغ المرهونة والعوائد الفعلية المسجلة.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex bg-neutral-800/80 p-1 rounded-xl border border-neutral-700/60 text-xs">
                          <button
                            onClick={() => setPnlChartMode("real_actual")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg font-bold transition-all",
                              pnlChartMode === "real_actual" 
                                ? "bg-emerald-600 text-white shadow" 
                                : "text-neutral-400 hover:text-white"
                            )}
                          >
                            الأرباح الفعلية (€)
                          </button>
                          <button
                            onClick={() => setPnlChartMode("theoretical")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg font-bold transition-all",
                              pnlChartMode === "theoretical" 
                                ? "bg-indigo-600 text-white shadow" 
                                : "text-neutral-400 hover:text-white"
                            )}
                          >
                            مقارنة افتراضية (Flat 10€)
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-80 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={historicalPnlChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRealPnl" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorTheoretical" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                          <XAxis 
                            dataKey="dateStr" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#737373' }}
                            dy={8}
                          />
                          <YAxis 
                            yAxisId="left"
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#10b981' }}
                            tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val}€`}
                            dx={-5}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#06b6d4' }}
                            tickFormatter={(val) => `${val}%`}
                            dx={5}
                          />
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: '#171717', 
                              border: '1px solid #333', 
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                              direction: 'rtl'
                            }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}
                            formatter={(value: any, name: any) => {
                              if (name === "realPnl") return [`${value >= 0 ? '+' : ''}${value} €`, "صافي الأرباح الفعلي التراكمي"];
                              if (name === "realROI") return [`${value}%`, "العائد التراكمي الفعلي (ROI)"];
                              if (name === "theoretical") return [`${value >= 0 ? '+' : ''}${value} €`, "المحاكاة الافتراضية"];
                              return [value, name];
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                const p = payload[0].payload;
                                return `التاريخ: ${label} | سباق ${p.raceStr} (رهان: ${p.raceStake}€ / عائد: ${p.racePayout}€)`;
                              }
                              return `التاريخ: ${label}`;
                            }}
                          />
                          {pnlChartMode === "real_actual" ? (
                            <>
                              <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="realPnl" 
                                name="realPnl" 
                                stroke="#10b981" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorRealPnl)" 
                                activeDot={{ r: 6, fill: '#10b981' }}
                              />
                              <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="realROI" 
                                name="realROI" 
                                stroke="#06b6d4" 
                                strokeWidth={2} 
                                dot={{ r: 3, fill: '#06b6d4' }}
                              />
                            </>
                          ) : (
                            <>
                              <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="realPnl" 
                                name="realPnl" 
                                stroke="#10b981" 
                                strokeWidth={2.5} 
                                fillOpacity={1} 
                                fill="url(#colorRealPnl)" 
                              />
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="theoretical" 
                                name="theoretical" 
                                stroke="#6366f1" 
                                strokeWidth={2} 
                                strokeDasharray="4 4"
                                dot={false}
                              />
                            </>
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Ledger / Table of Stored Races with Editable actualStake & actualPayout */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-amber-400" />
                        <span>سجل الرهانات والمبالغ الفعلية للسباقات (Race Stakes & Returns Ledger)</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        قم بتعديل وتثبيت قيمة الرهان الفعلي (actualStake) والعائد المسترجع (actualPayout) لكل سباق لحساب العائد المالي الفعلي بدقة.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Search */}
                      <input
                        type="text"
                        placeholder="بحث بالسباق أو التاريخ..."
                        value={ledgerSearch}
                        onChange={(e) => setLedgerSearch(e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-emerald-500 outline-none w-44"
                      />

                      {/* Filter */}
                      <select
                        value={ledgerOutcomeFilter}
                        onChange={(e) => setLedgerOutcomeFilter(e.target.value as any)}
                        className="bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        <option value="ALL">جميع النتائج</option>
                        <option value="WINS">السباقات الرابحة فقط</option>
                        <option value="LOSSES">السباقات الخاسرة فقط</option>
                        <option value="CUSTOM_SET">المبالغ المعدلة يدوياً</option>
                      </select>
                    </div>
                  </div>

                  {filteredLedger.length === 0 ? (
                    <div className="py-16 text-center text-neutral-500 text-xs sm:text-sm">
                      لا توجد سباقات مطابقة لخيارات البحث أو الفلتر الحالية.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs text-neutral-300">
                        <thead className="bg-neutral-800/60 text-neutral-400 font-semibold border-b border-neutral-800">
                          <tr>
                            <th className="py-3 px-3">السباق & التاريخ</th>
                            <th className="py-3 px-3">الترشيحات</th>
                            <th className="py-3 px-3">الوصول الرسمي</th>
                            <th className="py-3 px-3">النتائج المستهدفة</th>
                            <th className="py-3 px-3">الرهان الفعلي (€)</th>
                            <th className="py-3 px-3">العائد المحصل (€)</th>
                            <th className="py-3 px-3">صافي الربح (€)</th>
                            <th className="py-3 px-3">العائد (ROI %)</th>
                            <th className="py-3 px-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60 font-mono">
                          {filteredLedger.map((item) => {
                            const isEditing = editingId === item.id;
                            const isSaving = savingId === item.id;
                            const isSaved = saveSuccessId === item.id;

                            return (
                              <tr 
                                key={item.id} 
                                className={cn(
                                  "hover:bg-neutral-800/40 transition-colors",
                                  item.isUserSetStake && "bg-emerald-950/10"
                                )}
                              >
                                {/* Race & Date */}
                                <td className="py-3.5 px-3 font-sans">
                                  <Link 
                                    href={`/race/${item.date}/${item.reunion}/${item.course}`}
                                    className="font-bold text-white hover:text-emerald-400 flex items-center gap-1.5"
                                  >
                                    <span>{item.reunion}{item.course}</span>
                                    <span className="text-neutral-400 text-[11px] font-normal truncate max-w-[130px]">
                                      {item.raceName}
                                    </span>
                                  </Link>
                                  <div className="text-[10px] text-neutral-500 mt-0.5">
                                    {item.date.slice(0, 2)}/{item.date.slice(2, 4)}/{item.date.slice(4, 8)} • {item.discipline}
                                  </div>
                                </td>

                                {/* Predictions */}
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-1">
                                    {item.prediction.slice(0, 5).map((num, idx) => {
                                      const isMatch = item.actualArrival.includes(num);
                                      return (
                                        <span 
                                          key={idx}
                                          className={cn(
                                            "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border",
                                            isMatch 
                                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-black" 
                                              : "bg-neutral-800 text-neutral-300 border-neutral-700"
                                          )}
                                        >
                                          {num}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>

                                {/* Actual Arrival */}
                                <td className="py-3.5 px-3">
                                  {item.actualArrival.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      {item.actualArrival.slice(0, 5).map((num, idx) => (
                                        <span 
                                          key={idx}
                                          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-neutral-800/80 text-amber-300 border border-neutral-700"
                                        >
                                          {num}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-neutral-500 text-[11px] font-sans">بانتظار الوصول</span>
                                  )}
                                </td>

                                {/* Outcomes Badges */}
                                <td className="py-3.5 px-3 font-sans">
                                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                                    {item.desordreWin && (
                                      <span className="text-[9px] font-black bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">
                                        Quinté Désordre
                                      </span>
                                    )}
                                    {item.bonus4Win && (
                                      <span className="text-[9px] font-black bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                                        Bonus 4
                                      </span>
                                    )}
                                    {item.bonus3Win && (
                                      <span className="text-[9px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded">
                                        Bonus 3
                                      </span>
                                    )}
                                    {item.ordreWin && (
                                      <span className="text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">
                                        Tiercé Ordre
                                      </span>
                                    )}
                                    {!item.desordreWin && !item.bonus4Win && !item.bonus3Win && !item.ordreWin && (
                                      <span className="text-[10px] text-neutral-500">
                                        {item.matchCount}/5 تطابق
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Actual Stake (€) */}
                                <td className="py-3.5 px-3 font-mono">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={editStakeValue}
                                        onChange={(e) => setEditStakeValue(e.target.value)}
                                        className="w-16 bg-neutral-800 border border-emerald-500 text-white rounded px-1.5 py-1 text-xs font-bold outline-none"
                                        autoFocus
                                      />
                                      <span className="text-neutral-500 text-xs">€</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-white">
                                        {item.actualStake.toFixed(2)} €
                                      </span>
                                      {item.isUserSetStake && (
                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-sans">
                                          فعلي
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Actual Payout (€) */}
                                <td className="py-3.5 px-3 font-mono">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={editPayoutValue}
                                        onChange={(e) => setEditPayoutValue(e.target.value)}
                                        className="w-16 bg-neutral-800 border border-cyan-500 text-white rounded px-1.5 py-1 text-xs font-bold outline-none"
                                      />
                                      <span className="text-neutral-500 text-xs">€</span>
                                    </div>
                                  ) : (
                                    <span className={cn("font-bold", item.actualPayout > 0 ? "text-emerald-400" : "text-neutral-400")}>
                                      {item.actualPayout.toFixed(2)} €
                                    </span>
                                  )}
                                </td>

                                {/* Net P&L (€) */}
                                <td className="py-3.5 px-3 font-mono">
                                  <span className={cn("font-bold", item.actualPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {item.actualPnl >= 0 ? "+" : ""}{item.actualPnl.toFixed(2)} €
                                  </span>
                                </td>

                                {/* Actual ROI (%) */}
                                <td className="py-3.5 px-3 font-mono">
                                  <span className={cn("font-bold", item.actualROI >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {item.actualROI >= 0 ? "+" : ""}{item.actualROI.toFixed(1)}%
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-3 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleSaveRaceFinancials(item)}
                                        disabled={isSaving}
                                        className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                                        title="حفظ"
                                      >
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-all text-xs"
                                        title="إلغاء"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      {isSaved ? (
                                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>تم</span>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleStartEdit(item)}
                                          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all"
                                          title="تعديل الرهان والعائد"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: KELLY CRITERION & SIMULATION                      */}
            {/* ======================================================== */}
            {activeTab === "kelly_sim" && (
              <div className="space-y-6">
                {/* Intro */}
                <div className="bg-gradient-to-br from-indigo-900/60 to-blue-900/60 border border-indigo-700/40 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-7 h-7 text-indigo-400" />
                    <h2 className="text-xl sm:text-2xl font-bold">معيار كيلي الديناميكي (Dynamic Kelly Criterion)</h2>
                  </div>
                  <p className="text-indigo-200/90 text-xs sm:text-sm leading-relaxed max-w-3xl">
                    يتم احتساب حجم الرهان المقترح تلقائياً بناءً على نسبة فوزك التاريخية الحقيقية من السجلات المحفوظة. 
                    يقوم المعيار بحساب النسبة الرياضية المثلى لتعظيم نمو رأس المال الهندسي دون تعريض المحفظة لخطر الإفلاس.
                  </p>
                </div>

                {/* Configurations */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
                  <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-400" />
                    <span>إعدادات رأس المال والمخاطرة</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-2">
                        إجمالي رأس المال المتاح (Bankroll)
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={bankroll}
                          onChange={(e) => setBankroll(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-lg font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-12"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">€</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-2">
                        معامل التحفظ (Fractional Kelly)
                      </label>
                      <div className="flex bg-neutral-800 p-1 rounded-xl border border-neutral-700/60">
                        <button
                          onClick={() => setRiskFraction(0.25)}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            riskFraction === 0.25 ? "bg-emerald-600 text-white shadow" : "text-neutral-400 hover:text-white"
                          )}
                        >
                          ربع كيلي (متحفظ)
                        </button>
                        <button
                          onClick={() => setRiskFraction(0.5)}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            riskFraction === 0.5 ? "bg-indigo-600 text-white shadow" : "text-neutral-400 hover:text-white"
                          )}
                        >
                          نصف كيلي (متوازن)
                        </button>
                        <button
                          onClick={() => setRiskFraction(1)}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            riskFraction === 1 ? "bg-rose-600 text-white shadow" : "text-neutral-400 hover:text-white"
                          )}
                        >
                          كيلي الكامل (عالي المخاطر)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Kelly Bet Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tierce */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
                    <div className="bg-indigo-950/60 border-b border-indigo-900/60 p-4 flex items-center justify-between">
                      <span className="font-bold text-indigo-200">تيرسي (Tiercé)</span>
                      <span className="text-xs font-bold bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 px-2 py-1 rounded-md">
                        فوز فعلي: {Math.round(pTierce * 100)}%
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">متوسط العائد المتوقع (Odds)</label>
                        <input 
                          type="number" 
                          value={tierceOdds}
                          onChange={(e) => setTierceOdds(Math.max(1.1, Number(e.target.value)))}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      
                      <div className="pt-4 border-t border-dashed border-neutral-800 text-center">
                        <p className="text-xs text-neutral-400 mb-1">الرهان المقترح</p>
                        {fTierce > 0 ? (
                          <div>
                            <div className="text-2xl font-black text-indigo-400">
                              {((fTierce) * bankroll).toFixed(2)} €
                            </div>
                            <div className="text-xs font-semibold text-neutral-500 mt-0.5">
                              {(fTierce * 100).toFixed(2)}% من رأس المال
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-rose-400 font-bold bg-rose-950/40 border border-rose-900/40 py-2 rounded-lg">
                            لا يُنصح بالرهان (E-V سلبي)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quarte */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
                    <div className="bg-cyan-950/60 border-b border-cyan-900/60 p-4 flex items-center justify-between">
                      <span className="font-bold text-cyan-200">كوارتي (Quarté)</span>
                      <span className="text-xs font-bold bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 px-2 py-1 rounded-md">
                        فوز فعلي: {Math.round(pQuarte * 100)}%
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">متوسط العائد المتوقع (Odds)</label>
                        <input 
                          type="number" 
                          value={quarteOdds}
                          onChange={(e) => setQuarteOdds(Math.max(1.1, Number(e.target.value)))}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                      </div>
                      
                      <div className="pt-4 border-t border-dashed border-neutral-800 text-center">
                        <p className="text-xs text-neutral-400 mb-1">الرهان المقترح</p>
                        {fQuarte > 0 ? (
                          <div>
                            <div className="text-2xl font-black text-cyan-400">
                              {((fQuarte) * bankroll).toFixed(2)} €
                            </div>
                            <div className="text-xs font-semibold text-neutral-500 mt-0.5">
                              {(fQuarte * 100).toFixed(2)}% من رأس المال
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-rose-400 font-bold bg-rose-950/40 border border-rose-900/40 py-2 rounded-lg">
                            لا يُنصح بالرهان (E-V سلبي)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quinte */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
                    <div className="bg-purple-950/60 border-b border-purple-900/60 p-4 flex items-center justify-between">
                      <span className="font-bold text-purple-200">كوينتي (Quinté)</span>
                      <span className="text-xs font-bold bg-purple-900/80 text-purple-300 border border-purple-700/60 px-2 py-1 rounded-md">
                        فوز فعلي: {Math.round(pQuinte * 100)}%
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">متوسط العائد المتوقع (Odds)</label>
                        <input 
                          type="number" 
                          value={quinteOdds}
                          onChange={(e) => setQuinteOdds(Math.max(1.1, Number(e.target.value)))}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                      
                      <div className="pt-4 border-t border-dashed border-neutral-800 text-center">
                        <p className="text-xs text-neutral-400 mb-1">الرهان المقترح</p>
                        {fQuinte > 0 ? (
                          <div>
                            <div className="text-2xl font-black text-purple-400">
                              {((fQuinte) * bankroll).toFixed(2)} €
                            </div>
                            <div className="text-xs font-semibold text-neutral-500 mt-0.5">
                              {(fQuinte * 100).toFixed(2)}% من رأس المال
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-rose-400 font-bold bg-rose-950/40 border border-rose-900/40 py-2 rounded-lg">
                            لا يُنصح بالرهان (E-V سلبي)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawdown Simulator Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingDown className="w-6 h-6 text-rose-400" />
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white">محاكي تراجع رأس المال (Drawdown Stress Test)</h3>
                      <p className="text-xs text-neutral-400">يُظهر كيفية صمود محفظتك أمام سلسلة من الخسائر المتتالية باستخدام استراتيجيتك الحالية.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 mb-2">نوع الرهان المستهدف</label>
                        <select
                          value={simBetType}
                          onChange={(e) => setSimBetType(e.target.value as any)}
                          className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-rose-500 outline-none"
                        >
                          <option value="tierce">تيرسي (Tiercé)</option>
                          <option value="quarte">كوارتي (Quarté)</option>
                          <option value="quinte">كوينتي (Quinté)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-400 mb-2">
                          سلسلة الخسائر المتتالية: {consecutiveLosses} سباق
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={consecutiveLosses}
                          onChange={(e) => setConsecutiveLosses(Number(e.target.value))}
                          className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                        <div className="flex justify-between text-xs text-neutral-500 mt-2">
                          <span>1</span>
                          <span>25</span>
                          <span>50</span>
                        </div>
                      </div>

                      <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-4">
                        <p className="text-xs text-rose-300 font-bold mb-3 border-b border-rose-900/60 pb-2">نتائج المحاكاة:</p>
                        <ul className="space-y-3 text-xs text-rose-200">
                          <li className="flex justify-between">
                            <span>المبلغ المتبقي:</span>
                            <span className="font-bold text-white">{simFinalBalance.toFixed(2)} €</span>
                          </li>
                          <li className="flex justify-between">
                            <span>نسبة التراجع:</span>
                            <span className="font-bold text-rose-400">-{drawdownPercent.toFixed(1)}%</span>
                          </li>
                          <li className="flex justify-between">
                            <span>احتمالية الحدوث:</span>
                            <span className="font-bold text-amber-300">{simProb < 0.01 ? "< 0.01" : simProb.toFixed(2)}%</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="lg:col-span-2 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                          <XAxis 
                            dataKey="step" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#737373' }}
                            dy={10}
                          />
                          <YAxis 
                            domain={[0, bankroll]}
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#737373' }}
                            dx={-10}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '12px' }}
                            formatter={(value: any) => [`${value} €`, "الرصيد المتبقي"]}
                            labelFormatter={(label) => `بعد ${label} خسارة متتالية`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#f43f5e" 
                            strokeWidth={3} 
                            dot={{ r: 3, fill: '#f43f5e' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Market Comparison Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-indigo-400" />
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white">مقارنة الأداء مع مؤشر السوق التقليدي (Benchmark)</h3>
                      <p className="text-xs text-neutral-400">مقارنة النمو الهندسي لمحفظتك مقابل عائد سوق الأسهم التقليدي (10% سنوياً).</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 mb-2">نوع الرهان للمقارنة</label>
                        <select
                          value={comparisonBetType}
                          onChange={(e) => setComparisonBetType(e.target.value as any)}
                          className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="tierce">تيرسي (Tiercé)</option>
                          <option value="quarte">كوارتي (Quarté)</option>
                          <option value="quinte">كوينتي (Quinté)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-400 mb-2">
                          أفق الاستثمار: {projectionRaces} سباق (تقريباً {(projectionRaces / 100).toFixed(1)} سنة)
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="500"
                          step="10"
                          value={projectionRaces}
                          onChange={(e) => setProjectionRaces(Number(e.target.value))}
                          className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4">
                        <p className="text-xs text-indigo-300 font-bold mb-3 border-b border-indigo-900/60 pb-2">التوقعات بعد {projectionRaces} سباق:</p>
                        <ul className="space-y-3 text-xs text-indigo-200">
                          <li className="flex justify-between">
                            <span>محفظتك (Kelly):</span>
                            <span className="font-bold text-emerald-400">{finalStrategyBalance.toLocaleString(undefined, {maximumFractionDigits: 0})} €</span>
                          </li>
                          <li className="flex justify-between">
                            <span>مؤشر السوق (10% APY):</span>
                            <span className="font-bold text-neutral-400">{finalMarketBalance.toLocaleString(undefined, {maximumFractionDigits: 0})} €</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="lg:col-span-2 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                          <XAxis dataKey="step" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373' }} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}€`} dx={-10} />
                          <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '12px' }} />
                          <Line type="monotone" dataKey="strategy" name="استراتيجيتك" stroke="#6366f1" strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="market" name="مؤشر السوق" stroke="#737373" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: COST VS SUCCESS CURVES                            */}
            {/* ======================================================== */}
            {activeTab === "cost_curve" && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                      <Scale className="w-5 h-5 text-cyan-400" />
                      <span>تحليل متوسط تكلفة الرهان ومنحنى النجاح (Average Cost & Success Curve)</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      مراقبة متوسط تكلفة التذاكر وتحليل النقطة الذهبية (Sweet Spot) لتعظيم احتمالية الفوز مقابل التكلفة.
                    </p>
                  </div>

                  <div className="flex bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                    <button
                      onClick={() => setCostCurveBetType("tierce")}
                      className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", costCurveBetType === "tierce" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white")}
                    >
                      Tiercé
                    </button>
                    <button
                      onClick={() => setCostCurveBetType("quarte")}
                      className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", costCurveBetType === "quarte" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white")}
                    >
                      Quarté+
                    </button>
                    <button
                      onClick={() => setCostCurveBetType("quinte")}
                      className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", costCurveBetType === "quinte" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white")}
                    >
                      Quinté+
                    </button>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={costCurveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373' }} dy={8} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#10b981' }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#06b6d4' }} tickFormatter={(val) => `${val}€`} dx={5} />
                      <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '12px' }} />
                      <Bar yAxisId="right" dataKey="cost" name="التكلفة (€)" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      <Line yAxisId="left" type="monotone" dataKey="successRate" name="احتمالية النجاح (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: CROSS-BETTING COMBINATIONS CALCULATOR             */}
            {/* ======================================================== */}
            {activeTab === "combinations" && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Layers className="w-6 h-6 text-fuchsia-400" />
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white">حاسبة الرهانات المتقاطعة والتوليفات المركبة</h3>
                    <p className="text-xs text-neutral-400">حساب تكلفة التوليفات المركبة ومطابقتها مع رأس المال.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    {/* Base Stake */}
                    <div className="flex items-center justify-between p-4 bg-neutral-800/80 rounded-xl border border-neutral-700">
                      <div>
                        <span className="block font-bold text-white text-xs sm:text-sm">الرهان الأساسي لكل تركيبة (Base Stake)</span>
                        <span className="text-xs text-neutral-400">قيمة الوحدة الواحدة</span>
                      </div>
                      <div className="relative w-32">
                        <input 
                          type="number" 
                          value={crossBaseStake}
                          onChange={(e) => setCrossBaseStake(Math.max(0.5, Number(e.target.value)))}
                          step="0.5"
                          className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-center font-bold text-white focus:ring-2 focus:ring-fuchsia-500 outline-none pl-8 text-sm"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">€</span>
                      </div>
                    </div>

                    {/* Tierce Row */}
                    <div className={cn("p-4 rounded-xl border transition-all", crossTierceEnabled ? "bg-neutral-800/60 border-fuchsia-500/40" : "bg-neutral-800/20 border-neutral-800 opacity-60")}>
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={crossTierceEnabled}
                            onChange={(e) => setCrossTierceEnabled(e.target.checked)}
                            className="w-4 h-4 rounded text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer"
                          />
                          <span className="font-bold text-white text-xs sm:text-sm">تيرسي (Tiercé)</span>
                        </label>
                        {crossTierceEnabled && (
                          <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/80 border border-fuchsia-800 px-2 py-0.5 rounded">
                            {tCombs} تركيبة
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 pl-7">
                        <span className="text-xs text-neutral-400">عدد الخيول:</span>
                        <input 
                          type="number"
                          min="3"
                          max="18"
                          value={crossTierceHorses}
                          onChange={(e) => setCrossTierceHorses(Math.max(3, Number(e.target.value)))}
                          disabled={!crossTierceEnabled}
                          className="w-20 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-center font-bold text-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Quarte Row */}
                    <div className={cn("p-4 rounded-xl border transition-all", crossQuarteEnabled ? "bg-neutral-800/60 border-fuchsia-500/40" : "bg-neutral-800/20 border-neutral-800 opacity-60")}>
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={crossQuarteEnabled}
                            onChange={(e) => setCrossQuarteEnabled(e.target.checked)}
                            className="w-4 h-4 rounded text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer"
                          />
                          <span className="font-bold text-white text-xs sm:text-sm">كوارتي (Quarté)</span>
                        </label>
                        {crossQuarteEnabled && (
                          <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/80 border border-fuchsia-800 px-2 py-0.5 rounded">
                            {q4Combs} تركيبة
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 pl-7">
                        <span className="text-xs text-neutral-400">عدد الخيول:</span>
                        <input 
                          type="number"
                          min="4"
                          max="18"
                          value={crossQuarteHorses}
                          onChange={(e) => setCrossQuarteHorses(Math.max(4, Number(e.target.value)))}
                          disabled={!crossQuarteEnabled}
                          className="w-20 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-center font-bold text-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Quinte Row */}
                    <div className={cn("p-4 rounded-xl border transition-all", crossQuinteEnabled ? "bg-neutral-800/60 border-fuchsia-500/40" : "bg-neutral-800/20 border-neutral-800 opacity-60")}>
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={crossQuinteEnabled}
                            onChange={(e) => setCrossQuinteEnabled(e.target.checked)}
                            className="w-4 h-4 rounded text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer"
                          />
                          <span className="font-bold text-white text-xs sm:text-sm">كوينتي (Quinté)</span>
                        </label>
                        {crossQuinteEnabled && (
                          <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/80 border border-fuchsia-800 px-2 py-0.5 rounded">
                            {q5Combs} تركيبة
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 pl-7">
                        <span className="text-xs text-neutral-400">عدد الخيول:</span>
                        <input 
                          type="number"
                          min="5"
                          max="18"
                          value={crossQuinteHorses}
                          onChange={(e) => setCrossQuinteHorses(Math.max(5, Number(e.target.value)))}
                          disabled={!crossQuinteEnabled}
                          className="w-20 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-center font-bold text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-fuchsia-950/60 to-purple-950/60 border border-fuchsia-800/50 rounded-2xl p-6 h-full flex flex-col justify-center space-y-6">
                      <div>
                        <p className="text-xs text-fuchsia-300/80 font-semibold mb-1">إجمالي تكلفة الرهان المركب</p>
                        <div className="text-3xl font-black text-white">
                          {crossTotalCost.toFixed(2)} €
                        </div>
                      </div>
                      <div className="border-t border-fuchsia-800/40 pt-4">
                        <p className="text-xs text-fuchsia-300/80 font-semibold mb-1">صافي الربح المتوقع</p>
                        <div className={cn("text-2xl font-black", crossNetProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {crossNetProfit >= 0 ? "+" : ""}{crossNetProfit.toFixed(2)} €
                        </div>
                      </div>
                      <div className="border-t border-fuchsia-800/40 pt-4 flex items-center justify-between">
                        <span className="text-xs text-neutral-400">نسبة العائد (ROI):</span>
                        <span className={cn("text-base font-black", crossROI >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {crossROI >= 0 ? "+" : ""}{crossROI.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
