import { useState } from "react";
import {
  ARTICLE_PROVIDERS,
  BROADCAST_CHANNELS,
  DEFAULT_INTEL_SETTINGS,
  saveIntelSettings,
} from "../config/broadcastChannels";

const AGE_OPTIONS = [
  { label: "1h", value: 1 },
  { label: "6h", value: 6 },
  { label: "12h", value: 12 },
  { label: "24h", value: 24 },
];

const REFRESH_OPTIONS = [
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
];

export default function IntelligenceSettings({ settings, onClose, onChange }) {
  const [draft, setDraft] = useState(settings);

  const toggleSource = (key) =>
    setDraft((d) => ({ ...d, sources: { ...d.sources, [key]: !d.sources[key] } }));

  const toggleChannel = (key) =>
    setDraft((d) => ({ ...d, channels: { ...d.channels, [key]: !d.channels[key] } }));

  const save = () => {
    saveIntelSettings(draft);
    onChange(draft);
    onClose();
  };

  const reset = () => setDraft({ ...DEFAULT_INTEL_SETTINGS });

  const channelsByMarket = BROADCAST_CHANNELS.reduce((acc, c) => {
    (acc[c.market] = acc[c.market] || []).push(c);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f11] border border-[#27272a] rounded-sm w-full max-w-2xl max-h-[85vh] overflow-y-auto font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3 sticky top-0 bg-[#0f0f11]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-lime-500 rounded-sm" />
            <h2 className="text-xs text-white font-bold uppercase tracking-widest">
              Intelligence Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-sm px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Article sources */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 border-b border-[#27272a] pb-1">
              Wire Sources
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {ARTICLE_PROVIDERS.map((p) => {
                const on = draft.sources[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => toggleSource(p.key)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-sm border text-[10px] uppercase tracking-wider transition-colors ${
                      on
                        ? "bg-lime-500/10 border-lime-500/40 text-lime-300"
                        : "bg-[#18181b] border-[#27272a] text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className={`text-[8px] ${on ? "text-lime-400" : "text-zinc-600"}`}>
                      {on ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Broadcast channels */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 border-b border-[#27272a] pb-1">
              Broadcast Channels
            </h3>
            {Object.entries(channelsByMarket).map(([market, channels]) => (
              <div key={market} className="mb-3 last:mb-0">
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">
                  {market}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {channels.map((c) => {
                    const on = draft.channels[c.key];
                    return (
                      <button
                        key={c.key}
                        onClick={() => toggleChannel(c.key)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-sm border text-[10px] uppercase tracking-wider transition-colors ${
                          on
                            ? "border-lime-500/40 text-white"
                            : "bg-[#18181b] border-[#27272a] text-zinc-500 hover:text-zinc-300"
                        }`}
                        style={on ? { background: `${c.accent}15` } : {}}
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-sm"
                            style={{ background: on ? c.accent : "#3f3f46" }}
                          />
                          {c.name}
                        </span>
                        <span className={`text-[8px] ${on ? "text-lime-400" : "text-zinc-600"}`}>
                          {on ? "ON" : "OFF"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* Behavior */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 border-b border-[#27272a] pb-1">
              Behavior
            </h3>

            <div className="space-y-3">
              <div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
                  Max Article Age
                </div>
                <div className="flex gap-1">
                  {AGE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setDraft((d) => ({ ...d, maxAgeHours: o.value }))}
                      className={`flex-1 px-2 py-1.5 rounded-sm border text-[10px] uppercase tracking-wider ${
                        draft.maxAgeHours === o.value
                          ? "bg-lime-500/10 border-lime-500/40 text-lime-300"
                          : "bg-[#18181b] border-[#27272a] text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
                  Refresh Interval
                </div>
                <div className="flex gap-1">
                  {REFRESH_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setDraft((d) => ({ ...d, refreshIntervalSec: o.value }))}
                      className={`flex-1 px-2 py-1.5 rounded-sm border text-[10px] uppercase tracking-wider ${
                        draft.refreshIntervalSec === o.value
                          ? "bg-lime-500/10 border-lime-500/40 text-lime-300"
                          : "bg-[#18181b] border-[#27272a] text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
                  Default Tab
                </div>
                <div className="flex gap-1">
                  {["WIRE", "BROADCAST", "TAPE"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setDraft((d) => ({ ...d, defaultTab: t }))}
                      className={`flex-1 px-2 py-1.5 rounded-sm border text-[10px] uppercase tracking-wider ${
                        draft.defaultTab === t
                          ? "bg-lime-500/10 border-lime-500/40 text-lime-300"
                          : "bg-[#18181b] border-[#27272a] text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-[#0f0f11] border-t border-[#27272a] px-4 py-3 flex items-center justify-between">
          <button
            onClick={reset}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[10px] text-zinc-400 hover:text-white uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-4 py-1.5 bg-lime-500 hover:bg-lime-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
