// src/routes/graphic-design.gallery.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Heart, Loader2, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/graphic-design/gallery")({
  component: GalleryPage,
});

interface Post {
  id: string;
  owner_id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  created_at: string;
}

function GalleryPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("gd_feed_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (data) setPosts(data as Post[]);
        setLoading(false);
      });
  }, []);

  async function like(postId: string, current: number) {
    if (!user) return;
    await supabase.from("gd_feed_posts").update({ likes_count: current + 1 }).eq("id", postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes_count: current + 1 } : p)));
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/graphic-design" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> جرافيك ديزاين
          </Link>
          <Link to="/graphic-design/editor" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white">
            صمّم ونشر عملك
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-6 text-2xl font-black">معرض المجتمع</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          </div>
        ) : posts.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">لسه محدش نشر تصاميم — كن أول واحد</p>
        ) : (
          <div className="columns-2 gap-4 md:columns-4 [&>*]:mb-4">
            {posts.map((post) => (
              <div key={post.id} className="break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card">
                <img src={post.image_url} alt={post.caption || ""} className="w-full object-cover" />
                <div className="p-3">
                  {post.caption && <p className="text-xs text-muted-foreground">{post.caption}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <Link
                      to="/graphic-design/profile/$userId"
                      params={{ userId: post.owner_id }}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <UserIcon className="h-3 w-3" /> المصمم
                    </Link>
                    <button onClick={() => like(post.id, post.likes_count)} className="flex items-center gap-1 text-[10px] text-red-500">
                      <Heart className="h-3.5 w-3.5" /> {post.likes_count}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

