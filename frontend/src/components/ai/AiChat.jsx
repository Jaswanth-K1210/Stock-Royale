import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, AlertTriangle } from "lucide-react";
import api from "../../services/api";

/**
 * Reusable AI assistant chat.
 *
 * Props:
 *   context     — { company?, symbol?, market? } passed to the backend for grounding
 *   suggestions — quick-prompt chips shown above the input when no messages yet
 *   placeholder — input placeholder text
 *   storageKey  — optional localStorage key; if set, persists the conversation
 *   compact     — tighter layout (used in the FAB)
 */
export default function AiChat({
  context,
  suggestions = [],
  placeholder = "Ask a quick question…",
  storageKey,
  compact = false,
}) {
  const [messages, setMessages] = useState(() => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
      } catch {
        /* ignore quota */
      }
    }
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, storageKey]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError(null);
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/api/ai/chat", { messages: next, context });
      const reply = res.data?.reply || "(no reply)";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't reach the assistant.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className={`flex-1 flex flex-col h-full min-h-0 ${compact ? "text-[13px]" : "text-sm"}`}>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 py-4">
            <Sparkles size={18} className="mx-auto mb-2 text-primary-bright" />
            <div className="text-xs">
              {context?.company
                ? `Ask anything about ${context.company}.`
                : "Ask a quick trading or markets question."}
            </div>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-2.5 py-1 rounded-none bg-bg-card border border-border text-[11px] text-text-dim hover:bg-bg-hover hover:text-text hover:border-primary/40 transition-colors font-mono uppercase tracking-wider"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 whitespace-pre-wrap leading-snug rounded-none ${
                  m.role === "user"
                    ? "bg-primary/10 text-primary border border-primary/30 font-bold"
                    : "bg-bg-card border border-border text-text"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-none bg-bg-card border border-border text-text-dim text-xs inline-flex gap-1.5 items-center font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(0,200,5,0.5)]" />
              processing...
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-none bg-bear/10 border border-bear/40 text-bear text-xs inline-flex gap-2 items-start font-mono">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-border p-2 flex gap-2 items-center shrink-0 bg-bg"
      >
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-[10px] uppercase tracking-wider font-bold text-text-faint hover:text-text-dim px-1.5"
            title="Clear chat"
          >
            Clear
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="term-input !py-1.5"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="term-btn-bull !px-3 !py-1.5 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
