import { Star, TrendingDown, TrendingUp, X } from "lucide-react";
import { formatCurrencyDecimal } from "./helpers";

export default function LeftColumn({
  cash,
  portfolioValue,
  pnlValue,
  pnlPct,
  market,
  favorites,
  onSelectStock,
  onToggleFavorite,
  searchQuery,
  searchResults,
  searching,
}) {
  const up = pnlPct >= 0;
  return (
    <aside id="tour-game-left" className="w-[280px] shrink-0 flex flex-col gap-2.5 min-h-0">
      <div className="term-panel p-3.5 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-zinc-400">Portfolio</span>
          <button className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded-md ring-1 ring-zinc-800">
            Live
          </button>
        </div>
        <div className="text-2xl font-semibold text-white tabular-nums leading-tight">
          {formatCurrencyDecimal(portfolioValue, market)}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {up ? (
            <TrendingUp size={13} className="text-emerald-400" />
          ) : (
            <TrendingDown size={13} className="text-rose-400" />
          )}
          <span
            className={`text-xs font-medium tabular-nums ${
              up ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {up ? "+" : ""}
            {formatCurrencyDecimal(pnlValue, market)} ({up ? "+" : ""}
            {pnlPct.toFixed(2)}%)
          </span>
          <span className="text-[11px] text-zinc-500 ml-0.5">today</span>
        </div>

        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3">
          <Stat label="Buying power" value={formatCurrencyDecimal(cash, market)} />
          <Stat
            label="Holdings"
            value={formatCurrencyDecimal(portfolioValue - cash, market)}
          />
        </div>
      </div>

      <div className="term-panel flex-1 overflow-hidden min-h-0">
        <div className="term-header">
          <span>
            {searchQuery ? "Search results" : "Watchlist"}
          </span>
          {!searchQuery && (
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {favorites.length}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {searchQuery ? (
            <SearchList
              results={searchResults}
              searching={searching}
              onSelectStock={onSelectStock}
            />
          ) : favorites.length === 0 ? (
            <Empty>
              No favourites yet. Search a ticker and tap the heart to add it.
            </Empty>
          ) : (
            <ul>
              {favorites.map((f, i) => (
                <li key={f.symbol}>
                  <div className="group flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/40">
                    <span className="text-[10px] text-zinc-600 tabular-nums w-4 text-right">
                      {i + 1}
                    </span>
                    <button
                      onClick={() => onSelectStock(f.symbol)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <Star
                        size={12}
                        className="text-amber-400 fill-amber-400 shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-zinc-100 leading-tight truncate">
                          {f.symbol}
                        </span>
                        <span className="text-[10px] text-zinc-500 leading-tight truncate">
                          {f.name}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => onToggleFavorite(f.symbol, f.name, f.market)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-0.5"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

function SearchList({ results, searching, onSelectStock }) {
  if (searching) return <Empty>Searching…</Empty>;
  if (!results.length) return <Empty>No matches.</Empty>;
  return (
    <ul>
      {results.map((s) => (
        <li key={s.symbol}>
          <button
            onClick={() => onSelectStock(s.symbol)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/40"
          >
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[13px] font-medium text-zinc-100">
                {s.symbol}
              </span>
              <span className="text-[10px] text-zinc-500 truncate capitalize">
                {s.name?.toLowerCase()}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

const Stat = ({ label, value }) => (
  <div>
    <div className="text-[10px] text-zinc-500">{label}</div>
    <div className="text-xs text-zinc-200 tabular-nums">{value}</div>
  </div>
);

const Empty = ({ children }) => (
  <div className="px-3 py-4 text-xs text-zinc-500">{children}</div>
);
