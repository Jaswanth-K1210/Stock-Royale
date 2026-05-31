import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

export const setupSocket = (io) => {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join a room's socket channel
    socket.on("join_room", ({ roomCode }) => {
      if (roomCode) {
        socket.join(roomCode.toUpperCase());
        logger.info(`User ${socket.userId} joined room channel: ${roomCode}`);
      }
    });

    // Leave a room's socket channel
    socket.on("leave_room", ({ roomCode }) => {
      if (roomCode) {
        socket.leave(roomCode.toUpperCase());
        logger.info(`User ${socket.userId} left room channel: ${roomCode}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};
