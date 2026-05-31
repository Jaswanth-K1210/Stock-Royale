import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Search, X, CalendarClock, Filter, Sparkles, Newspaper } from "lucide-react";
import AiChat from "../components/ai/AiChat";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import api from "../services/api";
import {
  ARTICLE_PROVIDERS,
  loadIntelSettings,
  loadNewsMarket,
  saveIntelSettings,
  saveNewsMarket,
} from "../config/broadcastChannels";
import { fmtRelative } from "../components/game/helpers";
import NewsChannels from "../components/news/NewsChannels";

const MARKETS = [
  { key: "USA", label: "US" },
  { key: "INDIA", label: "India" },
  { key: "BOTH", label: "Global" },
];

export default function News() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const market = params.get("market") || loadNewsMarket();
  const setMarket = (m) => {
    saveNewsMarket(m);
    setParams({ market: m }, { replace: true });
  };

  // Smart back: if the user arrived here from another page, go back to it;
  // otherwise fall back to /dashboard (e.g. when /news was opened directly).
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const [settings, setSettings] = useState(loadIntelSettings);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [companyOnly, setCompanyOnly] = useState(true); // filter to items mentioning the company
  const [mode, setMode] = useState("articles"); // "articles" | "ai"

  const [searchTerm, setSearchTerm] = useState("");
  const [resolvedSymbol, setResolvedSymbol] = useState(null); // { symbol, name }
  const [freeTextQuery, setFreeTextQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // Resolve search term to a stock symbol (debounced)
  useEffect(() => {
    const q = searchTerm.trim();
    let alive = true;
    const t = setTimeout(async () => {
      if (!q) {
        if (alive) setSuggestions([]);
        return;
      }
      try {
        const res = await api.get(
          `/api/stocks/search?q=${encodeURIComponent(q)}&market=${market}`
        );
        if (alive) setSuggestions((res.data || []).slice(0, 6));
      } catch {
        /* noop */
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchTerm, market]);

  // Close suggestions on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!searchRef.current?.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Fetch news — either general, for a resolved symbol, or for a free-text query
  const fetchFeed = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        market,
        since: `${settings.maxAgeHours || 12}h`,
        limit: "80",
      });
      if (resolvedSymbol?.symbol) qs.set("symbols", resolvedSymbol.symbol);
      const qText = resolvedSymbol?.name || freeTextQuery;
      if (qText) qs.set("q", qText);
      if (todayOnly) qs.set("dateOnly", "today");
      const res = await api.get(`/api/news/feed?${qs.toString()}`);
      setItems(res.data.items || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!alive) return;
      await fetchFeed();
    };
    const t = setTimeout(run, 0);
    const id = setInterval(run, (settings.refreshIntervalSec || 60) * 1000);
    return () => {
      alive = false;
      clearTimeout(t);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    market,
    resolvedSymbol?.symbol,
    freeTextQuery,
    todayOnly,
    settings.maxAgeHours,
    settings.refreshIntervalSec,
  ]);

  // Interactive Tour
  useEffect(() => {
    if (!localStorage.getItem("hasSeenNewsTour")) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { element: '#tour-news-search', popover: { title: 'Global Search', description: 'Look up specific companies to filter the news feed and live broadcasts.', side: "bottom", align: 'start' }},
          { element: '#tour-news-ai', popover: { title: 'AI Assistant', description: 'Switch to the AI Assistant to ask trading questions or summarize the latest sentiment on a company.', side: "bottom", align: 'center' }},
          { element: '#tour-news-feed', popover: { title: 'Intelligence Feed', description: 'Browse the latest headlines. All articles are color-coded by source and sorted in real-time.', side: "left", align: 'start' }},
        ],
        onDestroyStarted: () => {
          localStorage.setItem("hasSeenNewsTour", "true");
          driverObj.destroy();
        }
      });
      setTimeout(() => driverObj.drive(), 500);
    }
  }, []);

  // The "company term" used both for the backend query and for client-side
  // filtering. resolvedSymbol gives us a clean canonical name; freeTextQuery
  // is whatever the user typed.
  const companyTerm = (resolvedSymbol?.name || freeTextQuery || "").trim();

  // Build a set of needles to match titles against (company name + bare ticker
  // without exchange suffix). Used when companyOnly is true.
  const needles = useMemo(() => {
    const out = new Set();
    if (companyTerm) {
      out.add(companyTerm.toLowerCase());
      // First word of the company name (e.g. "Reliance" from "Reliance Industries")
      const first = companyTerm.split(/\s+/)[0]?.toLowerCase();
      if (first && first.length >= 3) out.add(first);
    }
    if (resolvedSymbol?.symbol) {
      out.add(resolvedSymbol.symbol.toLowerCase().replace(/\.(ns|bo)$/i, ""));
    }
    return out;
  }, [companyTerm, resolvedSymbol?.symbol]);

  // Sort newest first + apply provider filter + optional company filter
  const filtered = useMemo(() => {
    const passesCompany = (it) => {
      if (!companyOnly || needles.size === 0) return true;
      const hay = `${it.title} ${it.source}`.toLowerCase();
      for (const n of needles) if (hay.includes(n)) return true;
      return false;
    };
    return items
      .filter((it) => settings.sources[it.provider] !== false)
      .filter(passesCompany)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
  }, [items, settings.sources, companyOnly, needles]);

  const toggleSource = (key) => {
    const next = {
      ...settings,
      sources: { ...settings.sources, [key]: !settings.sources[key] },
    };
    setSettings(next);
    saveIntelSettings(next);
  };

  const pickSuggestion = (s) => {
    setResolvedSymbol({ symbol: s.symbol, name: s.name });
    setSearchTerm(s.name || s.symbol);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setResolvedSymbol(null);
    setFreeTextQuery("");
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Enter without picking a suggestion → treat input as a free-text query
  // (sent as `q` to Google News / Moneycontrol / ET / LiveMint scrapers).
  const submitFreeText = () => {
    const q = searchTerm.trim();
    if (!q) return;
    setResolvedSymbol(null);
    setFreeTextQuery(q);
    setShowSuggestions(false);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-bg text-text flex flex-col">
      <header className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-border bg-bg/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-base font-semibold text-white">News</span>
          {resolvedSymbol ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-500/15 text-sky-300 text-[11px]">
              {resolvedSymbol.symbol}
              <button
                onClick={clearSearch}
                className="hover:text-white"
                title="Clear filter"
              >
                <X size={11} />
              </button>
            </span>
          ) : (
            <span className="text-xs text-zinc-500">
              Live broadcasts · Headlines · Markets
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div id="tour-news-search" ref={searchRef} className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitFreeText();
                }
              }}
              placeholder="Search by company or ticker…"
              className="w-80 h-9 pl-8 pr-8 rounded-lg bg-zinc-800/60 ring-1 ring-zinc-700/60 text-sm text-white placeholder:text-zinc-500 outline-none focus:ring-sky-500/40"
            />
            {(searchTerm || resolvedSymbol) && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5"
              >
                <X size={13} />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl bg-[#15181f] ring-1 ring-zinc-800/80 shadow-xl z-40">
                {suggestions.map((s) => (
                  <li key={s.symbol}>
                    <button
                      onClick={() => pickSuggestion(s)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-zinc-800/60 text-left"
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm text-zinc-100 font-medium">
                          {s.symbol}
                        </span>
                        <span className="text-[11px] text-zinc-500 truncate capitalize">
                          {s.name?.toLowerCase()}
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase">
                        {s.market || market}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="inline-flex rounded-lg bg-zinc-800/60 ring-1 ring-zinc-700/60 p-0.5">
            {MARKETS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMarket(m.key)}
                className={`px-3 h-8 rounded-md text-xs font-medium ${
                  market === m.key
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {/* Articles ⟷ AI mode */}
          <div id="tour-news-ai" className="inline-flex rounded-lg bg-zinc-800/60 ring-1 ring-zinc-700/60 p-0.5">
            <button
              onClick={() => setMode("articles")}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium ${
                mode === "articles"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Show news articles"
            >
              <Newspaper size={12} /> Articles
            </button>
            <button
              onClick={() => setMode("ai")}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium ${
                mode === "ai"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Ask the AI assistant"
            >
              <Sparkles size={12} /> AI Assistant
            </button>
          </div>
          {/* Company-only filter (only meaningful when there's a query) */}
          {companyTerm && mode === "articles" && (
            <button
              onClick={() => setCompanyOnly((v) => !v)}
              title={
                companyOnly
                  ? `Showing only items mentioning "${companyTerm}" — click to disable`
                  : "Filter to items mentioning the company"
              }
              className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium ring-1 transition-colors ${
                companyOnly
                  ? "bg-sky-500/15 text-sky-300 ring-sky-500/40"
                  : "bg-zinc-800/60 text-zinc-400 ring-zinc-700/60 hover:text-zinc-200"
              }`}
            >
              <Filter size={13} />
              Company only
            </button>
          )}
          <button
            onClick={() => setTodayOnly((v) => !v)}
            title={todayOnly ? "Showing today only (IST) — click to disable" : "Show today only (IST)"}
            className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium ring-1 transition-colors ${
              todayOnly
                ? "bg-sky-500/15 text-sky-300 ring-sky-500/40"
                : "bg-zinc-800/60 text-zinc-400 ring-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            <CalendarClock size={13} />
            Today
          </button>
          <button
            onClick={fetchFeed}
            title="Refresh"
            className={`p-2 rounded-lg ring-1 ring-zinc-800 hover:bg-zinc-800 text-zinc-300 ${
              loading ? "animate-spin" : ""
            }`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex justify-center">
        <div className="w-full max-w-[1600px] flex flex-col xl:flex-row gap-6 items-start">
        {/* Live Broadcast (Left Column) */}
        <section className="w-full xl:w-[400px] shrink-0 flex flex-col gap-2">
          <NewsChannels market={market} />
        </section>

        {/* News Feed (Right Column) */}
        <section id="tour-news-feed" className="w-full flex-1 flex flex-col gap-4 min-h-0">


          {mode === "ai" ? (
            <div className="term-panel flex-1 flex flex-col overflow-hidden min-h-[400px]">
              <div className="px-5 py-3 border-b border-zinc-800/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary-bright" />
                  <span className="text-sm font-semibold text-white">
                    AI Assistant
                    {companyTerm ? ` — ${companyTerm}` : ""}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  educational, not financial advice
                </span>
              </div>
              <AiChat
                context={{
                  company: companyTerm || undefined,
                  symbol: resolvedSymbol?.symbol,
                  market,
                }}
                storageKey={`stockroyale.ai.news.${companyTerm || "general"}.${market}`}
                placeholder={
                  companyTerm
                    ? `Ask about ${companyTerm}…`
                    : "Ask a quick markets question…"
                }
                suggestions={
                  companyTerm
                    ? [
                        `What does ${companyTerm} do?`,
                        `Recent news themes for ${companyTerm}?`,
                        `Key risks for ${companyTerm}?`,
                      ]
                    : [
                        "What moved the market today?",
                        "Explain P/E ratio briefly",
                        "How do circuit limits work?",
                      ]
                }
              />
            </div>
          ) : (
          <div className="term-panel flex-1 flex flex-col overflow-hidden min-h-[400px]">
            <div className="term-header flex items-center justify-between bg-bg-card">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text uppercase tracking-wider">
                  {resolvedSymbol
                    ? `News for ${resolvedSymbol.symbol}`
                    : "Latest headlines"}
                </span>
              </div>
              <span className="text-[11px] text-text-dim tabular-nums font-mono">
                {filtered.length} articles
              </span>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-transparent border-t border-border/50">
              {loading && items.length === 0 ? (
                <Empty>Loading headlines…</Empty>
              ) : filtered.length === 0 ? (
                <Empty>
                  {resolvedSymbol
                    ? `No recent news for ${resolvedSymbol.symbol}.`
                    : "No news right now."}
                </Empty>
              ) : (
                filtered.map((n) => (
                  <a
                    key={n.id}
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-5 bg-bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-bg-hover transition-all group shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-block max-w-[70%] truncate text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">
                        {n.source}
                      </span>
                      <span className="text-[10px] text-text-dim tabular-nums font-mono">
                        {fmtRelative(n.publishedAt)}
                      </span>
                    </div>
                    <div className="text-sm text-text font-medium leading-relaxed line-clamp-3 group-hover:text-primary transition-colors">
                      {n.title}
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

const Empty = ({ children }) => (
  <div className="col-span-full px-3 py-10 text-center text-xs text-zinc-500">
    {children}
  </div>
);
