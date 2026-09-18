"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-neutral-950 text-white min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto text-amber-400 font-bold text-2xl">
            !
          </div>
          <h2 className="text-lg font-black text-white">حدث خطأ في النظام</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            حدث خطأ غير متوقع أثناء المعالجة، اضغط أدناه لإعادة التحميل.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl transition-all shadow-lg cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
