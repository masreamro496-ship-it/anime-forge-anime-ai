import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLockGate } from "@/components/SiteLockGate";
import { ArrowRight, Trophy, Volume2, VolumeX, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/world-cup")({
  head: () => ({
    meta: [
      { title: "كأس العالم — خمّن واربح كريدت" },
      { name: "description", content: "شارك في تحدي توقّع نتائج ماتشات كأس العالم واربح كريدت. قريباً: العب ماتش مباشر ضد لاعبين آخرين." },
    ],
  }),
  component: () => (
    <SiteLockGate slug="world-cup">
      <WorldCupPage />
    </SiteLockGate>
  ),
});

type Match = {
  id: string;
  team_a: string;
  team_b: string;
  match_time: string | null;
  reward_credits: number;
  result_a: number | null;
  result_b: number | null;
  status: string;
};

function WorldCupPage() {
  const { user } = useAuth();
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const matches = useQuery({
    queryKey: ["wc_matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wc_matches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Match[];
    },
  });

  const myGuesses = useQuery({
    queryKey: ["wc_my_guesses", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wc_predictions").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const toggleSound = () => {
    if (!audioRef.current) return;
    if (muted) {
      audioRef.current.volume = 0.35;
      audioRef.current.play().catch(() => {});
      setMuted(false);
    } else {
      audioRef.current.pause();
      setMuted(true);
    }
  };

  useEffect(() => () => audioRef.current?.pause(), []);

  const open = matches.data?.filter((m) => m.status === "open") ?? [];
  const finished = matches.data?.filter((m) => m.status === "finished") ?? [];

  return (
    <div className="min-h-screen">
      {/* Stadium sound (crowd cheering) - hosted asset */}
      <audio
        ref={audioRef}
        loop
        src="https://cdn.pixabay.com/download/audio/2022/10/25/audio_63f2c9bc0e.mp3?filename=stadium-crowd-loop-118543.mp3"
      />

      <header className="sticky top-0 z-40 border-b border-emerald-500/30 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-lg font-black bg-gradient-to-r from-yellow-400 to-emerald-500 bg-clip-text text-transparent">كأس العالم</span>
          </div>
          <button
            onClick={toggleSound}
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 p-2 text-emerald-400"
            aria-label={muted ? "تشغيل صوت الملعب" : "كتم"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/25 via-yellow-500/10 to-transparent" />
        <div className="container mx-auto max-w-5xl px-4 py-10 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-6xl shadow-[0_10px_40px_-8px_rgba(234,179,8,0.6)]">
            🏆
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-yellow-400 to-emerald-500 bg-clip-text text-transparent">
              خمّن نتيجة الماتش
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            خمّن النتيجة الصحيحة قبل الماتش. لما الأدمن يدخل النتيجة النهائية، الكريدت هيتحوّل لحسابك تلقائياً.
          </p>
        </div>
      </section>

      {/* PvP placeholder */}
      <section className="container mx-auto max-w-5xl px-4 pb-6">
        <div className="rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
          <Users className="mx-auto h-10 w-10 text-emerald-400" />
          <h2 className="mt-3 text-xl font-black text-emerald-400">العب مقابل 50 كريدت</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            لاعب ضد لاعب Real-time — تسديد وتصدي بشخصيات مختلفة. جماهير، هدف "GOOOOL"، ومؤقت 20 دقيقة.
          </p>
          <Link
            to="/world-cup/play"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg hover:scale-105 transition-transform"
          >
            <Users className="h-4 w-4" /> ابدأ اللعب الآن
          </Link>
        </div>
      </section>

      {/* Open matches */}
      <section className="container mx-auto max-w-5xl px-4 pb-8">
        <h2 className="mb-3 text-lg font-black">ماتشات مفتوحة للتخمين</h2>
        {matches.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : open.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            لا توجد ماتشات مفتوحة حالياً. الأدمن هيضيف ماتشات جديدة قريباً.
          </div>
        ) : (
          <div className="grid gap-3">
            {open.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                existing={myGuesses.data?.find((g) => g.match_id === m.id)}
                onGuess={() => myGuesses.refetch()}
                loggedIn={!!user}
              />
            ))}
          </div>
        )}
      </section>

      {/* Finished */}
      {finished.length > 0 && (
        <section className="container mx-auto max-w-5xl px-4 pb-16">
          <h2 className="mb-3 text-lg font-black">ماتشات منتهية</h2>
          <div className="grid gap-3">
            {finished.map((m) => {
              const g = myGuesses.data?.find((x) => x.match_id === m.id);
              const won = g && g.guess_a === m.result_a && g.guess_b === m.result_b;
              return (
                <div key={m.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold">{m.team_a} <span className="text-emerald-400">{m.result_a}</span> - <span className="text-emerald-400">{m.result_b}</span> {m.team_b}</div>
                    {g && (
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${won ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                        {won ? `فزت +${m.reward_credits}` : `تخمينك ${g.guess_a}-${g.guess_b}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function MatchCard({
  match,
  existing,
  onGuess,
  loggedIn,
}: {
  match: Match;
  existing: { guess_a: number; guess_b: number } | undefined;
  onGuess: () => void;
  loggedIn: boolean;
}) {
  const [a, setA] = useState(existing?.guess_a ?? 1);
  const [b, setB] = useState(existing?.guess_b ?? 1);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!loggedIn) {
      toast.error("سجّل دخولك للتخمين");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("wc_predictions").insert({
        match_id: match.id,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        guess_a: a,
        guess_b: b,
      });
      if (error) throw error;
      toast.success("تم حفظ تخمينك! انتظر النتيجة النهائية");
      onGuess();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 font-black text-yellow-400">جائزة: {match.reward_credits} كريدت</span>
        {match.match_time && <span className="text-muted-foreground">{new Date(match.match_time).toLocaleString("ar-EG")}</span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-center">
          <div className="text-sm font-black">{match.team_a}</div>
          <input
            type="number"
            min={0}
            max={20}
            value={a}
            onChange={(e) => setA(Math.max(0, Math.min(20, +e.target.value || 0)))}
            disabled={!!existing}
            className="mt-2 w-full rounded-xl border-2 border-emerald-500/40 bg-background py-3 text-center text-2xl font-black disabled:opacity-70"
          />
        </div>
        <div className="text-2xl font-black text-muted-foreground">×</div>
        <div className="text-center">
          <div className="text-sm font-black">{match.team_b}</div>
          <input
            type="number"
            min={0}
            max={20}
            value={b}
            onChange={(e) => setB(Math.max(0, Math.min(20, +e.target.value || 0)))}
            disabled={!!existing}
            className="mt-2 w-full rounded-xl border-2 border-emerald-500/40 bg-background py-3 text-center text-2xl font-black disabled:opacity-70"
          />
        </div>
      </div>
      {existing ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-sm font-bold text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> تم حفظ تخمينك — بالتوفيق!
        </div>
      ) : (
        <button
          onClick={submit}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-base font-black text-white shadow-lg disabled:opacity-60"
        >
          {busy ? "جاري الإرسال..." : "احفظ تخميني"}
        </button>
      )}
    </div>
  );
}
