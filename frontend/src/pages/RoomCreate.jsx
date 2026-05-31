import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { Terminal as TerminalIcon } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const MARKETS = [
  { value: "INDIA", label: "NSE/BSE (IN)" },
  { value: "USA", label: "NYSE/NSDQ (US)" },
  { value: "BOTH", label: "GLOBAL (ALL)" },
];

export default function RoomCreate() {
  const [market, setMarket] = useState("USA");
  const [startingCash, setStartingCash] = useState(100000);
  const [durationMins, setDurationMins] = useState(15);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  // Interactive Tour
  useEffect(() => {
    if (!localStorage.getItem("hasSeenRoomCreateTour")) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { element: '#tour-room-visibility', popover: { title: 'Node Visibility', description: 'Public rooms appear on the global dashboard. Private rooms are hidden and require the 6-digit code to join.', side: "bottom", align: 'start' }},
          { element: '#tour-room-market', popover: { title: 'Target Market', description: 'Lock the simulation to US stocks, Indian stocks, or allow global trading.', side: "bottom", align: 'start' }},
          { element: '#tour-room-cash', popover: { title: 'Starting Capital', description: 'Set the initial cash balance every operator receives.', side: "bottom", align: 'start' }},
          { element: '#tour-room-duration', popover: { title: 'Time Limit', description: 'How long the simulation runs before automatically closing out and declaring a winner.', side: "bottom", align: 'start' }},
          { element: '#tour-room-start', popover: { title: 'Initialize', description: 'Create the room and enter the waiting lobby.', side: "top", align: 'center' }},
        ],
        onDestroyStarted: () => {
          localStorage.setItem("hasSeenRoomCreateTour", "true");
          driverObj.destroy();
        }
      });
      setTimeout(() => driverObj.drive(), 500);
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/api/rooms", {
        market,
        startingCash,
        durationMs: durationMins * 60_000,
        maxPlayers,
        isPublic,
      });
      toast.success(`Node ${res.data.code} initialized.`);
      navigate(`/rooms/${res.data.code}/lobby`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Init failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-bg p-4 flex items-center justify-center font-sans">
      <div className="w-full max-w-lg term-panel p-0 border border-border">
        <div className="term-header bg-bg-card border-b border-border flex items-center gap-2">
          <TerminalIcon size={14} className="text-primary" />
          <span className="font-bold text-text uppercase tracking-wider">Initialize Node</span>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-6 bg-black">
          {/* Public / Private Toggle */}
          <div id="tour-room-visibility" className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <div className="text-xs text-text-dim font-bold tracking-wider mb-1 uppercase">Visibility</div>
              <div className="text-[10px] text-text-faint font-mono">Public rooms appear on the dashboard feed.</div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-5 w-9 items-center rounded-sm transition-colors focus:outline-none ${
                isPublic ? 'bg-primary' : 'bg-bg-hover border border-border'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-sm bg-white transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Market Selection */}
          <div id="tour-room-market">
            <label className="block text-[10px] text-text-dim mb-2 font-bold tracking-wider uppercase">Target Market</label>
            <div className="grid grid-cols-3 gap-2">
              {MARKETS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMarket(m.value)}
                  className={`p-2 text-[10px] font-mono border transition-all rounded-none uppercase tracking-wider ${
                    market === m.value
                      ? "border-primary text-primary bg-primary/10 shadow-[0_0_5px_rgba(0,200,5,0.2)]"
                      : "border-border text-text-dim hover:bg-bg-hover hover:text-text"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Starting Cash */}
            <div id="tour-room-cash">
              <label className="block text-[10px] text-text-dim mb-2 font-bold tracking-wider uppercase">Alloc Cash (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono text-xs">$</span>
                <input
                  type="number"
                  value={startingCash}
                  onChange={(e) => setStartingCash(Number(e.target.value))}
                  min={1000}
                  className="term-input pl-6 text-xs font-mono !bg-[#0b0c10]"
                />
              </div>
            </div>

            {/* Duration */}
            <div id="tour-room-duration">
              <label className="block text-[10px] text-text-dim mb-2 font-bold tracking-wider uppercase">Time Limit (Mins)</label>
              <input
                type="number"
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                min={1}
                max={240}
                className="term-input text-xs font-mono !bg-[#0b0c10]"
              />
            </div>
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-[10px] text-text-dim mb-2 font-bold tracking-wider uppercase">Max Capacity</label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              min={2}
              max={50}
              className="term-input text-xs font-mono !bg-[#0b0c10]"
            />
          </div>

          <div id="tour-room-start" className="pt-4 border-t border-border mt-6">
            <button
              type="submit"
              disabled={creating}
              className="w-full term-btn-bull py-3 text-xs tracking-widest disabled:opacity-50"
            >
              {creating ? "INITIALIZING..." : "EXECUTE START"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
