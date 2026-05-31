import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Activity, ShieldAlert, Cpu, BarChart2, Coins, Target, Terminal as TerminalIcon, Sparkles } from "lucide-react";
import api from "../services/api";
import useAuthStore from "../store/authStore";
import DashboardNewsSection from "../components/news/DashboardNewsSection";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);

  useEffect(() => {
    // Fetch public rooms
    api.get("/api/rooms").then((res) => {
      setPublicRooms(res.data);
    }).catch(() => {});

    // Interactive Tour
    if (!localStorage.getItem("hasSeenDashboardTour")) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { element: '#tour-profile', popover: { title: 'Operator Profile', description: 'This is your command identity. Track your XP, Level, and Global Rank here.', side: "right", align: 'start' }},
          { element: '#tour-command', popover: { title: 'Command Center', description: 'Initialize a new private room or join an existing one using a 6-digit access code.', side: "right", align: 'start' }},
          { element: '#tour-public', popover: { title: 'Public Operations', description: 'Quickly drop into live, open simulation rooms happening right now.', side: "right", align: 'start' }},
          { element: '#tour-news-market', popover: { title: 'Market Context', description: 'Switch between US and Indian markets. This updates the live news stream to help you research local companies.', side: "bottom", align: 'start' }},
          { element: '#tour-news', popover: { title: 'Live Intelligence Feed', description: 'Monitor global markets with live business news broadcasts and real-time RSS feeds. Crucial for making informed trades.', side: "left", align: 'start' }},
        ],
        onDestroyStarted: () => {
          localStorage.setItem("hasSeenDashboardTour", "true");
          driverObj.destroy();
        }
      });
      setTimeout(() => driverObj.drive(), 500);
    }
  }, []);



  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await api.post(`/api/rooms/${joinCode}/join`);
      navigate(`/rooms/${joinCode.toUpperCase()}/lobby`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join room");
    } finally {
      setJoining(false);
    }
  };

  const handleJoinPublic = async (code) => {
    setJoining(true);
    try {
      await api.post(`/api/rooms/${code}/join`);
      navigate(`/rooms/${code.toUpperCase()}/lobby`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join room");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] bg-bg flex flex-col font-sans text-text p-4">
      {/* Top Header / Marquee */}
      <div className="w-full bg-black border border-border p-1.5 mb-4 flex items-center gap-2 overflow-hidden shadow-sm shrink-0 rounded-xl">
        <div className="bg-primary text-black font-bold px-3 py-1 text-xs uppercase whitespace-nowrap z-10 flex-shrink-0 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
          SYS_DATA_STREAM
        </div>
        <div className="marquee-container text-xs text-primary/80 uppercase tracking-widest font-mono">
          <div className="marquee-content">
            *** SECURE CONNECTION ESTABLISHED *** WAR ROOM TERMINAL ONLINE *** ALL DATA STREAMS NOMINAL *** OPERATOR: {user?.username || "—"} *** NETWORK LATENCY: 12MS *** AWAITING DEPLOYMENT ***
          </div>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column: Operator Status, Deployments & Command Center */}
        <div className="col-span-12 xl:col-span-6 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          <div id="tour-profile" className="term-panel shrink-0">
            <div className="term-header">
              <span className="flex items-center gap-2 text-text font-bold"><Cpu size={14} className="text-text-dim" /> OPERATOR PROFILE</span>
              <span className="text-primary flex items-center gap-1.5 font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block shadow-[0_0_8px_rgba(0,200,5,0.8)]"></span>
                ONLINE
              </span>
            </div>
            <div className="term-content flex flex-col gap-5 p-5">
              
              <div className="flex items-center gap-4 border-b border-border pb-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-neon-purple/20 border border-primary/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,200,5,0.1)]">
                  <span className="text-2xl font-bold text-primary">{user?.username?.[0]?.toUpperCase() || "?"}</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-white leading-tight">{user?.username || "UNKNOWN"}</div>
                  <div className="text-xs text-text-dim flex items-center gap-1 font-mono uppercase tracking-wider mt-1">
                    ID: {user?.id?.substring(0, 8) || "00000000"}
                  </div>
                </div>
              </div>

              {/* Stats Block */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0b0c10] border border-border p-3 rounded-xl">
                  <div className="text-text-dim text-[10px] uppercase tracking-wider flex items-center gap-1.5 mb-1"><Target size={12}/> Level</div>
                  <div className="text-white text-xl font-bold font-mono">{user?.level || 1}</div>
                </div>
                <div className="bg-[#0b0c10] border border-border p-3 rounded-xl">
                  <div className="text-text-dim text-[10px] uppercase tracking-wider flex items-center gap-1.5 mb-1"><Sparkles size={12}/> XP</div>
                  <div className="text-neon-purple text-xl font-bold font-mono">{user?.xp || 0}</div>
                </div>
                <div className="bg-[#0b0c10] border border-border p-3 rounded-xl">
                  <div className="text-text-dim text-[10px] uppercase tracking-wider flex items-center gap-1.5 mb-1"><Coins size={12}/> Coins</div>
                  <div className="text-gold text-xl font-bold font-mono">{user?.coins || 0}</div>
                </div>
                <div className="bg-[#0b0c10] border border-border p-3 rounded-xl">
                  <div className="text-text-dim text-[10px] uppercase tracking-wider flex items-center gap-1.5 mb-1"><BarChart2 size={12}/> Win Rate</div>
                  <div className="text-primary text-xl font-bold font-mono">
                    {user?.totalGamesPlayed ? Math.round((user.totalWins / user.totalGamesPlayed)*100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div id="tour-command" className="term-panel shrink-0 flex flex-col">
            <div className="term-header">
              <span className="flex items-center gap-2 text-text font-bold"><TerminalIcon size={14} className="text-text-dim" /> COMMAND_CENTER</span>
            </div>
            <div className="term-content flex flex-col p-4 gap-4">
              {/* Create Room */}
              <div className="bg-[#0b0c10] border border-border p-4 hover:border-primary/50 transition-all rounded-xl group">
                <div className="text-[10px] text-text-dim font-mono mb-1 uppercase tracking-wider">{">>"} NEW BATTLE</div>
                <div className="text-xs text-text-dim mb-4">Host a private trading simulation.</div>
                <Link to="/rooms/create" className="term-btn-bull w-full block">INITIALIZE ROOM</Link>
              </div>

              {/* Join Room */}
              <div className="bg-[#0b0c10] border border-border p-4 hover:border-neon-blue/50 transition-all rounded-xl group">
                <div className="text-[10px] text-text-dim font-mono mb-1 uppercase tracking-wider">{">>"} JOIN BATTLE</div>
                <div className="text-xs text-text-dim mb-4">Enter a 6-character room code.</div>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    maxLength={6}
                    className="term-input flex-1 uppercase text-center font-bold tracking-widest text-neon-blue border-border bg-bg focus:border-neon-blue focus:ring-neon-blue/30"
                  />
                  <button type="submit" disabled={joining} className="term-btn bg-neon-blue/10 border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black font-bold">
                    JOIN
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div id="tour-public" className="term-panel shrink-0 flex flex-col min-h-[250px] max-h-80">
            <div className="term-header">
              <span className="flex items-center gap-2 text-text font-bold"><Activity size={14} className="text-text-dim" /> PUBLIC OPERATIONS</span>
            </div>
            <div className="term-content overflow-y-auto p-0">
              {publicRooms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-faint p-6 text-center">
                  <div className="text-xs font-mono">NO PUBLIC OPERATIONS FOUND.</div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {publicRooms.map((r) => (
                    <div 
                      key={r.code}
                      onClick={() => handleJoinPublic(r.code)}
                      className="group cursor-pointer bg-bg hover:bg-bg-hover p-4 flex justify-between items-center transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white text-base font-bold font-mono tracking-wider group-hover:text-primary transition-colors">{r.code}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider ${r.status === "ACTIVE" ? "bg-primary/10 text-primary border border-primary/30" : "bg-bg-card text-text-dim border border-border"}`}>
                            {r.status === "ACTIVE" ? "LIVE" : "LOBBY"}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider">
                          {r.market} • {r.players?.length || 0}/{r.maxPlayers} OPRS
                        </div>
                      </div>
                      <div className="text-[10px] text-neon-blue uppercase font-bold tracking-wider border border-neon-blue/30 px-2 py-1 bg-neon-blue/10">
                        JOIN
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Column: Live Feed & News */}
        <div id="tour-news" className="col-span-12 xl:col-span-6 flex flex-col min-h-0 term-panel">
          <DashboardNewsSection />
        </div>

      </div>
    </div>
  );
}
