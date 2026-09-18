"use client";

import { useState, useEffect } from "react";
import { Notebook, Save, Trash2, Clock, Plus, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  text: string;
  timestamp: number;
}

interface BettorNotebookProps {
  raceId: string;
}

export default function BettorNotebook({ raceId }: BettorNotebookProps) {
  const storageKey = `bettor_notes_${raceId}`;

  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`bettor_notes_${raceId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Sync notes to storage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } else if (localStorage.getItem(storageKey)) {
      // If notes are empty but storage is not, it means we might have deleted last note
      localStorage.setItem(storageKey, JSON.stringify([]));
    }
  }, [notes, storageKey]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: crypto.randomUUID(),
      text: newNote.trim(),
      timestamp: Date.now(),
    };

    setNotes((prev) => [note, ...prev]);
    setNewNote("");
    setIsAdding(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const formatDateTime = (ts: number) => {
    return new Intl.DateTimeFormat("ar-MA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b bg-neutral-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Notebook className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-neutral-900">مفكرة المراهن الشخصية</h2>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
            isAdding
              ? "bg-neutral-200 text-neutral-600"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          )}
        >
          {isAdding ? "إلغاء" : (
            <>
              <Plus className="w-3.5 h-3.5" />
              إضافة ملاحظة
            </>
          )}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Input Section */}
        {isAdding && (
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-top-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="اكتب ملاحظاتك هنا (مثلاً: حالة الجواد رقم 5 في التدريبات، استراتيجية الرهان المتبعة...)"
              className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-indigo-500/20 min-h-[100px] transition-all"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
              >
                <Save className="w-4 h-4" />
                حفظ الملاحظة
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <StickyNote className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">لا توجد ملاحظات مسجلة لهذا السباق.</p>
              <p className="text-[11px] text-neutral-400 mt-1">الملاحظات تخزن محلياً على جهازك فقط لضمان الخصوصية.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group bg-white border rounded-2xl p-4 hover:border-indigo-200 transition-all relative"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(note.timestamp)}
                    </div>
                    <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tip section */}
        <div className="pt-4 border-t border-neutral-100">
          <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
            <Notebook className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="block mb-1">نصيحة للمراهن الذكي:</strong>
              تدوين الملاحظات يساعدك على تذكر التفاصيل الدقيقة التي لا تظهر في الإحصائيات العامة، مثل سلوك الجواد في البوابات أو انطباعك عن أداء الراكب في السباقات السابقة.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
