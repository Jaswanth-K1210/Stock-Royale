import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";

const MARKET_FLAGS = { INDIA: "IN", USA: "US", BOTH: "GL" };

export default function RoomBrowser() {
  const [publicRooms, setPublicRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL"); // "MY", "PUBLIC", "ALL"
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [pubRes, myRes] = await Promise.all([
        api.get("/api/rooms"),
        api.get("/api/rooms/mine")
      ]);
      setPublicRooms(pubRes.data);
      setMyRooms(myRes.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    const timeId = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(id);
      clearInterval(timeId);
    };
  }, []);

  const join = async (code, dest) => {
    try {
      await api.post(`/api/rooms/${code}/join`);
      navigate(`/rooms/${code}/${dest}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to connect");
    }
  };

  // Combine rooms based on active tab, removing duplicates by code
  const displayedRooms = useMemo(() => {
    let raw = [];
    if (activeTab === "MY") raw = myRooms;
    else if (activeTab === "PUBLIC") raw = publicRooms;
    else {
      // ALL
      const map = new Map();
      myRooms.forEach(r => map.set(r.code, r));
      publicRooms.forEach(r => {
        if (!map.has(r.code)) map.set(r.code, r);
      });
      raw = Array.from(map.values());
    }
    // Sort: ACTIVE first, then LOBBY
    return raw.sort((a, b) => {
      if (a.status === b.status) return new Date(b.createdAt) - new Date(a.createdAt);
      return a.status === "ACTIVE" ? -1 : 1;
    });
  }, [publicRooms, myRooms, activeTab]);

  return (
    <div className="w-full px-4 sm:px-8 pb-10">
      <div className="border-b border-border pb-4 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl text-gold uppercase font-bold tracking-wider">Operations Dashboard</h1>
          <p className="text-xs text-text-dim mt-1">Discover, monitor, and connect to live trading simulations.</p>
        </div>
        
        <div className="flex bg-bg-card border border-border p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("MY")}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors ${activeTab === "MY" ? "bg-primary text-black" : "text-text-dim hover:text-text"}`}
          >
            My Ops
          </button>
          <button
            onClick={() => setActiveTab("PUBLIC")}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors ${activeTab === "PUBLIC" ? "bg-primary text-black" : "text-text-dim hover:text-text"}`}
          >
            Public Ops
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors ${activeTab === "ALL" ? "bg-primary text-black" : "text-text-dim hover:text-text"}`}
          >
            All Ops
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-text-dim text-xs animate-pulse">SCANNING NETWORK...</div>
      ) : displayedRooms.length === 0 ? (
        <div className="glass-panel p-8 text-center border-dashed rounded-xl">
          <p className="text-text-faint text-xs mb-4 uppercase tracking-widest font-bold">NO DEPLOYMENTS DETECTED.</p>
          <Link to="/rooms/create" className="text-[10px] font-bold tracking-wider uppercase text-black bg-gold hover:bg-gold/90 px-6 py-2 rounded-md inline-block transition-colors">
            Initialize New Operation
          </Link>
        </div>
      ) : (
        <div className="bg-[#0b0c10] border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border text-[9px] uppercase tracking-wider text-text-faint bg-bg-card/50">
                  <th className="py-3 px-5 font-bold">Operation Code</th>
                  <th className="py-3 px-4 font-bold">Market</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Visibility</th>
                  <th className="py-3 px-4 font-bold">Capacity</th>
                  <th className="py-3 px-4 font-bold">Time Remaining</th>
                  <th className="py-3 px-5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {displayedRooms.map((r) => {
                  const isMine = myRooms.some(m => m.code === r.code);
                  const dest = r.status === "ACTIVE" ? "game" : "lobby";
                  
                  // Calculate time remaining
                  let timeText = "WAITING";
                  let timeColor = "text-text-dim";
                  let canJoinLate = true;
                  
                  if (r.status === "ACTIVE" && r.startsAt) {
                    const elapsed = now - new Date(r.startsAt).getTime();
                    const remaining = r.durationMs - elapsed;
                    if (remaining <= 0) {
                      timeText = "FINISHED";
                      timeColor = "text-bear";
                      canJoinLate = false;
                    } else {
                      const mins = Math.floor(remaining / 60000);
                      const secs = Math.floor((remaining % 60000) / 1000);
                      timeText = `${mins}:${secs.toString().padStart(2, '0')}`;
                      
                      // Under 40% time left
                      if (elapsed >= r.durationMs * 0.6) {
                        timeColor = "text-bear";
                        canJoinLate = false;
                      } else {
                        timeColor = "text-gold";
                      }
                    }
                  } else if (r.status === "FINISHED") {
                    timeText = "COMPLETED";
                    timeColor = "text-text-dim";
                    canJoinLate = false;
                  }

                  const isFull = r.players.length >= r.maxPlayers;
                  
                  let actionBtn;
                  if (isMine) {
                    actionBtn = (
                      <button onClick={() => navigate(`/rooms/${r.code}/${dest}`)} className="text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold hover:bg-gold/20 border border-gold/30 px-4 py-1.5 rounded-md transition-colors">
                        Re-Connect
                      </button>
                    );
                  } else if (r.status === "FINISHED" || (r.status === "ACTIVE" && !r.isPublic)) {
                    actionBtn = (
                      <button disabled className="text-[10px] font-bold uppercase tracking-wider bg-transparent text-text-faint border border-border px-4 py-1.5 rounded-md opacity-50 cursor-not-allowed">
                        Locked
                      </button>
                    );
                  } else if (r.status === "ACTIVE" && !canJoinLate) {
                    actionBtn = (
                      <button disabled className="text-[10px] font-bold uppercase tracking-wider bg-transparent text-text-faint border border-border px-4 py-1.5 rounded-md opacity-50 cursor-not-allowed">
                        Too Late
                      </button>
                    );
                  } else if (isFull) {
                    actionBtn = (
                      <button disabled className="text-[10px] font-bold uppercase tracking-wider bg-transparent text-text-faint border border-border px-4 py-1.5 rounded-md opacity-50 cursor-not-allowed">
                        Full
                      </button>
                    );
                  } else {
                    actionBtn = (
                      <button onClick={() => join(r.code, dest)} className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 px-4 py-1.5 rounded-md transition-colors">
                        Connect
                      </button>
                    );
                  }

                  return (
                    <tr key={r.code} className="hover:bg-[#151821] transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono font-bold tracking-widest text-sm group-hover:text-primary transition-colors">{r.code}</span>
                          {isMine && <span className="text-[8px] bg-gold/20 text-gold px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Mine</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-text-dim">{MARKET_FLAGS[r.market]}</td>
                      <td className="py-4 px-4">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider ${r.status === "ACTIVE" ? "bg-primary/10 text-primary border border-primary/30" : "bg-bg text-text-dim border border-border"}`}>
                          {r.status === "ACTIVE" ? "LIVE" : r.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono">
                        {r.isPublic ? <span className="text-bull">PUBLIC</span> : <span className="text-bear">PRIVATE</span>}
                      </td>
                      <td className="py-4 px-4 font-mono">
                        <span className={isFull ? "text-bear font-bold" : "text-white"}>{r.players.length}</span>
                        <span className="text-text-faint">/{r.maxPlayers}</span>
                      </td>
                      <td className={`py-4 px-4 font-mono font-bold ${timeColor}`}>
                        {timeText}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {actionBtn}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
