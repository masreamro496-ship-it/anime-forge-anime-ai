// src/routes/graphic-design.upload.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Upload, Loader2, ImagePlus, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/graphic-design/upload")({
  component: UploadPage,
});

const PUBLISH_COST_CREDITS = 10;
const STORAGE_BUCKET = "gd-marketplace-files";

interface MyProject {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [credits, setCredits] = useState<number | null>(null);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);

  const [listingType, setListingType] = useState<"template" | "file">("template");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState("استخدام شخصي");
  const [price, setPrice] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("credits").eq("id", user.id).single().then(({ data }) => {
      if (data) setCredits(data.credits);
    });
    supabase
      .from("gd_projects")
      .select("id, title, thumbnail_url")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => data && setMyProjects(data));
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">لازم تسجّل دخولك الأول عشان تنشر تصميم</p>
        <Link to="/login" search={{ redirect: "/graphic-design/upload" }} className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const notEnoughCredits = credits !== null && credits < PUBLISH_COST_CREDITS;

  async function handlePublish() {
    if (!title.trim()) return alert("اكتب عنوان للتصميم");
    if (listingType === "template" && !selectedProjectId) return alert("اختار مشروع من محرر التصميم");
    if (listingType === "file" && !file) return alert("ارفع الملف اللي عايز تبيعه");
    if (notEnoughCredits) return alert(`محتاج ${PUBLISH_COST_CREDITS} كريدت على الأقل عشان تنشر`);

    setSubmitting(true);
    try {
      let filePath: string | null = null;
      let previewUrl: string | null = null;

      if (listingType === "file" && file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
        if (upErr) throw upErr;
        filePath = path;
      }

      if (previewImage) {
        const path = `previews/${user.id}/${Date.now()}-${previewImage.name}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, previewImage, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        previewUrl = pub.publicUrl;
      } else if (listingType === "template") {
        const proj = myProjects.find((p) => p.id === selectedProjectId);
        previewUrl = proj?.thumbnail_url || null;
      }

      const { data, error } = await supabase.rpc("gd_publish_listing", {
        p_owner_id: user.id,
        p_title: title.trim(),
        p_description: description.trim(),
        p_listing_type: listingType,
        p_project_id: listingType === "template" ? selectedProjectId : null,
        p_file_path: filePath,
        p_preview_image_url: previewUrl,
        p_license: license,
        p_price_usd: price,
        p_publish_cost_credits: PUBLISH_COST_CREDITS,
      });

      if (error) throw error;

      alert("تم إرسال التصميم للمراجعة! هيظهر في السوق فور موافقة الأدمن ✅");
      navigate({ to: "/graphic-design/market" });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "حصل خطأ أثناء النشر");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 px-4 py-4">
        <Link to="/graphic-design" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> جرافيك ديزاين
        </Link>
      </header>

      <div className="container mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-black mb-1">انشر تصميمك للبيع</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          نشر أي تصميم بيكلّف <b className="text-red-500">{PUBLISH_COST_CREDITS} كريدت</b> (بتُخصم فوراً عند النشر)
        </p>

        {credits !== null && (
          <div className={`mb-6 flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${notEnoughCredits ? "border-red-500/50 bg-red-500/10 text-red-500" : "border-border bg-card"}`}>
            <AlertCircle className="h-4 w-4" />
            رصيدك الحالي: {credits} كريدت
            {notEnoughCredits && " — رصيدك مش كافي للنشر"}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-black">نوع المنتج</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setListingType("template")}
                className={`rounded-xl border-2 p-3 text-xs font-black ${listingType === "template" ? "border-red-500 bg-red-500/10 text-red-500" : "border-border"}`}
              >
                قالب قابل للتعديل
                <p className="mt-1 text-[10px] font-normal text-muted-foreground">المشتري يفتحه في المحرر ويعدّل عليه</p>
              </button>
              <button
                onClick={() => setListingType("file")}
                className={`rounded-xl border-2 p-3 text-xs font-black ${listingType === "file" ? "border-red-500 bg-red-500/10 text-red-500" : "border-border"}`}
              >
                ملف للتحميل المباشر
                <p className="mt-1 text-[10px] font-normal text-muted-foreground">صورة، PDF، أو حزمة أيقونات</p>
              </button>
            </div>
          </div>

          {listingType === "template" ? (
            <div>
              <label className="mb-1.5 block text-xs font-black">اختار مشروع من المحرر</label>
              {myProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  مفيش مشاريع محفوظة عندك.{" "}
                  <Link to="/graphic-design/editor" className="text-red-500 underline">
                    افتح المحرر وابدأ تصميم
                  </Link>
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {myProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`overflow-hidden rounded-xl border-2 ${selectedProjectId === p.id ? "border-red-500" : "border-border"}`}
                    >
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-neutral-800 text-white/20 text-[10px]">
                          بدون معاينة
                        </div>
                      )}
                      <p className="truncate p-1 text-[10px]">{p.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-black">ملف المنتج</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-xs text-muted-foreground hover:border-red-500">
                <Upload className="h-4 w-4" />
                {file ? file.name : "اضغط لرفع الملف (PDF, ZIP, PNG...)"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-black">صورة معاينة (تظهر في السوق)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-xs text-muted-foreground hover:border-red-500">
              <ImagePlus className="h-4 w-4" />
              {previewImage ? previewImage.name : "اضغط لرفع صورة معاينة"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPreviewImage(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black">العنوان</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black">الوصف</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black">نوع الترخيص</label>
            <select value={license} onChange={(e) => setLicense(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
              <option value="استخدام شخصي">استخدام شخصي</option>
              <option value="استخدام تجاري">استخدام تجاري</option>
              <option value="حصري (تحويل الملكية)">حصري (تحويل الملكية)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-black">
              <span>السعر</span>
              <span className="text-red-500">{price === 0 ? "مجاني" : `$${price}`}</span>
            </label>
            <input
              type="range"
              min={0}
              max={80}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>$0 (مجاني)</span>
              <span>$80 (الحد الأقصى)</span>
            </div>
          </div>

          <button
            onClick={handlePublish}
            disabled={submitting || notEnoughCredits}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `انشر مقابل ${PUBLISH_COST_CREDITS} كريدت`}
          </button>
        </div>
      </div>
    </div>
  );
}

