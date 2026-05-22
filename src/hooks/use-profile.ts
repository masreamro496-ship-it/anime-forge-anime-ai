import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type ProfileData = {
  profile: { id: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; pro_expires_at: string | null; earnings_usd: number } | null;
  credits: number;
  earningsUsd: number;
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
      const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { maybeSingle: () => Promise<{ data: { earnings_usd?: number; balance?: number; role?: string; id?: string; is_pro?: boolean } | null }> } } } };
      const [profileRes, creditsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("credits").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const profile = profileRes.data as ProfileData["profile"];
      const credits = creditsRes.data as { balance: number } | null;
      const rolesArr = (rolesRes.data ?? []) as { role: string }[];
      const roleList = rolesArr.map((r) => r.role);
      void sb;
      return {
        profile,
        credits: Number(credits?.balance ?? 0),
        earningsUsd: Number(profile?.earnings_usd ?? 0),
        roles: roleList,
        isAdmin: roleList.includes("admin"),
        isPro: !!profile?.is_pro || roleList.includes("pro"),
      };
    },
  });
}
