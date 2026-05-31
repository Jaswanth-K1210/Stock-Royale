import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "../services/api";
import useAuthStore from "../store/authStore";
import { Lock, Globe } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { io } from "socket.io-client";

const MARKET_FLAGS = { INDIA: "🇮🇳", USA: "🇺🇸", BOTH: "🌐" };

export default function Lobby() {
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get(`/api/rooms/${code}`);
      setRoom(res.data);
      if (res.data.status === "ACTIVE") navigate(`/rooms/${code}/game`);
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);

    // Socket for real-time updates
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5001", {
      auth: { token: localStorage.getItem("token") },
    });
    socket.emit("join_room", { roomCode: code });
    socket.on("player_joined", () => load());
    socket.on("game_started", () => navigate(`/rooms/${code}/game`));

    return () => {
      clearInterval(id);
      socket.disconnect();
    };
  }, [code]);

  // Interactive Tour
  useEffect(() => {
    if (room && !localStorage.getItem("hasSeenLobbyTour")) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { element: '#tour-lobby-code', popover: { title: 'Lobby Code', description: 'Share this 6-digit code with other operators so they can join your node.', side: "bottom", align: 'center' }},
          { element: '#tour-lobby-players', popover: { title: 'Connected Operators', description: 'See who is currently connected. The game cannot start until the host initiates it.', side: "right", align: 'start' }},
          { element: '#tour-lobby-rules', popover: { title: 'Security Rules', description: 'Review the access rules for this node. Notice how private rooms lock out new players once the battle begins.', side: "left", align: 'start' }},
          { element: '#tour-lobby-start', popover: { title: 'Deployment', description: 'Once all operators are connected, the host can deploy the node to begin the simulation.', side: "top", align: 'center' }},
        ],
        onDestroyStarted: () => {
          localStorage.setItem("hasSeenLobbyTour", "true");
          driverObj.destroy();
        }
      });
      setTimeout(() => driverObj.drive(), 500);
    }
  }, [room?._id]);

  const handleStart = async () => {
    try {
      await api.post(`/api/rooms/${code}/start`);
      navigate(`/rooms/${code}/game`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start");
    }
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-dim font-mono animate-pulse">Connecting to lobby...</div>
      </div>
    );
  }

  const isHost = room.hostId === user?._id;

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-up pb-10">
      <div id="tour-lobby-code" className="text-center mb-10">
        <div className="text-5xl mb-3">{MARKET_FLAGS[room.market] || "🌐"}</div>
        <h1 className="text-5xl font-display font-bold mb-3">
          <span className="text-gold text-glow-gold">{room.code}</span>
        </h1>
        <p className="text-text-dim font-mono text-sm uppercase tracking-widest">
          {room.market} Market • ${room.startingCash.toLocaleString()} • {Math.round(room.durationMs / 60000)} min
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Players */}
        <div id="tour-lobby-players" className="glass-panel p-6 rounded-xl">
          <h2 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-4 pb-2 border-b border-border">
            Players ({room.players.length}/{room.maxPlayers})
          </h2>
          <ul className="space-y-3">
            {room.players.map((p, i) => (
              <motion.li
                key={p.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-bg/50 border border-border/50"
              >
                <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold font-bold text-sm">
                  {p.username[0].toUpperCase()}
                </div>
                <span className="font-semibold text-sm">{p.username}</span>
                {p.userId === room.hostId && (
                  <span className="ml-auto text-[10px] font-mono bg-gold/10 text-gold px-2 py-0.5 rounded border border-gold/20">
                    HOST
                  </span>
                )}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Room Info */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-4 pb-2 border-b border-border">
            Room Info
          </h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-text-dim">Room Code</span>
              <span className="font-mono font-bold text-gold">{room.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">Market</span>
              <span className="font-mono">{MARKET_FLAGS[room.market]} {room.market}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">Starting Cash</span>
              <span className="font-mono">${room.startingCash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">Duration</span>
              <span className="font-mono">{Math.round(room.durationMs / 60000)} min</span>
            </div>
          </div>

          <div id="tour-lobby-rules" className="mt-6 p-4 rounded-lg bg-bg/50 border border-border/50 text-left">
            <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-2 flex items-center gap-2">
              {room.isPublic ? <Globe size={14} className="text-emerald-400" /> : <Lock size={14} className="text-rose-400" />}
              Node Security Rules
            </p>
            {room.isPublic ? (
              <p className="text-xs text-text-faint font-mono leading-relaxed">
                <strong className="text-emerald-400">PUBLIC NODE:</strong> Open access. New operators can drop in and join the simulation until the session reaches 60% completion.
              </p>
            ) : (
              <p className="text-xs text-text-faint font-mono leading-relaxed">
                <strong className="text-rose-400">PRIVATE NODE:</strong> Access is restricted. New operators <strong className="text-rose-400">cannot join</strong> after the session begins. Disconnected operators may rejoin at any point.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Start / Waiting */}
      <div id="tour-lobby-start" className="mt-10">
        {isHost ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="w-full btn-primary py-5 text-xl font-display tracking-[0.2em] animate-glow-pulse"
          >
            START BATTLE
          </motion.button>
        ) : (
          <div className="glass p-5 rounded-xl text-center font-mono text-text-dim animate-pulse">
            ⏳ Waiting for host to start the battle...
          </div>
        )}
      </div>
    </div>
  );
}
