import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings } from "lucide-react";

function fmt(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function AnimeVideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onProg = () => {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("progress", onProg);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("progress", onProg);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };
  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
  };
  const seek = (t: number) => { const v = videoRef.current; if (v) v.currentTime = t; };
  const skip = (delta: number) => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta)); };
  const setVol = (val: number) => {
    const v = videoRef.current; if (!v) return;
    v.volume = val; setVolume(val); if (val > 0 && v.muted) { v.muted = false; setMuted(false); }
  };
  const setPlaybackRate = (r: number) => {
    const v = videoRef.current; if (!v) return;
    v.playbackRate = r; setSpeed(r); setShowSpeed(false);
  };
  const toggleFs = async () => {
    const el = wrapRef.current; if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen();
    else await document.exitFullscreen();
  };

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => { if (playing) setControlsVisible(false); }, 2500);
  };

  return (
    <div
      ref={wrapRef}
      dir="ltr"
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10"
      onMouseMove={showControls}
      onMouseLeave={() => { if (playing) setControlsVisible(false); }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full bg-black object-contain"
        onClick={togglePlay}
        playsInline
      />

      {/* Center play overlay */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm transition hover:bg-black/40"
          aria-label="تشغيل"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-2xl transition-transform hover:scale-110">
            <Play className="h-9 w-9 fill-current" />
          </span>
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-8 transition-opacity duration-300 ${controlsVisible || !playing ? "opacity-100" : "opacity-0"}`}
      >
        {/* Seek bar */}
        <div className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * duration);
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}>
            <div className="absolute -right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-gold opacity-0 shadow-lg transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay} className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="تشغيل/إيقاف">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={() => skip(-10)} className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="ارجاع 10 ثواني">
            <SkipBack className="h-5 w-5" />
          </button>
          <button onClick={() => skip(10)} className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="تقديم 10 ثواني">
            <SkipForward className="h-5 w-5" />
          </button>

          <div className="group/vol flex items-center gap-2">
            <button onClick={toggleMute} className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="كتم">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              className="hidden h-1 w-20 cursor-pointer accent-gold group-hover/vol:block"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/90">{fmt(current)} / {fmt(duration)}</span>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative">
              <button onClick={() => setShowSpeed((s) => !s)} className="flex items-center gap-1 rounded-full p-1.5 text-xs transition hover:bg-white/15" aria-label="سرعة">
                <Settings className="h-4 w-4" /> {speed}x
              </button>
              {showSpeed && (
                <div className="absolute bottom-full right-0 mb-2 flex flex-col overflow-hidden rounded-lg bg-black/95 text-xs ring-1 ring-white/20">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <button key={r} onClick={() => setPlaybackRate(r)} className={`px-4 py-1.5 text-right transition hover:bg-white/15 ${speed === r ? "text-gold" : "text-white"}`}>
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={toggleFs} className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="ملء الشاشة">
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
