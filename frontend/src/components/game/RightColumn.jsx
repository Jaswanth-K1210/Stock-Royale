import { Trophy } from "lucide-react";
import { formatCurrencyDecimal } from "./helpers";

export default function RightColumn({
  positions,
  market,
  leaderboard,
  currentUserId,
  trades,
  onSelectStock,
}) {
  return (
    <aside id="tour-game-right" className="w-[340px] shrink-0 flex flex-col gap-2.5 min-h-0">
      <PositionsCard
        positions={positions}
        market={market}
        onSelectStock={onSelectStock}
      />
      <LeaderboardCard
        leaderboard={leaderboard}
        market={market}
        currentUserId={currentUserId}
      />
      <RecentOrdersCard trades={trades} />
    </aside>
  );
}

function PositionsCard({ positions, market, onSelectStock }) {
  const entries = Object.entries(positions);
  return (
    <section className="term-panel flex-1 min-h-0">
      <header className="term-header">
        <span>Positions</span>
        <span className="text-[10px] text-zinc-500 tabular-nums">
          {entries.length}
        </span>
      </header>
      {entries.length === 0 ? (
        <Empty>No positions yet.</Empty>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[1fr_auto_auto] px-3.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800/50">
            <span>Symbol</span>
            <span className="text-right pr-4">Qty</span>
            <span className="text-right">Mkt val</span>
          </div>
          <ul>
            {entries.map(([ticker, pos]) => (
              <li key={ticker}>
                <button
                  onClick={() => onSelectStock(ticker)}
                  className="w-full grid grid-cols-[1fr_auto_auto] items-center px-3.5 py-2 hover:bg-zinc-800/40 text-left"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-zinc-100">
                      {ticker}
                    </span>
                    <span className="text-[10px] text-zinc-500 tabular-nums">
                      @ {pos.avgPrice.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-300 tabular-nums text-right pr-4">
                    {pos.qty}
                  </span>
                  <span className="text-sm text-zinc-100 tabular-nums text-right">
                    {formatCurrencyDecimal(pos.qty * pos.avgPrice, market)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function LeaderboardCard({ leaderboard, market, currentUserId }) {
  return (
    <section className="term-panel flex-1 min-h-0">
      <header className="term-header flex gap-2">
        <Trophy size={14} className="text-amber-300" />
        <span>Leaderboard</span>
        <span className="ml-auto text-[10px] text-zinc-500 tabular-nums">
          {leaderboard.length}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto">
        {leaderboard.length === 0 ? (
          <Empty>No players yet.</Empty>
        ) : (
          <ul>
            {leaderboard.map((p) => {
              const me = p.userId === currentUserId;
              return (
                <li
                  key={p.userId}
                  className={`flex items-center justify-between px-3.5 py-2 ${
                    me ? "bg-sky-500/10" : "hover:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 grid place-items-center rounded-lg text-[11px] font-semibold tabular-nums ${
                        p.rank === 1
                          ? "bg-amber-400/20 text-amber-300"
                          : me
                          ? "bg-sky-500/20 text-sky-300"
                          : "bg-zinc-700/60 text-zinc-300"
                      }`}
                    >
                      {p.rank}
                    </span>
                    <span
                      className={`text-sm font-medium truncate ${
                        me ? "text-sky-200" : "text-zinc-100"
                      }`}
                    >
                      {p.username}
                      {me && (
                        <span className="text-[10px] text-sky-400 ml-1.5">
                          you
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-sm tabular-nums text-zinc-200">
                    {formatCurrencyDecimal(p.value, market)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function RecentOrdersCard({ trades }) {
  return (
    <section className="term-panel flex-1 min-h-0">
      <header className="term-header">
        <span>Recent orders</span>
        <span className="text-[10px] text-zinc-500 tabular-nums">
          {trades.length}
        </span>
      </header>
      {trades.length === 0 ? (
        <Empty>No orders yet.</Empty>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[1fr_auto_auto] px-3.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800/50">
            <span>Symbol</span>
            <span className="text-right pr-4">Side</span>
            <span className="text-right">Price</span>
          </div>
          <ul>
            {trades.slice(0, 30).map((t, i) => (
              <li
                key={t.id || i}
                className="grid grid-cols-[1fr_auto_auto] items-center px-3.5 py-2 hover:bg-zinc-800/30"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-zinc-100">
                    {t.ticker}
                    <span className="text-zinc-500 font-normal ml-1.5 text-[11px]">
                      ×{t.qty}
                    </span>
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {t.ts
                      ? new Date(t.ts).toLocaleTimeString("en-US", {
                          hour12: false,
                        })
                      : ""}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md text-right justify-self-end mr-3 ${
                    t.side === "BUY"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {t.side}
                </span>
                <span className="text-sm tabular-nums text-zinc-200 text-right">
                  {Number(t.price).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const Empty = ({ children }) => (
  <div className="px-3.5 py-4 text-xs text-zinc-500">{children}</div>
);
