import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Trophy,
  Newspaper,
  Settings as SettingsIcon,
  LogOut,
  X,
  Pin,
} from "lucide-react";
import api from "../../services/api";
import {
  BROADCAST_CHANNELS,
  ARTICLE_PROVIDERS,
  loadIntelSettings,
  saveIntelSettings,
} from "../../config/broadcastChannels";
import { fmtRelative, formatCurrencyDecimal } from "./helpers";

const ITEMS = [
  { key: "room", label: "Room", icon: Users },
  { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  {
    key: "news",
    label: "News",
    icon: Newspaper,
    accent: "text-amber-300",
    href: "/news",
  },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export default function HoverSidebar({
  open,
  pinned,
  onOpen,
  onPin,
  onClose,
  room,
  code,
  leaderboard,
  currentUserId,
  market,
  onExit,
}) {
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pinned, onClose]);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => !pinned && onOpen("room")}
      onMouseLeave={() => !pinned && onClose()}
      className="shrink-0 h-full flex relative z-30"
    >
      <div className="w-14 h-full border-r border-border bg-bg-card flex flex-col items-center py-3 gap-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = open === item.key;
          if (item.href) {
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.href)}
                title={item.label}
                className={`w-10 h-10 rounded-sm grid place-items-center transition-colors text-zinc-500 hover:text-white hover:bg-zinc-800/60 ${item.accent || ""}`}
              >
                <Icon size={18} />
              </button>
            );
          }
          return (
            <button
              key={item.key}
              onClick={() => (active && pinned ? onClose() : onOpen(item.key))}
              title={item.label}
              className={`w-10 h-10 rounded-sm grid place-items-center transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : `text-zinc-500 hover:text-white hover:bg-zinc-800/60 ${item.accent || ""}`
              }`}
            >
              <Icon size={18} />
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={onExit}
          title="Exit room"
          className="w-10 h-10 rounded-sm grid place-items-center text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div
        className={`absolute left-14 top-0 h-full transition-all duration-200 ease-out ${
          open ? "w-[300px] opacity-100" : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="term-panel h-full w-[300px] !border-t-0 !border-b-0 shadow-2xl">
          <div className="term-header px-4 h-12 flex items-center justify-between">
            <span className="text-sm font-semibold text-white capitalize">
              {open || ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => (pinned ? onOpen(open) : onPin(open))}
                title={pinned ? "Unpin" : "Pin open"}
                className={`p-1.5 rounded-md hover:bg-zinc-800 ${
                  pinned ? "text-sky-400" : "text-zinc-500 hover:text-white"
                }`}
              >
                <Pin size={14} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {open === "room" && (
              <RoomPanel room={room} code={code} currentUserId={currentUserId} market={market} />
            )}
            {open === "leaderboard" && (
              <LeaderboardPanel
                leaderboard={leaderboard}
                market={market}
                currentUserId={currentUserId}
              />
            )}
            {open === "news" && <NewsPanel market={market} />}
            {open === "settings" && <SettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ROOM ─────────────────────────────────────── */
function RoomPanel({ room, code, currentUserId, market }) {
  if (!room) return <Hint>Loading room…</Hint>;
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1.5">
        <Label>Code</Label>
        <div className="font-mono text-base text-white">{code}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Status" value={room.status || "—"} />
        <Stat label="Market" value={room.market || "—"} />
        <Stat
          label="Starting cash"
          value={formatCurrencyDecimal(room.startingCash || 0, market)}
        />
        <Stat label="Players" value={String(room.players?.length || 0)} />
      </div>
      <div>
        <Label>Players</Label>
        <ul className="mt-1.5 space-y-1">
          {(room.players || []).map((p) => (
            <li
              key={p.userId}
              className="flex items-center justify-between px-2.5 py-2 bg-bg border border-border"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500/60 to-emerald-500/60 grid place-items-center text-[11px] font-semibold text-white">
                  {p.username?.[0]?.toUpperCase() || "?"}
                </span>
                <span className="text-sm text-zinc-100 truncate">
                  {p.username}
                  {p.userId === currentUserId && (
                    <span className="text-[10px] text-sky-400 ml-1.5">you</span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── LEADERBOARD ──────────────────────────────── */
function LeaderboardPanel({ leaderboard, market, currentUserId }) {
  if (!leaderboard.length) return <Hint>No players yet.</Hint>;
  return (
    <ul className="p-3 space-y-1.5">
      {leaderboard.map((p) => {
        const me = p.userId === currentUserId;
        return (
          <li
            key={p.userId}
            className={`flex items-center justify-between px-3 py-2.5 border ${
              me ? "bg-primary/10 border-primary/30" : "bg-bg border-border"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-7 h-7 grid place-items-center rounded-lg text-xs font-semibold tabular-nums ${
                  p.rank === 1
                    ? "bg-amber-400/20 text-amber-300"
                    : me
                    ? "bg-sky-500/20 text-sky-300"
                    : "bg-zinc-700/60 text-zinc-300"
                }`}
              >
                {p.rank}
              </span>
              <span className={`text-sm font-medium truncate ${me ? "text-sky-200" : "text-zinc-100"}`}>
                {p.username}
              </span>
            </div>
            <span className="text-sm tabular-nums text-zinc-200">
              {formatCurrencyDecimal(p.value, market)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── NEWS ─────────────────────────────────────── */
function NewsPanel({ market }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(loadIntelSettings);
  const [tab, setTab] = useState("articles"); // articles | channels

  useEffect(() => {
    let alive = true;
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          market,
          since: `${settings.maxAgeHours}h`,
          limit: "50",
        });
        const res = await api.get(`/api/news/feed?${params.toString()}`);
        if (!alive) return;
        setItems(
          (res.data.items || []).filter((it) => settings.sources[it.provider] !== false)
        );
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
  }, [market, settings.maxAgeHours, settings.refreshIntervalSec, settings.sources]);

  const toggleChannel = (key) => {
    const next = {
      ...settings,
      channels: { ...settings.channels, [key]: !settings.channels[key] },
    };
    setSettings(next);
    saveIntelSettings(next);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b border-zinc-800/70">
        {[
          { k: "articles", l: "Articles" },
          { k: "channels", l: "Channels" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              tab === t.k ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {tab === "articles" ? (
          loading && items.length === 0 ? (
            <Hint>Loading headlines…</Hint>
          ) : items.length === 0 ? (
            <Hint>No news.</Hint>
          ) : (
            items.map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block p-3 bg-bg border border-border hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-block max-w-[70%] truncate text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300">
                    {n.source}
                  </span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">
                    {fmtRelative(n.publishedAt)}
                  </span>
                </div>
                <div className="text-sm text-zinc-200 leading-snug line-clamp-3">{n.title}</div>
              </a>
            ))
          )
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Broadcast channels</Label>
              <ul className="mt-1.5 space-y-1">
                {BROADCAST_CHANNELS.filter(
                  (c) => !market || market === "BOTH" || c.market === market
                ).map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center justify-between px-3 py-2 bg-bg border border-border"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.accent }}
                      />
                      <span className="text-sm text-zinc-100 truncate">{c.name}</span>
                    </span>
                    <Toggle
                      on={!!settings.channels[c.key]}
                      onClick={() => toggleChannel(c.key)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SETTINGS ─────────────────────────────────── */
function SettingsPanel() {
  const [settings, setSettings] = useState(loadIntelSettings);

  const toggleSource = (key) => {
    const next = {
      ...settings,
      sources: { ...settings.sources, [key]: !settings.sources[key] },
    };
    setSettings(next);
    saveIntelSettings(next);
  };

  const setNumber = (key, value, min, max) => {
    const v = Math.max(min, Math.min(max, Number(value) || min));
    const next = { ...settings, [key]: v };
    setSettings(next);
    saveIntelSettings(next);
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <Label>Article providers</Label>
        <ul className="mt-1.5 space-y-1">
          {ARTICLE_PROVIDERS.map((p) => (
            <li
              key={p.key}
              className="flex items-center justify-between px-3 py-2 bg-bg border border-border"
            >
              <span className="text-sm text-zinc-100">{p.name}</span>
              <Toggle on={!!settings.sources[p.key]} onClick={() => toggleSource(p.key)} />
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2.5">
        <Label>Feed behavior</Label>
        <NumberField
          label="Max age (hours)"
          value={settings.maxAgeHours}
          min={1}
          max={72}
          onChange={(v) => setNumber("maxAgeHours", v, 1, 72)}
        />
        <NumberField
          label="Refresh every (seconds)"
          value={settings.refreshIntervalSec}
          min={15}
          max={600}
          onChange={(v) => setNumber("refreshIntervalSec", v, 15, 600)}
        />
      </div>
    </div>
  );
}

/* ── shared bits ──────────────────────────────── */
const Label = ({ children }) => (
  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-1">
    {children}
  </div>
);
const Hint = ({ children }) => (
  <div className="p-4 text-xs text-zinc-500">{children}</div>
);
const Stat = ({ label, value }) => (
  <div className="px-3 py-2 bg-bg border border-border">
    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
    <div className="text-sm text-zinc-100 mt-0.5 truncate">{value}</div>
  </div>
);
const Toggle = ({ on, onClick }) => (
  <button
    onClick={onClick}
    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
      on ? "bg-sky-500" : "bg-zinc-700"
    }`}
  >
    <span
      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
        on ? "translate-x-[18px]" : "translate-x-0.5"
      }`}
    />
  </button>
);
const NumberField = ({ label, value, min, max, onChange }) => (
  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/40">
    <span className="text-sm text-zinc-100">{label}</span>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-20 bg-[#0f1218] ring-1 ring-zinc-800 rounded-md px-2 py-1 text-sm text-white text-right tabular-nums outline-none focus:ring-sky-500/50"
    />
  </div>
);
