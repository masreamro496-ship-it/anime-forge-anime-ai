import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "./use-auth";

// إعداد الاتصال المباشر بقاعدة البيانات المستقلة
const SUPABASE_URL = "https://ximllvsgpfeqmhharjin.supabase.co";
const SUPABASE_KEY = "sb_publishable_gjpclJMqOF6g74NMKVEM9Q_ndgM4rqX";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type ProfileData = {
  profile: { id: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; pro_expires_at: string | null; earnings_usd: number; credits: number } | null;
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
      
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      
      const profile = profileRes.data as ProfileData["profile"];
      const rolesArr = (rolesRes.data ?? []) as { role: string }[];
      const roleList = rolesArr.map((r) => r.role);
      
      return {
        profile,
        credits: Number(profile?.credits ?? 0), // قراءة الكريديت مباشرة من جدول profiles
        earningsUsd: Number(profile?.earnings_usd ?? 0),
        roles: roleList,
        isAdmin: roleList.includes("admin"),
        isPro: !!profile?.is_pro || roleList.includes("pro"),
      };
    },
  });
}
