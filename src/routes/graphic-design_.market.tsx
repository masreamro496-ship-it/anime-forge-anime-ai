// src/routes/graphic-design.market.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, DollarSign, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/graphic-design/market")({
  component: MarketPage,
});

interface Listing {
  id: string;
  title: string;
  price_usd: number;
  preview_image_url: string | null;
  listing_type: "template" | "file";
  license: string;
  downloads_count: number;
}

function MarketPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(80);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("gd_listings")
        .select("id, title, price_usd, preview_image_url, listing_type, license, downloads_count")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (!error && data) setListings(data as Listing[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = listings.filter(
    (l) => l.title.toLowerCase().includes(query.toLowerCase()) && l.price_usd <= maxPrice
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/graphic-design" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> جرافيك ديزاين
          </Link>
          <Link to="/graphic-design/upload" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white">
            انشر تصميمك للبيع
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-black mb-4">سوق التصاميم</h1>

        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="دوّر على تصميم..."
              className="w-full rounded-xl border border-border bg-card py-2.5 pr-9 pl-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span>لحد ${maxPrice}</span>
            <input
              type="range"
              min={0}
              max={80}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-20">مفيش تصاميم متاحة دلوقتي</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {filtered.map((l) => (
              <Link
                key={l.id}
                to="/graphic-design/market/$listingId"
                params={{ listingId: l.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-red-500"
              >
                <div className="aspect-square w-full overflow-hidden bg-neutral-800">
                  {l.preview_image_url ? (
                    <img src={l.preview_image_url} alt={l.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/20 text-xs">لا توجد معاينة</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-bold">{l.title}</h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-black text-red-500">
                      <DollarSign className="h-3 w-3" /> {l.price_usd === 0 ? "مجاني" : l.price_usd}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{l.listing_type === "template" ? "قالب قابل للتعديل" : "ملف تحميل"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

