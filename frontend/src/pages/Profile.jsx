import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineBadgeCheck, HiOutlineTrendingUp, HiOutlineFire, HiOutlineStar } from "react-icons/hi";
import useAuthStore from "../store/authStore";
import api from "../services/api";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Fetch user favorites
    api.get("/api/stocks/favorites").then((res) => {
      setFavorites(res.data);
    }).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <div className="w-full px-4 sm:px-8 animate-fade-up pb-10">
      
      {/* Profile Header */}
      <div className="glass-panel p-8 rounded-2xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-32 h-32 rounded-2xl bg-gold/20 border-2 border-gold/40 flex items-center justify-center text-gold font-display font-bold text-6xl shadow-[0_0_30px_rgba(240,180,41,0.2)]">
          {user.username?.[0]?.toUpperCase()}
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <div className="inline-block px-3 py-1 bg-gold/10 border border-gold/30 text-gold text-[10px] font-mono font-bold tracking-widest rounded-full mb-3">
            LEVEL {user.level || 1}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gold text-glow-gold mb-2">
            {user.username}
          </h1>
          <p className="text-text-dim font-mono mb-4 text-sm">{user.email}</p>
          
          <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-6">
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
              <HiOutlineFire className="text-bear text-xl" />
              <div>
                <div className="text-[10px] text-text-faint uppercase">Win Streak</div>
                <div className="font-mono font-bold text-lg">{user.winStreak || 0}</div>
              </div>
            </div>
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
              <HiOutlineBadgeCheck className="text-neon-blue text-xl" />
              <div>
                <div className="text-[10px] text-text-faint uppercase">Wins</div>
                <div className="font-mono font-bold text-lg">{user.totalWins || 0}</div>
              </div>
            </div>
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
              <HiOutlineTrendingUp className="text-bull text-xl" />
              <div>
                <div className="text-[10px] text-text-faint uppercase">Total Games</div>
                <div className="font-mono font-bold text-lg">{user.totalGamesPlayed || 0}</div>
              </div>
            </div>
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2 border border-gold/30 bg-gold/10">
              <div className="text-gold font-bold text-xl">🪙</div>
              <div>
                <div className="text-[10px] text-text-faint uppercase">Coins</div>
                <div className="font-mono font-bold text-lg text-gold">{user.coins || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Favorites Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-6 rounded-2xl h-full">
            <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-wider flex items-center gap-2 mb-6">
              <HiOutlineStar className="text-gold text-lg" /> Watchlist
            </h3>
            
            {favorites.length === 0 ? (
              <div className="text-text-faint text-sm text-center py-10 border-2 border-dashed border-border rounded-lg">
                No favorited stocks yet.
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((f, i) => (
                  <motion.div
                    key={f.symbol}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-bg/50 border border-border/50 hover:border-gold/30 transition-colors"
                  >
                    <div>
                      <span className="font-mono font-bold text-gold">{f.symbol}</span>
                      <div className="text-[10px] text-text-faint">{f.name}</div>
                    </div>
                    <span className="text-[10px] font-mono bg-bg px-2 py-1 rounded border border-border">
                      {f.market}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Career Stats / Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-6">Career Intel</h3>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg/50 border border-border/50">
                <div className="text-text-faint text-xs uppercase mb-1">Win Rate</div>
                <div className="text-3xl font-display text-neon-blue">
                  {user.totalGamesPlayed > 0 
                    ? Math.round((user.totalWins / user.totalGamesPlayed) * 100)
                    : 0}%
                </div>
              </div>
              <div className="p-4 rounded-xl bg-bg/50 border border-border/50">
                <div className="text-text-faint text-xs uppercase mb-1">Experience Points</div>
                <div className="text-3xl font-mono text-neon-purple">
                  {user.xp || 0} <span className="text-sm text-text-dim">XP</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-border/30 flex items-center justify-center text-2xl text-text-faint mb-4">
              🎯
            </div>
            <h3 className="text-lg font-display text-text-dim mb-2">More Stats Coming Soon</h3>
            <p className="text-text-faint text-sm text-center max-w-sm mb-6">
              Trade history, achievements, and detailed analytics will be unlocked in a future update.
            </p>
            <Link to="/dashboard" className="px-6 py-2 border border-border-bright text-text-dim rounded-lg hover:text-gold hover:border-gold transition-colors text-sm">
              Back to HQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
