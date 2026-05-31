import { Heart, LineChart } from "lucide-react";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { tvSymbolFor } from "./helpers";

const CHART_STUDIES = ["Volume@tv-basicstudies"];

const OHLCField = ({ label, value, accent }) => (
  <span className="inline-flex items-baseline gap-1">
    <span className="text-[10px] text-zinc-500">{label}</span>
    <span className={`text-[11px] tabular-nums ${accent || "text-zinc-200"}`}>
      {value}
    </span>
  </span>
);

const formatNum = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(2);
};

const formatVolume = (v) => {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}k`;
  return String(v);
};

export default function ChartCard({
  selectedStock,
  isFavorite,
  onToggleFavorite,
}) {
  if (!selectedStock) {
    return (
      <div className="term-panel flex-1 min-h-0 flex flex-col items-center justify-center text-center px-8">
        <div className="w-12 h-12 rounded-full bg-zinc-800/50 grid place-items-center mb-3">
          <LineChart size={22} className="text-zinc-500" />
        </div>
        <div className="text-zinc-300 text-sm font-medium mb-1">
          Pick a stock to start trading
        </div>
        <div className="text-zinc-500 text-xs max-w-xs">
          Search the bar at the top, or tap one from your watchlist.
        </div>
      </div>
    );
  }

  const up = selectedStock.changePct >= 0;
  const tvSymbol = tvSymbolFor(selectedStock.symbol);
  const isIndian = tvSymbol.startsWith("BSE:") || tvSymbol.startsWith("NSE:");

  return (
    <div id="tour-game-chart" className="term-panel flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="term-header px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-base font-semibold text-white">
              {selectedStock.symbol}
            </span>
            <span className="text-sm text-zinc-200 tabular-nums">
              ${selectedStock.price.toFixed(2)}
            </span>
            <span
              className={`text-xs font-medium tabular-nums ${
                up ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {up ? "▲" : "▼"} ${Math.abs(selectedStock.change ?? 0).toFixed(2)} (
              {up ? "+" : ""}
              {selectedStock.changePct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-[11px] font-medium">
            Buy
          </span>
          <span className="px-2 py-1 rounded-md bg-rose-500/15 text-rose-400 text-[11px] font-medium">
            Sell
          </span>
          <button
            onClick={onToggleFavorite}
            title={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
            className={`p-1.5 rounded-md ring-1 ring-zinc-800 hover:bg-zinc-800/60 ml-1 ${
              isFavorite ? "text-rose-400" : "text-zinc-500"
            }`}
          >
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="px-4 py-1.5 border-b border-border bg-bg/50 flex items-center gap-4 flex-wrap">
        <OHLCField label="O" value={formatNum(selectedStock.open)} />
        <OHLCField
          label="H"
          value={formatNum(selectedStock.high)}
          accent="text-emerald-400"
        />
        <OHLCField
          label="L"
          value={formatNum(selectedStock.low)}
          accent="text-rose-400"
        />
        <OHLCField label="C" value={formatNum(selectedStock.prevClose)} />
        <OHLCField label="V" value={formatVolume(selectedStock.volume)} />
      </div>

      <div className="flex-1 min-h-0 relative">
        <AdvancedRealTimeChart
          key={tvSymbol}
          symbol={tvSymbol}
          interval={isIndian ? "D" : "15"}
          theme="dark"
          autosize
          timezone="Etc/UTC"
          style="1"
          locale="en"
          enable_publishing={false}
          hide_top_toolbar={true}
          hide_legend={true}
          save_image={false}
          container_id="tradingview_chart"
          toolbar_bg="#0A0F1A"
          studies={CHART_STUDIES}
        />
      </div>
    </div>
  );
}
