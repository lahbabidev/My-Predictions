"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, Flag, Timer, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RaceTimelineProps {
  departureTime: number; // timestamp in ms
}

interface Milestone {
  id: string;
  label: string;
  offsetMinutes: number; // relative to departure
  description: string;
}

const MILESTONES: Milestone[] = [
  { id: "warmup", label: "بداية التحمية", offsetMinutes: -20, description: "الخيول تبدأ دورات التحمية في الحلبة." },
  { id: "gates", label: "التوجه للبوابة", offsetMinutes: -7, description: "الخيول والركاب يتوجهون نحو بوابات الانطلاق." },
  { id: "betting_close", label: "إغلاق المراهنات", offsetMinutes: -1, description: "اللحظات الأخيرة لوضع الرهانات قبل الانطلاق." },
  { id: "start", label: "انطلاق السباق", offsetMinutes: 0, description: "بداية الشوط الرسمي." },
];

export default function RaceTimeline({ departureTime }: RaceTimelineProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timeoutId = setTimeout(() => {
      setMounted(true);
    }, 0);
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000); // Update every 10 seconds
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  const timelineData = useMemo(() => {
    if (!mounted) {
      return { progress: 0, milestones: MILESTONES.map(m => ({ ...m, time: departureTime + m.offsetMinutes * 60000, status: "pending" as const })) };
    }
    const startTime = departureTime + MILESTONES[0].offsetMinutes * 60000;
    const endTime = departureTime;
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    const milestonesWithStatus = MILESTONES.map((m) => {
      const mTime = departureTime + m.offsetMinutes * 60000;
      let status: "pending" | "current" | "completed" = "pending";
      
      if (now >= mTime) {
        status = "completed";
      }
      
      // Find the "current" active milestone
      const nextM = MILESTONES[MILESTONES.indexOf(m) + 1];
      if (nextM) {
        const nextMTime = departureTime + nextM.offsetMinutes * 60000;
        if (now >= mTime && now < nextMTime) {
          status = "current";
        }
      } else if (now >= mTime && now < mTime + 5 * 60000) { // Keep last one active for 5 mins
        status = "current";
      }

      return { ...m, time: mTime, status };
    });

    return { progress, milestones: milestonesWithStatus };
  }, [departureTime, now, mounted]);

  const timeLeft = departureTime - now;
  const minutesLeft = Math.floor(timeLeft / 60000);
  const secondsLeft = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-neutral-900 text-lg">الجدول الزمني للسباق</h2>
        </div>
        
        {mounted && timeLeft > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 font-mono font-bold text-sm">
            <Clock className="w-4 h-4" />
            <span>متبقي على الانطلاق:</span>
            <span>{minutesLeft}د {secondsLeft}ث</span>
          </div>
        ) : mounted && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold text-sm">
            <Flag className="w-4 h-4" />
            <span>السباق بدأ أو انتهى</span>
          </div>
        )}
      </div>

      {/* Progress Bar Container */}
      <div className="relative pt-2 pb-12 px-2">
        {/* Background Track */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-100 rounded-full -translate-y-1/2" />
        
        {/* Active Progress */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-indigo-600 rounded-full -translate-y-1/2 transition-all duration-1000 ease-linear"
          style={{ width: `${timelineData.progress}%` }}
        />

        {/* Milestone Dots */}
        <div className="relative flex justify-between">
          {timelineData.milestones.map((m) => (
            <div key={m.id} className="flex flex-col items-center">
              <div 
                className={cn(
                  "w-5 h-5 rounded-full border-4 transition-all duration-500 z-10 flex items-center justify-center",
                  m.status === "completed" ? "bg-indigo-600 border-white shadow-sm ring-2 ring-indigo-600" :
                  m.status === "current" ? "bg-white border-indigo-600 animate-pulse shadow-md" :
                  "bg-white border-neutral-200"
                )}
              >
                {m.status === "completed" && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              
              <div className="absolute mt-8 text-center flex flex-col items-center">
                <span className={cn(
                  "text-[10px] font-bold whitespace-nowrap mb-0.5",
                  m.status === "completed" ? "text-indigo-600" :
                  m.status === "current" ? "text-indigo-900" : "text-neutral-400"
                )}>
                  {m.label}
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {new Date(m.time).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Milestone Description */}
      <div className="mt-8 bg-neutral-50 rounded-xl p-4 border border-neutral-100 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          {timelineData.milestones.find(m => m.status === "current") ? (
            <>
              <strong className="text-xs text-neutral-900 block mb-1">
                المرحلة الحالية: {timelineData.milestones.find(m => m.status === "current")?.label}
              </strong>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {timelineData.milestones.find(m => m.status === "current")?.description}
              </p>
            </>
          ) : timeLeft > 20 * 60000 ? (
            <p className="text-xs text-neutral-500">السباق في مرحلة التحضير المبكر. ابدأ بتحليل الخيول والركائز الذهبية.</p>
          ) : (
            <p className="text-xs text-neutral-500">السباق قيد التشغيل أو في مرحلة تسوية النتائج.</p>
          )}
        </div>
      </div>
    </div>
  );
}
