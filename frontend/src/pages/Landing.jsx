import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, BarChart3, Users, ArrowRight, TrendingUp, TrendingDown, Target, Wallet, Activity, Trophy } from "lucide-react";

const features = [
  { icon: Zap, title: "Real-Time Trading", desc: "Trade live stocks from India & USA markets with real prices" },
  { icon: BarChart3, title: "Any Stock You Want", desc: "Search and trade any stock — no restrictions, full freedom" },
  { icon: Users, title: "Multiplayer Rooms", desc: "Compete with friends in timed trading battles" },
];

const howItWorks = [
  { icon: Target, title: "1. Join the Arena", desc: "Enter a public room or host a private, timed game with your friends." },
  { icon: Wallet, title: "2. Secure Capital", desc: "Everyone starts on an even playing field with the exact same virtual cash balance." },
  { icon: Activity, title: "3. Trade Live", desc: "Buy and sell real stocks from the USA or Indian markets in real-time." },
  { icon: Trophy, title: "4. Dominate", desc: "The trader with the highest overall portfolio value when the clock runs out wins." },
];

const ticker = [
  { sym: "AAPL", chg: "+1.24%", up: true },
  { sym: "TSLA", chg: "-2.10%", up: false },
  { sym: "RELIANCE", chg: "+0.86%", up: true },
  { sym: "NVDA", chg: "+3.42%", up: true },
  { sym: "INFY", chg: "-0.54%", up: false },
  { sym: "MSFT", chg: "+0.91%", up: true },
  { sym: "TATAMOTORS", chg: "+2.07%", up: true },
  { sym: "AMZN", chg: "-1.18%", up: false },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Decorative glows + grid */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neon-blue/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neon-purple/8 rounded-full blur-[140px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border-bright) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-bright) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Ticker tape */}
      <div className="absolute top-0 left-0 right-0 border-b border-border bg-bg-card/60 backdrop-blur-sm overflow-hidden py-2 z-10">
        <div className="marquee-container">
          <div className="marquee-content font-mono text-sm">
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 mx-6">
                <span className="text-text-dim">{t.sym}</span>
                <span className={`inline-flex items-center gap-0.5 ${t.up ? "text-bull" : "text-bear"}`}>
                  {t.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {t.chg}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center max-w-3xl z-10"
      >
        <div className="inline-flex items-center gap-2 mb-7 px-4 py-1.5 border border-primary/30 bg-primary/10 text-primary-bright text-xs font-mono tracking-[0.2em] uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-bull" />
          </span>
          Multiplayer Stock Trading Game
        </div>

        <h1 className="text-6xl md:text-8xl font-mono font-bold mb-6 leading-[0.95] tracking-tight">
          <span className="text-text">STOCK</span>
          <br />
          <span className="bg-gradient-to-r from-primary-bright via-neon-blue to-neon-purple bg-clip-text text-transparent">
            ROYALE
          </span>
        </h1>

        <p className="text-text-dim text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
          Enter the arena. Trade real stocks from any market. Outsmart your opponents.
          The last trader standing wins.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="group term-btn bg-primary text-black font-bold text-base px-8 py-4 tracking-wider inline-flex items-center justify-center gap-2"
          >
            ENTER THE ARENA
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="term-btn px-8 py-4 text-base"
          >
            Sign In
          </Link>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="grid md:grid-cols-3 gap-5 mt-20 max-w-4xl w-full z-10"
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group term-panel p-6 text-center relative overflow-hidden cursor-default hover:border-primary/40 transition-colors"
          >
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 mx-auto mb-4 grid place-items-center bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <f.icon className="w-5 h-5 text-primary-bright" />
            </div>
            <h3 className="font-mono font-bold text-base mb-2 text-text tracking-wide uppercase">{f.title}</h3>
            <p className="text-text-dim text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="mt-32 max-w-5xl w-full z-10"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-mono font-bold mb-4 text-text uppercase tracking-tight">How It Works</h2>
          <p className="text-text-dim text-base md:text-lg max-w-2xl mx-auto">Master the mechanics and climb the ranks.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* Connector Line (visible on md+) */}
          <div className="hidden md:block absolute top-8 left-12 right-12 h-px bg-border-bright border-dashed border-t border-border z-0" />

          {howItWorks.map((step, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-bg border-2 border-primary grid place-items-center mb-6 shadow-[0_0_15px_rgba(0,255,6,0.15)]">
                <step.icon className="w-7 h-7 text-primary-bright" />
              </div>
              <h3 className="font-mono font-bold text-lg mb-3 text-white uppercase">{step.title}</h3>
              <p className="text-text-dim text-sm leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
