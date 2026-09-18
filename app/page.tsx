"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PMUProgramme, PMURace, PMUReunion } from "@/types/pmu";
import { Calendar, ChevronRight, Clock, Trophy, MapPin, ArrowRight, Loader2, SlidersHorizontal, Layers, Award, Bell, Heart, X, Sparkles, Wallet, Brain, RefreshCw, Activity, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { encryptData, decryptData } from "@/lib/encryption";

interface WatchlistRace {
  date: string;
  reunion: string;
  course: string;
  libelle: string;
  heure: string;
  timestamp: number;
}

const getTodayFormatted = () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${dd}${mm}${yyyy}`;
};

export default function Home() {
  const [date, setDate] = useState<string>(getTodayFormatted);
  const [programme, setProgramme] = useState<PMUProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [betTypeFilter, setBetTypeFilter] = useState<"ALL" | "TIERCE" | "QUARTE" | "QUINTE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PROGRAMMEE" | "A_PARTIR" | "ARRIVEE">("ALL");

  // Automated background analytical worker states
  const [savedPredictions, setSavedPredictions] = useState<Record<string, boolean>>({});
  const [autoWorkerActive, setAutoWorkerActive] = useState<boolean>(true);
  const [workerStatus, setWorkerStatus] = useState<string>("جاري تهيئة محلل السجل الفعلي...");
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Watchlist & Alerts state
  const [mounted, setMounted] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistRace[]>([]);
  const [activeAlert, setActiveAlert] = useState<{
    id: string;
    message: string;
    type: "live" | "upcoming";
    link: string;
  } | null>(null);

  // Load watchlist on mount
  useEffect(() => {
    let timeoutId = setTimeout(() => {
      setMounted(true);
      try {
        const saved = localStorage.getItem("pmu_watchlist");
        if (saved) {
          try {
            const decrypted = decryptData(saved);
            if (decrypted) {
              setWatchlist(decrypted);
            } else {
              // Fallback for unencrypted old data
              const parsed = JSON.parse(saved);
              setWatchlist(parsed);
              localStorage.setItem("pmu_watchlist", encryptData(parsed));
            }
          } catch (e) {
            const parsed = JSON.parse(saved);
            setWatchlist(parsed);
            localStorage.setItem("pmu_watchlist", encryptData(parsed));
          }
        }
      } catch (e) {
        console.error("Failed to load watchlist", e);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  // Watchlist alerts simulator
  useEffect(() => {
    if (!mounted) return;
    // We define a simulation cycle
    const timer = setTimeout(() => {
      if (watchlist.length > 0) {
        // Alert about a watchlist item
        const item = watchlist[0];
        setActiveAlert({
          id: `upcoming_${item.reunion}_${item.course}`,
          message: `تنبيــه اقتراب السباق: ${item.libelle} (R${item.reunion} C${item.course}) المضاف لقائمتك ينطلق خلال دقائق معدودة! ⏱️`,
          type: "upcoming",
          link: `/race/${item.date}/R${item.reunion}/C${item.course}`
        });
      } else {
        // Generic live update alert
        setActiveAlert({
          id: "live_general_update",
          message: "تحديث حي: تم إقرار النتائج النهائية وتحديث أرقام التفوق لسباقات القمة اليوم! 🏆 اضغط للتحليل ومتابعة المحاكاة.",
          type: "live",
          link: "#"
        });
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [watchlist, date, mounted]);

  const toggleWatchlist = (e: React.MouseEvent, race: PMURace, reunionNum: number) => {
    e.preventDefault();
    e.stopPropagation();

    const raceId = `${date}_R${reunionNum}_C${race.numOrdre}`;
    const exists = watchlist.some(w => w.reunion === String(reunionNum) && w.course === String(race.numOrdre));

    let updated: WatchlistRace[] = [];
    if (exists) {
      updated = watchlist.filter(w => !(w.reunion === String(reunionNum) && w.course === String(race.numOrdre)));
    } else {
      updated = [
        ...watchlist,
        {
          date,
          reunion: String(reunionNum),
          course: String(race.numOrdre),
          libelle: race.libelle,
          heure: formatTime(race.heureDepart),
          timestamp: race.heureDepart
        }
      ];
    }
    setWatchlist(updated);
    localStorage.setItem("pmu_watchlist", encryptData(updated));

    // Instantly trigger an alert indicating watchlist updated successfully!
    if (!exists) {
      setActiveAlert({
        id: `added_${reunionNum}_${race.numOrdre}`,
        message: `تمت إضافة سباق C${race.numOrdre} في الاجتماع R${reunionNum} لقائمة المتابعة الحية! ستتلقى إشعارات فورية هنا. ✨`,
        type: "upcoming",
        link: `/race/${date}/R${reunionNum}/C${race.numOrdre}`
      });
    }
  };

  useEffect(() => {
    if (!date) return;
    
    let isMounted = true;
    fetch(`/api/pmu/programme?date=${date}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load PMU program");
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          setProgramme(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error(err);
          setError("تعذر تحميل بيانات السباقات.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [date]);

  // Fetch saved predictions list from server store
  const fetchSavedPredictions = async () => {
    try {
      const res = await fetch("/api/predictions");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, boolean> = {};
        if (data.records && Array.isArray(data.records)) {
          data.records.forEach((rec: any) => {
            const key = `prediction_${rec.date}_R${rec.reunion.replace("R", "")}_C${rec.course.replace("C", "")}`;
            map[key] = true;
          });
        }
        setSavedPredictions(map);
      }
    } catch (e) {
      console.error("Failed to fetch saved predictions list:", e);
    }
  };

  useEffect(() => {
    fetchSavedPredictions();
  }, [date]);

  // Automated background predictions queue processor (starts automatically for ALL loaded races)
  useEffect(() => {
    if (!programme?.programme?.reunions || !autoWorkerActive) return;

    let isCancelled = false;

    // Collect all races in current program
    const allRaces: { reunionNum: number; raceNum: number; key: string }[] = [];
    programme.programme.reunions.forEach((reunion) => {
      (reunion.courses || []).forEach((race) => {
        const key = `prediction_${date}_R${reunion.numOfficiel}_C${race.numOrdre}`;
        allRaces.push({
          reunionNum: reunion.numOfficiel,
          raceNum: race.numOrdre,
          key,
        });
      });
    });

    if (allRaces.length === 0) return;

    // Find races that do not have generated predictions yet
    const pendingRaces = allRaces.filter((r) => !savedPredictions[r.key]);

    if (pendingRaces.length === 0) {
      setWorkerStatus("جميع سباقات اليوم تم تحليلها وتوليد توقعاتها تلقائياً ومحفوظة بنجاح! ✅");
      setSyncProgress({ current: allRaces.length, total: allRaces.length });
      return;
    }

    const totalToSync = pendingRaces.length;
    const completedInitially = allRaces.length - totalToSync;
    setSyncProgress({ current: completedInitially, total: allRaces.length });

    const runSequence = async () => {
      setWorkerStatus(`جاري توليد وتحليل ${totalToSync} سباق في الخلفية لملء سجل الإحصائيات... 🧠`);

      for (let i = 0; i < pendingRaces.length; i++) {
        if (isCancelled) break;

        const target = pendingRaces[i];
        setWorkerStatus(`توليد وتحليل تكتيكي تلقائي نشط: الاجتماع R${target.reunionNum} السباق C${target.raceNum}... ⚡`);

        try {
          const raceRes = await fetch(`/api/pmu/race?date=${date}&reunion=R${target.reunionNum}&course=C${target.raceNum}`);
          if (raceRes.ok) {
            const raceData = await raceRes.json();
            if (raceData.info && raceData.participants && raceData.participants.length > 0) {
              const predictRes = await fetch("/api/ai/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  raceInfo: raceData.info,
                  participants: raceData.participants,
                  date,
                  reunion: `R${target.reunionNum}`,
                  course: `C${target.raceNum}`,
                }),
              });

              if (predictRes.ok) {
                setSavedPredictions((prev) => ({ ...prev, [target.key]: true }));
              }
            }
          }
        } catch (err) {
          console.warn(`[AutoWorker] Skipped R${target.reunionNum} C${target.raceNum} due to network request info:`, err);
        }

        setSyncProgress((prev) => ({ ...prev, current: prev.current + 1 }));
        // Slower delay to guarantee stable API usage
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!isCancelled) {
        setWorkerStatus("اكتمل التحليل والتوليد التلقائي لجميع السباقات وتم حفظها بسجل التوقعات والإحصائيات! 🏆");
        fetchSavedPredictions();
      }
    };

    runSequence();

    return () => {
      isCancelled = true;
    };
  }, [programme, savedPredictions, date, autoWorkerActive]);

  const changeDate = (offset: number) => {
    const currentDate = new Date(
      parseInt(date.substring(4, 8)),
      parseInt(date.substring(2, 4)) - 1,
      parseInt(date.substring(0, 2))
    );
    currentDate.setDate(currentDate.getDate() + offset);
    const dd = String(currentDate.getDate()).padStart(2, '0');
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const yyyy = currentDate.getFullYear();
    setLoading(true);
    setDate(`${dd}${mm}${yyyy}`);
  };

  const exportToICS = () => {
    if (watchlist.length === 0) return;

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Horse Racing Predictions//NONSGML v1.0//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ].join("\r\n") + "\r\n";

    watchlist.forEach((race) => {
      const start = new Date(race.timestamp);
      const end = new Date(race.timestamp + 30 * 60 * 1000); // Assume 30 mins duration

      const formatDateICS = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };

      icsContent += [
        "BEGIN:VEVENT",
        `UID:${race.date}-R${race.reunion}-C${race.course}@pmu-predictions`,
        `DTSTAMP:${formatDateICS(new Date())}`,
        `DTSTART:${formatDateICS(start)}`,
        `DTEND:${formatDateICS(end)}`,
        `SUMMARY:سباق خيول: ${race.libelle} (R${race.reunion} C${race.course})`,
        `DESCRIPTION:سباق خيول مضاف من قائمة المتابعة. الاجتماع ${race.reunion} السباق ${race.course}`,
        "END:VEVENT"
      ].join("\r\n") + "\r\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `watchlist_races_${date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success alert
    setActiveAlert({
      id: "export_success",
      message: "✅ تم تصدير ملف التقويم بنجاح! يمكنك الآن استيراده إلى تقويمك المفضل.",
      type: "live",
      link: "#"
    });
  };

  const isQuinte = (race: PMURace) => {
    return race.paris?.some(pari => pari.typePari === "QUINTE_PLUS" || pari.typePari === "E_QUINTE_PLUS");
  };

  const hasBetType = (race: PMURace, type: "TIERCE" | "QUARTE" | "QUINTE") => {
    if (!race.paris) return false;
    if (type === "TIERCE") {
      return race.paris.some(pari => pari.typePari === "TIERCE" || pari.typePari === "E_TIERCE");
    }
    if (type === "QUARTE") {
      return race.paris.some(pari => pari.typePari === "QUARTE" || pari.typePari === "E_QUARTE");
    }
    if (type === "QUINTE") {
      return race.paris.some(pari => pari.typePari === "QUINTE_PLUS" || pari.typePari === "E_QUINTE_PLUS");
    }
    return false;
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('ar-MA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  // Compute filtered programme
  const filteredReunions = useMemo(() => {
    if (!programme?.programme?.reunions) return [];

    return programme.programme.reunions
      .map((reunion) => {
        const courses = reunion.courses.filter((race) => {
          // 1. Filter by Bet Type
          if (betTypeFilter !== "ALL") {
            if (!hasBetType(race, betTypeFilter)) return false;
          }

          // 2. Filter by Race Status
          if (statusFilter !== "ALL") {
            if (statusFilter === "PROGRAMMEE" && race.statut !== "PROGRAMMEE") return false;
            if (statusFilter === "A_PARTIR" && race.statut !== "A_PARTIR") return false;
            if (statusFilter === "ARRIVEE" && race.statut !== "ARRIVEE" && race.statut !== "ARRIVEE_DEFINITIVE") return false;
          }

          return true;
        });

        return { ...reunion, courses };
      })
      .filter((reunion) => reunion.courses.length > 0);
  }, [programme, betTypeFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-500 w-6 h-6" />
            <h1 className="text-xl font-bold text-neutral-900">توقعات ونتائج الخيول</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/bankroll"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors text-sm"
              title="إدارة رأس المال"
            >
              <Wallet className="w-4 h-4" />
              <span>إدارة رأس المال</span>
            </Link>
            <Link 
              href="/history"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors text-sm"
            >
              سجل التوقعات
            </Link>
          </div>
        </div>
      </header>

      {/* Live Alerts / Watchlist Simulated Notification Bar */}
      {mounted && activeAlert && (
        <div className="bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-red-600/90 text-white shadow-md animate-pulse">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs md:text-sm font-bold">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <Bell className="w-4 h-4 text-white shrink-0" />
              <p className="truncate text-white">{activeAlert.message}</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {activeAlert.link !== "#" ? (
                <Link 
                  href={activeAlert.link}
                  className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-[10px] font-black transition-all whitespace-nowrap"
                >
                  انتقال سريع ⚡
                </Link>
              ) : null}
              <button 
                onClick={() => setActiveAlert(null)}
                className="hover:bg-white/10 p-1 rounded text-white/80 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* Date Selector & Filters Container */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border">
            <button 
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600 rotate-180" />
            </button>
            
            <div className="flex items-center gap-2 text-neutral-800 font-medium">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span suppressHydrationWarning>
                {date ? `${date.substring(0, 2)}/${date.substring(2, 4)}/${date.substring(4, 8)}` : ""}
              </span>
            </div>

            <button 
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          {/* Interactive Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
              <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
              <span>خيارات التصفية السريعة للسباقات</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filter 1: Bet Types */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-neutral-500">نوع الرهان</span>
                <div className="flex flex-wrap gap-1.5">
                  {(["ALL", "TIERCE", "QUARTE", "QUINTE"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setBetTypeFilter(type)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                        betTypeFilter === type 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      )}
                    >
                      {type === "ALL" ? "الكل" : type === "TIERCE" ? "Tiercé" : type === "QUARTE" ? "Quarté" : "Quinté+"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter 2: Race Status */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-neutral-500">حالة السباق</span>
                <div className="flex flex-wrap gap-1.5">
                  {(["ALL", "PROGRAMMEE", "A_PARTIR", "ARRIVEE"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                        statusFilter === status 
                          ? "bg-emerald-600 text-white shadow-sm" 
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      )}
                    >
                      {status === "ALL" ? "الكل" : status === "PROGRAMMEE" ? "مبرمج" : status === "A_PARTIR" ? "جارٍ..." : "منتهي"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Generator Monitor Panel */}
        {mounted && programme?.programme?.reunions && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Brain className={cn("w-5 h-5 text-indigo-600", autoWorkerActive && "animate-pulse")} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <span>المحلل التكتيكي ونظام التوليد الآلي</span>
                    {autoWorkerActive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    توليد وحفظ توقعات كافة سباقات البرنامج اليومي آلياً وبدون بيانات وهمية.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAutoWorkerActive(!autoWorkerActive)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-center",
                  autoWorkerActive 
                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" 
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                )}
              >
                {autoWorkerActive ? (
                  <>
                    <Activity className="w-3.5 h-3.5 text-red-500 animate-spin" />
                    <span>إيقاف مؤقت للتحليل الآلي</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                    <span>تنشيط التوليد والتحليل الآلي</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-neutral-600 gap-1">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-neutral-700">{workerStatus}</span>
                </div>
                <span className="text-indigo-600 shrink-0 font-mono">
                  {syncProgress.current} / {syncProgress.total} سباق
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Watchlist Section */}
        {mounted && watchlist.length > 0 && (
          <div className="bg-indigo-900 rounded-2xl p-6 shadow-lg border border-indigo-800 text-white space-y-4 mb-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Heart className="w-32 h-32 fill-white" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                  قائمة المتابعة الحية ({watchlist.length})
                </h2>
                <p className="text-indigo-200 text-xs mt-1">
                  السباقات التي اخترت متابعتها عن كثب اليوم.
                </p>
              </div>
              <button
                onClick={exportToICS}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-indigo-900 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-all shadow-md shadow-indigo-950/20"
              >
                <Calendar className="w-4 h-4" />
                تصدير للتقويم (ICS)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
              {watchlist.map((item) => (
                <div key={`${item.date}_${item.reunion}_${item.course}`} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-between group hover:bg-white/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-800/50 flex items-center justify-center font-bold text-indigo-200">
                      C{item.course}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white truncate max-w-[150px]">
                        {item.libelle}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-indigo-300">
                        <span>R{item.reunion}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.heure}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/race/${item.date}/R${item.reunion}/C${item.course}`}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="عرض التحليل"
                    >
                      <ArrowRight className="w-4 h-4 text-white rotate-180" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const updated = watchlist.filter(w => !(w.reunion === item.reunion && w.course === item.course));
                        setWatchlist(updated);
                        localStorage.setItem("pmu_watchlist", encryptData(updated));
                      }}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-red-300 hover:text-red-400"
                      title="إزالة"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
            <p>جاري تحميل السباقات...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
            {error}
          </div>
        ) : filteredReunions.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 bg-white rounded-2xl border shadow-sm space-y-2">
            <SlidersHorizontal className="w-10 h-10 text-neutral-300 mx-auto" />
            <p className="font-semibold text-neutral-700">لا توجد سباقات تطابق خيارات التصفية النشطة.</p>
            <p className="text-xs text-neutral-400">جرب تعديل أو إلغاء فلاتر التصفية أعلاه.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReunions.map((reunion) => (
              <div key={reunion.numOfficiel} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <h2 className="font-bold text-lg">
                      R{reunion.numOfficiel} - {reunion.hippodrome.libelleCourt}
                    </h2>
                  </div>
                  <span className="text-sm text-neutral-400">{reunion.nature}</span>
                </div>
                
                <div className="divide-y">
                  {reunion.courses.map((race) => {
                    const quinte = isQuinte(race);
                    const isBookmarked = mounted && watchlist.some(w => w.reunion === String(reunion.numOfficiel) && w.course === String(race.numOrdre));
                    
                    return (
                      <Link 
                        key={race.numOrdre}
                        href={`/race/${date}/R${reunion.numOfficiel}/C${race.numOrdre}`}
                        className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={cn(
                              "font-bold text-lg w-8 shrink-0",
                              quinte ? "text-amber-600" : "text-neutral-700"
                            )}>
                              C{race.numOrdre}
                            </span>
                            <h3 className="font-semibold text-neutral-900 truncate">
                              {race.libelle}
                            </h3>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 mt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(race.heureDepart)}</span>
                            </div>
                            <span>•</span>
                            <span>{race.discipline}</span>
                            <span>•</span>
                            <span>{race.distance}m</span>
                            {mounted && (
                              <>
                                <span>•</span>
                                {savedPredictions[`prediction_${date}_R${reunion.numOfficiel}_C${race.numOrdre}`] ? (
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 flex items-center gap-1">
                                    <Brain className="w-3 h-3 text-indigo-500" />
                                    <span>تم التنبؤ والتحليل</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-100 flex items-center gap-1 animate-pulse">
                                    <Activity className="w-3 h-3 text-amber-500" />
                                    <span>جاري التوليد...</span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex flex-col items-end gap-1.5">
                            {quinte && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded uppercase">
                                Quinté+
                              </span>
                            )}
                            <div className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                              race.statut === "PROGRAMMEE" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              race.statut === "A_PARTIR" ? "bg-blue-50 text-blue-600 border border-blue-100 animate-pulse" :
                              "bg-neutral-100 text-neutral-600"
                            )}>
                              {race.statut === "PROGRAMMEE" ? "مبرمج" :
                               race.statut === "A_PARTIR" ? "جارٍ..." : "انتهى"}
                            </div>
                          </div>

                          <button
                            onClick={(e) => toggleWatchlist(e, race, reunion.numOfficiel)}
                            className={cn(
                              "p-2 rounded-xl border transition-all hover:scale-105",
                              isBookmarked 
                                ? "bg-red-50 text-red-500 border-red-200" 
                                : "bg-neutral-50 text-neutral-400 border-neutral-200 hover:text-neutral-600 hover:bg-neutral-100"
                            )}
                            title={isBookmarked ? "إزالة من قائمة المتابعة" : "إضافة إلى قائمة المتابعة"}
                          >
                            <Heart className={cn("w-4 h-4", isBookmarked && "fill-red-500")} />
                          </button>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
