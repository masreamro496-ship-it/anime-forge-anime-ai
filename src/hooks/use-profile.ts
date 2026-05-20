import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type ProfileData = {
  profile: { id: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; pro_expires_at: string | null } | null;
  credits: number;
  roles: string[];
  isAdmin: boolean;
  isPro: boolean;
};

export function useProfile() {
  const { user } = useAuth();

  return useQuery<ProfileData>({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("no user");
      const [{ data: profile }, { data: credits }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("credits").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const roleList = (roles ?? []).map((r) => r.role as string);
      return {
        profile: profile ?? null,
        credits: Number(credits?.balance ?? 0),
        roles: roleList,
        isAdmin: roleList.includes("admin"),
        isPro: !!profile?.is_pro || roleList.includes("pro"),
      };
    },
  });
}
