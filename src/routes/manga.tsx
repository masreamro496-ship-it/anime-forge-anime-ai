import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Brush, Eraser, Trash2, Undo2, Download, Play, Pause, Plus, Copy } from "lucide-react";

export const Route = createFileRoute("/manga")({
  head: () => ({
    meta: [
      { title: "استوديو المانجا — ارسم مانجا بالألوان والأنميشن | انمي فورج" },
      { name: "description", content: "ارسم صفحات مانجا بألوان كاملة، أقلام وفرش متعددة، مكتبة عناصر جاهزة، وحوّل رسوماتك إلى أنميشن بالإطارات." },
      { property: "og:title", content: "استوديو المانجا — انمي فورج" },
      { property: "og:description", content: "أدوات رسم مانجا احترافية: أقلام، ألوان، مكتبات عناصر، وإطارات أنميشن." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MangaStudio,
});

const COLORS = [
  "#111827", "#ffffff", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#f43f5e", "#78350f", "#f7d7b4", "#9ca3af", "#000000",
];

const TOOLS = [
  { id: "pen", label: "قلم حبر", width: 3 },
  { id: "brush", label: "فرشاة", width: 12 },
  { id: "marker", label: "ماركر", width: 24 },
  { id: "fine", label: "قلم رفيع", width: 1 },
  { id: "eraser", label: "ممحاة", width: 20 },
] as const;

const STICKERS = [
  { emoji: "💥", label: "انفجار" },
  { emoji: "⚡", label: "برق" },
  { emoji: "💢", label: "غضب" },
  { emoji: "💧", label: "عرق" },
  { emoji: "❤️", label: "قلب" },
  { emoji: "⭐", label: "نجمة" },
  { emoji: "🗯️", label: "فقاعة صراخ" },
  { emoji: "💬", label: "فقاعة كلام" },
  { emoji: "🌸", label: "زهرة" },
  { emoji: "🔥", label: "لهب" },
];

const W = 900;
const H = 620;

function MangaStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [tool, setTool] = useState<(typeof TOOLS)[number]["id"]>("pen");
  const [color, setColor] = useState("#111827");
  const [width, setWidth] = useState(3);
  const [frames, setFrames] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(6);
  const history = useRef<string[]>([]);

  // تهيئة اللوحة
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    setFrames([c.toDataURL()]);
  }, []);

  const ctx2d = () => canvasRef.current?.getContext("2d") ?? null;

  const snapshot = () => {
    const c = canvasRef.current;
    if (!c) return;
    history.current.push(c.toDataURL());
    if (history.current.length > 25) history.current.shift();
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ctx2d();
    if (!ctx) return;
    snapshot();
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ctx2d();
    if (!ctx) return;
    const p = pos(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.globalAlpha = tool === "marker" ? 0.45 : 1;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const end = () => {
    drawing.current = false;
    saveToFrame();
  };

  const saveToFrame = () => {
    const c = canvasRef.current;
    if (!c) return;
    setFrames((f) => {
      const next = [...f];
      next[current] = c.toDataURL();
      return next;
    });
  };

  const loadFrame = (index: number) => {
    const c = canvasRef.current;
    const ctx = ctx2d();
    if (!c || !ctx) return;
    const src = frames[index];
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (!src) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, W, H);
    img.src = src;
  };

  const undo = () => {
    const prev = history.current.pop();
    const ctx = ctx2d();
    if (!prev || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      saveToFrame();
    };
    img.src = prev;
  };

  const clearCanvas = () => {
    const ctx = ctx2d();
    if (!ctx) return;
    snapshot();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    saveToFrame();
  };

  const addPanels = (cols: number, rows: number) => {
    const ctx = ctx2d();
    if (!ctx) return;
    snapshot();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 4;
    const pad = 20;
    const cw = (W - pad * 2) / cols;
    const ch = (H - pad * 2) / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.strokeRect(pad + i * cw + 6, pad + j * ch + 6, cw - 12, ch - 12);
      }
    }
    saveToFrame();
  };

  const stampSticker = (emoji: string) => {
    const ctx = ctx2d();
    if (!ctx) return;
    snapshot();
    ctx.font = "90px serif";
    ctx.textAlign = "center";
    ctx.fillText(emoji, W / 2, H / 2);
    saveToFrame();
  };

  const addBubble = () => {
    const ctx = ctx2d();
    if (!ctx) return;
    snapshot();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(W / 2, 120, 150, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 - 20, 185);
    ctx.lineTo(W / 2 - 60, 240);
    ctx.lineTo(W / 2 + 20, 188);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    saveToFrame();
  };

  const newFrame = (copyCurrent: boolean) => {
    const c = canvasRef.current;
    if (!c) return;
    const src = copyCurrent ? c.toDataURL() : null;
    setFrames((f) => {
      const next = [...f, src ?? ""];
      return next;
    });
    const index = frames.length;
    setCurrent(index);
    const ctx = ctx2d();
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (src) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, W, H);
      img.src = src;
    }
  };

  // تشغيل الأنميشن
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const id = window.setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % frames.length;
        loadFrame(next);
        return next;
      });
    }, 1000 / fps);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, fps, frames.length]);

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = `manga-frame-${current + 1}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الرئيسية</Link>
          <span className="text-base font-black text-gradient-gold">استوديو المانجا</span>
          <button onClick={download} className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground">
            <Download className="h-4 w-4" /> تحميل
          </button>
        </div>
      </header>

      <main className="container mx-auto grid gap-4 px-4 py-5 lg:grid-cols-[260px_1fr]">
        {/* أدوات */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <p className="mb-2 text-xs font-black text-muted-foreground">الأقلام والفرش</p>
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTool(t.id); setWidth(t.width); }}
                  className={`flex items-center justify-center gap-1 rounded-xl border-2 px-2 py-2 text-[11px] font-black ${tool === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}
                >
                  {t.id === "eraser" ? <Eraser className="h-3.5 w-3.5" /> : <Brush className="h-3.5 w-3.5" />}
                  {t.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-[11px] font-black text-muted-foreground">سُمك: {width}px</label>
            <input type="range" min={1} max={60} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <p className="mb-2 text-xs font-black text-muted-foreground">ألوان المانجا</p>
            <div className="grid grid-cols-6 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); if (tool === "eraser") setTool("pen"); }}
                  aria-label={c}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-primary scale-110" : "border-border"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-2 h-9 w-full rounded-lg border border-border bg-background" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <p className="mb-2 text-xs font-black text-muted-foreground">مكتبة العناصر</p>
            <div className="grid grid-cols-5 gap-1.5">
              {STICKERS.map((s) => (
                <button key={s.emoji} onClick={() => stampSticker(s.emoji)} title={s.label} className="rounded-lg border border-border bg-background py-1.5 text-lg hover:border-primary">
                  {s.emoji}
                </button>
              ))}
            </div>
            <button onClick={addBubble} className="mt-2 w-full rounded-lg border border-border bg-background py-2 text-[11px] font-black hover:border-primary">
              إضافة فقاعة حوار
            </button>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[[1, 2], [2, 2], [2, 3]].map(([c, r]) => (
                <button key={`${c}-${r}`} onClick={() => addPanels(c, r)} className="rounded-lg border border-border bg-background py-2 text-[11px] font-black hover:border-primary">
                  {c}×{r} لوحات
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={undo} className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2 text-xs font-black"><Undo2 className="h-4 w-4" /> تراجع</button>
            <button onClick={clearCanvas} className="flex items-center justify-center gap-1 rounded-xl border border-destructive/40 bg-card py-2 text-xs font-black text-destructive"><Trash2 className="h-4 w-4" /> مسح</button>
          </div>
        </aside>

        {/* اللوحة */}
        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border-2 border-border bg-card p-2 shadow-card">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="w-full touch-none rounded-xl bg-white"
              style={{ aspectRatio: `${W} / ${H}` }}
            />
          </div>

          {/* شريط الأنميشن */}
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button onClick={() => setPlaying((p) => !p)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "إيقاف" : "تشغيل الأنميشن"}
              </button>
              <button onClick={() => newFrame(false)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-black"><Plus className="h-4 w-4" /> إطار جديد</button>
              <button onClick={() => newFrame(true)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-black"><Copy className="h-4 w-4" /> نسخ الإطار</button>
              <span className="text-[11px] font-black text-muted-foreground">سرعة: {fps} إطار/ث</span>
              <input type="range" min={1} max={24} value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-28 accent-[var(--primary)]" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {frames.map((f, i) => (
                <button
                  key={i}
                  onClick={() => { setPlaying(false); setCurrent(i); loadFrame(i); }}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${i === current ? "border-primary" : "border-border"}`}
                >
                  {f ? <img src={f} alt={`إطار ${i + 1}`} className="h-full w-full object-cover" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
