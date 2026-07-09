import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { wcPayEntry, wcFinishMatch } from "@/lib/wc-pvp.functions";
import { toast } from "sonner";
import { ArrowRight, Users, Play, Zap, Clock } from "lucide-react";

export const Route = createFileRoute("/world-cup/play")({
  head: () => ({ meta: [{ title: "كأس العالم — العب مباشر" }] }),
  component: PlayPage,
});

const CHARACTERS = [
  { id: "flame", name: "لهب", emoji: "🔥", color: "#f97316", bg: "from-orange-500 to-red-600" },
  { id: "storm", name: "عاصفة", emoji: "⚡", color: "#eab308", bg: "from-yellow-400 to-amber-600" },
  { id: "shadow", name: "ظل", emoji: "🌙", color: "#8b5cf6", bg: "from-purple-500 to-indigo-700" },
  { id: "ice", name: "جليد", emoji: "❄️", color: "#38bdf8", bg: "from-sky-400 to-blue-600" },
];

type Phase = "select" | "lobby" | "playing" | "finished";
type PresenceP = { user_id: string; name: string; char: string; joined_at: number };

function PlayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("select");
  const [charId, setCharId] = useState<string>("flame");
  const [players, setPlayers] = useState<PresenceP[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [finalResult, setFinalResult] = useState<{ team: string; a: number; b: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) {
      toast.error("سجّل دخولك أولاً");
      navigate({ to: "/auth" });
    }
  }, [user, navigate]);

  const enterLobby = useCallback(async () => {
    if (!user) return;
    const rid = `wc-lobby-v1`;
    setRoomId(rid);
    const ch = supabase.channel(rid, { config: { presence: { key: user.id } } });
    channelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, PresenceP[]>;
      const list: PresenceP[] = Object.values(state).flat().sort((a, b) => a.joined_at - b.joined_at).slice(0, 8);
      setPlayers(list);
    });
    ch.on("broadcast", { event: "match_start" }, (payload) => {
      const p = payload.payload as { room_id: string; players: PresenceP[] };
      setRoomId(p.room_id);
      setPlayers(p.players);
      setPhase("playing");
    });
    await ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          user_id: user.id,
          name: user.email?.split("@")[0] ?? "لاعب",
          char: charId,
          joined_at: Date.now(),
        } satisfies PresenceP);
      }
    });
    setPhase("lobby");
  }, [user, charId]);

  useEffect(() => () => { channelRef.current?.unsubscribe(); }, []);

  const payEntry = useServerFn(wcPayEntry);
  const isHost = players.length > 0 && players[0].user_id === user?.id;
  const canStart = isHost && players.length === 8;

  const startMatch = async () => {
    if (!canStart || !channelRef.current) return;
    const matchRoom = `wc-match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await payEntry({ data: { room_id: matchRoom } });
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    await channelRef.current.send({
      type: "broadcast",
      event: "match_start",
      payload: { room_id: matchRoom, players },
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-500/30 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/world-cup" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> رجوع
          </Link>
          <span className="font-black text-emerald-400">⚽ ماتش مباشر</span>
          <span className="text-xs text-muted-foreground">{phase === "playing" ? "جاري اللعب" : phase === "lobby" ? `${players.length}/8` : ""}</span>
        </div>
      </header>

      {phase === "select" && (
        <section className="container mx-auto max-w-3xl px-4 py-8">
          <h1 className="mb-2 text-center text-2xl font-black text-white">اختر شخصيتك</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">ادفع 50 كريدت. الفائز يأخذ 80 كريدت.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCharId(c.id)}
                className={`group relative overflow-hidden rounded-2xl border-4 p-4 text-center transition-all ${
                  charId === c.id ? "border-emerald-400 scale-105 shadow-[0_0_30px_-5px_rgba(52,211,153,0.6)]" : "border-white/10"
                } bg-gradient-to-b ${c.bg}`}
              >
                <div className="text-6xl">{c.emoji}</div>
                <div className="mt-2 text-lg font-black text-white drop-shadow">{c.name}</div>
              </button>
            ))}
          </div>
          <button
            onClick={enterLobby}
            className="mt-8 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-lg font-black text-white shadow-lg hover:scale-105 transition-transform"
          >
            <Play className="inline h-5 w-5 ml-1" /> ابحث عن ماتش
          </button>
        </section>
      )}

      {phase === "lobby" && (
        <Lobby players={players} me={user.id} isHost={isHost} canStart={canStart} onStart={startMatch} onLeave={() => { channelRef.current?.unsubscribe(); setPhase("select"); }} />
      )}

      {phase === "playing" && (
        <FootballMatch
          roomId={roomId}
          me={user.id}
          myChar={charId}
          players={players}
          onFinish={async (winnerTeam, scoreA, scoreB) => {
            const teamA = players.slice(0, 4).map((p) => p.user_id);
            const teamB = players.slice(4, 8).map((p) => p.user_id);
            const winners = winnerTeam === "A" ? teamA : winnerTeam === "B" ? teamB : [];
            // Only host reports result
            if (players[0].user_id === user.id) {
              try {
                await wcFinishMatch({ data: {
                  room_id: roomId, winner_team: winnerTeam, score_a: scoreA, score_b: scoreB,
                  winners, players,
                } });
              } catch (e) { console.error(e); }
            }
            setFinalResult({ team: winnerTeam, a: scoreA, b: scoreB });
            setPhase("finished");
          }}
        />
      )}

      {phase === "finished" && finalResult && (
        <section className="container mx-auto max-w-md px-4 py-16 text-center">
          <div className="text-8xl">{finalResult.team === "draw" ? "🤝" : "🏆"}</div>
          <h2 className="mt-4 text-3xl font-black text-white">
            {finalResult.team === "draw" ? "تعادل!" : `فاز الفريق ${finalResult.team}`}
          </h2>
          <p className="mt-2 text-xl text-emerald-400">النتيجة: {finalResult.a} - {finalResult.b}</p>
          <Link to="/world-cup" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-black text-white">
            رجوع
          </Link>
        </section>
      )}
    </div>
  );
}

function Lobby({ players, me, isHost, canStart, onStart, onLeave }: {
  players: PresenceP[]; me: string; isHost: boolean; canStart: boolean; onStart: () => void; onLeave: () => void;
}) {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
        <div className="animate-pulse text-5xl">⏳</div>
        <h2 className="mt-3 text-xl font-black text-emerald-400">
          {players.length < 8 ? `جاري انتظار 8 لاعبين حقيقيين (${players.length}/8)` : "اكتمل العدد! جاهزين للبدء"}
        </h2>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all" style={{ width: `${(players.length / 8) * 100}%` }} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => {
          const p = players[i];
          const c = p ? CHARACTERS.find((x) => x.id === p.char) : null;
          return (
            <div key={i} className={`aspect-square rounded-xl border-2 p-2 text-center flex flex-col items-center justify-center ${p ? "border-emerald-400/50" : "border-dashed border-white/10"}`}>
              {p && c ? (
                <>
                  <div className="text-4xl">{c.emoji}</div>
                  <div className="mt-1 truncate text-xs font-bold text-white">{p.name}{p.user_id === me && " (أنت)"}</div>
                  <div className={`mt-1 text-[10px] font-black ${i < 4 ? "text-red-400" : "text-blue-400"}`}>فريق {i < 4 ? "A" : "B"}</div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">في الانتظار...</span>
              )}
            </div>
          );
        })}
      </div>

      {isHost && (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-lg font-black text-white shadow-lg disabled:opacity-40"
        >
          {canStart ? "🚀 ابدأ الماتش (50 كريدت)" : `في انتظار ${8 - players.length} لاعبين`}
        </button>
      )}
      {!isHost && players.length === 8 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">في انتظار قائد الغرفة ليبدأ الماتش...</p>
      )}
      <button onClick={onLeave} className="mt-3 w-full rounded-xl border border-red-500/40 py-2 text-sm text-red-400">
        خروج
      </button>
    </section>
  );
}

// ==================== FOOTBALL MATCH ====================
type PlayerState = { x: number; y: number; vx: number; vy: number; char: string; team: "A" | "B"; name: string; stunUntil: number };
type BallState = { x: number; y: number; vx: number; vy: number };

const FIELD_W = 800;
const FIELD_H = 500;
const MATCH_SECONDS = 180;
const SKILL_COOLDOWN = 8000;
const SKILL_RADIUS = 80;
const STUN_DURATION = 2500;

function FootballMatch({ roomId, me, myChar, players, onFinish }: {
  roomId: string; me: string; myChar: string; players: PresenceP[];
  onFinish: (winnerTeam: "A" | "B" | "draw", a: number, b: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isHost = players[0].user_id === me;
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stateRef = useRef<{
    players: Map<string, PlayerState>;
    ball: BallState;
    scoreA: number;
    scoreB: number;
    timeLeft: number;
    goalFlash: number;
  }>({
    players: new Map(),
    ball: { x: FIELD_W / 2, y: FIELD_H / 2, vx: 0, vy: 0 },
    scoreA: 0, scoreB: 0, timeLeft: MATCH_SECONDS, goalFlash: 0,
  });
  const inputRef = useRef({ dx: 0, dy: 0, kick: false, skillAt: 0 });
  const [, force] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATCH_SECONDS);
  const [scores, setScores] = useState({ a: 0, b: 0 });
  const [goalMsg, setGoalMsg] = useState<string>("");
  const [skillReady, setSkillReady] = useState(true);
  const skillLastRef = useRef(0);

  // Init player positions
  useEffect(() => {
    players.forEach((p, i) => {
      const team: "A" | "B" = i < 4 ? "A" : "B";
      const idx = i % 4;
      const x = team === "A" ? 100 + idx * 40 : FIELD_W - 100 - idx * 40;
      const y = 80 + idx * 100;
      stateRef.current.players.set(p.user_id, {
        x, y, vx: 0, vy: 0, char: p.char, team, name: p.name, stunUntil: 0,
      });
    });
    force((n) => n + 1);
  }, [players]);

  // Realtime channel for game
  useEffect(() => {
    const ch = supabase.channel(roomId, { config: { broadcast: { self: false } } });
    chRef.current = ch;

    ch.on("broadcast", { event: "pos" }, (payload) => {
      const { uid, x, y, vx, vy } = payload.payload as { uid: string; x: number; y: number; vx: number; vy: number };
      const p = stateRef.current.players.get(uid);
      if (p) { p.x = x; p.y = y; p.vx = vx; p.vy = vy; }
    });
    ch.on("broadcast", { event: "skill" }, (payload) => {
      const { uid } = payload.payload as { uid: string };
      const caster = stateRef.current.players.get(uid);
      if (!caster) return;
      stateRef.current.players.forEach((p, pid) => {
        if (pid === uid || p.team === caster.team) return;
        const dx = p.x - caster.x, dy = p.y - caster.y;
        if (Math.hypot(dx, dy) < SKILL_RADIUS) p.stunUntil = Date.now() + STUN_DURATION;
      });
    });
    ch.on("broadcast", { event: "ball" }, (payload) => {
      if (isHost) return;
      stateRef.current.ball = payload.payload as BallState;
    });
    ch.on("broadcast", { event: "goal" }, (payload) => {
      const { team, a, b } = payload.payload as { team: "A" | "B"; a: number; b: number };
      stateRef.current.scoreA = a; stateRef.current.scoreB = b; stateRef.current.goalFlash = Date.now() + 2000;
      setScores({ a, b });
      setGoalMsg(`GOOOOL! فريق ${team}`);
      setTimeout(() => setGoalMsg(""), 2000);
      stateRef.current.ball = { x: FIELD_W / 2, y: FIELD_H / 2, vx: 0, vy: 0 };
    });
    ch.subscribe();
    return () => { ch.unsubscribe(); };
  }, [roomId, isHost]);

  // Input handlers
  useEffect(() => {
    const keys: Record<string, boolean> = {};
    const kd = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === " ") castSkill();
    };
    const ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    const tick = setInterval(() => {
      let dx = 0, dy = 0;
      if (keys["arrowup"] || keys["w"]) dy = -1;
      if (keys["arrowdown"] || keys["s"]) dy = 1;
      if (keys["arrowleft"] || keys["a"]) dx = -1;
      if (keys["arrowright"] || keys["d"]) dx = 1;
      inputRef.current.dx = dx; inputRef.current.dy = dy;
    }, 30);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); clearInterval(tick); };
  }, []);

  const castSkill = () => {
    if (Date.now() - skillLastRef.current < SKILL_COOLDOWN) return;
    skillLastRef.current = Date.now();
    setSkillReady(false);
    setTimeout(() => setSkillReady(true), SKILL_COOLDOWN);
    chRef.current?.send({ type: "broadcast", event: "skill", payload: { uid: me } });
    // Apply locally
    const caster = stateRef.current.players.get(me);
    if (caster) {
      stateRef.current.players.forEach((p, pid) => {
        if (pid === me || p.team === caster.team) return;
        const dx = p.x - caster.x, dy = p.y - caster.y;
        if (Math.hypot(dx, dy) < SKILL_RADIUS) p.stunUntil = Date.now() + STUN_DURATION;
      });
    }
  };

  // Timer
  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      const { scoreA, scoreB } = stateRef.current;
      const winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "draw";
      onFinish(winner, scoreA, scoreB);
    }
  }, [timeLeft, onFinish]);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let lastBroadcast = 0;
    let lastBallBroadcast = 0;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      const now = Date.now();
      const me_p = stateRef.current.players.get(me);
      if (me_p && me_p.stunUntil < now) {
        const speed = 3;
        me_p.vx = inputRef.current.dx * speed;
        me_p.vy = inputRef.current.dy * speed;
        me_p.x = Math.max(20, Math.min(FIELD_W - 20, me_p.x + me_p.vx));
        me_p.y = Math.max(20, Math.min(FIELD_H - 20, me_p.y + me_p.vy));
      } else if (me_p) { me_p.vx = 0; me_p.vy = 0; }

      // Broadcast my position 15 fps
      if (me_p && now - lastBroadcast > 66) {
        lastBroadcast = now;
        chRef.current?.send({ type: "broadcast", event: "pos", payload: { uid: me, x: me_p.x, y: me_p.y, vx: me_p.vx, vy: me_p.vy } });
      }

      // Host: ball physics + collision
      if (isHost) {
        const b = stateRef.current.ball;
        b.x += b.vx; b.y += b.vy;
        b.vx *= 0.98; b.vy *= 0.98;
        if (b.x < 12 || b.x > FIELD_W - 12) {
          // goal check y between goal
          if (b.y > FIELD_H / 2 - 60 && b.y < FIELD_H / 2 + 60) {
            const team: "A" | "B" = b.x < 12 ? "B" : "A";
            if (team === "A") stateRef.current.scoreA++; else stateRef.current.scoreB++;
            const { scoreA, scoreB } = stateRef.current;
            setScores({ a: scoreA, b: scoreB });
            setGoalMsg(`GOOOOL! فريق ${team}`);
            stateRef.current.goalFlash = now + 2000;
            setTimeout(() => setGoalMsg(""), 2000);
            b.x = FIELD_W / 2; b.y = FIELD_H / 2; b.vx = 0; b.vy = 0;
            chRef.current?.send({ type: "broadcast", event: "goal", payload: { team, a: scoreA, b: scoreB } });
          } else { b.vx *= -0.8; b.x = Math.max(12, Math.min(FIELD_W - 12, b.x)); }
        }
        if (b.y < 12 || b.y > FIELD_H - 12) { b.vy *= -0.8; b.y = Math.max(12, Math.min(FIELD_H - 12, b.y)); }

        // Player-ball collisions
        stateRef.current.players.forEach((p) => {
          if (p.stunUntil > now) return;
          const dx = b.x - p.x, dy = b.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 24) {
            const push = 6 / Math.max(1, d);
            b.vx = dx * push + p.vx * 0.5;
            b.vy = dy * push + p.vy * 0.5;
          }
        });

        if (now - lastBallBroadcast > 50) {
          lastBallBroadcast = now;
          chRef.current?.send({ type: "broadcast", event: "ball", payload: b });
        }
      }

      // Render
      drawField(ctx, stateRef.current, me);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [me, isHost]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="relative">
      {/* HUD */}
      <div className="sticky top-14 z-30 mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-2">
        <div className="rounded-lg bg-red-500/20 px-3 py-1 text-lg font-black text-red-400">A: {scores.a}</div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-900/80 px-3 py-1 font-mono text-white">
          <Clock className="h-3 w-3" /> {mins}:{secs.toString().padStart(2, "0")}
        </div>
        <div className="rounded-lg bg-blue-500/20 px-3 py-1 text-lg font-black text-blue-400">B: {scores.b}</div>
      </div>

      <div className="relative mx-auto max-w-3xl px-2">
        <canvas
          ref={canvasRef}
          width={FIELD_W}
          height={FIELD_H}
          className="w-full rounded-xl border-2 border-emerald-500/30 shadow-2xl"
          style={{ aspectRatio: `${FIELD_W}/${FIELD_H}`, touchAction: "none" }}
        />
        {goalMsg && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-pulse sm:text-7xl">
              {goalMsg}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="fixed bottom-4 left-0 right-0 z-40 flex items-end justify-between px-6">
        <Joystick onMove={(dx, dy) => { inputRef.current.dx = dx; inputRef.current.dy = dy; }} />
        <button
          onClick={castSkill}
          disabled={!skillReady}
          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 text-3xl font-black shadow-2xl transition-all ${
            skillReady ? "border-yellow-400 bg-gradient-to-br from-yellow-500 to-orange-600 text-white animate-pulse" : "border-slate-600 bg-slate-800 text-slate-500"
          }`}
          aria-label="skill"
        >
          <Zap className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}

function Joystick({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const baseRef = useRef<HTMLDivElement | null>(null);

  const handle = (clientX: number, clientY: number) => {
    const rect = baseRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx, dy = clientY - cy;
    const mag = Math.hypot(dx, dy);
    const max = 40;
    if (mag > max) { dx = (dx / mag) * max; dy = (dy / mag) * max; }
    setDrag({ x: dx, y: dy });
    onMove(mag < 8 ? 0 : dx / max, mag < 8 ? 0 : dy / max);
  };

  return (
    <div
      ref={baseRef}
      className="relative h-24 w-24 rounded-full border-4 border-white/30 bg-slate-900/60 backdrop-blur"
      onTouchStart={(e) => { const t = e.touches[0]; handle(t.clientX, t.clientY); }}
      onTouchMove={(e) => { const t = e.touches[0]; handle(t.clientX, t.clientY); }}
      onTouchEnd={() => { setDrag(null); onMove(0, 0); }}
      onMouseDown={(e) => handle(e.clientX, e.clientY)}
      onMouseMove={(e) => { if (e.buttons) handle(e.clientX, e.clientY); }}
      onMouseUp={() => { setDrag(null); onMove(0, 0); }}
      onMouseLeave={() => { setDrag(null); onMove(0, 0); }}
    >
      <div
        className="absolute h-12 w-12 rounded-full bg-emerald-500 shadow-lg transition-transform"
        style={{ left: "50%", top: "50%", transform: `translate(-50%, -50%) translate(${drag?.x ?? 0}px, ${drag?.y ?? 0}px)` }}
      />
    </div>
  );
}

function drawField(ctx: CanvasRenderingContext2D, state: {
  players: Map<string, PlayerState>; ball: BallState; goalFlash: number;
}, me: string) {
  ctx.fillStyle = "#0a3d1a";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  // Stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#0d4a20" : "#0a3d1a";
    ctx.fillRect((FIELD_W / 8) * i, 0, FIELD_W / 8, FIELD_H);
  }
  // Border + center
  ctx.strokeStyle = "#ffffff88";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, FIELD_W - 20, FIELD_H - 20);
  ctx.beginPath(); ctx.moveTo(FIELD_W / 2, 10); ctx.lineTo(FIELD_W / 2, FIELD_H - 10); ctx.stroke();
  ctx.beginPath(); ctx.arc(FIELD_W / 2, FIELD_H / 2, 50, 0, Math.PI * 2); ctx.stroke();
  // Goals
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, FIELD_H / 2 - 60, 12, 120);
  ctx.strokeRect(FIELD_W - 12, FIELD_H / 2 - 60, 12, 120);

  const now = Date.now();
  if (state.goalFlash > now) {
    ctx.fillStyle = `rgba(250,204,21,${(state.goalFlash - now) / 2000 * 0.3})`;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  }

  // Players
  state.players.forEach((p, uid) => {
    const c = CHARACTERS.find((x) => x.id === p.char);
    const color = c?.color ?? "#fff";
    const stunned = p.stunUntil > now;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = p.team === "A" ? "#dc2626" : "#2563eb";
    ctx.fill();
    ctx.strokeStyle = uid === me ? "#facc15" : color;
    ctx.lineWidth = uid === me ? 4 : 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c?.emoji ?? "⚽", p.x, p.y);
    if (stunned) {
      ctx.fillStyle = "#facc15";
      ctx.font = "16px sans-serif";
      ctx.fillText("💫", p.x, p.y - 22);
    }
    // Name
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.fillText(p.name.slice(0, 8), p.x, p.y + 30);
  });

  // Ball
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚽", state.ball.x, state.ball.y);
}
