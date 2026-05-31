import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import api from "../services/api";
import { loadIntelSettings } from "../config/broadcastChannels";
import BroadcastTab from "./BroadcastTab";
import IntelligenceSettings from "./IntelligenceSettings";

const fmtRelative = (iso) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
};

const isStale = (iso) => Date.now() - new Date(iso).getTime() > 2 * 60 * 60 * 1000;

export default function IntelligencePanel({
  market = "USA",
  symbols = [],
  showTape = false,
  trades = [],
  className = "",
}) {
  const [settings, setSettings] = useState(loadIntelSettings);
  const [activeTab, setActiveTab] = useState(settings.defaultTab || "WIRE");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const seenIds = useRef(new Set());
  const [pulseIds, setPulseIds] = useState(new Set());

  const symbolsKey = useMemo(() => symbols.join(","), [symbols]);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        market,
        since: `${settings.maxAgeHours}h`,
        limit: "50",
      });
      if (symbolsKey) params.set("symbols", symbolsKey);
      const res = await api.get(`/api/news/feed?${params.toString()}`);
      const next = res.data.items || [];

      // Flag new ids for pulse
      const newIds = new Set();
      for (const it of next) {
        if (!seenIds.current.has(it.id)) newIds.add(it.id);
      }
      next.forEach((it) => seenIds.current.add(it.id));
      if (newIds.size > 0 && items.length > 0) {
        setPulseIds(newIds);
        setTimeout(() => setPulseIds(new Set()), 1500);
      }
      setItems(next);
      setLastFetch(new Date());
    } catch {
      /* swallow — keep last items */
    } finally {
      setLoading(false);
    }
  }, [market, symbolsKey, settings.maxAgeHours, items.length]);

  // Initial + interval refresh
  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, settings.refreshIntervalSec * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, symbolsKey, settings.refreshIntervalSec, settings.maxAgeHours]);

  // Client-side source filter
  const filteredItems = useMemo(
    () => items.filter((it) => settings.sources[it.provider] !== false),
    [items, settings.sources]
  );

  const tabs = [
    { key: "WIRE", label: "WIRE" },
    { key: "BROADCAST", label: "BROADCAST" },
    ...(showTape ? [{ key: "TAPE", label: "TAPE" }] : []),
  ];

  return (
    <div className={`bg-[#0f0f11] border border-[#27272a] rounded-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#27272a] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">
            Live Intelligence
          </span>
          {loading && <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse" />}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-[#18181b] rounded overflow-hidden text-[9px] border border-[#27272a]">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-2 py-0.5 uppercase tracking-wider ${
                  activeTab === t.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="text-zinc-500 hover:text-white text-[11px] px-1.5 py-0.5 border border-[#27272a] hover:border-zinc-500 rounded-sm"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-1.5 min-h-0">
        {activeTab === "WIRE" && (
          <WireList
            items={filteredItems}
            loading={loading}
            pulseIds={pulseIds}
            lastFetch={lastFetch}
          />
        )}

        {activeTab === "BROADCAST" && <BroadcastTab settings={settings} />}

        {activeTab === "TAPE" && <TapeList trades={trades} />}
      </div>

      {showSettings && (
        <IntelligenceSettings
          settings={settings}
          onClose={() => setShowSettings(false)}
          onChange={setSettings}
        />
      )}
    </div>
  );
}

function WireList({ items, loading, pulseIds, lastFetch }) {
  if (loading && items.length === 0) {
    return (
      <div className="text-[10px] text-zinc-600 text-center py-6">Initializing wire…</div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-[10px] text-zinc-600 text-center py-6">
        Wire is quiet — try widening Max Age in settings.
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {items.map((n) => {
        const stale = isStale(n.publishedAt);
        const pulse = pulseIds.has(n.id);
        return (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noreferrer"
            className={`block p-2 border rounded-sm transition-colors group ${
              pulse
                ? "bg-lime-500/10 border-lime-500/40"
                : "bg-[#18181b] border-[#27272a] hover:border-zinc-500"
            }`}
            style={pulse ? { animation: "intel-pulse 1.5s ease-out" } : undefined}
          >
            <div className="text-[8px] flex justify-between uppercase mb-1 items-center">
              <span className="text-blue-400 font-bold truncate max-w-[60%]" title={n.source}>
                {n.source}
              </span>
              <span className={`shrink-0 ${stale ? "text-red-500/70" : "text-zinc-500"}`}>
                {fmtRelative(n.publishedAt)}
              </span>
            </div>
            <div className="text-[10px] text-zinc-200 group-hover:text-white leading-snug line-clamp-3">
              {n.title}
            </div>
          </a>
        );
      })}
      {lastFetch && (
        <div className="text-[8px] text-zinc-700 text-center pt-2 uppercase tracking-widest">
          Last sync {fmtRelative(lastFetch.toISOString())} ago
        </div>
      )}
      <style>{`
        @keyframes intel-pulse {
          0% { box-shadow: 0 0 0 0 rgba(132, 204, 22, 0.5); }
          100% { box-shadow: 0 0 0 8px rgba(132, 204, 22, 0); }
        }
      `}</style>
    </div>
  );
}

function TapeList({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-[10px] text-zinc-600 text-center py-6">
        No recent activity detected.
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {trades.map((t, i) => (
        <div
          key={t.id || i}
          className="flex flex-col p-1.5 bg-[#18181b] rounded-sm border border-transparent hover:border-[#27272a]"
        >
          <div className="flex items-center justify-between mb-0.5 text-[9px] text-zinc-500">
            <span>{t.ts ? new Date(t.ts).toLocaleTimeString("en-US", { hour12: false }) : "—"}</span>
            <span
              className={`px-1 rounded-sm uppercase ${
                t.side === "BUY"
                  ? "bg-lime-900/30 text-lime-400"
                  : "bg-red-900/30 text-red-400"
              }`}
            >
              {t.side}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white font-bold tracking-wider">
              {t.ticker}
              <span className="text-zinc-500 font-normal ml-1">×{t.qty}</span>
            </span>
            <span className="text-zinc-300">{Number(t.price).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
