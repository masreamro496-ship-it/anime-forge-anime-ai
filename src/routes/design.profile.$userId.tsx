// src/routes/graphic-design.profile.$userId.tsx
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Star, UserPlus, UserCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/graphic-design/profile/$userId")({
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = useParams({ from: "/graphic-design/profile/$userId" });
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [userId, user]);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: feed }, { data: l }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("gd_feed_posts").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
      supabase.from("gd_listings").select("*").eq("owner_id", userId).eq("status", "approved"),
      supabase.from("gd_follows").select("*", { count: "exact", head: true }).eq("designer_id", userId),
    ]);
    setProfile(p);
    setPosts(feed || []);
    setListings(l || []);
    setFollowersCount(count || 0);

    if (user) {
      const { data: f } = await supabase
        .from("gd_follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("designer_id", userId)
        .maybeSingle();
      setIsFollowing(!!f);
    }
    setLoading(false);
  }

  async function toggleFollow() {
    if (!user) return;
    if (isFollowing) {
      await supabase.from("gd_follows").delete().eq("follower_id", user.id).eq("designer_id", userId);
      setFollowersCount((c) => c - 1);
    } else {
      await supabase.from("gd_follows").insert({ follower_id: user.id, designer_id: userId });
      setFollowersCount((c) => c + 1);
    }
    setIsFollowing(!isFollowing);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 px-4 py-4">
        <Link to="/graphic-design/gallery" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> المعرض
        </Link>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center text-2xl font-black text-red-500">
            {(profile?.full_name || profile?.username || "م")[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black">{profile?.full_name || profile?.username || "مصمم"}</h1>
            <p className="text-xs text-muted-foreground">{followersCount} متابع · {listings.length} تصميم للبيع</p>
          </div>
          {user && user.id !== userId && (
            <button
              onClick={toggleFollow}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black ${isFollowing ? "border border-border" : "bg-red-600 text-white"}`}
            >
              {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {isFollowing ? "بتتابعه" : "متابعة"}
            </button>
          )}
        </div>

        <h2 className="mt-8 mb-3 text-lg font-black">الأعمال المنشورة</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {posts.map((post) => (
            <img key={post.id} src={post.image_url} className="aspect-square w-full rounded-xl object-cover" />
          ))}
          {posts.length === 0 && <p className="col-span-full text-sm text-muted-foreground">لسه مفيش أعمال منشورة</p>}
        </div>

        <h2 className="mt-8 mb-3 text-lg font-black">تصاميم للبيع</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {listings.map((l) => (
            <Link key={l.id} to="/graphic-design/market/$listingId" params={{ listingId: l.id }} className="overflow-hidden rounded-xl border border-border">
              {l.preview_image_url && <img src={l.preview_image_url} className="aspect-square w-full object-cover" />}
              <div className="p-2">
                <p className="truncate text-xs font-bold">{l.title}</p>
                <p className="flex items-center gap-1 text-[10px] text-red-500">${l.price_usd}</p>
              </div>
            </Link>
          ))}
          {listings.length === 0 && <p className="col-span-full text-sm text-muted-foreground">لسه مفيش تصاميم للبيع</p>}
        </div>
      </div>
    </div>
  );
}

