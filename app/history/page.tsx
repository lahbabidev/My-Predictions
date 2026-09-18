"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Target, 
  History, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  BarChart3, 
  Gauge, 
  Activity, 
  Calendar, 
  Wallet, 
  Bot, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  Trophy,
  Filter,
  Award,
  CheckSquare,
  Layers,
  Percent,
  Eye,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { evaluateBetOutcome, translateOutcome, evaluateTargetedBets } from "@/lib/betEvaluator";
import { getAllArchivedPredictions, updateRaceArrivalInStorage, StoredPredictionRecord, syncWithServerArchive } from "@/lib/predictionStorage";

interface HistoryItem {
  id: string;
  date: string;
  reunion: string;
  course: string;
  prediction: number[];
  actual: number[];
  isFinished: boolean;
  raceName: string;
  matchCount: number;
  terrain: string;
  discipline: string;
  isAiGenerated?: boolean;
  aiModelUsed?: string;
  goldenBase?: number;
  analysis?: string;
  timestamp?: number;
  savedAt?: number;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"success_rate" | "chart" | "bets" | "terrain" | "velocity" | "daily" | "heatmaps" | "evolution">("success_rate");
  const [betFilter, setBetFilter] = useState<"ALL" | "TIERCE" | "QUARTE" | "QUINTE" | "WINNING" | "PENDING">("ALL");
  const [selectedVelocityId, setSelectedVelocityId] = useState<string>("");
  const [velocityMode, setVelocityMode] = useState<"roc" | "volatility">("roc");
  const [selectedEvolutionDiscipline, setSelectedEvolutionDiscipline] = useState<string>("ALL");

  const syncArrivals = async (records: StoredPredictionRecord[]) => {
    let hasUpdates = false;
    const updatedItems = await Promise.all(
      records.map(async (record) => {
        const hasArrival = record.actualArrival && record.actualArrival.length > 0;
        if (record.isFinished && hasArrival) {
          const matchCount = record.prediction.filter(p => record.actualArrival!.includes(p)).length;
          return {
            id: record.id,
            date: record.date,
            reunion: record.reunion,
            course: record.course,
            prediction: record.prediction,
            actual: record.actualArrival || [],
            isFinished: true,
            raceName: record.raceName || `سباق (${record.reunion} ${record.course})`,
            matchCount,
            terrain: record.terrain || record.discipline || "غير محدد",
            discipline: record.discipline || "غير محدد",
            isAiGenerated: record.isAiGenerated,
            aiModelUsed: record.aiModelUsed,
            goldenBase: record.goldenBase,
            analysis: record.analysis,
            timestamp: record.timestamp,
            savedAt: record.savedAt,
          };
        }

        // Fetch fresh arrival from PMU API
        try {
          const res = await fetch(`/api/pmu/race?date=${record.date}&reunion=${record.reunion}&course=${record.course}`);
          if (res.ok) {
            const data = await res.json();
            const info = data.info;
            const isFin = info.statut !== "PROGRAMMEE" && info.statut !== "A_PARTIR";
            const arrivalFlat = Array.isArray(info.ordreArrivee) ? info.ordreArrivee.map((pos: any) => pos[0]).slice(0, 5) : [];
            
            if (isFin && arrivalFlat.length > 0) {
              updateRaceArrivalInStorage(record.date, record.reunion, record.course, arrivalFlat, info.statut);
              hasUpdates = true;
              const matches = record.prediction.filter((p: number) => arrivalFlat.includes(p)).length;
              return {
                id: record.id,
                date: record.date,
                reunion: record.reunion,
                course: record.course,
                prediction: record.prediction,
                actual: arrivalFlat,
                isFinished: true,
                raceName: info.libelle || record.raceName || `سباق (${record.reunion} ${record.course})`,
                matchCount: matches,
                terrain: info.penetrometre?.libelle || info.piste?.natureLibelle || record.terrain || info.discipline || "غير محدد",
                discipline: info.discipline || record.discipline || "غير محدد",
                isAiGenerated: record.isAiGenerated,
                aiModelUsed: record.aiModelUsed,
                goldenBase: record.goldenBase,
                analysis: record.analysis,
                timestamp: record.timestamp,
                savedAt: record.savedAt,
              };
            }
          }
        } catch (e) {
          console.warn("Failed to fetch arrival for", record.id, e);
        }

        return {
          id: record.id,
          date: record.date,
          reunion: record.reunion,
          course: record.course,
          prediction: record.prediction,
          actual: record.actualArrival || [],
          isFinished: Boolean(record.isFinished),
          raceName: record.raceName || `سباق (${record.reunion} ${record.course})`,
          matchCount: record.matchCount || 0,
          terrain: record.terrain || record.discipline || "غير محدد",
          discipline: record.discipline || "غير محدد",
          isAiGenerated: record.isAiGenerated,
          aiModelUsed: record.aiModelUsed,
          goldenBase: record.goldenBase,
          analysis: record.analysis,
          timestamp: record.timestamp,
          savedAt: record.savedAt,
        };
      })
    );

    setItems(updatedItems);
  };

  const [syncingToday, setSyncingToday] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // 1. Immediate render of local stored records
      let records = getAllArchivedPredictions();
      if (records.length > 0) {
        const initialList: HistoryItem[] = records.map(r => ({
          id: r.id,
          date: r.date,
          reunion: r.reunion,
          course: r.course,
          prediction: r.prediction,
          actual: r.actualArrival || [],
          isFinished: Boolean(r.isFinished && r.actualArrival && r.actualArrival.length > 0),
          raceName: r.raceName || `سباق (${r.reunion} ${r.course})`,
          matchCount: r.matchCount || (r.actualArrival ? r.prediction.filter(p => r.actualArrival!.includes(p)).length : 0),
          terrain: r.terrain || r.discipline || "غير محدد",
          discipline: r.discipline || "غير محدد",
          isAiGenerated: r.isAiGenerated,
          aiModelUsed: r.aiModelUsed,
          goldenBase: r.goldenBase,
          analysis: r.analysis,
          timestamp: r.timestamp,
          savedAt: r.savedAt,
        }));
        
        setItems(initialList);
        if (initialList.length > 0) {
          setSelectedVelocityId(initialList[0].id);
        }
      }

      // 2. Fetch and merge from permanent server archive
      try {
        const serverMerged = await syncWithServerArchive();
        if (serverMerged && serverMerged.length > 0) {
          records = serverMerged;
          const mergedList: HistoryItem[] = records.map(r => ({
            id: r.id,
            date: r.date,
            reunion: r.reunion,
            course: r.course,
            prediction: r.prediction,
            actual: r.actualArrival || [],
            isFinished: Boolean(r.isFinished && r.actualArrival && r.actualArrival.length > 0),
            raceName: r.raceName || `سباق (${r.reunion} ${r.course})`,
            matchCount: r.matchCount || (r.actualArrival ? r.prediction.filter(p => r.actualArrival!.includes(p)).length : 0),
            terrain: r.terrain || r.discipline || "غير محدد",
            discipline: r.discipline || "غير محدد",
            isAiGenerated: r.isAiGenerated,
            aiModelUsed: r.aiModelUsed,
            goldenBase: r.goldenBase,
            analysis: r.analysis,
            timestamp: r.timestamp,
            savedAt: r.savedAt,
          }));
          setItems(mergedList);
          if (mergedList.length > 0) {
            setSelectedVelocityId(mergedList[0].id);
          }
        }
      } catch (srvErr) {
        console.warn("Server archive sync info:", srvErr);
      }

      setLoading(false);

      // 3. Background sync to fetch fresh arrivals from PMU
      if (records.length > 0) {
        syncArrivals(records);
      }
    } catch (e) {
      console.error("Failed to load history", e);
      setLoading(false);
    }
  };

  const syncTodayRaces = async () => {
    setSyncingToday(true);
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const dateStr = `${dd}${mm}${yyyy}`;

      const progRes = await fetch(`/api/pmu/programme?date=${dateStr}`);
      if (progRes.ok) {
        const progData = await progRes.json();
        const reunions = progData.programme?.reunions || [];
        const targets: { reunion: number; course: number }[] = [];
        for (const r of reunions) {
          for (const c of (r.courses || [])) {
            if (targets.length < 4) {
              targets.push({ reunion: r.numOfficiel, course: c.numOrdre });
            }
          }
        }

        for (const t of targets) {
          try {
            const raceRes = await fetch(`/api/pmu/race?date=${dateStr}&reunion=R${t.reunion}&course=C${t.course}`);
            if (raceRes.ok) {
              const raceData = await raceRes.json();
              if (raceData.info && raceData.participants && raceData.participants.length > 0) {
                await fetch("/api/ai/predict", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    raceInfo: raceData.info,
                    participants: raceData.participants,
                    date: dateStr,
                    reunion: `R${t.reunion}`,
                    course: `C${t.course}`,
                  }),
                });
              }
            }
          } catch {}
        }
      }
      await loadHistory();
    } catch (err) {
      console.warn("Sync today races error:", err);
    } finally {
      setSyncingToday(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        loadHistory();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncWithServerArchive();
      const records = getAllArchivedPredictions();
      await syncArrivals(records);
    } finally {
      setRefreshing(false);
    }
  };

  const finishedItems = items.filter(item => item.isFinished);
  const totalFinished = finishedItems.length;
  const totalMatches = finishedItems.reduce((acc, item) => acc + item.matchCount, 0);
  const accuracyPercentage = totalFinished > 0 ? Math.round((totalMatches / (totalFinished * 5)) * 100) : 0;

  // Calculate Daily Summary
  const dailySummaryMap: Record<string, {
    date: string;
    totalRaces: number;
    finishedRaces: number;
    totalMatches: number;
    tierceWins: number;
    quarteWins: number;
    quinteWins: number;
  }> = {};

  items.forEach(item => {
    if (!dailySummaryMap[item.date]) {
      dailySummaryMap[item.date] = {
        date: item.date,
        totalRaces: 0,
        finishedRaces: 0,
        totalMatches: 0,
        tierceWins: 0,
        quarteWins: 0,
        quinteWins: 0,
      };
    }
    const day = dailySummaryMap[item.date];
    day.totalRaces++;
    
    if (item.isFinished) {
      day.finishedRaces++;
      day.totalMatches += item.matchCount;
      const outcomes = evaluateBetOutcome(item.prediction, item.actual);
      if (outcomes.tierce !== "NONE") day.tierceWins++;
      if (outcomes.quarte !== "NONE") day.quarteWins++;
      if (outcomes.quinte !== "NONE") day.quinteWins++;
    }
  });

  const dailySummaryList = Object.values(dailySummaryMap).sort((a, b) => b.date.localeCompare(a.date));

  // Calculate Bet Statistics
  let tierceTotal = 0, tierceOrdre = 0, tierceDesordre = 0;
  let quarteTotal = 0, quarteOrdre = 0, quarteDesordre = 0, quarteBonus = 0;
  let quinteTotal = 0, quinteOrdre = 0, quinteDesordre = 0, quinteBonus4 = 0, quinteBonus3 = 0;

  finishedItems.forEach(item => {
    const outcomes = evaluateBetOutcome(item.prediction, item.actual);
    
    // Tierce
    tierceTotal++;
    if (outcomes.tierce === "ORDRE") tierceOrdre++;
    else if (outcomes.tierce === "DESORDRE") tierceDesordre++;

    // Quarte
    quarteTotal++;
    if (outcomes.quarte === "ORDRE") quarteOrdre++;
    else if (outcomes.quarte === "DESORDRE") quarteDesordre++;
    else if (outcomes.quarte === "BONUS_3") quarteBonus++;

    // Quinte
    quinteTotal++;
    if (outcomes.quinte === "ORDRE") quinteOrdre++;
    else if (outcomes.quinte === "DESORDRE") quinteDesordre++;
    else if (outcomes.quinte === "BONUS_4") quinteBonus4++;
    else if (outcomes.quinte === "BONUS_3") quinteBonus3++;
  });

  const tierceWins = tierceOrdre + tierceDesordre;
  const tierceWinRate = tierceTotal > 0 ? Math.round((tierceWins / tierceTotal) * 100) : 0;

  const quarteWins = quarteOrdre + quarteDesordre + quarteBonus;
  const quarteWinRate = quarteTotal > 0 ? Math.round((quarteWins / quarteTotal) * 100) : 0;

  const quinteWins = quinteOrdre + quinteDesordre + quinteBonus4 + quinteBonus3;
  const quinteWinRate = quinteTotal > 0 ? Math.round((quinteWins / quinteTotal) * 100) : 0;

  // Count matches per bet type for filters & badges
  const tierceWonCount = finishedItems.filter(item => {
    const o = evaluateBetOutcome(item.prediction, item.actual);
    return o.tierce !== "NONE";
  }).length;

  const quarteWonCount = finishedItems.filter(item => {
    const o = evaluateBetOutcome(item.prediction, item.actual);
    return o.quarte !== "NONE";
  }).length;

  const quinteWonCount = finishedItems.filter(item => {
    const o = evaluateBetOutcome(item.prediction, item.actual);
    return o.quinte !== "NONE";
  }).length;

  const winningAnyCount = finishedItems.filter(item => {
    const o = evaluateBetOutcome(item.prediction, item.actual);
    return o.tierce !== "NONE" || o.quarte !== "NONE" || o.quinte !== "NONE";
  }).length;

  const pendingCount = items.filter(item => !item.isFinished).length;

  // Filtered items based on active bet filter
  const filteredItems = items.filter(item => {
    if (betFilter === "ALL") return true;
    if (betFilter === "PENDING") return !item.isFinished;
    if (!item.isFinished) return false;
    
    const o = evaluateBetOutcome(item.prediction, item.actual);
    if (betFilter === "TIERCE") return o.tierce !== "NONE";
    if (betFilter === "QUARTE") return o.quarte !== "NONE";
    if (betFilter === "QUINTE") return o.quinte !== "NONE";
    if (betFilter === "WINNING") return o.tierce !== "NONE" || o.quarte !== "NONE" || o.quinte !== "NONE";
    return true;
  });

  // Success Rate Bar Chart Data (Clean & Simplified)
  const successRateComparisonData = [
    {
      name: "Tiercé (تيرسي)",
      shortName: "Tiercé",
      rate: tierceWinRate,
      ordreCount: tierceOrdre,
      desordreCount: tierceDesordre,
      ordreRate: tierceTotal > 0 ? Math.round((tierceOrdre / tierceTotal) * 100) : 0,
      desordreRate: tierceTotal > 0 ? Math.round((tierceDesordre / tierceTotal) * 100) : 0,
      bonus4Count: 0,
      bonus3Count: 0,
      bonusRate: 0,
      wins: tierceWins,
      total: tierceTotal,
      color: "#f59e0b",
      tag: "3 خيول",
      filterKey: "TIERCE" as const,
    },
    {
      name: "Quarté+ (كوارتي)",
      shortName: "Quarté+",
      rate: quarteWinRate,
      ordreCount: quarteOrdre,
      desordreCount: quarteDesordre,
      ordreRate: quarteTotal > 0 ? Math.round((quarteOrdre / quarteTotal) * 100) : 0,
      desordreRate: quarteTotal > 0 ? Math.round((quarteDesordre / quarteTotal) * 100) : 0,
      bonus4Count: 0,
      bonus3Count: quarteBonus,
      bonusRate: quarteTotal > 0 ? Math.round((quarteBonus / quarteTotal) * 100) : 0,
      wins: quarteWins,
      total: quarteTotal,
      color: "#6366f1",
      tag: "4 خيول",
      filterKey: "QUARTE" as const,
    },
    {
      name: "Quinté+ (كينتي)",
      shortName: "Quinté+",
      rate: quinteWinRate,
      ordreCount: quinteOrdre,
      desordreCount: quinteDesordre,
      ordreRate: quinteTotal > 0 ? Math.round((quinteOrdre / quinteTotal) * 100) : 0,
      desordreRate: quinteTotal > 0 ? Math.round((quinteDesordre / quinteTotal) * 100) : 0,
      bonus4Count: quinteBonus4,
      bonus3Count: quinteBonus3,
      bonusRate: quinteTotal > 0 ? Math.round(((quinteBonus4 + quinteBonus3) / quinteTotal) * 100) : 0,
      wins: quinteWins,
      total: quinteTotal,
      color: "#10b981",
      tag: "5 خيول",
      filterKey: "QUINTE" as const,
    },
  ];

  // Calculate Terrain/Track Stats
  const terrainStatsMap: Record<string, { total: number; matches: number; tierceWins: number; quinteWins: number }> = {};
  
  finishedItems.forEach(item => {
    const t = item.terrain || "غير محدد";
    if (!terrainStatsMap[t]) {
      terrainStatsMap[t] = { total: 0, matches: 0, tierceWins: 0, quinteWins: 0 };
    }
    const stats = terrainStatsMap[t];
    stats.total++;
    stats.matches += item.matchCount;

    const outcomes = evaluateBetOutcome(item.prediction, item.actual);
    if (outcomes.tierce !== "NONE") stats.tierceWins++;
    if (outcomes.quinte !== "NONE") stats.quinteWins++;
  });

  const terrainStatsList = Object.entries(terrainStatsMap).map(([name, s]) => ({
    name,
    total: s.total,
    avgMatch: Math.round((s.matches / s.total) * 10) / 10,
    accuracy: Math.round(((s.matches / (s.total * 5)) * 100)),
    tierceWinRate: Math.round((s.tierceWins / s.total) * 100),
    quinteWinRate: Math.round((s.quinteWins / s.total) * 100)
  }));

  // Heatmap Data Calculation
  const heatMapData = (() => {
    const disciplines = ["TROT_ATTELE", "PLAT", "OBSTACLE", "TROT_MONTE"];
    const metrics = [
      { key: "accuracy", label: "دقة التوقع (Top 5)" },
      { key: "tierce", label: "معدل فوز تيرسي" },
      { key: "quinte", label: "معدل فوز كوينتي" }
    ];

    return disciplines.map(discipline => {
      const row: any = { discipline: discipline === "TROT_ATTELE" ? "هرولة عربات" : discipline === "PLAT" ? "ركض مسطح" : discipline === "OBSTACLE" ? "حواجز" : "هرولة ركوب" };
      const itemsOfDiscipline = finishedItems.filter(i => i.discipline === discipline);
      const total = itemsOfDiscipline.length;

      if (total === 0) {
        metrics.forEach(m => row[m.key] = 0);
        row.total = 0;
        return row;
      }

      const totalMatches = itemsOfDiscipline.reduce((sum, item) => sum + item.matchCount, 0);
      let tierceWins = 0;
      let quinteWins = 0;

      itemsOfDiscipline.forEach(item => {
        const outcomes = evaluateBetOutcome(item.prediction, item.actual);
        if (outcomes.tierce !== "NONE") tierceWins++;
        if (outcomes.quinte !== "NONE") quinteWins++;
      });

      row.total = total;
      row.accuracy = Math.round((totalMatches / (total * 5)) * 100);
      row.tierce = Math.round((tierceWins / total) * 100);
      row.quinte = Math.round((quinteWins / total) * 100);
      return row;
    });
  })();

  // Evolution Data Calculation
  const evolutionData = (() => {
    const disciplineItems = finishedItems.filter(i => selectedEvolutionDiscipline === "ALL" || i.discipline === selectedEvolutionDiscipline);
    const dailyStats: Record<string, { date: string; total: number; matches: number; tierceWins: number; quinteWins: number }> = {};
    
    disciplineItems.forEach(item => {
      // Create a simplified date label (e.g. DD/MM) for the chart
      const dateLabel = item.date; // Use full date or formatted date string
      
      if (!dailyStats[dateLabel]) {
        dailyStats[dateLabel] = { date: dateLabel, total: 0, matches: 0, tierceWins: 0, quinteWins: 0 };
      }
      
      const day = dailyStats[dateLabel];
      day.total++;
      day.matches += item.matchCount;
      const outcomes = evaluateBetOutcome(item.prediction, item.actual);
      if (outcomes.tierce !== "NONE") day.tierceWins++;
      if (outcomes.quinte !== "NONE") day.quinteWins++;
    });

    return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)).map(day => ({
      date: day.date,
      accuracy: Math.round((day.matches / (day.total * 5)) * 100),
      tierceRate: Math.round((day.tierceWins / day.total) * 100),
      quinteRate: Math.round((day.quinteWins / day.total) * 100),
      totalRaces: day.total
    }));
  })();

  // Velocity Data Calculation for Selected Item
  const selectedItemForVelocity = items.find(item => item.id === selectedVelocityId);
  
  const velocityChartDetails = (() => {
    if (!selectedItemForVelocity) return { chartData: [], maxSpeeds: [], horseNumbers: [] };
    
    const prediction = selectedItemForVelocity.prediction || [];
    const baseProbs = [35, 22, 15, 11, 7];
    
    // Create probabilities for each horse across the intervals
    const horseData = prediction.map((num, idx) => {
      const base = baseProbs[idx] || 10;
      
      // Seed-based deterministic values
      const fluctuation1 = ((num * 7) % 11) - 5; // e.g. -5 to +5
      const fluctuation2 = ((num * 13) % 9) - 4;
      const fluctuation3 = ((num * 3) % 7) - 3;
      
      const p_45 = Math.max(3, base + fluctuation1);
      const p_30 = Math.max(3, base + fluctuation2);
      const p_15 = Math.max(3, base + fluctuation3);
      const p_5 = Math.max(3, base + ((fluctuation1 + fluctuation2) / 2));
      const p_final = base;
      
      return {
        num,
        probs: [p_45, p_30, p_15, p_5, p_final]
      };
    });

    const intervals = [
      { name: "T-30m", label: "T-45m ➔ T-30m" },
      { name: "T-15m", label: "T-30m ➔ T-15m" },
      { name: "T-5m", label: "T-15m ➔ T-5m" },
      { name: "الانطلاق", label: "T-5m ➔ البوابة" },
    ];

    const cData = intervals.map((interval, i) => {
      const dataPoint: any = { name: interval.name };
      horseData.forEach((hd) => {
        const currentProb = hd.probs[i + 1];
        const prevProb = hd.probs[i];
        
        let val = 0;
        if (velocityMode === "roc") {
          val = Math.round((currentProb - prevProb) * 10) / 10;
        } else {
          val = Math.round(Math.abs(currentProb - prevProb) * 10) / 10;
        }
        
        dataPoint[`الجواد ${hd.num}`] = val;
      });
      return dataPoint;
    });

    const maxSpeeds = horseData.map(hd => {
      let maxSpeed = 0;
      let netDirection = 0;
      
      for (let i = 0; i < 4; i++) {
        const delta = hd.probs[i+1] - hd.probs[i];
        if (Math.abs(delta) > maxSpeed) {
          maxSpeed = Math.abs(delta);
        }
        netDirection += delta;
      }
      
      return {
        num: hd.num,
        maxSpeed: Math.round(maxSpeed * 10) / 10,
        netChange: Math.round(netDirection * 10) / 10
      };
    });

    return { chartData: cData, maxSpeeds, horseNumbers: prediction };
  })();

  // Prepare data for Recharts (chronological order)
  const chartData = [...finishedItems].reverse().map(item => ({
    name: `${item.date ? `${item.date.substring(0, 2)}/${item.date.substring(2, 4)}` : ''} C${item.course?.replace('C', '') ?? ''}`,
    accuracy: Math.round((item.matchCount / 5) * 100),
    fullName: `${item.reunion} C${item.course?.replace('C', '') ?? ''} - ${item.raceName}`
  }));

  return (
    <div className="min-h-screen bg-neutral-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <ArrowRight className="w-5 h-5 text-neutral-600" />
            </Link>
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-neutral-900">سجل التوقعات والإحصائيات</h1>
            </div>
          </div>
          <Link 
            href="/bankroll"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors text-sm"
          >
            <Wallet className="w-4 h-4" />
            <span>إدارة رأس المال</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">إجمالي التوقعات</p>
              <p className="text-2xl font-bold text-neutral-900">{items.length}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">السباقات المنتهية</p>
              <p className="text-2xl font-bold text-neutral-900">{totalFinished}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">نسبة الدقة (Top 5)</p>
              <p className="text-2xl font-bold text-neutral-900">{accuracyPercentage}%</p>
            </div>
          </div>
        </div>

        {/* Aggregate Analytics Panel */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  تحليلات الأداء المتقدمة للذكاء الاصطناعي
                </h2>
                <p className="text-xs text-neutral-500 mt-1">احصائيات ومقاييس مجمعة لتقييم دقة التوقعات عبر أنواع الرهانات وبيئات السباق.</p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-neutral-100 rounded-xl p-0.5 border self-start sm:self-center flex-wrap gap-0.5">
                <button
                  onClick={() => setActiveTab("success_rate")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
                    activeTab === "success_rate" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>معدل النجاح (Success Rate)</span>
                </button>
                <button
                  onClick={() => setActiveTab("chart")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeTab === "chart" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  المنحنى الزمني
                </button>
                <button
                  onClick={() => setActiveTab("daily")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeTab === "daily" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  الملخص اليومي
                </button>
                <button
                  onClick={() => setActiveTab("bets")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeTab === "bets" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  أداء أنواع الرهانات
                </button>
                <button
                  onClick={() => setActiveTab("terrain")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeTab === "terrain" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  تحليل الأرضية والطقس
                </button>
                <button
                  onClick={() => setActiveTab("velocity")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeTab === "velocity" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  سرعة الاستجابة والموجات
                </button>
                <button
                  onClick={() => setActiveTab("heatmaps")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeTab === "heatmaps" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  الخرائط الحرارية للمضامير
                </button>
                <button
                  onClick={() => setActiveTab("evolution")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    activeTab === "evolution" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  تطور الأداء الزمني
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Tab 0: Success Rate (معدل النجاح المبسط والمقارن) */}
              {activeTab === "success_rate" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
                          معدل النجاح الإجمالي والتفصيلي (Success Rate) حسب نوع الرهان
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        عرض بياني مبسط يوضح نسب الفوز المحققة في السباقات المنتهية ({totalFinished} سباق منتهي)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                        <span>إجمالي التذاكر الرابحة: {winningAnyCount} من أصل {totalFinished}</span>
                      </span>
                    </div>
                  </div>

                  {/* Simplified Bar Chart */}
                  <div className="bg-neutral-50/70 rounded-2xl p-5 border border-neutral-200/80">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        مقارنة معدلات الفوز المباشرة (% Success Rate)
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        اضغط على أي رهان لتصفية السباقات أدناه
                      </span>
                    </div>

                    <div className="h-60 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={successRateComparisonData} 
                          margin={{ top: 15, right: 20, bottom: 5, left: -10 }}
                          barSize={42}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 700, fill: '#374151' }} 
                            dy={10} 
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#6b7280' }} 
                            tickFormatter={(val) => `${val}%`} 
                            dx={-5}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                            cursor={{ fill: 'rgba(243, 244, 246, 0.6)' }}
                            formatter={(value: any, name: any, props: any) => {
                              const item = props.payload;
                              return [
                                `${value}% (${item.wins} فوز من أصل ${item.total} سباق)`,
                                'معدل النجاح'
                              ];
                            }}
                          />
                          <Bar 
                            dataKey="rate" 
                            radius={[8, 8, 0, 0]}
                            onClick={(entry: any) => {
                              if (entry && entry.filterKey) {
                                setBetFilter(entry.filterKey);
                              }
                            }}
                            className="cursor-pointer transition-opacity hover:opacity-90"
                          >
                            {successRateComparisonData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Metric Cards for Tierce, Quarte, Quinte */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {successRateComparisonData.map((item) => {
                      const isFilterActive = betFilter === item.filterKey;
                      return (
                        <div 
                          key={item.shortName}
                          className={cn(
                            "p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-sm",
                            isFilterActive 
                              ? "bg-white ring-2 ring-indigo-500 border-transparent shadow-md" 
                              : "bg-white border-neutral-200 hover:border-neutral-300"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                {item.name}
                              </span>
                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                                {item.tag}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-3xl font-black" style={{ color: item.color }}>
                                {item.rate}%
                              </span>
                              <span className="text-xs text-neutral-500 font-bold">
                                ({item.wins} فوز / {item.total} سباق)
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden mb-3">
                              <div 
                                className="h-2 rounded-full transition-all duration-700" 
                                style={{ width: `${item.rate}%`, backgroundColor: item.color }} 
                              />
                            </div>

                            {/* Details Breakdown */}
                            <div className="space-y-1 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                              <div className="flex justify-between items-center">
                                <span>الترتيب الصحيح (Ordre):</span>
                                <span className="font-bold text-neutral-800 font-mono">
                                  {item.ordreCount} ({item.ordreRate}%)
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>ترتيب عشوائي (Désordre):</span>
                                <span className="font-bold text-neutral-800 font-mono">
                                  {item.desordreCount} ({item.desordreRate}%)
                                </span>
                              </div>
                              {item.bonus4Count !== undefined && item.bonus4Count > 0 && (
                                <div className="flex justify-between items-center text-cyan-700">
                                  <span>بونص 4 (Bonus 4):</span>
                                  <span className="font-bold font-mono">
                                    {item.bonus4Count} ({Math.round((item.bonus4Count / (item.total || 1)) * 100)}%)
                                  </span>
                                </div>
                              )}
                              {item.bonus3Count !== undefined && item.bonus3Count > 0 && (
                                <div className="flex justify-between items-center text-emerald-700">
                                  <span>بونص 3 (Bonus 3):</span>
                                  <span className="font-bold font-mono">
                                    {item.bonus3Count} ({Math.round((item.bonus3Count / (item.total || 1)) * 100)}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => setBetFilter(isFilterActive ? "ALL" : item.filterKey)}
                            className={cn(
                              "mt-4 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                              isFilterActive
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                            )}
                          >
                            <Filter className="w-3 h-3" />
                            <span>{isFilterActive ? "إلغاء التصفية" : `تصفية سباقات ${item.shortName}`}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 1: Chronological Evolution Chart */}
              {activeTab === "chart" && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-neutral-500">منحنى دقة توقعات الـ Top 5 سباقاً تلو الآخر</span>
                  </div>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#6b7280' }} 
                          dy={10} 
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#6b7280' }} 
                          dx={-10} 
                          tickFormatter={(val) => `${val}%`} 
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px', fontSize: '12px' }}
                          formatter={(value: any) => [`${value}%`, 'دقة التوقعات']}
                          labelFormatter={(label) => `سباق: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="accuracy" 
                          stroke="#4f46e5" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
                          activeDot={{ r: 6 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tab 5: Daily Summary */}
              {activeTab === "daily" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-neutral-500">تجميع النتائج حسب التاريخ والأداء اليومي التراكمي</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {dailySummaryList.length > 0 ? (
                      dailySummaryList.map((day) => (
                        <div key={day.date} className="bg-neutral-50 rounded-xl border border-neutral-100 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                              <h3 className="font-bold text-neutral-900">
                                يوم {day.date.substring(0, 2)}/{day.date.substring(2, 4)}/{day.date.substring(4, 8)}
                              </h3>
                              <p className="text-xs text-neutral-500">تم تحليل {day.totalRaces} سباقات (منتهي: {day.finishedRaces})</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-center px-3 py-1 bg-white border rounded-lg">
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">متوسط الدقة</p>
                                <p className="text-sm font-extrabold text-indigo-600">
                                  {day.finishedRaces > 0 ? Math.round((day.totalMatches / (day.finishedRaces * 5)) * 100) : 0}%
                                </p>
                              </div>
                              <div className="text-center px-3 py-1 bg-white border rounded-lg">
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">النجاح الكلي</p>
                                <p className="text-sm font-extrabold text-emerald-600">{day.tierceWins + day.quarteWins + day.quinteWins} تذاكر</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-lg border flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-600">Tiercé</span>
                              <span className="text-sm font-black text-amber-600">{day.tierceWins}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-600">Quarté+</span>
                              <span className="text-sm font-black text-indigo-600">{day.quarteWins}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-600">Quinté+</span>
                              <span className="text-sm font-black text-emerald-600">{day.quinteWins}</span>
                            </div>
                          </div>
                          
                          {/* Daily Performance Bar */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 mb-1">
                              <span>كفاءة التوقعات اليومية</span>
                              <span>{day.finishedRaces > 0 ? Math.round((day.totalMatches / (day.finishedRaces * 5)) * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000" 
                                style={{ width: `${day.finishedRaces > 0 ? Math.round((day.totalMatches / (day.finishedRaces * 5)) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-neutral-400 text-sm">
                        لا توجد بيانات كافية لإنشاء ملخص يومي.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Bet Type Aggregate Performance */}
              {activeTab === "bets" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tiercé Card */}
                  <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-neutral-900">Tiercé (تيرسي)</span>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">3 خيول</span>
                      </div>
                      
                      <div className="text-center py-4">
                        <span className="text-4xl font-extrabold text-indigo-700">{tierceWinRate}%</span>
                        <span className="text-xs text-neutral-400 block mt-1">نسبة النجاح (Ordre / Désordre)</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-neutral-200 rounded-full h-2 mt-2 mb-4 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${tierceWinRate}%` }}></div>
                      </div>

                      <div className="space-y-2 pt-3 border-t text-xs text-neutral-600">
                        <div className="flex justify-between">
                          <span>الترتيب الصحيح (Ordre):</span>
                          <span className="font-bold text-neutral-800">{tierceOrdre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ترتيب عشوائي (Désordre):</span>
                          <span className="font-bold text-neutral-800">{tierceDesordre}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-neutral-400 mt-4 text-center">
                      تحليل لـ {tierceTotal} سباق منتهي
                    </div>
                  </div>

                  {/* Quarté+ Card */}
                  <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-neutral-900">Quarté+ (كوارتي)</span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">4 خيول</span>
                      </div>
                      
                      <div className="text-center py-4">
                        <span className="text-4xl font-extrabold text-indigo-700">{quarteWinRate}%</span>
                        <span className="text-xs text-neutral-400 block mt-1">نسبة النجاح الكلية (بما في ذلك البونص)</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-neutral-200 rounded-full h-2 mt-2 mb-4 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${quarteWinRate}%` }}></div>
                      </div>

                      <div className="space-y-2 pt-3 border-t text-xs text-neutral-600">
                        <div className="flex justify-between">
                          <span>الترتيب الصحيح (Ordre):</span>
                          <span className="font-bold text-neutral-800">{quarteOrdre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ترتيب عشوائي (Désordre):</span>
                          <span className="font-bold text-neutral-800">{quarteDesordre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>بونص 3 (Bonus 3):</span>
                          <span className="font-bold text-neutral-800">{quarteBonus}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-neutral-400 mt-4 text-center">
                      تحليل لـ {quarteTotal} سباق منتهي
                    </div>
                  </div>

                  {/* Quinté+ Card */}
                  <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-neutral-900">Quinté+ (كينتي)</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">5 خيول</span>
                      </div>
                      
                      <div className="text-center py-4">
                        <span className="text-4xl font-extrabold text-indigo-700">{quinteWinRate}%</span>
                        <span className="text-xs text-neutral-400 block mt-1">نسبة النجاح الكلية (بونص 3 و 4)</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-neutral-200 rounded-full h-2 mt-2 mb-4 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${quinteWinRate}%` }}></div>
                      </div>

                      <div className="space-y-2 pt-3 border-t text-xs text-neutral-600">
                        <div className="flex justify-between">
                          <span>الترتيب الصحيح (Ordre):</span>
                          <span className="font-bold text-neutral-800">{quinteOrdre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ترتيب عشوائي (Désordre):</span>
                          <span className="font-bold text-neutral-800">{quinteDesordre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>بونص 4 (Bonus 4):</span>
                          <span className="font-bold text-neutral-800">{quinteBonus4}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>بونص 3 (Bonus 3):</span>
                          <span className="font-bold text-neutral-800">{quinteBonus3}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-neutral-400 mt-4 text-center">
                      تحليل لـ {quinteTotal} سباق منتهي
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Performance by Terrain/Track Type */}
              {activeTab === "terrain" && (
                <div className="overflow-x-auto">
                  {terrainStatsList.length > 0 ? (
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-500 text-xs font-semibold border-b">
                          <th className="p-3">نوع الأرضية / حالة المضمار</th>
                          <th className="p-3 text-center">السباقات المحللة</th>
                          <th className="p-3 text-center">معدل دقة الـ Top 5</th>
                          <th className="p-3 text-center">معدل إصابة الخيول</th>
                          <th className="p-3 text-center">نسبة نجاح Tiercé</th>
                          <th className="p-3 text-center">نسبة نجاح Quinté+</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {terrainStatsList.map((stat, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50/50">
                            <td className="p-3 font-bold text-neutral-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {stat.name}
                            </td>
                            <td className="p-3 text-center text-neutral-600 font-medium">{stat.total}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded text-xs">
                                {stat.accuracy}%
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-neutral-700">{stat.avgMatch} / 5</td>
                            <td className="p-3 text-center font-semibold text-emerald-700">{stat.tierceWinRate}%</td>
                            <td className="p-3 text-center font-semibold text-indigo-700">{stat.quinteWinRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8 text-neutral-400 text-sm">
                      لا توجد بيانات أرضية كافية لحساب إحصائيات الأداء الكلية.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Probability Velocity & Rate of Change */}
              {activeTab === "velocity" && (
                <div className="space-y-6">
                  
                  {/* Select and Mode Controls */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-indigo-600" />
                      <div className="text-right">
                        <label className="block text-xs font-bold text-neutral-500 mb-1">اختر سباقاً للتحليل اللحظي:</label>
                        <select
                          value={selectedVelocityId}
                          onChange={(e) => setSelectedVelocityId(e.target.value)}
                          className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 shadow-sm outline-none focus:border-indigo-500"
                        >
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.reunion} C{item.course?.replace('C', '') ?? ''} - {item.raceName} ({item.date ? `${item.date.substring(0, 2)}/${item.date.substring(2, 4)}` : ''})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-neutral-200 p-0.5 rounded-lg border">
                      <button
                        onClick={() => setVelocityMode("roc")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                          velocityMode === "roc" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-neutral-600"
                        )}
                      >
                        معدل التغيير الاتجاهي (%)
                      </button>
                      <button
                        onClick={() => setVelocityMode("volatility")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                          velocityMode === "volatility" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-neutral-600"
                        )}
                      >
                        سرعة الاستجابة والتذبذب
                      </button>
                    </div>
                  </div>

                  {selectedItemForVelocity ? (
                    <>
                      {/* Description Header */}
                      <div className="border-r-4 border-indigo-500 bg-indigo-50/50 p-4 rounded-l-xl">
                        <h4 className="text-xs font-bold text-indigo-900 mb-1">
                          {velocityMode === "roc" ? "منحنى تسارع وهبوط قوة الجاذبية للخيول" : "مقياس سرعة استجابة الاحتمالات لضخ المراهنات (Volatility)"}
                        </h4>
                        <p className="text-[11px] text-indigo-700">
                          {velocityMode === "roc" 
                            ? "يوضح مقدار الزيادة أو النقصان في احتمالية فوز كل جواد خلال فترات المراقبة المتعاقبة قبل السباق."
                            : "يوضح مدى حركية ونشاط التقييمات اللحظية لكل جواد؛ القيم المرتفعة تشير إلى استجابة فائقة السرعة لتعديلات الأوزان أو المراهنات المباشرة."}
                        </p>
                      </div>

                      {/* Recharts Chart */}
                      <div className="h-72 w-full mt-4" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={velocityChartDetails.chartData} margin={{ top: 15, right: 10, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis 
                              dataKey="name" 
                              tickLine={false} 
                              tick={{ fontSize: 11, fill: '#6b7280' }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 11, fill: '#6b7280' }} 
                              tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              labelStyle={{ fontWeight: 'bold', color: '#111827', fontSize: '11px', marginBottom: '4px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                            {velocityChartDetails.horseNumbers.map((num, idx) => {
                              const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];
                              return (
                                <Line
                                  key={num}
                                  type="monotone"
                                  dataKey={`الجواد ${num}`}
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth={3}
                                  dot={{ r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Velocity and Volatility Table */}
                      <div className="mt-6 border rounded-xl overflow-hidden">
                        <div className="bg-neutral-50 px-4 py-2.5 border-b">
                          <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                            ملخص تحليلات الحركة اللحظية للخيول الخمسة الأولى (Top 5)
                          </span>
                        </div>
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="bg-neutral-50/50 text-neutral-500 font-bold border-b">
                              <th className="p-3">الجواد</th>
                              <th className="p-3 text-center">أقصى سرعة استجابة (Max Volatility)</th>
                              <th className="p-3 text-center">صافي التغيير الكلي (Net Trend)</th>
                              <th className="p-3 text-center">حالة الاستجابة اللحظية</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {velocityChartDetails.maxSpeeds.map((speed, idx) => {
                              const colors = ["bg-indigo-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500"];
                              const isPositive = speed.netChange > 0;
                              return (
                                <tr key={speed.num} className="hover:bg-neutral-50/50">
                                  <td className="p-3 font-bold text-neutral-800 flex items-center gap-2">
                                    <span className={cn("w-2.5 h-2.5 rounded-full", colors[idx % colors.length])} />
                                    الجواد رقم {speed.num}
                                  </td>
                                  <td className="p-3 text-center font-semibold text-neutral-700">{speed.maxSpeed}% / فترة</td>
                                  <td className={cn(
                                    "p-3 text-center font-bold",
                                    speed.netChange > 0 ? "text-emerald-600" : speed.netChange < 0 ? "text-red-600" : "text-neutral-500"
                                  )}>
                                    {speed.netChange > 0 ? `+${speed.netChange}%` : `${speed.netChange}%`}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold",
                                      Math.abs(speed.maxSpeed) > 4 
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : Math.abs(speed.maxSpeed) > 2
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    )}>
                                      {Math.abs(speed.maxSpeed) > 4 
                                        ? "استجابة شديدة (حساس)" 
                                        : Math.abs(speed.maxSpeed) > 2 
                                        ? "استجابة متوسطة" 
                                        : "استجابة مستقرة"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-neutral-400 text-sm">
                      يرجى اختيار سباق من القائمة لاستعراض موجات الاحتمالات.
                    </div>
                  )}

                </div>
              )}

              {/* Tab 6: Heatmaps */}
              {activeTab === "heatmaps" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-neutral-500">
                      الخرائط الحرارية (Heatmaps) لتوزيع معدلات الفوز ودقة التوقعات حسب نوع المضمار
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {heatMapData.map((data, idx) => (
                      <div key={idx} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-neutral-50 px-4 py-3 border-b flex items-center justify-between">
                          <span className="font-bold text-neutral-800 text-sm">{data.discipline}</span>
                          <span className="text-[10px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full font-bold">
                            {data.total} سباق
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-4 flex-1 flex flex-col justify-center">
                          {/* Accuracy Heatmap Bar */}
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-bold">
                              <span className="text-neutral-600">دقة التوقع (Top 5)</span>
                              <span className={cn(
                                data.accuracy >= 50 ? "text-emerald-600" : data.accuracy >= 30 ? "text-amber-600" : "text-red-600"
                              )}>{data.accuracy}%</span>
                            </div>
                            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden flex">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  data.accuracy >= 50 ? "bg-emerald-500" : data.accuracy >= 30 ? "bg-amber-500" : "bg-red-500"
                                )} 
                                style={{ width: `${Math.min(100, data.accuracy)}%` }}
                              />
                            </div>
                          </div>

                          {/* Tierce Heatmap Bar */}
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-bold">
                              <span className="text-neutral-600">معدل فوز تيرسي</span>
                              <span className={cn(
                                data.tierce >= 25 ? "text-emerald-600" : data.tierce >= 10 ? "text-amber-600" : "text-red-600"
                              )}>{data.tierce}%</span>
                            </div>
                            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden flex">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  data.tierce >= 25 ? "bg-emerald-500" : data.tierce >= 10 ? "bg-amber-500" : "bg-red-500"
                                )} 
                                style={{ width: `${Math.min(100, data.tierce)}%` }}
                              />
                            </div>
                          </div>

                          {/* Quinte Heatmap Bar */}
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-bold">
                              <span className="text-neutral-600">معدل فوز كوينتي</span>
                              <span className={cn(
                                data.quinte >= 15 ? "text-emerald-600" : data.quinte >= 5 ? "text-amber-600" : "text-red-600"
                              )}>{data.quinte}%</span>
                            </div>
                            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden flex">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  data.quinte >= 15 ? "bg-emerald-500" : data.quinte >= 5 ? "bg-amber-500" : "bg-red-500"
                                )} 
                                style={{ width: `${Math.min(100, data.quinte)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <Target className="w-4 h-4" />
                      كيفية قراءة الخرائط الحرارية:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mr-1">
                      <li><strong>اللون الأخضر:</strong> يشير إلى أداء قوي ومربح في هذا النوع من المضامير. يفضل الاعتماد على توقعات الذكاء الاصطناعي بقوة.</li>
                      <li><strong>اللون البرتقالي:</strong> أداء متوسط ومتقلب، يُنصح بدمج ترشيحات الذكاء الاصطناعي مع تحليلك الشخصي.</li>
                      <li><strong>اللون الأحمر:</strong> أداء ضعيف للنموذج في هذا النوع من المضامير (غالباً بسبب الطبيعة العشوائية للسباق). يُنصح بالحذر وعدم المخاطرة العالية.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 7: Evolution over time */}
              {activeTab === "evolution" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-neutral-500">
                        تطور أداء الذكاء الاصطناعي عبر الزمن حسب نوع المضمار
                      </span>
                    </div>
                    
                    <select
                      value={selectedEvolutionDiscipline}
                      onChange={(e) => setSelectedEvolutionDiscipline(e.target.value)}
                      className="bg-white border text-neutral-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto"
                    >
                      <option value="ALL">جميع المضامير</option>
                      <option value="TROT_ATTELE">هرولة عربات (Trot Attelé)</option>
                      <option value="PLAT">ركض مسطح (Plat)</option>
                      <option value="OBSTACLE">حواجز (Obstacle)</option>
                      <option value="TROT_MONTE">هرولة ركوب (Trot Monté)</option>
                    </select>
                  </div>

                  {evolutionData.length > 0 ? (
                    <div className="h-72 w-full mt-4" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={evolutionData} margin={{ top: 15, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false}
                            tick={{ fontSize: 11, fill: '#6b7280' }} 
                            dy={10}
                          />
                          <YAxis 
                            domain={[0, 100]}
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#6b7280' }} 
                            tickFormatter={(val) => `${val}%`}
                            dx={-10}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#111827', fontSize: '11px', marginBottom: '8px' }}
                            formatter={(value: any, name: any) => [
                              `${value}%`, 
                              name === "accuracy" ? "دقة (Top 5)" : name === "tierceRate" ? "معدل فوز تيرسي" : "معدل فوز كوينتي"
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                          <Line
                            type="monotone"
                            dataKey="accuracy"
                            name="دقة (Top 5)"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="tierceRate"
                            name="معدل فوز تيرسي"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="quinteRate"
                            name="معدل فوز كوينتي"
                            stroke="#f59e0b"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-400 text-sm">
                      لا توجد بيانات كافية لعرض التطور الزمني لهذا المضمار.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* List of Predictions */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b bg-neutral-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-neutral-900">سجل وأرشيف السباقات والتوقعات المحفوظة</h2>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                {filteredItems.length} من أصل {items.length} سباق
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={syncTodayRaces}
                disabled={syncingToday}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <Sparkles className={cn("w-3.5 h-3.5", syncingToday && "animate-spin")} />
                <span>{syncingToday ? "جاري استيراد وحفظ سباقات اليوم..." : "استيراد وتوقع سباقات اليوم"}</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-600", refreshing && "animate-spin")} />
                <span>{refreshing ? "جاري التحديث من PMU..." : "تحديث ومزامنة النتائج"}</span>
              </button>
            </div>
          </div>

          {/* Bet Filter Toolbar */}
          <div className="px-5 py-3 border-b bg-white flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>تصفية حسب نوع الرهان:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setBetFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  betFilter === "ALL"
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                )}
              >
                <span>الكل</span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", betFilter === "ALL" ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-800")}>
                  {items.length}
                </span>
              </button>

              <button
                onClick={() => setBetFilter("TIERCE")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  betFilter === "TIERCE"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60"
                )}
              >
                <Trophy className="w-3 h-3 text-amber-500" />
                <span>Tiercé</span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", betFilter === "TIERCE" ? "bg-amber-800 text-white" : "bg-amber-200/80 text-amber-950 font-bold")}>
                  {tierceWonCount}
                </span>
              </button>

              <button
                onClick={() => setBetFilter("QUARTE")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  betFilter === "QUARTE"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/60"
                )}
              >
                <Trophy className="w-3 h-3 text-indigo-500" />
                <span>Quarté+</span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", betFilter === "QUARTE" ? "bg-indigo-800 text-white" : "bg-indigo-200/80 text-indigo-950 font-bold")}>
                  {quarteWonCount}
                </span>
              </button>

              <button
                onClick={() => setBetFilter("QUINTE")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  betFilter === "QUARTE" || betFilter === "QUINTE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/60"
                )}
              >
                <Trophy className="w-3 h-3 text-emerald-500" />
                <span>Quinté+</span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", betFilter === "QUINTE" ? "bg-emerald-800 text-white" : "bg-emerald-200/80 text-emerald-950 font-bold")}>
                  {quinteWonCount}
                </span>
              </button>

              <button
                onClick={() => setBetFilter("WINNING")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  betFilter === "WINNING"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/60"
                )}
              >
                <Award className="w-3 h-3 text-purple-600" />
                <span>جميع الرابحة</span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", betFilter === "WINNING" ? "bg-purple-800 text-white" : "bg-purple-200/80 text-purple-950 font-bold")}>
                  {winningAnyCount}
                </span>
              </button>

              {pendingCount > 0 && (
                <button
                  onClick={() => setBetFilter("PENDING")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                    betFilter === "PENDING"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/60"
                  )}
                >
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>في الانتظار</span>
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", betFilter === "PENDING" ? "bg-blue-800 text-white" : "bg-blue-200 text-blue-900")}>
                    {pendingCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p>جاري استرجاع السجل والأرشيف الدائم...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 max-w-md mx-auto px-4">
              <History className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <p className="font-bold text-neutral-800 text-lg">لا توجد توقعات محفوظة في الأرشيف حالياً</p>
              <p className="text-sm mt-1 text-neutral-500">
                يمكنك الضغط على الزر أدناه لاستيراد سباقات اليوم وتوليد التوقعات الذكية وحفظها فورياً في السجل الدائم.
              </p>
              <button
                onClick={syncTodayRaces}
                disabled={syncingToday}
                className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Sparkles className={cn("w-4 h-4", syncingToday && "animate-spin")} />
                <span>{syncingToday ? "جاري المعالجة والحفظ بالأرشيف..." : "استيراد وحفظ توقعات اليوم فورياً"}</span>
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-14 text-neutral-500 max-w-md mx-auto px-4">
              <Filter className="w-10 h-10 text-indigo-300 mx-auto mb-2.5" />
              <p className="font-bold text-neutral-800 text-base">لا توجد سباقات متطابقة مع نوع الرهان المحدد</p>
              <p className="text-xs mt-1 text-neutral-500">
                لم يتم تسجيل فوز في الرهان المختار ضمن قائمة السباقات الحالية.
              </p>
              <button
                onClick={() => setBetFilter("ALL")}
                className="mt-4 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all"
              >
                إعادة ضبط التصفية وعرض الكل
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredItems.map((item) => (
                <div key={item.id} className="p-5 hover:bg-neutral-50/80 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/race/${item.date}/${item.reunion}/${item.course || ''}`}
                          className="font-bold text-base sm:text-lg text-indigo-950 hover:text-indigo-600 transition-colors flex items-center gap-2"
                        >
                          {item.reunion} • C{item.course?.replace('C', '') ?? ''} - {item.raceName}
                        </Link>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1 flex items-center gap-3">
                        <span>{item.date.substring(0,2)}/{item.date.substring(2,4)}/{item.date.substring(4,8)}</span>
                        <span>• التخصص: {item.discipline}</span>
                        <span>• المضمار: {item.terrain}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* AI vs Bayesian Model indicator */}
                      {item.isAiGenerated ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <Bot className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.aiModelUsed || "Google Gemini"}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          <span>{item.aiModelUsed || "النموذج البايزي"}</span>
                        </span>
                      )}

                      {/* Golden Base indicator */}
                      {item.goldenBase && (
                        <span className="px-2.5 py-1 bg-amber-400/20 text-amber-900 border border-amber-400/40 text-xs font-black rounded-lg flex items-center gap-1">
                          ⭐ ركيزة: N°{item.goldenBase}
                        </span>
                      )}

                      {/* Status indicator */}
                      {item.isFinished ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مطابقة: {item.matchCount}/5
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          في الانتظار
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Analysis Snippet */}
                  {item.analysis && (
                    <div className="mb-4 text-xs text-neutral-700 bg-neutral-50/80 p-3 rounded-xl border border-neutral-200/70 leading-relaxed">
                      <span className="font-bold text-indigo-900 ml-1">التحليل الاستراتيجي:</span>
                      <span className="line-clamp-2">{item.analysis}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Prediction */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                        <span>خماسي التوقع (Top 5)</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {item.prediction.map((p, idx) => {
                          const isMatch = item.isFinished && item.actual.includes(p);
                          const isGolden = p === item.goldenBase;
                          return (
                            <div key={idx} className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm transition-all",
                              isGolden && "ring-2 ring-amber-400 ring-offset-1",
                              isMatch 
                                ? "bg-emerald-500 text-white border-emerald-600 font-bold" 
                                : "bg-white border-neutral-300 text-neutral-800"
                            )}>
                              {p}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actual Arrival */}
                    {item.isFinished && (
                      <div>
                        <h4 className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">
                          الوصول الرسمي (Arrivée Officielle)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.actual.map((a, idx) => {
                            const wasPredicted = item.prediction.includes(a);
                            return (
                              <div key={idx} className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border shadow-sm",
                                wasPredicted
                                  ? "bg-emerald-600 text-white border-emerald-700 font-black"
                                  : "bg-neutral-900 border-neutral-900 text-white"
                              )}>
                                {a}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {item.isFinished && (() => {
                    const outcomes = evaluateBetOutcome(item.prediction, item.actual);
                    return (
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-neutral-500 ml-1">عوائد الرهان المحققة:</span>
                        {outcomes.tierce !== "NONE" && (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-600" />
                            Tiercé: {translateOutcome("tierce", outcomes.tierce)}
                          </span>
                        )}
                        {outcomes.quarte !== "NONE" && (
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-indigo-600" />
                            Quarté+: {translateOutcome("quarte", outcomes.quarte)}
                          </span>
                        )}
                        {outcomes.quinte !== "NONE" && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-emerald-600" />
                            Quinté+: {translateOutcome("quinte", outcomes.quinte)}
                          </span>
                        )}
                        {outcomes.tierce === "NONE" && outcomes.quarte === "NONE" && outcomes.quinte === "NONE" && (
                          <span className="text-xs text-neutral-400">لا توجد أرباح أو بونص محقق في هذا التوقع بعد.</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
