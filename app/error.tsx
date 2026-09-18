"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error to console
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="bg-neutral-900/90 border border-amber-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-5">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">حدث خطأ غير متوقع</h2>
          <p className="text-xs text-neutral-300 leading-relaxed">
            تعذر تحميل بعض عناصر الصفحة مؤقتاً. يمكنك إعادة المحاولة أو العودة للرئيسية لمتابعة السباقات المباشرة.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة فوراً</span>
          </button>

          <Link
            href="/"
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>العودة لبرنامج اليوم</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
