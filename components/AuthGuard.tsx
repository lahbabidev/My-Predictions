"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Lock, ShieldCheck, Eye, EyeOff, LogIn, LogOut, AlertCircle, Loader2, KeyRound, Sparkles, CheckCircle2 } from "lucide-react";

interface AuthUser {
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => ({ success: false }),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Login form state
  const [email, setEmail] = useState<string>("info@zakariaelahbabi.com");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Verify session on client mount
  useEffect(() => {
    setMounted(true);

    async function checkAuth() {
      try {
        let localToken: string | null = null;
        try {
          localToken = localStorage.getItem("pmu_auth_token");
        } catch {
          // localStorage disabled fallback
        }

        const headers: Record<string, string> = {};
        if (localToken) {
          headers["Authorization"] = `Bearer ${localToken}`;
        }

        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({ token: localToken }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setIsAuthenticated(true);
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = useCallback(async (emailInput: string, passwordInput: string, remember: boolean) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput,
          rememberMe: remember,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "فشل تسجيل الدخول. تأكد من صحة البيانات.");
        setSubmitting(false);
        return { success: false, error: data.error };
      }

      if (data.token) {
        try {
          localStorage.setItem("pmu_auth_token", data.token);
        } catch (e) {
          console.error("Could not save auth token:", e);
        }
      }

      setUser(data.user);
      setIsAuthenticated(true);
      setSuccessMessage("تم التحقق بنجاح! جاري فتح المنصة...");
      return { success: true };
    } catch (err) {
      const msg = "تعذر الاتصال بالخادم للتحقق من بيانات الدخول.";
      setErrorMessage(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem("pmu_auth_token");
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setUser(null);
    setPassword("");
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage("يرجى إدخال كلمة المرور للمتابعة.");
      return;
    }
    await login(email, password, rememberMe);
  };

  // During SSR / build prerender, render a clean dark backdrop until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Lock className="w-6 h-6" />
          </div>
          <span className="text-xs text-slate-400 font-mono">نظام الحماية المشفر v2.4</span>
        </div>
      </div>
    );
  }

  // 1. Initial Loading State on client
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin absolute -bottom-2 -left-2" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">فحص أمان الجلسة</h2>
            <p className="text-xs text-slate-400 mt-1">جاري التحقق من التشفير والصلاحيات...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Authenticated - Show High-Craft Login Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 text-slate-100 selection:bg-indigo-500 selection:text-white" dir="rtl">
        {/* Background glow accents */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative w-full max-w-md z-10">
          {/* Card Container */}
          <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8">
            
            {/* Top Security Badge */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">محمي ومشفّر</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>
                  <h1 className="text-sm font-semibold text-slate-200">بوابة الدخول الخاصة</h1>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>SHA-256</span>
              </div>
            </div>

            {/* Platform Branding */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>نظام التوقعات السباقية PMU المتقدم</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                تسجيل الدخول للمنصة
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                هذه المنصة مخصصة للاستخدام الشخصي المصرح به فقط ومحمية بتشفير طرفي مشدد.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  البريد الإلكتروني المعتمد
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="info@zakariaelahbabi.com"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 block">
                    كلمة المرور المشفرة
                  </label>
                  <span className="text-[11px] text-slate-500">حساسة لحالة الأحرف</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 pl-11 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-slate-300">تذكر تسجيل الدخول (30 يوماً)</span>
                </label>

                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-amber-400" />
                  <span>وصول شخصي</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all duration-150 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق من التشفير...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول وفك القفل</span>
                  </>
                )}
              </button>
            </form>

            {/* Security Verification Footnote */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                تشفير SHA-256 مع Salt & توقيع HMAC
              </span>
              <span>v2.4 Private Engine</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated - Render Top User Bar and Protected Children
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
        {/* Discreet Top Security Status & Account Bar */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-[11px]">جلسة خاصة مشفرة</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
              <span className="text-slate-400">المستخدم:</span>
              <span className="font-semibold text-slate-200">{user?.email || "info@zakariaelahbabi.com"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-slate-700/60 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              title="تسجيل الخروج وقفل المنصة"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </header>

        {/* Application Content */}
        <div className="flex-1">{children}</div>
      </div>
    </AuthContext.Provider>
  );
}
