import Trade from "../models/Trade.js";
import Room from "../models/Room.js";
import { getQuote } from "../services/priceService.js";

// POST /api/trades — execute a trade
export const executeTrade = async (req, res) => {
  try {
    const { roomCode, ticker, side, qty } = req.body;

    if (!roomCode || !ticker || !side || !qty) {
      return res.status(400).json({ message: "roomCode, ticker, side, qty required" });
    }

    if (!["BUY", "SELL"].includes(side)) {
      return res.status(400).json({ message: "side must be BUY or SELL" });
    }

    if (qty < 1) {
      return res.status(400).json({ message: "qty must be at least 1" });
    }

    const room = await Room.findOne({ code: roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.status !== "ACTIVE") {
      return res.status(400).json({ message: "Room is not active" });
    }

    // Defensive: in-process game-end timers are lost on restart, so enforce
    // the deadline here too — once endsAt passes, no more trades are allowed.
    if (room.endsAt && Date.now() > new Date(room.endsAt).getTime()) {
      if (room.status === "ACTIVE") {
        room.status = "FINISHED";
        await room.save();
      }
      return res.status(400).json({ message: "Room has ended" });
    }

    // Check player is in the room
    const playerIdx = room.players.findIndex(
      (p) => p.userId.toString() === req.user._id.toString()
    );
    if (playerIdx === -1) {
      return res.status(403).json({ message: "You are not in this room" });
    }

    // Get live price
    const quoteData = await getQuote(ticker);
    if (!quoteData || !quoteData.price) {
      return res.status(400).json({ message: "Could not fetch price for " + ticker });
    }

    const price = quoteData.price;
    const total = price * qty;
    const player = room.players[playerIdx];
    const tickerUpper = ticker.toUpperCase();

    const posIdx = player.positions.findIndex((p) => p.ticker === tickerUpper);

    if (side === "BUY") {
      if (player.cash < total) {
        return res.status(400).json({ message: "Insufficient cash" });
      }
      player.cash -= total;

      if (posIdx === -1) {
        player.positions.push({ ticker: tickerUpper, qty, avgPrice: price });
      } else {
        const existing = player.positions[posIdx];
        const totalQty = existing.qty + qty;
        const totalCost = existing.qty * existing.avgPrice + total;
        existing.qty = totalQty;
        existing.avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
      }
    } else {
      // SELL — must own at least qty shares
      if (posIdx === -1 || player.positions[posIdx].qty < qty) {
        return res.status(400).json({ message: "Insufficient shares to sell" });
      }
      player.cash += total;
      const existing = player.positions[posIdx];
      existing.qty -= qty;
      if (existing.qty === 0) {
        player.positions.splice(posIdx, 1);
      }
    }

    // Save room
    room.players[playerIdx] = player;
    room.markModified("players");
    await room.save();

    // Record trade
    const trade = await Trade.create({
      roomId: room._id,
      userId: req.user._id,
      username: req.user.username,
      ticker: ticker.toUpperCase(),
      tickerName: quoteData.name || "",
      side,
      qty,
      price,
      total,
    });

    // Broadcast via Socket.io
    const io = req.app.get("io");
    io.to(roomCode.toUpperCase()).emit("trade_executed", {
      id: trade._id,
      userId: req.user._id,
      username: req.user.username,
      ticker: trade.ticker,
      tickerName: trade.tickerName,
      side,
      qty,
      price,
      total,
      cashAfter: player.cash,
      ts: trade.executedAt,
    });

    res.json({
      trade,
      cash: player.cash,
      positions: player.positions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/trades/:roomCode — get all trades in a room
export const getRoomTrades = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found" });

    // Only players in the room may read its trade history.
    const isMember = room.players.some(
      (p) => p.userId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not in this room" });
    }

    const trades = await Trade.find({ roomId: room._id })
      .sort({ executedAt: -1 })
      .limit(100);

    res.json(trades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
