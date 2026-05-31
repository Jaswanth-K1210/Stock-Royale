import { Minus, Plus } from "lucide-react";
import { formatCurrencyDecimal } from "./helpers";

export default function OrderDesk({
  selectedStock,
  qty,
  setQty,
  onTrade,
  market,
  cash,
}) {
  const total = selectedStock ? selectedStock.price * qty : 0;
  const canBuy = selectedStock && total <= cash;
  const disabled = !selectedStock;

  return (
    <div id="tour-game-order" className="bg-bg-card border border-border h-[72px] shrink-0 px-4 flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Qty</span>
        <div className="flex items-center bg-bg border border-border h-9">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            disabled={disabled}
            className="w-8 h-9 grid place-items-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 disabled:opacity-40"
          >
            <Minus size={13} />
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            disabled={disabled}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-14 h-9 bg-transparent text-center text-sm font-semibold text-white outline-none tabular-nums disabled:opacity-50"
          />
          <button
            onClick={() => setQty(qty + 1)}
            disabled={disabled}
            className="w-8 h-9 grid place-items-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 disabled:opacity-40"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          Order total
        </span>
        <span className="text-base font-semibold text-white tabular-nums">
          {selectedStock ? formatCurrencyDecimal(total, market) : "—"}
        </span>
      </div>

      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          Cash
        </span>
        <span
          className={`text-sm tabular-nums ${
            canBuy || !selectedStock ? "text-zinc-300" : "text-rose-400"
          }`}
        >
          {formatCurrencyDecimal(cash, market)}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          onClick={() => onTrade("BUY")}
          disabled={disabled || !canBuy}
          className="term-btn-bull px-6 h-10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
        >
          BUY {selectedStock?.symbol || ""}
        </button>
        <button
          onClick={() => onTrade("SELL")}
          disabled={disabled}
          className="term-btn-bear px-6 h-10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
        >
          SELL {selectedStock?.symbol || ""}
        </button>
      </div>
    </div>
  );
}
