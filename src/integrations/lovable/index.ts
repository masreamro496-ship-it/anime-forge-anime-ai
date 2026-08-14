// This file is updated to bypass Lovable Cloud Auth and route directly through Supabase.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      // تحويل اسم المزود لما يفهمه Supabase مباشرة
      const targetProvider = provider === "lovable" ? "google" : (provider === "microsoft" ? "azure" : provider);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: targetProvider as any,
        options: {
          redirectTo: opts?.redirect_uri || (typeof window !== 'undefined' ? window.location.origin : undefined),
          queryParams: opts?.extraParams,
        },
      });

      if (error) {
        return { error };
      }

      return { data, redirected: true };
    },
  },
};
