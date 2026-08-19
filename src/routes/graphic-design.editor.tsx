// src/routes/graphic-design.editor.tsx

import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
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
  Palette
} from "lucide-react";

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
  
  // نستخدم any هنا لتجنب استيراد أنواع fabric التي قد تسبب مشاكل أثناء البناء
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricModuleRef = useRef<any>(null);

  const [preset, setPreset] = useState(CANVAS_PRESETS[0]);
  const [layers, setLayers] = useState<LayerMeta[]>([]);
  const [selectedOpacity, setSelectedOpacity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [hasSelection, setHasSelection] = useState(false);
  const [title, setTitle] = useState("تصميم بدون عنوان");
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [isFabricLoaded, setIsFabricLoaded] = useState(false);

  // 1. تحميل خطوط Google Fonts
  useEffect(() => {
    if (typeof document === 'undefined') return;
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

  // 2. التهيئة الديناميكية لمكتبة Fabric (الحل الجذري للخطأ 500)
  useEffect(() => {
    if (typeof window === "undefined" || !canvasElRef.current) return;

    let canvasInstance: any;

    // استيراد المكتبة فقط داخل المتصفح
    import("fabric").then((module) => {
      const fabric = module.fabric || module;
      fabricModuleRef.current = fabric;

      canvasInstance = new fabric.Canvas(canvasElRef.current, {
        width: preset.w,
        height: preset.h,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      });
      
      fabricCanvasRef.current = canvasInstance;
      setIsFabricLoaded(true);

      const refreshLayers = () => {
        if (!canvasInstance) return;
        const objs = canvasInstance.getObjects();
        setLayers(
          objs.map((o: any, i: number) => ({
            id: o.__id || String(i),
            name: o.__name || o.type || `عنصر ${i + 1}`,
            locked: !!o.lockMovementX,
            visible: o.visible !== false,
          })).reverse()
        );
      };

      canvasInstance.on("object:added", refreshLayers);
      canvasInstance.on("object:removed", refreshLayers);
      canvasInstance.on("object:modified", refreshLayers);
      
      canvasInstance.on("selection:created", () => updateSelectionData(canvasInstance));
      canvasInstance.on("selection:updated", () => updateSelectionData(canvasInstance));
      canvasInstance.on("selection:cleared", () => setHasSelection(false));
    });

    return () => {
      if (canvasInstance) {
        canvasInstance.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.w, preset.h]);

  const updateSelectionData = (canvas: any) => {
    setHasSelection(true);
    const obj = canvas.getActiveObject();
    if (obj) {
      setSelectedOpacity(obj.opacity ?? 1);
      setSelectedColor(obj.fill || "#000000");
    }
  };

  // 3. تحميل المشاريع المحفوظة
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isFabricLoaded) return;

    async function loadExisting() {
      if (projectId) {
        const { data, error } = await supabase.from("gd_projects").select("*").eq("id", projectId).single();
        if (!error && data) {
          setTitle(data.title);
          setPreset({ key: "custom", label: "مخصص", w: data.width, h: data.height });
          canvas.loadFromJSON(data.canvas_json, () => canvas.renderAll());
        }
      } else if (templateListingId) {
        setLoadingTemplate(true);
        const { data: listing } = await supabase.from("gd_listings").select("project_id").eq("id", templateListingId).single();
        if (listing?.project_id) {
          const { data: proj } = await supabase.from("gd_projects").select("*").eq("id", listing.project_id).single();
          if (proj) {
            setTitle(proj.title + " (نسخة)");
            canvas.loadFromJSON(proj.canvas_json, () => canvas.renderAll());
          }
        }
        setLoadingTemplate(false);
      }
    }
    loadExisting();
  }, [projectId, templateListingId, isFabricLoaded]);

  // أدوات الإضافة
  const addText = useCallback(() => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas) return;

    const text = new fabric.Textbox("اكتب نصك هنا", {
      left: canvas.width / 2 - 100,
      top: canvas.height / 2 - 20,
      fontSize: 42,
      fontFamily: FONT_FAMILIES[0],
      fill: "#111111",
      width: 300,
      textAlign: "center"
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  }, []);

  const addShape = useCallback((shapeType: "rect" | "circle" | "triangle" | "line") => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas) return;

    let obj;
    const common = { 
      left: canvas.width / 2 - 75, 
      top: canvas.height / 2 - 75, 
      fill: "#ef4444", 
      width: 150, 
      height: 150,
      rx: shapeType === "rect" ? 10 : 0, // حواف ناعمة للمربع
      ry: shapeType === "rect" ? 10 : 0
    };

    if (shapeType === "rect") obj = new fabric.Rect(common);
    if (shapeType === "circle") obj = new fabric.Circle({ ...common, radius: 75 });
    if (shapeType === "triangle") obj = new fabric.Triangle(common);
    if (shapeType === "line") obj = new fabric.Line([50, 50, 250, 50], { left: canvas.width / 2 - 100, top: canvas.height / 2, stroke: "#ef4444", strokeWidth: 8 });
    
    if (obj) {
      canvas.add(obj);
      canvas.setActiveObject(obj);
    }
  }, []);

  const uploadImage = useCallback((file: File) => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas) return;

    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url, (img: any) => {
      img.scaleToWidth(Math.min(300, canvas.width - 40));
      img.set({ left: canvas.width / 2 - img.getScaledWidth() / 2, top: canvas.height / 2 - img.getScaledHeight() / 2 });
      canvas.add(img);
      canvas.setActiveObject(img);
      URL.revokeObjectURL(url);
    });
  }, []);

  // تعديل الخصائص
  const applyColor = (color: string) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      if (obj.type === "line") obj.set("stroke", color);
      else obj.set("fill", color);
      canvas.renderAll();
      setSelectedColor(color);
    }
  };

  const applyOpacity = (val: number) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      obj.set("opacity", val);
      canvas.renderAll();
      setSelectedOpacity(val);
    }
  };

  const setFontFamily = (font: string) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set("fontFamily", font);
      canvas.renderAll();
    }
  };

  // التحكم بالطبقات
  const executeCanvasCommand = (command: string) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj || !canvas) return;

    switch (command) {
      case "forward": canvas.bringForward(obj); break;
      case "backward": canvas.sendBackwards(obj); break;
      case "delete": canvas.remove(obj); canvas.discardActiveObject(); break;
      case "toggleLock":
        const locked = !!obj.lockMovementX;
        obj.set({ lockMovementX: !locked, lockMovementY: !locked, lockScalingX: !locked, lockScalingY: !locked, lockRotation: !locked });
        break;
      case "toggleVisible":
        obj.set({ visible: obj.visible === false });
        canvas.discardActiveObject();
        break;
    }
    canvas.renderAll();
  };

  // التصدير (مُحسّن)
  const exportImage = (format: "png" | "jpeg", ext: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format, multiplier: 2, quality: 0.95 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title}.${ext}`;
    a.click();
  };

  const exportPDF = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // تحميل jsPDF ديناميكياً لتجنب مشاكل السيرفر
    const { default: jsPDF } = await import("jspdf");
    
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${title}.pdf`);
  };

  // الحفظ
  const saveProject = async () => {
    if (!user) {
      alert("سجّل دخولك الأول عشان تقدر تحفظ تصميمك بكل سهولة!");
      return;
    }
    const canvas = fabricCanvasRef.current;
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
      alert("تم حفظ التصميم بنجاح! ✅");
    } catch (e) {
      alert("حصل خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-950 font-sans text-white overflow-hidden">
      {/* 🚀 الشريط العلوي (Top Bar) */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-neutral-900/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link to="/graphic-design" className="group flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white">
            <ArrowRight className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            الرئيسية
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="اسم التصميم..."
            className="w-48 rounded-md bg-transparent px-2 py-1 text-base font-bold text-white outline-none transition-all focus:bg-white/5 focus:ring-2 focus:ring-red-500/50"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-neutral-700"
            value={preset.key}
            onChange={(e) => setPreset(CANVAS_PRESETS.find((p) => p.key === e.target.value)!)}
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} ({p.w}×{p.h})
              </option>
            ))}
          </select>

          <div className="relative group">
            <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-800 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-neutral-700">
              <Download className="h-4 w-4" /> تصدير
            </button>
            <div className="absolute left-0 top-full mt-2 hidden w-36 flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-800 shadow-xl group-hover:flex z-50">
              <button onClick={() => exportImage('png', 'png')} className="px-4 py-2.5 text-right text-sm font-medium hover:bg-white/10 hover:text-red-400 transition-colors">صورة PNG</button>
              <button onClick={() => exportImage('jpeg', 'jpg')} className="px-4 py-2.5 text-right text-sm font-medium hover:bg-white/10 hover:text-red-400 transition-colors">صورة JPG</button>
              <div className="h-px w-full bg-white/10" />
              <button onClick={exportPDF} className="px-4 py-2.5 text-right text-sm font-medium hover:bg-white/10 hover:text-red-400 transition-colors">ملف PDF</button>
            </div>
          </div>

          <button 
            onClick={saveProject} 
            disabled={saving} 
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:scale-105 hover:from-red-500 hover:to-red-400 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
            حفظ التصميم
          </button>
        </div>
      </header>

      {/* 🎨 منطقة العمل (Workspace) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* شريط الأدوات الأيسر (Toolbar) */}
        <aside className="flex w-20 flex-col items-center gap-4 border-l border-white/10 bg-neutral-900/30 py-6 overflow-y-auto custom-scrollbar">
          <ToolBtn icon={Type} label="نص" onClick={addText} />
          <div className="h-px w-8 bg-white/10 my-1" />
          <ToolBtn icon={Square} label="مربع" onClick={() => addShape("rect")} />
          <ToolBtn icon={CircleIcon} label="دائرة" onClick={() => addShape("circle")} />
          <ToolBtn icon={TriangleIcon} label="مثلث" onClick={() => addShape("triangle")} />
          <ToolBtn icon={Minus} label="خط" onClick={() => addShape("line")} />
          <div className="h-px w-8 bg-white/10 my-1" />
          
          <label className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-3 text-white/50 transition-all hover:bg-white/5 hover:text-red-400">
            <ImagePlus className="h-6 w-6 transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-bold">صورة</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  uploadImage(e.target.files[0]);
                  e.target.value = ''; // Reset input
                }
              }}
            />
          </label>
        </aside>

        {/* لوحة الرسم (Canvas Area) */}
        <main className="relative flex flex-1 items-center justify-center bg-neutral-950 p-8 overflow-auto">
          {/* نمط المربعات لتمثيل الشفافية (Checkerboard background) */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }} />
          
          {loadingTemplate || !isFabricLoaded ? (
            <div className="flex flex-col items-center gap-4 z-10">
              <Loader2 className="h-10 w-10 animate-spin text-red-500" />
              <p className="text-sm font-medium text-white/60">جاري تجهيز مساحة العمل...</p>
            </div>
          ) : (
            <div className="relative z-10 shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-all duration-300">
              <canvas ref={canvasElRef} className="rounded-sm" />
            </div>
          )}
        </main>

        {/* اللوحة الجانبية اليمنى (Properties & Layers) */}
        <aside className="flex w-72 flex-col border-r border-white/10 bg-neutral-900/30 overflow-y-auto">
          
          {/* خصائص العنصر المحدد */}
          <div className={`flex flex-col gap-5 p-5 border-b border-white/10 transition-opacity duration-300 ${hasSelection ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <h3 className="text-xs font-black tracking-wider text-white/40 uppercase">خصائص العنصر</h3>
            
            <div className="space-y-4">
              {/* اختيار الخط */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/60">نوع الخط (للنصوص)</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-red-500/50"
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </div>

              {/* اختيار اللون */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/60 flex items-center gap-1.5"><Palette className="w-3 h-3"/> لون العنصر</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => applyColor(e.target.value)}
                    className="h-8 w-14 cursor-pointer rounded bg-transparent outline-none"
                  />
                  <span className="text-xs font-mono text-white/70 uppercase">{selectedColor}</span>
                </div>
              </div>

              {/* الشفافية */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-white/60">
                  <label>الشفافية</label>
                  <span>{Math.round(selectedOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedOpacity}
                  onChange={(e) => applyOpacity(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              {/* أزرار التحكم */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                <IconBtn icon={ChevronUp} onClick={() => executeCanvasCommand('forward')} title="إحضار للأمام" />
                <IconBtn icon={ChevronDown} onClick={() => executeCanvasCommand('backward')} title="إرسال للخلف" />
                <IconBtn icon={Lock} onClick={() => executeCanvasCommand('toggleLock')} title="قفل/فتح التعديل" />
                <IconBtn icon={EyeOff} onClick={() => executeCanvasCommand('toggleVisible')} title="إخفاء مؤقت" />
                <IconBtn icon={Trash2} onClick={() => executeCanvasCommand('delete')} title="حذف العنصر" danger />
              </div>
            </div>
          </div>

          {/* مدير الطبقات (Layers) */}
          <div className="flex flex-1 flex-col p-5">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black tracking-wider text-white/40 uppercase">
              <Layers className="h-4 w-4" /> 
              الطبقات ({layers.length})
            </h3>
            
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
              {layers.map((layer) => (
                <div 
                  key={layer.id} 
                  className="group flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-xs transition-colors hover:border-white/10 hover:bg-white/10"
                >
                  <span className="truncate pr-2 font-medium text-white/80">{layer.name}</span>
                  <div className="flex gap-2 text-white/30">
                    {layer.locked && <Lock className="h-3.5 w-3.5 text-amber-500/70" />}
                    {!layer.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                </div>
              ))}
              
              {layers.length === 0 && (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5">
                  <p className="text-[11px] font-medium text-white/30">مساحة العمل فارغة</p>
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}

// مكونات الأزرار المساعدة (Components)
function ToolBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className="group flex w-full flex-col items-center gap-1.5 rounded-xl py-3 text-white/50 transition-all hover:bg-white/5 hover:text-red-400 active:scale-95"
    >
      <Icon className="h-6 w-6 transition-transform group-hover:scale-110" />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function IconBtn({ icon: Icon, onClick, title, danger }: { icon: any; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex aspect-square items-center justify-center rounded-lg border transition-all active:scale-95
        ${danger 
          ? "border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" 
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/20 hover:text-white"
        }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

