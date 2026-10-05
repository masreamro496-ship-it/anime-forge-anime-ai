import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "./use-auth";
import { getWallet } from "@/lib/wallet.functions";
import { getMyRank } from "@/lib/ranks.functions";

// إعداد الاتصال المباشر بقاعدة البيانات المستقلة
const SUPABASE_URL = "https://ximllvsgpfeqmhharjin.supabase.co";
const SUPABASE_KEY = "sb_publishable_gjpclJMqOF6g74NMKVEM9Q_ndgM4rqX";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type ProfileData = {
  profile: { id: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; pro_expires_at: string | null; earnings_usd: number; credits: number } | null;
  credits: number;
  welcomeClaimed: boolean;
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

      const [profileRes, rolesRes, wallet, rank] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        getWallet().catch(() => null),
        getMyRank().catch(() => null),
      ]);

      const profile = profileRes.data as ProfileData["profile"];
      const rolesArr = (rolesRes.data ?? []) as { role: string }[];
      const roleList = rolesArr.map((r) => r.role);

      return {
        profile,
        // رصيد الكريدت من قاعدة بيانات Lovable الجديدة
        credits: wallet?.ok ? wallet.balance : Number(profile?.credits ?? 0),
        welcomeClaimed: wallet?.ok ? wallet.welcomeClaimed : true,
        earningsUsd: Number(profile?.earnings_usd ?? 0),
        roles: roleList,
        isAdmin: roleList.includes("admin") || !!rank?.isAdmin,
        isPro: !!profile?.is_pro || roleList.includes("pro") || !!rank?.isPro,
      };
    },
  });
}
