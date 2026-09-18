"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  MessageSquare, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Dna, 
  Loader2,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistantAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً بك! أنا وكيلك المساعد الذكي والمزود بقدرات تحليلية شاملة. يمكنني مساعدتك في تحليل السباقات، انتقاء أفضل الخيول لرهان Quinté+، وشرح الاستراتيجيات المتقدمة بناءً على الخوارزميات الجينية والنماذج البايزية. كيف يمكنني خدمتك اليوم؟"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }))
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "تحليل كينتي اليوم", icon: <TrendingUp className="w-3 h-3" />, prompt: "قم بتحليل سباق القمة (Quinté+) لهذا اليوم وقدم لي أفضل تشكيلة مقترحة." },
    { label: "الخوارزمية الجينية", icon: <Dna className="w-3 h-3" />, prompt: "كيف تعمل الخوارزمية الجينية في اختيار الخيول وما هي أفضل 5 خيول تكتشفها الآن؟" },
    { label: "رهان آمن جداً", icon: <ShieldCheck className="w-3 h-3" />, prompt: "ابحث لي عن أكثر رهان أماناً (Safe Bet) متاح حالياً في البرنامج." },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              width: isMaximized ? "min(90vw, 800px)" : "min(90vw, 400px)",
              height: isMaximized ? "80vh" : "500px"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col mb-4 pointer-events-auto"
          >
            {/* Header */}
            <div className="bg-neutral-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm">الوكيل الخبير المساعد</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">نشط الآن • شامل الصلاحيات</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4 text-neutral-400" /> : <Maximize2 className="w-4 h-4 text-neutral-400" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 scroll-smooth"
            >
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === "user" ? "mr-auto items-start" : "ml-auto items-end"
                  )}
                >
                  <div className={cn(
                    "p-3.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-neutral-200 text-neutral-800 rounded-tl-none" 
                      : "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1.5 font-bold px-1">
                    {msg.role === "assistant" ? "المساعد الذكي" : "أنت"}
                  </span>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex flex-col items-end ml-auto max-w-[85%]">
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl rounded-tr-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-xs text-indigo-600 font-bold">جاري التحليل والمعالجة...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Footer (Inner) */}
            <div className="p-3 border-t bg-white space-y-3">
              {messages.length < 5 && (
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(action.prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-black text-neutral-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="اطلب تحليلاً، توقعاً، أو استفسر عن سباق..."
                    className="w-full pl-10 pr-4 py-3 bg-neutral-100 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-12 h-12 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95"
                >
                  <Send className="w-5 h-5 rotate-180" />
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-4 text-[9px] text-neutral-400 font-bold uppercase tracking-widest pt-1">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Powered by Gemini 3.8</span>
                </div>
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>Real-time Data Access</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "pointer-events-auto w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all relative group overflow-hidden",
          isOpen ? "bg-white text-neutral-900 border border-neutral-200" : "bg-neutral-900 text-white"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-8 h-8" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative flex items-center justify-center"
            >
              <Bot className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-neutral-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Glow effect on closed */}
        {!isOpen && (
          <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </motion.button>
      
      {/* Tooltip hint when closed */}
      {!isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-20 top-1/2 -translate-y-1/2 bg-white text-neutral-900 px-4 py-2 rounded-2xl shadow-xl border border-neutral-200 text-xs font-black whitespace-nowrap"
        >
          اطلب توقعات الوكيل الذكي ⚡
        </motion.div>
      )}
    </div>
  );
}
