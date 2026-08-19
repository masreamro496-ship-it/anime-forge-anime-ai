import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnimeEpisodesBySlug } from "@/lib/anime-episodes.functions";
import { ArrowRight, Film, Loader2 } from "lucide-react";

export const Route = createFileRoute("/anime-browse/$slug")({
  head: () => ({
    meta: [
      { title: "حلقات الأنمي — انمي فورج" },
      { name: "description", content: "كل حلقات هذا الأنمي." },
    ],
  }),
  component: AnimeEpisodesPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="mb-3 text-sm text-destructive">{error.message}</p>
      <button onClick={reset} className="rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold text-gold-foreground">
        إعادة
      </button>
    </div>
  ),
});

function AnimeEpisodesPage() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getAnimeEpisodesBySlug);
  const data = useQuery({
    queryKey: ["anime_episodes", slug],
    queryFn: () => fn({ data: { slug } }),
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/anime-browse" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> رجوع
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {data.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : data.data ? (
          <>
            <h1 className="mb-4 text-2xl font-black">{data.data.title}</h1>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
              <Film className="h-5 w-5 text-gold" /> الحلقات
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {data.data.episodes.map((ep) => (
                <Link
                  key={ep.id}
                  to="/anime-browse/$slug/watch/$episode"
                  params={{ slug, episode: String(ep.number) }}
                  className="flex items-center justify-center rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground shadow-card transition hover:bg-gradient-gold hover:text-gold-foreground"
                >
                  {ep.number}
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
