"use client";

import { useEffect, useState } from "react";
import { PMUParticipant, PMURace } from "@/types/pmu";
import { Activity, Trophy, ShieldAlert, Loader2, Award, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveReunionComparisonProps {
  date: string;
  reunion: string;
  currentCourse: string;
  currentParticipants: PMUParticipant[];
}

interface OtherRaceData {
  numOrdre: number;
  libelle: string;
  statut: string;
  arrival: number[];
  participants: PMUParticipant[];
}

interface LeaderStats {
  name: string;
  count: number;
  races: { courseNum: number; pos: number; horseName: string }[];
}

export default function LiveReunionComparison({
  date,
  reunion,
  currentCourse,
  currentParticipants,
}: LiveReunionComparisonProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedRaces, setCompletedRaces] = useState<OtherRaceData[]>([]);
  const [hotTrainers, setHotTrainers] = useState<LeaderStats[]>([]);
  const [hotJockeys, setHotJockeys] = useState<LeaderStats[]>([]);
  const [hotNumbers, setHotNumbers] = useState<{ num: number; count: number }[]>([]);

  useEffect(() => {
    const fetchReunionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch entire day's programme
        const progRes = await fetch(`/api/pmu/programme?date=${date}`);
        if (!progRes.ok) throw new Error("تعذر تحميل جدول سباقات اليوم.");
        const progData = await progRes.json();

        // Parse official reunion number out of string, e.g. "R1" -> 1
        const reunionNum = parseInt(reunion.replace(/\D/g, ""));
        
        // Find correct reunion
        const currentReunionObj = progData.programme?.reunions?.find(
          (r: any) => r.numOfficiel === reunionNum
        );

        if (!currentReunionObj) {
          setError("لم يتم العثور على بيانات هذا الاجتماع اليوم.");
          setLoading(false);
          return;
        }

        // Get list of courses (races)
        const coursesList = currentReunionObj.courses || [];
        
        // Filter out completed races (excluding the current one)
        const finishedRaces = coursesList.filter(
          (c: any) => 
            c.statut === "ARRIVEE_DEFINITIVE" && 
            `C${c.numOrdre}` !== currentCourse
        );

        if (finishedRaces.length === 0) {
          setCompletedRaces([]);
          setLoading(false);
          return;
        }

        // 2. Fetch full details (participants & final arrival) for each completed race in parallel
        const detailsPromises = finishedRaces.map(async (c: any) => {
          try {
            const rRes = await fetch(`/api/pmu/race?date=${date}&reunion=${reunion}&course=C${c.numOrdre}`);
            if (!rRes.ok) return null;
            const rData = await rRes.json();
            
            // Format flat arrival array
            const arrivalArr = Array.isArray(rData.info?.ordreArrivee)
              ? rData.info.ordreArrivee.map((pos: any) => pos[0])
              : [];

            return {
              numOrdre: c.numOrdre,
              libelle: rData.info?.libelle || c.libelle,
              statut: c.statut,
              arrival: arrivalArr,
              participants: rData.participants || [],
            };
          } catch (e) {
            console.error(e);
            return null;
          }
        });

        const detailedRacesRaw = await Promise.all(detailsPromises);
        const detailedRaces = detailedRacesRaw.filter((r): r is OtherRaceData => r !== null);

        setCompletedRaces(detailedRaces.sort((a, b) => a.numOrdre - b.numOrdre));

        // 3. Compute live correlations (Hot trainers, Hot Jockeys, Hot numbers)
        const trainersMap: Record<string, LeaderStats> = {};
        const jockeysMap: Record<string, LeaderStats> = {};
        const numbersMap: Record<number, number> = {};

        detailedRaces.forEach((race) => {
          // Process top 3 arrivals
          race.arrival.slice(0, 3).forEach((num, index) => {
            // Find participant
            const p = race.participants.find((part) => part.numPmu === num);
            if (p) {
              const pos = index + 1;
              
              // Trainer
              if (p.entraineur) {
                const tr = p.entraineur.trim();
                if (!trainersMap[tr]) {
                  trainersMap[tr] = { name: tr, count: 0, races: [] };
                }
                trainersMap[tr].count += (4 - pos); // weight: 1st=3pts, 2nd=2pts, 3rd=1pt
                trainersMap[tr].races.push({ courseNum: race.numOrdre, pos, horseName: p.nom });
              }

              // Jockey/Driver
              if (p.driver) {
                const jk = p.driver.trim();
                if (!jockeysMap[jk]) {
                  jockeysMap[jk] = { name: jk, count: 0, races: [] };
                }
                jockeysMap[jk].count += (4 - pos);
                jockeysMap[jk].races.push({ courseNum: race.numOrdre, pos, horseName: p.nom });
              }
            }

            // Track dominant numbers
            numbersMap[num] = (numbersMap[num] || 0) + 1;
          });
        });

        // Correlate with current race participants
        const matchedTrainers = Object.values(trainersMap)
          .filter((t) => currentParticipants.some((cp) => cp.entraineur?.trim() === t.name))
          .sort((a, b) => b.count - a.count);

        const matchedJockeys = Object.values(jockeysMap)
          .filter((j) => currentParticipants.some((cp) => cp.driver?.trim() === j.name))
          .sort((a, b) => b.count - a.count);

        const sortedNumbers = Object.entries(numbersMap)
          .map(([num, count]) => ({ num: parseInt(num), count }))
          .sort((a, b) => b.count - a.count);

        setHotTrainers(matchedTrainers);
        setHotJockeys(matchedJockeys);
        setHotNumbers(sortedNumbers);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("فشل تحميل تحليلات مقارنة الاجتماع المباشرة.");
        setLoading(false);
      }
    };

    if (currentParticipants.length > 0) {
      fetchReunionData();
    }
  }, [date, reunion, currentCourse, currentParticipants]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-neutral-500 font-medium">جاري تحليل الأداء الجاري والنتائج اللحظية للاجتماع...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center text-center">
        <ShieldAlert className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-sm font-semibold text-neutral-800">{error}</p>
      </div>
    );
  }

  if (completedRaces.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <Activity className="w-10 h-10 text-neutral-400 mx-auto mb-3 animate-pulse" />
        <h3 className="font-bold text-neutral-800 text-base">لا توجد سباقات سابقة منتهية اليوم في هذا الاجتماع</h3>
        <p className="text-xs text-neutral-500 mt-1">هذا هو الشوط الأول أو لم تنتهِ أي أشواط بعد في {reunion}. المقارنة الحية ستظهر فور انتهاء الأشواط السابقة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Live Meeting Scoreboard (Podiums) */}
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h3 className="font-bold text-neutral-900 text-sm mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          منصات التتويج المباشرة للاجتماع اليوم ({reunion})
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {completedRaces.map((race) => (
            <div key={race.numOrdre} className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-indigo-700">الشوط {race.numOrdre}</span>
                <span className="text-[10px] text-neutral-400 font-semibold truncate max-w-[120px]">{race.libelle}</span>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                {race.arrival.slice(0, 3).map((num, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1">
                    <span className="text-[9px] text-neutral-400 mb-0.5">
                      {idx === 0 ? "الأول" : idx === 1 ? "الثاني" : "الثالث"}
                    </span>
                    <div className={cn(
                      "w-9 h-9 rounded-lg font-bold text-sm flex items-center justify-center border shadow-sm",
                      idx === 0 ? "bg-amber-100 text-amber-800 border-amber-300" :
                      idx === 1 ? "bg-slate-100 text-slate-800 border-slate-300" :
                      "bg-orange-50 text-orange-800 border-orange-200"
                    )}>
                      {num}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Hot Trainers and Jockeys Correlated to CURRENT Race */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Hot Trainers */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h3 className="font-bold text-neutral-900 text-sm mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            المدربون المتألقون اليوم والذين يشاركون الآن
          </h3>
          
          {hotTrainers.length > 0 ? (
            <div className="space-y-3">
              {hotTrainers.slice(0, 3).map((t, idx) => {
                // Find matching horse in current race
                const matchingHorse = currentParticipants.find(
                  (cp) => cp.entraineur?.trim() === t.name
                );
                
                return (
                  <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                      ★
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-800 text-sm">{t.name}</h4>
                      <p className="text-xs text-neutral-500 mt-1">
                        حقق اليوم:{" "}
                        {t.races.map((r, i) => (
                          <span key={i} className="font-semibold text-neutral-700">
                            المركز {r.pos} في الشوط {r.courseNum} ({r.horseName})
                            {i < t.races.length - 1 ? " • " : ""}
                          </span>
                        ))}
                      </p>
                      {matchingHorse && (
                        <div className="mt-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          يدرب في هذا الشوط: {matchingHorse.nom} (الرقم {matchingHorse.numPmu})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neutral-400 text-xs py-4 text-center">لا يوجد مدربون مكررون في منصة التتويج يشاركون في الشوط الحالي بعد.</p>
          )}
        </div>

        {/* Hot Jockeys */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h3 className="font-bold text-neutral-900 text-sm mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            الفرسان المتألقون اليوم والذين يشاركون الآن
          </h3>
          
          {hotJockeys.length > 0 ? (
            <div className="space-y-3">
              {hotJockeys.slice(0, 3).map((j, idx) => {
                // Find matching horse in current race
                const matchingHorse = currentParticipants.find(
                  (cp) => cp.driver?.trim() === j.name
                );
                
                return (
                  <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-xs shrink-0">
                      ★
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-800 text-sm">{j.name}</h4>
                      <p className="text-xs text-neutral-500 mt-1">
                        حقق اليوم:{" "}
                        {j.races.map((r, i) => (
                          <span key={i} className="font-semibold text-neutral-700">
                            المركز {r.pos} في الشوط {r.courseNum} ({r.horseName})
                            {i < j.races.length - 1 ? " • " : ""}
                          </span>
                        ))}
                      </p>
                      {matchingHorse && (
                        <div className="mt-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          يركب في هذا الشوط: {matchingHorse.nom} (الرقم {matchingHorse.numPmu})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neutral-400 text-xs py-4 text-center">لا يوجد فرسان مكررون في منصة التتويج يركبون في الشوط الحالي بعد.</p>
          )}
        </div>

      </div>

      {/* 3. Winning Numbers Stats */}
      {hotNumbers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h4 className="font-bold text-neutral-900 text-sm mb-3">أرقام الخيول الأكثر وصولاً لمنصة التتويج اليوم في هذا الاجتماع:</h4>
          <div className="flex flex-wrap gap-2">
            {hotNumbers.slice(0, 6).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-neutral-50 border px-3 py-1.5 rounded-xl">
                <span className="w-6 h-6 bg-neutral-900 text-white rounded-md font-bold text-xs flex items-center justify-center">
                  {item.num}
                </span>
                <span className="text-xs text-neutral-600 font-medium">وصل {item.count} {item.count === 1 ? "مرة" : "مرات"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}
