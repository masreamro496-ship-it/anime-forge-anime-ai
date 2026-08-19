// src/routes/graphic-design.editor.tsx
//
// ⚠️ تثبيت المكتبات المطلوبة قبل التشغيل:
//   npm install fabric jspdf html2canvas
//
// ⚠️ افتراض: عندك ملف عميل Supabase في "@/integrations/supabase/client"
// (زي مشاريع Lovable المعتادة). لو المسار عندك مختلف غيّر الـ import تحت.

import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Textbox, Rect, Circle, Triangle, Line, FabricImage } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Type,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Minus,
  ImagePlus,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Save,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/graphic-design/editor")({
  validateSearch: (search: Record<string, unknown>) => ({
    project: (search.project as string) || undefined,
    template: (search.template as string) || undefined,
  }),
  component: EditorPage,
});

const CANVAS_PRESETS = [
  { key: "logo", label: "لوجو / شعار", w: 800, h: 800 },
  { key: "cover", label: "غلاف سوشيال ميديا", w: 1200, h: 630 },
  { key: "business_card", label: "كرت عمل", w: 1050, h: 600 },
  { key: "ad", label: "إعلان (ستوري)", w: 1080, h: 1920 },
  { key: "poster", label: "بوستر", w: 1080, h: 1350 },
];

const FONT_FAMILIES = [
  "Cairo", "Tajawal", "Almarai", "Rubik", "Inter", "Poppins", "Playfair Display",
];

interface LayerMeta {
  id: string;
  name: string;
  locked: boolean;
  visible: boolean;
}

function EditorPage() {
  const { project: projectId, template: templateListingId } = useSearch({ from: "/graphic-design/editor" });
  const { user } = useAuth();
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const [preset, setPreset] = useState(CANVAS_PRESETS[0]);
  const [layers, setLayers] = useState<LayerMeta[]>([]);
  const [selectedOpacity, setSelectedOpacity] = useState(1);
  const [hasSelection, setHasSelection] = useState(false);
  const [title, setTitle] = useState("تصميم بدون عنوان");
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // تحميل خطوط Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      FONT_FAMILIES.map((f) => f.replace(/ /g, "+")).join("&family=") +
      "&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // تهيئة الكانفاس
  useEffect(() => {
    if (!canvasElRef.current) return;
    const canvas = new FabricCanvas(canvasElRef.current, {
      width: preset.w,
      height: preset.h,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    const refreshLayers = () => {
      const objs = canvas.getObjects();
      setLayers(
        objs.map((o, i) => ({
          id: (o as any).__id || String(i),
          name: (o as any).__name || o.type || `عنصر ${i + 1}`,
          locked: !!o.lockMovementX,
          visible: o.visible !== false,
        })).reverse()
      );
    };

    canvas.on("object:added", refreshLayers);
    canvas.on("object:removed", refreshLayers);
    canvas.on("object:modified", refreshLayers);
    canvas.on("selection:created", () => {
      setHasSelection(true);
      const obj = canvas.getActiveObject();
      if (obj) setSelectedOpacity(obj.opacity ?? 1);
    });
    canvas.on("selection:updated", () => {
      const obj = canvas.getActiveObject();
      if (obj) setSelectedOpacity(obj.opacity ?? 1);
    });
    canvas.on("selection:cleared", () => setHasSelection(false));

    return () => {
      canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.w, preset.h]);

  // تحميل مشروع موجود أو قالب من السوق
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    async function loadExisting() {
      if (projectId) {
        const { data, error } = await supabase.from("gd_projects").select("*").eq("id", projectId).single();
        if (!error && data) {
          setTitle(data.title);
          setPreset({ key: "custom", label: "مخصص", w: data.width, h: data.height });
          canvas!.loadFromJSON(data.canvas_json, () => canvas!.renderAll());
        }
      } else if (templateListingId) {
        setLoadingTemplate(true);
        // نسخ القالب (الطريقة 1) بعد شراء ناجح — هنا مجرد تحميل للمعاينة قبل الحفظ كمشروع خاص
        const { data: listing } = await supabase
          .from("gd_listings")
          .select("project_id")
          .eq("id", templateListingId)
          .single();
        if (listing?.project_id) {
          const { data: proj } = await supabase.from("gd_projects").select("*").eq("id", listing.project_id).single();
          if (proj) {
            setTitle(proj.title + " (نسخة)");
            canvas!.loadFromJSON(proj.canvas_json, () => canvas!.renderAll());
          }
        }
        setLoadingTemplate(false);
      }
    }
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, templateListingId, fabricRef.current]);

  const addText = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new Textbox("اكتب هنا", {
      left: 60,
      top: 60,
      fontSize: 42,
      fontFamily: FONT_FAMILIES[0],
      fill: "#111111",
      width: 300,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  }, []);

  const addShape = useCallback((shape: "rect" | "circle" | "triangle" | "line") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    let obj;
    const common = { left: 100, top: 100, fill: "#dc2626", width: 150, height: 150 };
    if (shape === "rect") obj = new Rect(common);
    if (shape === "circle") obj = new Circle({ ...common, radius: 75 });
    if (shape === "triangle") obj = new Triangle(common);
    if (shape === "line") obj = new Line([50, 50, 250, 50], { stroke: "#dc2626", strokeWidth: 6 });
    if (obj) {
      canvas.add(obj);
      canvas.setActiveObject(obj);
    }
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    const img = await FabricImage.fromURL(url);
    img.scaleToWidth(300);
    canvas.add(img);
    canvas.setActiveObject(img);
  }, []);

  const setFontFamily = (font: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && obj.type === "textbox") {
      (obj as Textbox).set("fontFamily", font);
      canvas!.renderAll();
    }
  };

  const bringForward = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      canvas.bringObjectForward(obj);
      canvas.renderAll();
    }
  };
  const sendBackward = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      canvas.sendObjectBackwards(obj);
      canvas.renderAll();
    }
  };
  const toggleLock = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      const locked = !!obj.lockMovementX;
      obj.set({
        lockMovementX: !locked,
        lockMovementY: !locked,
        lockScalingX: !locked,
        lockScalingY: !locked,
        lockRotation: !locked,
      });
      canvas.renderAll();
    }
  };
  const toggleVisible = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      obj.set({ visible: obj.visible === false });
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };
  const deleteSelected = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };
  const applyOpacity = (val: number) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      obj.set("opacity", val);
      canvas.renderAll();
      setSelectedOpacity(val);
    }
  };

  // التصدير
  const exportPNG = () => downloadDataUrl(fabricRef.current!.toDataURL({ format: "png", multiplier: 2 }), `${title}.png`);
  const exportJPG = () => downloadDataUrl(fabricRef.current!.toDataURL({ format: "jpeg", quality: 0.95, multiplier: 2 }), `${title}.jpg`);
  const exportSVG = () => {
    const svg = fabricRef.current!.toSVG();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    downloadBlob(blob, `${title}.svg`);
  };
  const exportPDF = () => {
    const canvas = fabricRef.current!;
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
    const pdf = new jsPDF({
      orientation: canvas.width! > canvas.height! ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width!, canvas.height!],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width!, canvas.height!);
    pdf.save(`${title}.pdf`);
  };

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, filename);
    URL.revokeObjectURL(url);
  }

  // حفظ المشروع في Supabase
  const saveProject = async () => {
    if (!user) {
      alert("سجّل دخولك الأول عشان تحفظ التصميم");
      return;
    }
    const canvas = fabricRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const canvasJson = canvas.toJSON();
      const thumbnail = canvas.toDataURL({ format: "png", multiplier: 0.3 });

      if (projectId) {
        await supabase
          .from("gd_projects")
          .update({ title, canvas_json: canvasJson, width: preset.w, height: preset.h, thumbnail_url: thumbnail, updated_at: new Date().toISOString() })
          .eq("id", projectId);
      } else {
        const { data, error } = await supabase
          .from("gd_projects")
          .insert({ owner_id: user.id, title, canvas_json: canvasJson, width: preset.w, height: preset.h, thumbnail_url: thumbnail })
          .select("id")
          .single();
        if (!error && data) {
          window.history.replaceState(null, "", `/graphic-design/editor?project=${data.id}`);
        }
      }
      alert("تم الحفظ ✅");
    } catch (e) {
      alert("حصل خطأ أثناء الحفظ");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/graphic-design" className="text-sm text-white/60 hover:text-white flex items-center gap-1">
            <ArrowRight className="h-4 w-4" /> رجوع
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold"
            value={preset.key}
            onChange={(e) => setPreset(CANVAS_PRESETS.find((p) => p.key === e.target.value)!)}
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} ({p.w}×{p.h})
              </option>
            ))}
          </select>

          <button onClick={saveProject} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-black hover:bg-red-500 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} حفظ
          </button>

          <div className="relative group">
            <button className="flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-1.5 text-xs font-black">
              <Download className="h-3.5 w-3.5" /> تصدير
            </button>
            <div className="absolute left-0 top-full mt-1 hidden w-32 flex-col rounded-lg border border-white/10 bg-neutral-900 p-1 group-hover:flex z-10">
              <button onClick={exportPNG} className="rounded px-3 py-1.5 text-right text-xs hover:bg-white/10">PNG</button>
              <button onClick={exportJPG} className="rounded px-3 py-1.5 text-right text-xs hover:bg-white/10">JPG</button>
              <button onClick={exportSVG} className="rounded px-3 py-1.5 text-right text-xs hover:bg-white/10">SVG</button>
              <button onClick={exportPDF} className="rounded px-3 py-1.5 text-right text-xs hover:bg-white/10">PDF</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left toolbar */}
        <div className="flex w-16 flex-col items-center gap-3 border-l border-white/10 py-4">
          <ToolBtn icon={Type} label="نص" onClick={addText} />
          <ToolBtn icon={Square} label="مربع" onClick={() => addShape("rect")} />
          <ToolBtn icon={CircleIcon} label="دائرة" onClick={() => addShape("circle")} />
          <ToolBtn icon={TriangleIcon} label="مثلث" onClick={() => addShape("triangle")} />
          <ToolBtn icon={Minus} label="خط" onClick={() => addShape("line")} />
          <label className="flex flex-col items-center gap-1 cursor-pointer text-white/70 hover:text-red-500">
            <ImagePlus className="h-5 w-5" />
            <span className="text-[9px]">صورة</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
            />
          </label>
        </div>

        {/* Canvas */}
        <div className="flex flex-1 items-center justify-center overflow-auto p-8">
          {loadingTemplate ? (
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          ) : (
            <div className="shadow-2xl">
              <canvas ref={canvasElRef} />
            </div>
          )}
        </div>

        {/* Right panel: properties + layers */}
        <div className="w-64 border-r border-white/10 p-4 space-y-6">
          {hasSelection && (
            <div>
              <h3 className="mb-2 text-xs font-black text-white/60">خصائص العنصر</h3>
              <div className="space-y-2">
                <select
                  className="w-full rounded-lg bg-white/10 px-2 py-1.5 text-xs"
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
                <div>
                  <label className="text-[10px] text-white/50">الشفافية</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedOpacity}
                    onChange={(e) => applyOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-1">
                  <IconBtn icon={ChevronUp} onClick={bringForward} title="للأمام" />
                  <IconBtn icon={ChevronDown} onClick={sendBackward} title="للخلف" />
                  <IconBtn icon={Lock} onClick={toggleLock} title="قفل/فتح" />
                  <IconBtn icon={EyeOff} onClick={toggleVisible} title="إخفاء" />
                  <IconBtn icon={Trash2} onClick={deleteSelected} title="حذف" danger />
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-black text-white/60">
              <Layers className="h-3.5 w-3.5" /> الطبقات ({layers.length})
            </h3>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {layers.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1.5 text-[11px]">
                  <span className="truncate">{l.name}</span>
                  <span className="flex gap-1 text-white/40">
                    {l.locked ? <Lock className="h-3 w-3" /> : null}
                    {!l.visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </span>
                </div>
              ))}
              {layers.length === 0 && <p className="text-[11px] text-white/30">لسه مفيش عناصر</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-white/70 hover:text-red-500">
      <Icon className="h-5 w-5" />
      <span className="text-[9px]">{label}</span>
    </button>
  );
}
function IconBtn({ icon: Icon, onClick, title, danger }: { icon: any; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex-1 rounded-lg border border-white/10 p-1.5 hover:bg-white/10 ${danger ? "text-red-500" : "text-white/70"}`}
    >
      <Icon className="mx-auto h-3.5 w-3.5" />
    </button>
  );
}
