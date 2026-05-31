import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import useAuthStore from "../store/authStore";

export default function Results() {
  const { code } = useParams();
  const user = useAuthStore((s) => s.user);
  const [room, setRoom] = useState(null);

  useEffect(() => {
    api.get(`/api/rooms/${code}`).then((res) => setRoom(res.data)).catch(() => {});
  }, [code]);

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-dim font-mono animate-pulse">Loading results...</div>
      </div>
    );
  }

  const leaderboard = [...room.players]
    .sort((a, b) => b.cash - a.cash)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const winner = leaderboard[0];

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-up flex flex-col items-center">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-display font-bold text-gold text-glow-gold mb-3">GAME OVER</h1>
        <p className="text-text-dim font-mono text-sm uppercase tracking-widest">
          Trading Floor <span className="text-gold">SYS_{code}</span>
        </p>
      </div>

      {/* Winner */}
      {winner && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-8 rounded-2xl text-center mb-8 w-full border-t-2 border-t-gold relative overflow-hidden"
        >
          <div className="text-6xl mb-3">👑</div>
          <p className="text-[10px] text-text-faint uppercase tracking-widest mb-2">Champion Trader</p>
          <h2 className="text-4xl font-display font-bold text-gold text-glow-gold">{winner.username}</h2>
          <p className="font-mono text-text-dim mt-2">${winner.cash.toLocaleString()}</p>
        </motion.div>
      )}

      {/* Final Standings */}
      <div className="glass-panel p-6 rounded-2xl w-full">
        <h2 className="text-[10px] uppercase tracking-widest text-text-dim mb-4 pb-2 border-b border-border font-bold">
          Final Settlement
        </h2>
        <ol className="space-y-2">
          {leaderboard.map((row) => {
            const isMe = row.userId === user?._id;
            return (
              <motion.li
                key={row.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex justify-between items-center py-3 px-4 rounded-lg font-mono ${
                  row.rank === 1
                    ? "bg-gold/10 border border-gold/30"
                    : isMe
                    ? "bg-neon-blue/10 border border-neon-blue/30"
                    : "bg-bg/50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${row.rank === 1 ? "text-gold" : "text-text-faint"}`}>
                    #{row.rank}
                  </span>
                  <span className={`font-semibold ${row.rank === 1 ? "text-gold" : isMe ? "text-neon-blue" : ""}`}>
                    {row.username}
                  </span>
                  {isMe && <span className="text-[10px] bg-neon-blue/20 text-neon-blue px-1.5 py-0.5 rounded font-bold">YOU</span>}
                </div>
                <span className={row.rank === 1 ? "text-gold font-bold" : "text-text-dim"}>
                  ${row.cash.toLocaleString()}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>

      <Link
        to="/dashboard"
        className="mt-8 btn-primary w-full py-4 text-center text-lg font-display tracking-wider"
      >
        RETURN TO HQ
      </Link>
    </div>
  );
}
