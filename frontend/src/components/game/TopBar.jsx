import { useEffect, useRef, useState } from "react";
import { Clock, ChevronDown, LogOut, Settings as SettingsIcon, Info, Search } from "lucide-react";
import { formatCurrency } from "./helpers";

const Countdown = ({ endsAt }) => {
  const [text, setText] = useState("--:--");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const left = end - Date.now();
      if (left <= 0) {
        setText("00:00");
        setUrgent(true);
        return false;
      }
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setText(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      setUrgent(left < 60_000);
      return true;
    };
    tick();
    const id = setInterval(() => {
      if (!tick()) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums ${
        urgent
          ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"
          : "bg-zinc-800/70 text-zinc-300 ring-1 ring-zinc-700/50"
      }`}
    >
      <Clock size={12} />
      {text}
    </span>
  );
};

export default function TopBar({
  room,
  code,
  portfolioValue,
  pnlPct,
  username,
  searchQuery,
  setSearchQuery,
  onShowRoomInfo,
  onShowSettings,
  onExit,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <header className="h-14 shrink-0 px-4 flex items-center justify-between bg-bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 grid place-items-center">
          <div className="w-2 h-2 rounded-sm bg-white/90" />
        </div>
        <span className="text-sm font-semibold text-white">Stock Royale</span>
        <div className="h-5 w-px bg-zinc-800" />
        <div className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-emerald-500/10 text-emerald-400 text-xs ring-1 ring-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {room?.status === "ACTIVE" ? "Market Open" : room?.status || "—"}
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <div id="tour-game-search" className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stocks…"
            className="term-input w-80 h-9 pl-8 pr-3"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Countdown endsAt={room?.endsAt} />
        <div className="text-right leading-tight">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Net Liquidity
          </div>
          <div className="flex items-baseline gap-2 justify-end">
            <span className="text-sm font-semibold text-white tabular-nums">
              {formatCurrency(portfolioValue, room?.market)}
            </span>
            <span
              className={`text-[11px] font-medium tabular-nums ${
                pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {pnlPct >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div ref={menuRef} className="relative pl-2 ml-1 border-l border-zinc-800">
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-zinc-800/60"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/60 to-emerald-500/60 grid place-items-center text-xs font-semibold text-white">
              {username?.[0]?.toUpperCase() || "?"}
            </div>
            <ChevronDown size={13} className="text-zinc-500" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 term-panel shadow-xl z-40">
              <div className="px-3 py-2.5 border-b border-zinc-800/70">
                <div className="text-sm text-white">{username}</div>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Room {code}
                </div>
              </div>
              <MenuItem
                icon={Info}
                label="Room info"
                onClick={() => {
                  setMenuOpen(false);
                  onShowRoomInfo?.();
                }}
              />
              <MenuItem
                icon={SettingsIcon}
                label="Settings"
                onClick={() => {
                  setMenuOpen(false);
                  onShowSettings?.();
                }}
              />
              <div className="h-px bg-zinc-800/70" />
              <MenuItem
                icon={LogOut}
                label="Exit room"
                accent="text-rose-400"
                onClick={() => {
                  setMenuOpen(false);
                  onExit?.();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-zinc-800/60 ${
        accent || "text-zinc-200"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
