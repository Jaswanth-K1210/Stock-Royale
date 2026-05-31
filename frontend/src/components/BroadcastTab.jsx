import { useState, useMemo, useRef } from "react";
import { BROADCAST_CHANNELS } from "../config/broadcastChannels";

export default function BroadcastTab({ settings }) {
  const enabled = useMemo(
    () => BROADCAST_CHANNELS.filter((c) => settings.channels[c.key]),
    [settings.channels]
  );

  const [focusedKey, setFocusedKey] = useState(enabled[0]?.key);
  const [muted, setMuted] = useState(true);
  const iframeRefs = useRef({});

  // If the focused channel was toggled off, pick a new one
  if (focusedKey && !enabled.find((c) => c.key === focusedKey)) {
    const next = enabled[0]?.key;
    if (next !== focusedKey) setFocusedKey(next);
  }

  if (enabled.length === 0) {
    return (
      <div className="text-[10px] text-zinc-600 text-center py-6 px-4">
        No broadcast channels enabled.
        <div className="text-[9px] text-zinc-700 mt-1">Open settings to turn channels on.</div>
      </div>
    );
  }

  const focused = enabled.find((c) => c.key === focusedKey) || enabled[0];
  const others = enabled.filter((c) => c.key !== focused.key);

  const embedUrl = (channelId, isFocused) =>
    `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&mute=${
      isFocused && !muted ? 0 : 1
    }&modestbranding=1&playsinline=1`;

  const requestPiP = async () => {
    const iframe = iframeRefs.current[focused.key];
    // Picture-in-picture on iframes isn't supported by all browsers.
    // We attempt; silently degrade if blocked.
    try {
      const video = iframe?.contentDocument?.querySelector("video");
      if (video && document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch {
      /* cross-origin iframe — expected to block; no action */
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Focused player */}
      <div className="relative w-full aspect-video bg-black border border-[#27272a] rounded-sm overflow-hidden">
        <iframe
          ref={(el) => (iframeRefs.current[focused.key] = el)}
          key={focused.key}
          src={embedUrl(focused.channelId, true)}
          title={focused.name}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 pointer-events-none">
          <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm tracking-widest animate-pulse">
            LIVE
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
            style={{ background: "rgba(0,0,0,0.6)", color: focused.accent }}
          >
            {focused.name}
          </span>
        </div>
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => setMuted((m) => !m)}
            className="bg-black/60 hover:bg-black/90 text-zinc-300 text-[9px] px-1.5 py-0.5 border border-zinc-700 rounded-sm uppercase tracking-widest"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={requestPiP}
            className="bg-black/60 hover:bg-black/90 text-zinc-300 text-[9px] px-1.5 py-0.5 border border-zinc-700 rounded-sm uppercase tracking-widest"
            title="Picture in picture"
          >
            PiP
          </button>
        </div>
      </div>

      {/* Other channel tiles */}
      {others.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {others.map((c) => (
            <button
              key={c.key}
              onClick={() => setFocusedKey(c.key)}
              className="relative aspect-video bg-black border border-[#27272a] hover:border-zinc-500 rounded-sm overflow-hidden group transition-colors"
            >
              <iframe
                src={embedUrl(c.channelId, false)}
                title={c.name}
                allow="autoplay; encrypted-media"
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors pointer-events-none" />
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between pointer-events-none">
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-black/70"
                  style={{ color: c.accent }}
                >
                  {c.name}
                </span>
                <span className="bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded-sm tracking-widest">
                  LIVE
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
