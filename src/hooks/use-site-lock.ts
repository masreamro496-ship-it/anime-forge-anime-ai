import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useSiteLock(slug: string) {
  const { user } = useAuth();

  const lockQuery = useQuery({
    queryKey: ["site_lock", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_locks")
        .select("is_locked,message")
        .eq("slug", slug)
        .maybeSingle();
      return data ?? { is_locked: false, message: null };
    },
    staleTime: 30_000,
  });

  const isAdminQuery = useQuery({
    queryKey: ["is_admin", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return !!data?.some((r) => r.role === "admin");
    },
    staleTime: 60_000,
  });

  const locked = !!lockQuery.data?.is_locked && !isAdminQuery.data;
  return {
    locked,
    message: lockQuery.data?.message ?? null,
    loading: lockQuery.isLoading || isAdminQuery.isLoading,
  };
}
