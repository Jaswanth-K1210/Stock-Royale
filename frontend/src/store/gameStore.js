import { create } from "zustand";

const useGameStore = create((set, get) => ({
  room: null,
  trades: [],
  cash: 0,
  positions: {}, // { AAPL: { qty: 10, avgPrice: 150 }, ... }

  setRoom: (room) => set({ room }),

  setCash: (cash) => set({ cash }),

  // Replace positions (used to hydrate from backend)
  setPositions: (positions) => set({ positions }),

  addTrade: (trade) =>
    set((s) => ({ trades: [trade, ...s.trades].slice(0, 100) })),

  // Update position after a trade
  applyTrade: (trade, isMine) => {
    if (!isMine) {
      // Just add to trade feed
      set((s) => ({ trades: [trade, ...s.trades].slice(0, 100) }));
      return;
    }

    set((s) => {
      const positions = { ...s.positions };
      const ticker = trade.ticker;
      const existing = positions[ticker] || { qty: 0, avgPrice: 0 };

      if (trade.side === "BUY") {
        const totalCost = existing.qty * existing.avgPrice + trade.qty * trade.price;
        const totalQty = existing.qty + trade.qty;
        positions[ticker] = {
          qty: totalQty,
          avgPrice: totalQty > 0 ? totalCost / totalQty : 0,
        };
      } else {
        // SELL
        const newQty = existing.qty - trade.qty;
        if (newQty <= 0) {
          delete positions[ticker];
        } else {
          positions[ticker] = { ...existing, qty: newQty };
        }
      }

      return {
        positions,
        cash: trade.cashAfter ?? s.cash,
        trades: [trade, ...s.trades].slice(0, 100),
      };
    });
  },

  reset: () => set({ room: null, trades: [], cash: 0, positions: {} }),
}));

export default useGameStore;
