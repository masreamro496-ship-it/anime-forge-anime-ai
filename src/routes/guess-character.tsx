import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowRight, Coins, Eye, Loader2, RefreshCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/guess-character")({
  head: () => ({
    meta: [
      { title: "تخمين الشخصية — اربح كريدت | انمي فورج" },
      {
        name: "description",
        content: "شوف جزء من وجه شخصية أنمي وخمّن مين هي. كل إجابة صحيحة تكسبك كريدت واحد فوراً.",
      },
      { property: "og:title", content: "تخمين الشخصية — اربح كريدت" },
      { property: "og:description", content: "خمّن شخصية الأنمي من جزء من وجهها واكسب كريدت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuessCharacterPage,
});

type Character = {
  id: string;
  name: string;
  anime: string | null;
  image_url: string;
  focus_x: number;
  focus_y: number;
  zoom: number;
  reward: number;
};

type GuessResult = {
  ok: boolean;
  correct?: boolean;
  awarded?: number;
  balance?: number;
  name?: string;
  anime?: string | null;
  error?: string;
};

const ERRORS: Record<string, string> = {
  not_authenticated: "لازم تسجّل الدخول الأول",
  character_not_found: "الشخصية مش متاحة",
  already_answered: "خمّنت الشخصية دي قبل كده",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

function GuessCharacterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Character[]>([]);
  const [pool, setPool] = useState<Character[]>([]);
  const [current, setCurrent] = useState<Character | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setResult(null);
    setRevealed(false);
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
    const [charsRes, attemptsRes] = await Promise.all([
      sb.from("guess_characters").select("*"),
      user
        ? sb.from("guess_attempts").select("character_id")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (charsRes.error) {
      toast.error("مش قادر أجيب الشخصيات: " + charsRes.error.message);
      setLoading(false);
      return;
    }

    const chars = (charsRes.data ?? []) as Character[];
    const done = new Set(
      ((attemptsRes.data ?? []) as { character_id: string }[]).map((a) => a.character_id),
    );
    const remaining = shuffle(chars.filter((c) => !done.has(c.id)));
    setAll(chars);
    setPool(remaining);
    setCurrent(remaining[0] ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const options = useMemo(() => {
    if (!current) return [];
    const others = shuffle(all.filter((c) => c.id !== current.id)).slice(0, 3);
    return shuffle([current.name, ...others.map((o) => o.name)]);
  }, [current, all]);

  const guess = async (answer: string) => {
    if (!current || sending || result) return;
    if (!user) {
      toast.error("سجّل الدخول عشان تكسب كريدت");
      return;
    }
    setSending(true);
    const { data, error } = await (
      supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: GuessResult | null; error: { message: string } | null }>;
      }
    ).rpc("submit_character_guess", { _character_id: current.id, _answer: answer });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const res = data as GuessResult;
    if (!res?.ok) {
      toast.error(ERRORS[res?.error ?? ""] ?? "حصلت مشكلة، جرّب تاني");
      return;
    }
    setResult(res);
    setRevealed(true);
    if (typeof res.balance === "number") setBalance(res.balance);
    if (res.correct) {
      setScore((s) => s + 1);
      toast.success(`إجابة صحيحة! +${res.awarded} كريدت 🎉`);
    } else {
      toast.error(`غلط! الشخصية كانت ${res.name}`);
    }
  };

  const next = () => {
    const rest = pool.slice(1);
    setPool(rest);
    setCurrent(rest[0] ?? null);
    setResult(null);
    setRevealed(false);
  };

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <h1 className="text-base font-black text-gradient-gold">تخمين الشخصية</h1>
          <span className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-1 text-[11px] font-black text-gold">
            <Coins className="h-3 w-3" /> {balance ?? 0}
          </span>
        </div>
      </header>

      <main className="container mx-auto max-w-xl px-4 py-6 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-card">
          <p className="text-sm font-bold">
            شوف جزء من وجه الشخصية وخمّن مين هي — كل إجابة صحيحة = <span className="text-gold">كريدت واحد</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            محاولة واحدة لكل شخصية. الإجابة الغلط مش بتاخد كريدت.
          </p>
          <p className="mt-2 text-xs font-black">نتيجتك في الجلسة: {score}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : !current ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-gold" />
            <p className="mt-3 text-sm font-black">خلّصت كل الشخصيات المتاحة!</p>
            <p className="mt-1 text-xs text-muted-foreground">استنى شخصيات جديدة قريب.</p>
            <button
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold"
            >
              <RefreshCw className="h-4 w-4" /> تحديث
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-3xl border-2 border-gold/40 bg-black shadow-card">
              <div className="relative aspect-square w-full">
                <img
                  src={current.image_url}
                  alt="جزء من وجه الشخصية"
                  className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
                  style={
                    revealed
                      ? { objectPosition: "center 20%", transform: "scale(1)" }
                      : {
                          objectPosition: `${current.focus_x}% ${current.focus_y}%`,
                          transform: `scale(${current.zoom / 100})`,
                        }
                  }
                />
                {!revealed && (
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
                    <Eye className="h-3 w-3" /> جزء من الوجه
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {options.map((opt) => {
                const isAnswer = revealed && opt === result?.name;
                const isWrongPick = revealed && !result?.correct && opt !== result?.name;
                return (
                  <button
                    key={opt}
                    disabled={sending || !!result}
                    onClick={() => void guess(opt)}
                    className={`rounded-2xl border-2 px-4 py-3 text-sm font-black transition-transform disabled:opacity-70 ${
                      isAnswer
                        ? "border-green-500 bg-green-500/10 text-green-600"
                        : isWrongPick
                          ? "border-border bg-card text-muted-foreground"
                          : "border-border bg-card hover:scale-[1.02] hover:border-gold"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {result && (
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-sm font-black">
                  {result.correct ? `صح! +${result.awarded} كريدت` : `غلط — الشخصية كانت ${result.name}`}
                </p>
                {result.anime && (
                  <p className="mt-1 text-xs text-muted-foreground">من أنمي {result.anime}</p>
                )}
                <button
                  onClick={next}
                  className="mt-3 w-full rounded-xl bg-gradient-gold px-4 py-3 text-sm font-black text-gold-foreground"
                >
                  الشخصية التالية
                </button>
              </div>
            )}
          </>
        )}

        {!user && (
          <Link
            to="/login"
            search={{ redirect: "/guess-character" }}
            className="block rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-center text-sm font-black text-gold"
          >
            سجّل الدخول لتجميع الكريدت
          </Link>
        )}
      </main>
    </div>
  );
}
