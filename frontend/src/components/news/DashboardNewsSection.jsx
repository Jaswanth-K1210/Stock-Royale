import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Newspaper } from "lucide-react";
import api from "../../services/api";
import {
  loadIntelSettings,
  loadNewsMarket,
  saveNewsMarket,
} from "../../config/broadcastChannels";
import { fmtRelative } from "../game/helpers";
import NewsChannels from "./NewsChannels";

const MARKETS = [
  { key: "USA", label: "US" },
  { key: "INDIA", label: "India" },
];

export default function DashboardNewsSection() {
  const [market, setMarket] = useState(loadNewsMarket);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const settings = loadIntelSettings();

  useEffect(() => {
    saveNewsMarket(market);
  }, [market]);

  useEffect(() => {
    let alive = true;
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          market,
          since: `${settings.maxAgeHours || 12}h`,
          limit: "30",
        });
        const res = await api.get(`/api/news/feed?${qs.toString()}`);
        if (alive) setItems(res.data.items || []);
      } catch {
        /* noop */
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
  }, [market]);

  const filtered = useMemo(
    () =>
      items
        .filter((it) => settings.sources[it.provider] !== false)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        )
        .slice(0, 10),
    [items, settings.sources]
  );

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="term-header !border-t-0 !border-l-0 !border-r-0 px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-primary" />
          <span className="font-bold text-text uppercase tracking-wider">
            Live News
          </span>
          <div id="tour-news-market" className="inline-flex rounded-md bg-bg border border-border p-0.5 ml-2">
            {MARKETS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMarket(m.key)}
                className={`px-3 h-6 rounded-md text-[10px] font-bold tracking-wider transition-colors uppercase ${
                  market === m.key
                    ? "bg-text-dim text-bg-card"
                    : "text-text-faint hover:text-text-dim"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <Link
          to={`/news?market=${market}`}
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary-bright uppercase tracking-wider font-bold transition-colors"
        >
          Full news
          <ArrowRight size={11} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4 w-full">
          <div className="border border-border bg-[#0b0c10] p-1 rounded-xl shadow-sm overflow-hidden shrink-0">
            <NewsChannels key={market} market={market} compact={true} />
          </div>

        <div className="border border-border bg-[#0b0c10] rounded-xl overflow-hidden flex flex-col min-h-[300px]">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-bg-card">
            <span className="text-xs font-bold text-text tracking-wide">Headlines</span>
            <span className="text-[10px] text-text-dim tabular-nums font-mono">
              {filtered.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {loading && filtered.length === 0 ? (
              <Empty>Loading intelligence...</Empty>
            ) : filtered.length === 0 ? (
              <Empty>No news detected.</Empty>
            ) : (
              filtered.map((n) => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-4 py-3 hover:bg-[#151821] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-block max-w-[70%] truncate text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">
                      {n.source}
                    </span>
                    <span className="text-[10px] text-text-dim tabular-nums font-mono tracking-tight">
                      {fmtRelative(n.publishedAt)}
                    </span>
                  </div>
                  <div className="text-sm text-white font-medium leading-relaxed line-clamp-2">
                    {n.title}
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

const Empty = ({ children }) => (
  <div className="px-4 py-8 text-sm text-text-dim text-center">{children}</div>
);
