import { useEffect, useRef, useState } from "react";
import {
  MessageSquarePlus,
  X,
  StickyNote,
  Sparkles,
  Plus,
  Trash2,
  ChevronLeft,
  Pencil,
  Check,
} from "lucide-react";
import AiChat from "../ai/AiChat";

/* ── localStorage helpers ──────────────────────────────────── */
const NOTES_KEY = "stockroyale.fab.notes.v1";

const loadNotes = () => {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveNotes = (notes) => {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    /* quota */
  }
};

/* ── Component ─────────────────────────────────────────────── */
export default function GlobalFab() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("notes"); // "notes" | "ai"
  const panelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      // Slight delay so the opening click doesn't immediately close
      const id = setTimeout(() => document.addEventListener("mousedown", onClick), 50);
      return () => {
        clearTimeout(id);
        document.removeEventListener("mousedown", onClick);
      };
    }
  }, [open]);

  return (
    <>
      {/* Backdrop — subtle dim */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9998] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-5 z-[9999] w-[400px] h-[540px] rounded-2xl bg-[#0f1218] ring-1 ring-zinc-800/80 shadow-2xl shadow-black/60 flex flex-col overflow-hidden animate-fab-in"
        >
          {/* Tabs header */}
          <div className="flex items-center border-b border-zinc-800/70 shrink-0">
            <button
              onClick={() => setTab("notes")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === "notes"
                  ? "text-amber-300 border-b-2 border-amber-400/60"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <StickyNote size={14} /> Notes
            </button>
            <button
              onClick={() => setTab("ai")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === "ai"
                  ? "text-sky-300 border-b-2 border-sky-400/60"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Sparkles size={14} /> AI Assistant
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-3 text-zinc-500 hover:text-white transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {tab === "notes" ? <NotesPanel /> : <AiPanel />}
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-[9999] w-14 h-14 rounded-full grid place-items-center shadow-lg shadow-black/40 transition-all duration-200 ${
          open
            ? "bg-zinc-800 ring-1 ring-zinc-700 text-zinc-300 rotate-90 scale-90"
            : "bg-gradient-to-br from-sky-500 to-indigo-600 text-white hover:scale-110 hover:shadow-sky-500/30"
        }`}
        title="Quick tools"
        aria-label="Open quick tools"
      >
        {open ? <X size={22} /> : <MessageSquarePlus size={22} />}
      </button>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Notes panel – multi-note CRUD backed by localStorage
   ──────────────────────────────────────────────────────────── */
function NotesPanel() {
  const [notes, setNotes] = useState(loadNotes);
  const [activeId, setActiveId] = useState(null);
  const textRef = useRef(null);

  const persist = (next) => {
    setNotes(next);
    saveNotes(next);
  };

  const addNote = () => {
    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: "Untitled note",
      body: "",
      updatedAt: new Date().toISOString(),
    };
    const next = [note, ...notes];
    persist(next);
    setActiveId(note.id);
  };

  const deleteNote = (id) => {
    persist(notes.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateNote = (id, patch) => {
    persist(
      notes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  const activeNote = notes.find((n) => n.id === activeId);

  // Auto-focus textarea when opening a note
  useEffect(() => {
    if (activeNote && textRef.current) {
      textRef.current.focus();
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Single-note editor ───────────────────────────────
  if (activeNote) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
          <button
            onClick={() => setActiveId(null)}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white"
            title="Back to notes list"
          >
            <ChevronLeft size={16} />
          </button>
          <EditableTitle
            value={activeNote.title}
            onChange={(v) => updateNote(activeNote.id, { title: v })}
          />
          <button
            onClick={() => deleteNote(activeNote.id)}
            className="ml-auto p-1.5 rounded-md hover:bg-rose-500/15 text-zinc-500 hover:text-rose-400"
            title="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <textarea
          ref={textRef}
          value={activeNote.body}
          onChange={(e) => updateNote(activeNote.id, { body: e.target.value })}
          placeholder="Start writing…"
          className="flex-1 w-full resize-none bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 px-4 py-3 outline-none leading-relaxed"
        />
        <div className="px-4 py-2 border-t border-zinc-800/50 text-[10px] text-zinc-600 tabular-nums shrink-0">
          Updated {new Date(activeNote.updatedAt).toLocaleString()}
        </div>
      </div>
    );
  }

  // ── Notes list ──────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-xs text-zinc-500 tabular-nums">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={addNote}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 ring-1 ring-sky-500/30 text-sky-300 text-[11px] font-medium hover:bg-sky-500/20 transition-colors"
        >
          <Plus size={13} /> New note
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-xs">
            <StickyNote size={24} className="mx-auto mb-2 text-zinc-700" />
            No notes yet. Create one to jot down<br />
            observations, strategies, or trade ideas.
          </div>
        ) : (
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setActiveId(n.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 ring-1 ring-transparent hover:ring-zinc-700/60 transition-colors group"
                >
                  <div className="text-sm font-medium text-zinc-100 truncate">
                    {n.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                    <span className="truncate flex-1">
                      {n.body ? n.body.slice(0, 60) : "Empty note"}
                    </span>
                    <span className="tabular-nums shrink-0">
                      {fmtRelativeShort(n.updatedAt)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Inline editable title ──────────────────────────────── */
function EditableTitle({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  const commit = () => {
    const next = draft.trim() || "Untitled note";
    onChange(next);
    setDraft(next);
    setEditing(false);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
        className="flex items-center gap-1 flex-1 min-w-0"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          className="flex-1 bg-zinc-800/60 rounded-md px-2 py-1 text-sm text-zinc-100 outline-none ring-1 ring-sky-500/40"
        />
        <button
          type="submit"
          className="p-1 rounded-md hover:bg-sky-500/15 text-sky-300"
        >
          <Check size={14} />
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="flex items-center gap-1.5 min-w-0 group"
      title="Click to rename"
    >
      <span className="text-sm font-semibold text-zinc-100 truncate">{value}</span>
      <Pencil
        size={12}
        className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0"
      />
    </button>
  );
}

/* ── AI panel (uses global AiChat) ──────────────────────── */
function AiPanel() {
  return (
    <div className="h-full flex flex-col">
      <AiChat
        context={{}}
        storageKey="stockroyale.fab.ai.general"
        placeholder="Ask a quick markets question…"
        compact
        suggestions={[
          "What moved the market today?",
          "Explain P/E ratio briefly",
          "Best sectors to watch this week?",
        ]}
      />
    </div>
  );
}

/* ── Tiny relative timestamp ────────────────────────────── */
function fmtRelativeShort(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
