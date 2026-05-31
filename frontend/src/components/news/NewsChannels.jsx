import { useState, useMemo, useEffect } from "react";
import { Volume2, VolumeX, ChevronLeft, ChevronRight, ExternalLink, Radio } from "lucide-react";
import api from "../../services/api";
import {
  BROADCAST_CHANNELS,
  loadIntelSettings,
  saveIntelSettings,
} from "../../config/broadcastChannels";

export default function NewsChannels({ market = "USA", compact = false }) {
  const [settings, setSettings] = useState(loadIntelSettings);
  const [muted, setMuted] = useState(true);

  const channels = useMemo(
    () =>
      BROADCAST_CHANNELS.filter(
        (c) => !market || market === "BOTH" || c.market === market
      ),
    [market]
  );

  const enabledKeys = channels
    .filter((c) => settings.channels[c.key])
    .map((c) => c.key);

  const [focusedKey, setFocusedKey] = useState(enabledKeys[0] || channels[0]?.key);

  if (focusedKey && !enabledKeys.includes(focusedKey)) {
    const next = enabledKeys[0];
    if (next && next !== focusedKey) setFocusedKey(next);
  }

  const toggleChannel = (key) => {
    const next = {
      ...settings,
      channels: { ...settings.channels, [key]: !settings.channels[key] },
    };
    setSettings(next);
    saveIntelSettings(next);
  };

  const focused = channels.find((c) => c.key === focusedKey) || channels[0];

  // Resolve the channel's current live videoId on the backend. The legacy
  // youtube.com/embed/live_stream?channel= URL no longer reliably resolves
  // to a playable video — it just loads a blank player shell.
  const [liveByChannel, setLiveByChannel] = useState({}); // key -> { videoId, isLive } | "loading" | "none"

  useEffect(() => {
    if (!focused) return;
    const key = focused.key;

    // If the channel config pins a specific live video, embed it directly and
    // skip the resolver entirely — the user has explicitly told us this stream
    // is the one to show for this channel.
    if (focused.liveVideoId) {
      setLiveByChannel((s) => ({
        ...s,
        [key]: { videoId: focused.liveVideoId, isLive: true },
      }));
      return;
    }

    let alive = true;
    const resolve = async () => {
      try {
        const res = await api.get(
          `/api/news/live?channel=${encodeURIComponent(focused.channelId)}`
        );
        if (!alive) return;
        setLiveByChannel((s) => ({
          ...s,
          [key]: res.data?.videoId
            ? { videoId: res.data.videoId, isLive: !!res.data.isLive }
            : "none",
        }));
      } catch {
        if (alive) setLiveByChannel((s) => ({ ...s, [key]: "none" }));
      }
    };

    const existing = liveByChannel[key];
    if (!existing || existing === "loading") {
      setLiveByChannel((s) => ({ ...s, [key]: "loading" }));
      resolve();
    }
    // If we previously got "none", re-poll every 60s so a channel that just
    // went live shows up without requiring a page refresh.
    const id = setInterval(() => {
      const cur = liveByChannel[key];
      if (cur === "none") resolve();
    }, 60_000);

    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.key, focused?.liveVideoId]);

  const live = focused ? liveByChannel[focused.key] : null;
  // YouTube blocks autoplay on embeds without an `origin` matching the parent
  // page, which can show as a blank player even when the videoId is valid.
  const embedOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const embedUrl = (videoId) =>
    `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${
      muted ? 1 : 0
    }&modestbranding=1&playsinline=1&rel=0${
      embedOrigin ? `&origin=${encodeURIComponent(embedOrigin)}` : ""
    }`;

  const youtubeChannelUrl = (channelId) =>
    `https://www.youtube.com/channel/${channelId}/live`;

  const focusedIndex = channels.findIndex((c) => c.key === focused?.key);
  const cycle = (delta) => {
    if (!channels.length) return;
    const next = (focusedIndex + delta + channels.length) % channels.length;
    setFocusedKey(channels[next].key);
  };

  if (!focused) {
    return (
      <div className="term-panel p-6 text-center text-text-dim text-sm">
        No broadcast channels for this market.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video">
        {live && live !== "loading" && live !== "none" ? (
          <iframe
            key={`${focused.key}-${live.videoId}-${muted ? "m" : "u"}`}
            src={embedUrl(live.videoId)}
            title={focused.name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center px-6">
            {live === "loading" || !live ? (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Radio size={22} className="animate-pulse text-sky-400" />
                <span className="text-xs">Resolving live stream…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Radio size={22} className="text-zinc-500" />
                <div className="text-sm text-zinc-200 font-medium">
                  {focused.name} isn't live right now
                </div>
                <a
                  href={youtubeChannelUrl(focused.channelId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  Open channel on YouTube <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {live && live !== "loading" && live !== "none" && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </span>
          )}
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: focused.accent }}
          />
          <span className="text-xs text-white font-medium drop-shadow">
            {focused.name}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <a
            href={youtubeChannelUrl(focused.channelId)}
            target="_blank"
            rel="noreferrer"
            title="Open on YouTube"
            className="w-8 h-8 grid place-items-center rounded-md bg-black/60 backdrop-blur text-white hover:bg-black/80"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute" : "Mute"}
            className="w-8 h-8 grid place-items-center rounded-md bg-black/60 backdrop-blur text-white hover:bg-black/80"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <button
            onClick={() => cycle(-1)}
            className="w-8 h-8 grid place-items-center rounded-md bg-black/60 backdrop-blur text-white hover:bg-black/80"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => cycle(1)}
            className="w-8 h-8 grid place-items-center rounded-md bg-black/60 backdrop-blur text-white hover:bg-black/80"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="text-[11px] text-zinc-500 text-center">
        Not showing? The channel may not be broadcasting right now.{" "}
        <a
          href={youtubeChannelUrl(focused.channelId)}
          target="_blank"
          rel="noreferrer"
          className="text-sky-400 hover:underline"
        >
          Open on YouTube
        </a>
        .
      </div>

      {!compact && (
        <ul className="flex flex-col gap-1.5">
          {channels.map((c) => {
            const on = !!settings.channels[c.key];
            const isFocused = c.key === focused.key;
            return (
              <li key={c.key} className="w-full">
                <button
                  onClick={() => {
                    if (!on) toggleChannel(c.key);
                    setFocusedKey(c.key);
                  }}
                  onDoubleClick={() => toggleChannel(c.key)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-none transition-all ${
                    isFocused
                      ? "bg-primary/10 border border-primary/40 text-primary"
                      : on
                      ? "bg-bg-card border border-border hover:bg-bg-hover text-text"
                      : "bg-transparent border border-border/40 opacity-60 hover:opacity-100 text-text-dim"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.accent }}
                    />
                    <span className="text-xs truncate font-mono tracking-tight">{c.name}</span>
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-wider font-bold ${
                      on ? "text-primary" : "text-text-faint"
                    }`}
                  >
                    {on ? "ON" : "OFF"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
