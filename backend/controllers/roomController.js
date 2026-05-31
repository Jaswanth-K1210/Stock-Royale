import Room from "../models/Room.js";

// Generate a random 6-char room code
const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// POST /api/rooms — create a room
export const createRoom = async (req, res) => {
  try {
    const { market, startingCash, durationMs, maxPlayers, isPublic } = req.body;

    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      exists = await Room.findOne({ code });
    }

    const room = await Room.create({
      code,
      hostId: req.user._id,
      market: market || "USA",
      isPublic: isPublic || false,
      startingCash: startingCash || 100000,
      durationMs: durationMs || 15 * 60 * 1000,
      maxPlayers: maxPlayers || 10,
      players: [
        {
          userId: req.user._id,
          username: req.user.username,
          cash: startingCash || 100000,
        },
      ],
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rooms — list public rooms in LOBBY state
export const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ 
      isPublic: true,
      status: { $in: ["LOBBY", "ACTIVE"] } 
    })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rooms/mine — list rooms the current user is a player in and that are still live
export const listMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      "players.userId": req.user._id,
      status: { $in: ["LOBBY", "ACTIVE"] },
    })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rooms/:code
export const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rooms/:code/join
export const joinRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const alreadyIn = room.players.some(
      (p) => p.userId.toString() === req.user._id.toString()
    );
    if (alreadyIn) return res.json(room);

    if (room.status === "ACTIVE") {
      if (!room.isPublic) {
        return res.status(403).json({ message: "Cannot join a private room that has already started" });
      }
      const timeElapsed = Date.now() - new Date(room.startsAt).getTime();
      if (timeElapsed >= room.durationMs * 0.6) {
        return res.status(403).json({ message: "Cannot join, room is more than 60% complete" });
      }
    } else if (room.status !== "LOBBY") {
      return res.status(400).json({ message: "Room is finished and not joinable" });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ message: "Room is full" });
    }

    room.players.push({
      userId: req.user._id,
      username: req.user.username,
      cash: room.startingCash,
    });
    await room.save();

    // Notify via Socket.io
    const io = req.app.get("io");
    io.to(room.code).emit("player_joined", {
      userId: req.user._id,
      username: req.user.username,
    });

    if (room.status === "ACTIVE") {
      io.to(room.code).emit("late_join_notification", {
        userId: req.user._id,
        username: req.user.username,
      });
    }

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rooms/:code/start
export const startRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only host can start the game" });
    }

    if (room.status !== "LOBBY") {
      return res.status(400).json({ message: "Room already started" });
    }

    room.status = "ACTIVE";
    room.startsAt = new Date();
    room.endsAt = new Date(Date.now() + room.durationMs);
    await room.save();

    // Notify all players
    const io = req.app.get("io");
    io.to(room.code).emit("game_started", {
      startsAt: room.startsAt,
      endsAt: room.endsAt,
    });

    // Schedule game end
    setTimeout(async () => {
      const r = await Room.findById(room._id);
      if (r && r.status === "ACTIVE") {
        r.status = "FINISHED";
        await r.save();
        io.to(r.code).emit("game_over", { room: r });
      }
    }, room.durationMs);

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
