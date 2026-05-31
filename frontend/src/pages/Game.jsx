import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import api from "../services/api";
import useAuthStore from "../store/authStore";
import useGameStore from "../store/gameStore";

import TopBar from "../components/game/TopBar";
import HoverSidebar from "../components/game/HoverSidebar";
import LeftColumn from "../components/game/LeftColumn";
import ChartCard from "../components/game/ChartCard";
import OrderDesk from "../components/game/OrderDesk";
import RightColumn from "../components/game/RightColumn";
import NewsStrip from "../components/game/NewsStrip";

export default function Game() {
  const { code } = useParams();
  const user = useAuthStore((s) => s.user);
  const {
    room,
    setRoom,
    cash,
    setCash,
    positions,
    setPositions,
    applyTrade,
    trades,
    reset,
  } = useGameStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [qty, setQty] = useState(1);
  const [favorites, setFavorites] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [sidebarOpen, setSidebarOpen] = useState(null);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const res = await api.get(`/api/rooms/${code}`);
        setRoom(res.data);
        const me = res.data.players.find((p) => p.userId === user?._id);
        if (me) {
          setCash(me.cash);
          const posMap = {};
          (me.positions || []).forEach((p) => {
            posMap[p.ticker] = { qty: p.qty, avgPrice: p.avgPrice };
          });
          setPositions(posMap);
        }
        const lb = res.data.players
          .map((p) => {
            const heldVal = (p.positions || []).reduce(
              (sum, pos) => sum + pos.qty * pos.avgPrice,
              0
            );
            return {
              userId: p.userId,
              username: p.username,
              value: p.cash + heldVal,
            };
          })
          .sort((a, b) => b.value - a.value)
          .map((p, i) => ({ ...p, rank: i + 1 }));
        setLeaderboard(lb);
      } catch {
        /* noop */
      }
    };
    loadRoom();

    api
      .get("/api/stocks/favorites")
      .then((res) => setFavorites(res.data))
      .catch(() => {});

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5001", {
      auth: { token: localStorage.getItem("token") },
    });
    socketRef.current = socket;
    socket.emit("join_room", { roomCode: code });
    socket.on("trade_executed", (trade) => {
      applyTrade(trade, trade.userId === user?._id);
    });
    socket.on("late_join_notification", (data) => {
      const currentRoom = useGameStore.getState().room;
      if (currentRoom?.hostId === user?._id) {
        toast(`⚠️ Operator ${data.username} has entered the active session.`, {
          style: { background: "#1A1A1A", color: "#FF9900", border: "1px solid #FF9900", borderRadius: "0" }
        });
      }
    });
    socket.on("game_over", () => navigate(`/rooms/${code}/results`));

    return () => {
      socket.disconnect();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!localStorage.getItem("hasSeenGameTour")) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { element: '#tour-game-search', popover: { title: 'Company Search', description: 'Look up any stock ticker here to load its live chart and news. The search is locked to your room\'s market context.', side: "bottom", align: 'center' }},
          { element: '#tour-game-left', popover: { title: 'Watchlist & Portfolio', description: 'Track your available cash, daily PnL, and monitor your favorite stocks here.', side: "right", align: 'start' }},
          { element: '#tour-game-chart', popover: { title: 'Live Trading Chart', description: 'Analyze real-time price action using TradingView.', side: "bottom", align: 'center' }},
          { element: '#tour-game-order', popover: { title: 'Order Desk', description: 'Execute your BUY and SELL orders here. Ensure you have enough cash to cover the transaction.', side: "top", align: 'center' }},
          { element: '#tour-game-right', popover: { title: 'Positions & Leaderboard', description: 'Track your active trades and see how you stack up against other players in real-time.', side: "left", align: 'start' }},
        ],
        onDestroyStarted: () => {
          localStorage.setItem("hasSeenGameTour", "true");
          driverObj.destroy();
        }
      });
      setTimeout(() => driverObj.drive(), 1500); // Slight delay for sockets to connect and UI to settle
    }
  }, []);

  const roomMarket = room?.market || "USA";
  useEffect(() => {
    const q = searchQuery;
    let alive = true;
    const t = setTimeout(async () => {
      if (!q || q.length < 1) {
        if (alive) setSearchResults([]);
        return;
      }
      if (alive) setSearching(true);
      try {
        const res = await api.get(
          `/api/stocks/search?q=${encodeURIComponent(q)}&market=${roomMarket}`
        );
        if (alive) setSearchResults(res.data);
      } catch {
        /* noop */
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchQuery, roomMarket]);

  const selectStock = async (symbol) => {
    try {
      const [quoteRes] = await Promise.allSettled([
        api.get(`/api/stocks/quote/${symbol}`),
      ]);
      if (quoteRes.status === "fulfilled") setSelectedStock(quoteRes.value.data);
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      toast.error("Could not retrieve security data");
    }
  };

  const executeTrade = async (side) => {
    if (!selectedStock) return;
    try {
      const res = await api.post("/api/trades", {
        roomCode: code,
        ticker: selectedStock.symbol,
        side,
        qty: Number(qty),
      });
      setCash(res.data.cash);
      if (res.data.positions) {
        const posMap = {};
        res.data.positions.forEach((p) => {
          posMap[p.ticker] = { qty: p.qty, avgPrice: p.avgPrice };
        });
        setPositions(posMap);
      }
      toast.success(`${side} ${qty} ${selectedStock.symbol}`);
      const updated = await api.get(`/api/stocks/quote/${selectedStock.symbol}`);
      setSelectedStock(updated.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Order rejected");
    }
  };

  const toggleFavorite = async (symbol, name, market) => {
    const fallbackMarket =
      room?.market === "BOTH" ? "USA" : room?.market || "USA";
    const isFav = favorites.some((f) => f.symbol === symbol);
    try {
      if (isFav) {
        const res = await api.delete(`/api/stocks/favorites/${symbol}`);
        setFavorites(res.data.favorites);
      } else {
        const res = await api.post("/api/stocks/favorites", {
          symbol,
          name,
          market: market || fallbackMarket,
        });
        setFavorites(res.data.favorites);
      }
    } catch {
      /* noop */
    }
  };

  const portfolioValue = useMemo(
    () =>
      cash + Object.values(positions).reduce((s, p) => s + p.qty * p.avgPrice, 0),
    [cash, positions]
  );
  const startingCash = room?.startingCash || 0;
  const pnlValue = portfolioValue - startingCash;
  const pnlPct =
    startingCash > 0 ? (pnlValue / startingCash) * 100 : 0;

  const market = room?.market === "BOTH" ? "USA" : room?.market || "USA";
  const isFavSelected = selectedStock
    ? favorites.some((f) => f.symbol === selectedStock.symbol)
    : false;

  const openSidebar = (key) => setSidebarOpen(key);
  const pinSidebar = (key) => {
    setSidebarOpen(key);
    setSidebarPinned(true);
  };
  const closeSidebar = () => {
    setSidebarOpen(null);
    setSidebarPinned(false);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-bg text-text flex">
      <HoverSidebar
        open={sidebarOpen}
        pinned={sidebarPinned}
        onOpen={openSidebar}
        onPin={pinSidebar}
        onClose={closeSidebar}
        room={room}
        code={code}
        leaderboard={leaderboard}
        currentUserId={user?._id}
        market={market}
        onExit={() => navigate("/dashboard")}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          room={room}
          code={code}
          portfolioValue={portfolioValue}
          pnlPct={pnlPct}
          username={user?.username}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onShowRoomInfo={() => pinSidebar("room")}
          onShowSettings={() => pinSidebar("settings")}
          onExit={() => navigate("/dashboard")}
        />

        <div className="flex-1 min-h-0 p-1 flex gap-1">
          <LeftColumn
            cash={cash}
            portfolioValue={portfolioValue}
            pnlValue={pnlValue}
            pnlPct={pnlPct}
            market={market}
            favorites={favorites}
            onSelectStock={selectStock}
            onToggleFavorite={toggleFavorite}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searching={searching}
          />

          <div className="flex-1 min-w-0 flex flex-col gap-1 min-h-0">
            <ChartCard
              selectedStock={selectedStock}
              isFavorite={isFavSelected}
              onToggleFavorite={() =>
                selectedStock &&
                toggleFavorite(selectedStock.symbol, selectedStock.name, market)
              }
            />
            <OrderDesk
              selectedStock={selectedStock}
              qty={qty}
              setQty={setQty}
              onTrade={executeTrade}
              market={market}
              cash={cash}
            />
            <NewsStrip
              market={market}
              symbols={selectedStock ? [selectedStock.symbol] : []}
              q={selectedStock?.name || ""}
              onOpenFull={() => pinSidebar("news")}
            />
          </div>

          <RightColumn
            positions={positions}
            market={market}
            leaderboard={leaderboard}
            currentUserId={user?._id}
            trades={trades}
            onSelectStock={selectStock}
          />
        </div>
      </div>
    </div>
  );
}
