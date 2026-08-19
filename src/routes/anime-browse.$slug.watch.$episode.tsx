import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEpisodeEmbed } from "@/lib/anime-episodes.functions";
import { ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/anime-browse/$slug/watch/$episode")({
  head: () => ({
    meta: [
      { title: "مشاهدة الحلقة — انمي فورج" },
      { name: "description", content: "شاهد الحلقة الآن." },
    ],
  }),
  component: WatchEpisodePage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="mb-3 text-sm text-destructive">{error.message}</p>
      <button onClick={reset} className="rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold text-gold-foreground">
        إعادة
      </button>
    </div>
  ),
});

function WatchEpisodePage() {
  const { slug, episode } = Route.useParams();
  const fn = useServerFn(getEpisodeEmbed);
  const data = useQuery({
    queryKey: ["episode_embed", slug, episode],
    queryFn: () => fn({ data: { slug, episodeNumber: Number(episode) } }),
  });

  const m = data.data;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            to="/anime-browse/$slug"
            params={{ slug }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4 rotate-180" /> قائمة الحلقات
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {data.isLoading || !m ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <>
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
              <iframe
                src={m.embed_url}
                title={`${m.anime_title} — الحلقة ${m.episode_number}`}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <h1 className="mt-4 text-xl font-black">
              {m.anime_title} — الحلقة {m.episode_number}
            </h1>
          </>
        )}
      </div>
    </div>
  );
}
