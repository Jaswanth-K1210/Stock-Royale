import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import api from "../../services/api";
import { loadIntelSettings } from "../../config/broadcastChannels";
import { fmtRelative } from "./helpers";

/**
 * Horizontal scrolling news strip shown in the Game view.
 *
 * Props:
 *   market   — "USA" | "INDIA" | "BOTH"
 *   symbols  — ticker symbols to filter on (sent to backend)
 *   q        — company name (sent as `q` to backend AND used for client-side filtering)
 *   onOpenFull — callback to open the full News sidebar
 */
export default function NewsStrip({ market = "USA", symbols = [], q = "", onOpenFull }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef(null);
  const settings = loadIntelSettings();
  const symbolsKey = symbols.join(",");
  const companyTerm = (q || "").trim();

  useEffect(() => {
    let alive = true;
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          market,
          since: `${settings.maxAgeHours}h`,
          limit: "30",
        });
        if (symbolsKey) params.set("symbols", symbolsKey);
        if (companyTerm) params.set("q", companyTerm);
        const res = await api.get(`/api/news/feed?${params.toString()}`);
        if (!alive) return;
        const next = (res.data.items || []).filter(
          (it) => settings.sources[it.provider] !== false
        );
        setItems(next);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchFeed();
    const id = setInterval(fetchFeed, (settings.refreshIntervalSec || 60) * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, symbolsKey, companyTerm]);

  // Client-side needle set for company-name filtering
  const needles = useMemo(() => {
    const out = new Set();
    if (companyTerm) {
      out.add(companyTerm.toLowerCase());
      const first = companyTerm.split(/\s+/)[0]?.toLowerCase();
      if (first && first.length >= 3) out.add(first);
    }
    // Also add bare ticker (strip .NS / .BO suffix)
    if (symbolsKey) {
      symbolsKey.split(",").forEach((s) => {
        out.add(s.toLowerCase().replace(/\.(ns|bo)$/i, ""));
      });
    }
    return out;
  }, [companyTerm, symbolsKey]);

  // When a company term is active, prefer items whose title/source matches.
  // If none match, fall back to showing all items so the strip never looks empty.
  const filtered = useMemo(() => {
    if (needles.size === 0) return items;
    const matched = items.filter((it) => {
      const hay = `${it.title} ${it.source}`.toLowerCase();
      for (const n of needles) if (hay.includes(n)) return true;
      return false;
    });
    return matched.length > 0 ? matched : items;
  }, [items, needles]);

  const scrollBy = (dx) => {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <div className="term-panel !flex-row h-[88px] shrink-0 items-stretch overflow-hidden">
      <button
        onClick={onOpenFull}
        title="Open full news"
        className="px-4 flex items-center gap-2 text-amber-300 hover:bg-amber-400/5 border-r border-zinc-800/70 transition-colors"
      >
        <Newspaper size={16} />
        <span className="text-xs font-medium uppercase tracking-wider">News</span>
      </button>

      <button
        onClick={() => scrollBy(-320)}
        className="px-1.5 text-zinc-500 hover:text-white"
        aria-label="Scroll left"
      >
        <ChevronLeft size={16} />
      </button>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-2 px-1 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {loading && filtered.length === 0 ? (
          <div className="px-3 text-xs text-zinc-500">Loading headlines…</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 text-xs text-zinc-500">No news right now.</div>
        ) : (
          filtered.map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 w-[300px] h-[68px] px-3 py-2 bg-bg border border-border hover:border-primary transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="inline-block max-w-[70%] truncate text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300">
                  {n.source}
                </span>
                <span className="text-[10px] text-zinc-500 tabular-nums">
                  {fmtRelative(n.publishedAt)}
                </span>
              </div>
              <div className="text-[12px] text-zinc-200 leading-snug line-clamp-2">
                {n.title}
              </div>
            </a>
          ))
        )}
      </div>

      <button
        onClick={() => scrollBy(320)}
        className="px-1.5 text-zinc-500 hover:text-white"
        aria-label="Scroll right"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
