import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { wcPayEntry, wcFinishMatch } from "@/lib/wc-pvp.functions";
import { toast } from "sonner";
import { ArrowLeft, Users, Play, LogOut, Zap } from "lucide-react";
import { ChibiCharacter, type CharState } from "@/components/wc/ChibiCharacter";

export const Route = createFileRoute("/world-cup/play")({
  head: () => ({ meta: [{ title: "كأس العالم — لعبة 3D أونلاين" }] }),
  component: PlayPage,
});

function PlayPage() {
  return (
    <ClientOnly fallback={<div className="min-h-screen flex items-center justify-center bg-black text-white">جاري تحميل اللعبة...</div>}>
      <PlayInner />
    </ClientOnly>
  );
}

// ============ Constants ============
const FIELD_W = 30; // X
const FIELD_H = 18; // Z
const GOAL_W = 5;
const PLAYER_SPEED = 5.2;
const STUN_MS = 5000;
const MATCH_MS = 5 * 60 * 1000;
const ENTRY_COST = 50;
const REWARD = 80;

type Phase = "menu" | "lobby" | "playing" | "finished";
type Presence = { user_id: string; name: string; joined_at: number };
type NetPlayer = {
  user_id: string;
  name: string;
  team: "red" | "blue";
  x: number;
  z: number;
  ry: number;
  state: CharState;
  stunnedUntil: number;
};

// ============ Main ============
function PlayInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("menu");
  const [cap, setCap] = useState<number>(2);
  const [players, setPlayers] = useState<Presence[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [result, setResult] = useState<{ winner: string; a: number; b: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const payEntry = useServerFn(wcPayEntry);
  const finishMatch = useServerFn(wcFinishMatch);

  // Force landscape + fullscreen when the match starts
  useEffect(() => {
    if (phase === "playing") {
      try {
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => {});
      } catch { /* noop */ }
      try {
        (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => {});
      } catch { /* noop */ }
    }
  }, [phase]);


  useEffect(() => {
    if (!user) {
      toast.error("سجّل دخولك أولاً");
      navigate({ to: "/login" });
    }
  }, [user, navigate]);

  const leaveLobby = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setPlayers([]);
    setRoomId("");
    setIsHost(false);
    setPhase("menu");
  }, []);

  const joinLobby = useCallback(async () => {
    if (!user) return;
    const rid = `wc-lobby-cap${cap}-v3`;
    setRoomId(rid);
    const name = user.email?.split("@")[0] || "Player";
    const ch = supabase.channel(rid, { config: { presence: { key: user.id } } });
    channelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Presence[]>;
      const list = Object.values(state).flat().sort((a, b) => a.joined_at - b.joined_at).slice(0, cap);
      setPlayers(list);
      if (list[0]?.user_id === user.id) setIsHost(true);
    });
    ch.on("broadcast", { event: "start" }, () => {
      setPhase("playing");
    });
    await ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ user_id: user.id, name, joined_at: Date.now() });
      }
    });
    setPhase("lobby");
  }, [user, cap]);

  const startMatch = useCallback(async () => {
    if (!isHost || players.length < cap) return;
    try {
      await payEntry({ data: { room_id: roomId } });
    } catch (e) {
      toast.error("رصيدك غير كافي (50 كريدت)");
      return;
    }
    channelRef.current?.send({ type: "broadcast", event: "start", payload: {} });
  }, [isHost, players.length, cap, payEntry, roomId]);

  const onMatchEnd = useCallback(async (scoreA: number, scoreB: number, myTeam: "red" | "blue", allPlayers: NetPlayer[]) => {
    const winnerTeam = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "draw";
    const winners = allPlayers.filter((p) => (winnerTeam === "A" ? p.team === "red" : winnerTeam === "B" ? p.team === "blue" : false)).map((p) => p.user_id);
    setResult({ winner: winnerTeam === "draw" ? "تعادل" : winnerTeam === "A" ? "الفريق الأحمر" : "الفريق الأزرق", a: scoreA, b: scoreB });
    setPhase("finished");
    // Only host reports to server (idempotent RPC)
    if (isHost) {
      try {
        await finishMatch({
          data: {
            room_id: roomId + "-" + Date.now(),
            winner_team: winnerTeam,
            score_a: scoreA,
            score_b: scoreB,
            winners,
            players: allPlayers,
          },
        });
      } catch (e) { console.warn(e); }
    }
    // Toast
    const iWon = (winnerTeam === "A" && myTeam === "red") || (winnerTeam === "B" && myTeam === "blue");
    toast[iWon ? "success" : "info"](iWon ? `فزت! +${REWARD} كريدت` : winnerTeam === "draw" ? "تعادل" : "خسرت");
  }, [isHost, roomId, finishMatch]);

  if (phase === "menu") return <MenuScreen cap={cap} setCap={setCap} onJoin={joinLobby} />;
  if (phase === "lobby") return <LobbyScreen players={players} cap={cap} isHost={isHost} onStart={startMatch} onLeave={leaveLobby} selfId={user?.id || ""} />;
  if (phase === "playing") return <GameScene roomId={roomId} presences={players} selfId={user!.id} selfName={user?.email?.split("@")[0] || "Player"} isHost={isHost} onEnd={onMatchEnd} onExit={leaveLobby} />;
  return <FinishedScreen result={result} onAgain={() => { setResult(null); setPhase("menu"); }} />;
}

// ============ Menu ============
function MenuScreen({ cap, setCap, onJoin }: { cap: number; setCap: (n: number) => void; onJoin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Link to="/world-cup" className="flex items-center gap-2 text-white/80 hover:text-white text-sm">
          <ArrowLeft className="h-4 w-4" /> رجوع
        </Link>
        <h1 className="text-lg font-black text-yellow-400">⚽ كأس العالم PvP</h1>
        <div className="w-16" />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4 animate-bounce">⚽</div>
        <h2 className="text-2xl font-black text-white mb-2">اختر عدد اللاعبين</h2>
        <p className="text-sm text-white/60 mb-6">تكلفة الدخول: {ENTRY_COST} كريدت · الجائزة: {REWARD} للفائز</p>
        <div className="grid grid-cols-4 gap-2 mb-8 w-full max-w-md">
          {[2, 4, 6, 8].map((n) => (
            <button
              key={n}
              onClick={() => setCap(n)}
              className={`aspect-square rounded-2xl border-2 font-black text-3xl transition-all ${
                cap === n ? "bg-yellow-500 border-yellow-300 text-black scale-110 shadow-2xl" : "bg-white/5 border-white/20 text-white/70"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={onJoin}
          className="w-full max-w-md rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 py-5 text-xl font-black text-black shadow-2xl hover:scale-105 transition"
        >
          <Play className="inline h-6 w-6 ml-2" /> ابدأ اللعب
        </button>
      </div>
    </div>
  );
}

// ============ Lobby ============
function LobbyScreen({ players, cap, isHost, onStart, onLeave, selfId }: {
  players: Presence[]; cap: number; isHost: boolean; onStart: () => void; onLeave: () => void; selfId: string;
}) {
  const full = players.length >= cap;
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 flex flex-col relative overflow-hidden">
      {/* Ambient dark warehouse feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,180,50,0.08),transparent_60%)]" />
      <header className="relative p-3 flex items-center justify-between">
        <button onClick={onLeave} className="flex items-center gap-1 text-white/80 text-sm">
          <LogOut className="h-4 w-4" /> خروج
        </button>
        <div className="text-2xl font-black text-white">{players.length}/{cap}</div>
        <div className="text-xs text-white/60">Lobby</div>
      </header>
      <div className="absolute top-16 left-3 bg-black/60 backdrop-blur rounded-lg p-2 min-w-[140px]">
        <div className="text-xs text-white/70 mb-1 text-center">اللاعبين</div>
        {players.map((p) => (
          <div key={p.user_id} className={`text-xs py-0.5 ${p.user_id === selfId ? "text-yellow-400 font-bold" : "text-white/80"}`}>
            Lv1 {p.name}
          </div>
        ))}
        {Array.from({ length: cap - players.length }).map((_, i) => (
          <div key={i} className="text-xs py-0.5 text-white/30">-- انتظار --</div>
        ))}
      </div>
      {full && isHost && (
        <button
          onClick={onStart}
          className="absolute top-16 left-1/2 -translate-x-1/2 rounded-xl bg-gradient-to-b from-yellow-300 to-amber-600 px-8 py-3 font-black text-black shadow-2xl animate-pulse"
        >
          Start Game
        </button>
      )}
      {full && !isHost && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-xl bg-black/70 px-6 py-3 text-yellow-300 font-bold">
          ينتظر بدء المضيف...
        </div>
      )}
      {/* Character preview */}
      <div className="flex-1 relative">
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 2, 4], fov: 40 }}>
          <ambientLight intensity={0.4} />
          <spotLight position={[3, 8, 3]} angle={0.5} penumbra={0.5} intensity={1.5} castShadow />
          <ChibiCharacter position={[0, 0, 0]} rotationY={0} state="idle" team="red" isSelf />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
          </mesh>
        </Canvas>
      </div>
    </div>
  );
}

// ============ Finished ============
function FinishedScreen({ result, onAgain }: { result: { winner: string; a: number; b: number } | null; onAgain: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-emerald-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="text-7xl mb-4">🏆</div>
      <h2 className="text-3xl font-black text-yellow-400 mb-2">{result?.winner ?? "انتهت المباراة"}</h2>
      <div className="text-6xl font-black mb-6">
        <span className="text-red-400">{result?.a ?? 0}</span>
        <span className="mx-4 text-white/50">-</span>
        <span className="text-blue-400">{result?.b ?? 0}</span>
      </div>
      <button onClick={onAgain} className="rounded-2xl bg-yellow-500 text-black font-black px-8 py-4 text-lg">
        العب مرة أخرى
      </button>
    </div>
  );
}

// ============ Game Scene ============
function GameScene({ roomId, presences, selfId, selfName, isHost, onEnd, onExit }: {
  roomId: string; presences: Presence[]; selfId: string; selfName: string; isHost: boolean;
  onEnd: (a: number, b: number, myTeam: "red" | "blue", players: NetPlayer[]) => void;
  onExit: () => void;
}) {
  // Assign teams deterministically by presence order
  const teamMap = useMemo(() => {
    const m = new Map<string, "red" | "blue">();
    presences.forEach((p, i) => m.set(p.user_id, i % 2 === 0 ? "red" : "blue"));
    return m;
  }, [presences]);
  const myTeam = teamMap.get(selfId) || "red";

  // Player states (self is authoritative locally; others come via broadcast)
  const playersRef = useRef<Map<string, NetPlayer>>(new Map());
  const ballRef = useRef({ x: 0, z: 0, vx: 0, vz: 0, y: 0.4 });
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATCH_MS);
  const [goalMsg, setGoalMsg] = useState<string>("");
  const [stones, setStones] = useState(3);
  const stonesRef = useRef<Array<{ x: number; z: number; vx: number; vz: number; owner: string; life: number }>>([]);
  const stonesVersion = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const endedRef = useRef(false);

  // Controls state
  const joyRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const camYawRef = useRef(0);
  const jumpingRef = useRef(false);
  const jumpVelRef = useRef(0);
  const kickRef = useRef(false);
  const throwRef = useRef(false);

  // Initialize players
  useEffect(() => {
    presences.forEach((p, i) => {
      const team = i % 2 === 0 ? "red" : "blue";
      const side = team === "red" ? -1 : 1;
      const startX = side * (FIELD_W / 4);
      const startZ = ((i % 4) - 1.5) * 2;
      playersRef.current.set(p.user_id, {
        user_id: p.user_id,
        name: p.name,
        team,
        x: startX,
        z: startZ,
        ry: team === "red" ? Math.PI / 2 : -Math.PI / 2,
        state: "idle",
        stunnedUntil: 0,
      });
    });
  }, [presences]);

  // Realtime channel for movement/ball
  useEffect(() => {
    const gameRoom = roomId + "-game";
    const ch = supabase.channel(gameRoom, { config: { broadcast: { self: false } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as NetPlayer;
      playersRef.current.set(p.user_id, p);
    });
    ch.on("broadcast", { event: "ball" }, ({ payload }) => {
      if (isHost) return; // host is authoritative
      Object.assign(ballRef.current, payload);
    });
    ch.on("broadcast", { event: "goal" }, ({ payload }) => {
      const p = payload as { team: "A" | "B"; a: number; b: number };
      setScoreA(p.a); setScoreB(p.b);
      setGoalMsg(p.team === "A" ? "GOOOOL أحمر!" : "GOOOOL أزرق!");
      setTimeout(() => setGoalMsg(""), 2000);
    });
    ch.on("broadcast", { event: "stone" }, ({ payload }) => {
      stonesRef.current.push(payload as { x: number; z: number; vx: number; vz: number; owner: string; life: number });
      stonesVersion.current++;
    });
    ch.on("broadcast", { event: "hit" }, ({ payload }) => {
      const p = payload as { target: string; until: number };
      const pl = playersRef.current.get(p.target);
      if (pl) { pl.stunnedUntil = p.until; pl.state = "stunned"; }
    });

    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, isHost]);

  // Broadcast my position throttled
  useEffect(() => {
    const id = setInterval(() => {
      const me = playersRef.current.get(selfId);
      if (me && channelRef.current) {
        channelRef.current.send({ type: "broadcast", event: "pos", payload: me });
      }
    }, 60);
    return () => clearInterval(id);
  }, [selfId]);

  // Host broadcasts ball
  useEffect(() => {
    if (!isHost) return;
    const id = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({ type: "broadcast", event: "ball", payload: ballRef.current });
      }
    }, 80);
    return () => clearInterval(id);
  }, [isHost]);

  // Match timer
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, MATCH_MS - elapsed);
      setTimeLeft(left);
      if (left === 0 && !endedRef.current) {
        endedRef.current = true;
        onEnd(scoreA, scoreB, myTeam, Array.from(playersRef.current.values()));
      }
    }, 500);
    return () => clearInterval(id);
  }, [scoreA, scoreB, myTeam, onEnd]);

  // Ensure self is initialized
  useEffect(() => {
    if (!playersRef.current.has(selfId)) {
      playersRef.current.set(selfId, {
        user_id: selfId, name: selfName, team: myTeam,
        x: myTeam === "red" ? -6 : 6, z: 0,
        ry: myTeam === "red" ? Math.PI / 2 : -Math.PI / 2,
        state: "idle", stunnedUntil: 0,
      });
    }
  }, [selfId, selfName, myTeam]);

  const doJump = () => {
    if (!jumpingRef.current) {
      jumpingRef.current = true;
      jumpVelRef.current = 6.5;
    }
  };
  const doKick = () => { kickRef.current = true; setTimeout(() => { kickRef.current = false; }, 200); };
  const doThrow = () => {
    if (stones <= 0) return;
    setStones((s) => s - 1);
    const me = playersRef.current.get(selfId);
    if (!me || !channelRef.current) return;
    const speed = 15;
    const st = { x: me.x, z: me.z, vx: Math.sin(me.ry) * speed, vz: Math.cos(me.ry) * speed, owner: selfId, life: 1.5 };
    stonesRef.current.push(st);
    channelRef.current.send({ type: "broadcast", event: "stone", payload: st });
    throwRef.current = true; setTimeout(() => { throwRef.current = false; }, 200);
  };

  const registerGoal = useCallback((team: "A" | "B") => {
    if (!isHost) return;
    const newA = team === "A" ? scoreA + 1 : scoreA;
    const newB = team === "B" ? scoreB + 1 : scoreB;
    setScoreA(newA); setScoreB(newB);
    setGoalMsg(team === "A" ? "GOOOOL أحمر!" : "GOOOOL أزرق!");
    setTimeout(() => setGoalMsg(""), 2000);
    channelRef.current?.send({ type: "broadcast", event: "goal", payload: { team, a: newA, b: newB } });
    ballRef.current.x = 0; ballRef.current.z = 0; ballRef.current.vx = 0; ballRef.current.vz = 0;
  }, [isHost, scoreA, scoreB]);

  const mm = String(Math.floor(timeLeft / 60000)).padStart(2, "0");
  const ss = String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 12, 14], fov: 55 }} gl={{ antialias: true }}>
        <SceneContent
          playersRef={playersRef}
          ballRef={ballRef}
          stonesRef={stonesRef}
          selfId={selfId}
          joyRef={joyRef}
          camYawRef={camYawRef}
          jumpingRef={jumpingRef}
          jumpVelRef={jumpVelRef}
          kickRef={kickRef}
          isHost={isHost}
          onGoal={registerGoal}
        />
      </Canvas>

      {/* HUD Top */}
      <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
        <div className="flex items-center justify-between">
          <button onClick={onExit} className="pointer-events-auto rounded-lg bg-black/60 backdrop-blur px-3 py-1.5 text-white text-xs flex items-center gap-1">
            <LogOut className="h-3 w-3" /> خروج
          </button>
          <div className="rounded-2xl bg-black/70 backdrop-blur px-5 py-2 flex items-center gap-4">
            <span className="text-red-400 text-2xl font-black">{scoreA}</span>
            <span className="text-white/40 text-xl">-</span>
            <span className="text-blue-400 text-2xl font-black">{scoreB}</span>
          </div>
          <div className="rounded-lg bg-black/60 backdrop-blur px-3 py-1.5 text-yellow-300 font-mono font-bold">
            {mm}:{ss}
          </div>
        </div>
      </div>

      {/* Goal message */}
      {goalMsg && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-6xl font-black text-yellow-400 animate-bounce drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]">
            {goalMsg}
          </div>
        </div>
      )}

      {/* Camera swipe area (top half — behind joystick / buttons) */}
      <CameraSwipe camYawRef={camYawRef} />

      {/* Joystick left */}
      <Joystick joyRef={joyRef} />

      {/* Action buttons right */}
      <div className="absolute bottom-6 right-4 flex flex-col gap-3 pointer-events-auto">
        <button
          onClick={doThrow}
          disabled={stones <= 0}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border-2 border-white/40 text-white text-xs font-bold flex flex-col items-center justify-center disabled:opacity-30"
        >
          <span className="text-lg">🪨</span>
          <span>{stones}</span>
        </button>
        <button
          onClick={doJump}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border-2 border-white/40 text-white flex items-center justify-center"
        >
          <span className="text-2xl">⬆️</span>
        </button>
        <button
          onClick={doKick}
          className="w-20 h-20 rounded-full bg-gradient-to-b from-yellow-400 to-amber-600 border-2 border-yellow-200 text-black flex items-center justify-center shadow-2xl"
        >
          <span className="text-3xl">⚽</span>
        </button>
      </div>
    </div>
  );
}

// ============ Camera swipe ============
function CameraSwipe({ camYawRef }: { camYawRef: React.MutableRefObject<number> }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const activeTouch = useRef<number | null>(null);

  const onStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    activeTouch.current = t.identifier;
    startX.current = t.clientX;
    startY.current = t.clientY;
  };
  const onMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === activeTouch.current) {
        const dx = t.clientX - startX.current;
        startX.current = t.clientX;
        startY.current = t.clientY;
        camYawRef.current += dx * 0.008;
      }
    }
  };
  const onEnd = () => { activeTouch.current = null; };

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{ touchAction: "none" }}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
      onMouseDown={(e) => { startX.current = e.clientX; activeTouch.current = -1; }}
      onMouseMove={(e) => {
        if (activeTouch.current === -1) {
          const dx = e.clientX - startX.current;
          startX.current = e.clientX;
          camYawRef.current += dx * 0.008;
        }
      }}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
    />
  );
}

// ============ Joystick ============
function Joystick({ joyRef }: { joyRef: React.MutableRefObject<{ dx: number; dy: number }> }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  const radius = 45;

  const update = (cx: number, cy: number) => {
    if (!baseRef.current) return;
    const r = baseRef.current.getBoundingClientRect();
    const centerX = r.left + r.width / 2;
    const centerY = r.top + r.height / 2;
    let dx = cx - centerX;
    let dy = cy - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) { dx = (dx / dist) * radius; dy = (dy / dist) * radius; }
    setKnob({ x: dx, y: dy });
    joyRef.current.dx = dx / radius;
    joyRef.current.dy = dy / radius;
  };
  const stop = () => {
    setKnob({ x: 0, y: 0 });
    joyRef.current.dx = 0; joyRef.current.dy = 0;
    activeTouch.current = null;
  };
  return (
    <div
      className="absolute bottom-8 left-6 pointer-events-auto z-20"
      style={{ touchAction: "none" }}
      onTouchStart={(e) => {
        e.stopPropagation();
        const t = e.changedTouches[0];
        activeTouch.current = t.identifier;
        update(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeTouch.current) update(t.clientX, t.clientY);
        }
      }}
      onTouchEnd={(e) => { e.stopPropagation(); stop(); }}
      onTouchCancel={stop}
    >
      <div ref={baseRef} className="w-32 h-32 rounded-full bg-black/50 border-2 border-white/40 backdrop-blur relative">
        <div
          className="absolute w-14 h-14 rounded-full bg-white/70 border-2 border-white shadow-lg"
          style={{ left: `calc(50% - 28px + ${knob.x}px)`, top: `calc(50% - 28px + ${knob.y}px)` }}
        />
      </div>
    </div>
  );
}

// ============ 3D Scene Content ============
function SceneContent({
  playersRef, ballRef, stonesRef, selfId, joyRef, camYawRef, jumpingRef, jumpVelRef, kickRef, isHost, onGoal,
}: {
  playersRef: React.MutableRefObject<Map<string, NetPlayer>>;
  ballRef: React.MutableRefObject<{ x: number; z: number; vx: number; vz: number; y: number }>;
  stonesRef: React.MutableRefObject<Array<{ x: number; z: number; vx: number; vz: number; owner: string; life: number }>>;
  selfId: string;
  joyRef: React.MutableRefObject<{ dx: number; dy: number }>;
  camYawRef: React.MutableRefObject<number>;
  jumpingRef: React.MutableRefObject<boolean>;
  jumpVelRef: React.MutableRefObject<number>;
  kickRef: React.MutableRefObject<boolean>;
  isHost: boolean;
  onGoal: (team: "A" | "B") => void;
}) {
  const { camera } = useThree();
  const yRef = useRef(0);
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 100); return () => clearInterval(id); }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const me = playersRef.current.get(selfId);
    if (!me) return;

    // Stun check
    const stunned = me.stunnedUntil > Date.now();
    const speedMul = stunned ? 0.3 : 1;

    // Movement — joystick relative to camera yaw
    const dx = joyRef.current.dx;
    const dy = joyRef.current.dy;
    const mag = Math.hypot(dx, dy);
    if (mag > 0.1) {
      const yaw = camYawRef.current;
      // dy negative = up on screen = forward
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const moveX = (forwardX * -dy + rightX * dx) * PLAYER_SPEED * speedMul * dt;
      const moveZ = (forwardZ * -dy + rightZ * dx) * PLAYER_SPEED * speedMul * dt;
      me.x = Math.max(-FIELD_W / 2 + 0.5, Math.min(FIELD_W / 2 - 0.5, me.x + moveX));
      me.z = Math.max(-FIELD_H / 2 + 0.5, Math.min(FIELD_H / 2 - 0.5, me.z + moveZ));
      me.ry = Math.atan2(moveX, moveZ);
      me.state = stunned ? "stunned" : "run";
    } else {
      me.state = stunned ? "stunned" : "idle";
    }

    // Jump
    if (jumpingRef.current) {
      yRef.current += jumpVelRef.current * dt;
      jumpVelRef.current -= 18 * dt;
      if (yRef.current <= 0) { yRef.current = 0; jumpingRef.current = false; jumpVelRef.current = 0; }
      if (me.state !== "stunned") me.state = "jump";
    }

    // Kick — impulse ball if close
    if (kickRef.current) {
      const dxb = ballRef.current.x - me.x;
      const dzb = ballRef.current.z - me.z;
      const d = Math.hypot(dxb, dzb);
      if (d < 1.3) {
        const power = 14;
        ballRef.current.vx = Math.sin(me.ry) * power;
        ballRef.current.vz = Math.cos(me.ry) * power;
      }
      if (me.state !== "stunned") me.state = "kick";
    }

    // Camera — orbit around player, independent yaw
    const camDist = 8;
    const camHeight = 5;
    const cx = me.x + Math.sin(camYawRef.current) * camDist;
    const cz = me.z + Math.cos(camYawRef.current) * camDist;
    camera.position.set(cx, camHeight, cz);
    camera.lookAt(me.x, 1.5, me.z);

    // Ball physics (host only)
    if (isHost) {
      const b = ballRef.current;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.vx *= 0.985; b.vz *= 0.985;
      // Walls (short sides have goal opening)
      if (Math.abs(b.x) > FIELD_W / 2 - 0.3) {
        // Goal check
        if (Math.abs(b.z) < GOAL_W / 2) {
          onGoal(b.x > 0 ? "A" : "B"); // ball went past +X = team red (A) scored
        } else {
          b.x = Math.sign(b.x) * (FIELD_W / 2 - 0.3);
          b.vx *= -0.7;
        }
      }
      if (Math.abs(b.z) > FIELD_H / 2 - 0.3) {
        b.z = Math.sign(b.z) * (FIELD_H / 2 - 0.3);
        b.vz *= -0.7;
      }
      // Push against players
      for (const p of playersRef.current.values()) {
        const dxb = b.x - p.x;
        const dzb = b.z - p.z;
        const d = Math.hypot(dxb, dzb);
        if (d < 0.7 && d > 0.01) {
          const push = 3;
          b.vx += (dxb / d) * push * dt * 5;
          b.vz += (dzb / d) * push * dt * 5;
        }
      }
    }

    // Stones physics
    const stones = stonesRef.current;
    for (let i = stones.length - 1; i >= 0; i--) {
      const s = stones[i];
      s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      // hit players
      for (const p of playersRef.current.values()) {
        if (p.user_id === s.owner) continue;
        const d = Math.hypot(s.x - p.x, s.z - p.z);
        if (d < 0.7) {
          if (p.user_id === selfId) {
            p.stunnedUntil = Date.now() + STUN_MS;
            p.state = "stunned";
          }
          s.life = 0;
        }
      }
      if (s.life <= 0 || Math.abs(s.x) > FIELD_W / 2 || Math.abs(s.z) > FIELD_H / 2) {
        stones.splice(i, 1);
      }
    }
  });

  // Extract latest snapshots for rendering
  const allPlayers = Array.from(playersRef.current.values());
  const b = ballRef.current;
  const stones = stonesRef.current;

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.35} color="#a3c9ff" />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[0, 8, 0]} intensity={1} color="#fff5c8" distance={30} />
      <hemisphereLight args={["#87ceeb", "#2f4030", 0.4]} />

      {/* Sky/background */}
      <color attach="background" args={["#0b1220"]} />
      <fog attach="fog" args={["#0b1220", 25, 60]} />

      {/* Field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[FIELD_W, FIELD_H]} />
        <meshStandardMaterial color="#1e6b2a" roughness={0.9} />
      </mesh>
      {/* Center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.9, 3, 64]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.1, FIELD_H]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Goals */}
      <Goal x={-FIELD_W / 2} color="#c8102e" />
      <Goal x={FIELD_W / 2} color="#1e4d9e" />
      {/* Walls */}
      <Walls />
      {/* Crowd (billboard planes) */}
      <Crowd />

      {/* Ball */}
      <mesh position={[b.x, b.y + 0.4, b.z]} castShadow>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshStandardMaterial color="white" roughness={0.4} />
      </mesh>

      {/* Ball shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[b.x, 0.02, b.z]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>

      {/* Players */}
      {allPlayers.map((p) => (
        <ChibiCharacter
          key={p.user_id}
          position={[p.x, p.user_id === selfId ? yRef.current : 0, p.z]}
          rotationY={p.ry}
          state={p.stunnedUntil > Date.now() ? "stunned" : p.state}
          team={p.team}
          isSelf={p.user_id === selfId}
        />
      ))}

      {/* Stones */}
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, 0.4, s.z]} castShadow>
          <dodecahedronGeometry args={[0.25]} />
          <meshStandardMaterial color="#6b6b6b" roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

function Goal({ x, color }: { x: number; color: string }) {
  const sign = Math.sign(x);
  return (
    <group position={[x, 0, 0]}>
      {/* Posts */}
      <mesh position={[0, 1.2, -GOAL_W / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2.4, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, 1.2, GOAL_W / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2.4, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 2.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, GOAL_W, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Net back */}
      <mesh position={[sign * 0.8, 1.2, 0]}>
        <planeGeometry args={[GOAL_W, 2.4]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Walls() {
  const wallMat = new THREE.MeshStandardMaterial({ color: "#3a3a48", roughness: 0.8 });
  return (
    <>
      <mesh position={[0, 2, -FIELD_H / 2 - 0.5]} receiveShadow>
        <boxGeometry args={[FIELD_W + 2, 4, 0.5]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      <mesh position={[0, 2, FIELD_H / 2 + 0.5]} receiveShadow>
        <boxGeometry args={[FIELD_W + 2, 4, 0.5]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
    </>
  );
}

function Crowd() {
  const positions = useMemo(() => {
    const arr: Array<[number, number, number, string]> = [];
    const colors = ["#f97316", "#eab308", "#3b82f6", "#ef4444", "#22c55e", "#8b5cf6"];
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * (FIELD_W + 4);
      const z = (Math.random() < 0.5 ? -1 : 1) * (FIELD_H / 2 + 1.5 + Math.random() * 1.5);
      arr.push([x, 1, z, colors[i % colors.length]]);
    }
    return arr;
  }, []);
  return (
    <>
      {positions.map(([x, y, z, c], i) => (
        <mesh key={i} position={[x, y, z]}>
          <capsuleGeometry args={[0.2, 0.5, 4, 8]} />
          <meshStandardMaterial color={c} roughness={0.7} />
        </mesh>
      ))}
    </>
  );
}
