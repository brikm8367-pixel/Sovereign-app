/**
 * Sovereign OAuth helper — thin wrapper around Supabase OAuth.
 * Kept for backward-compat; prefer importing supabase directly.
 */
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const sovereign = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      const redirectTo = opts?.redirect_uri ?? window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, queryParams: opts?.extraParams },
      });
      if (error) return { error, redirected: false };
      return { redirected: !!data?.url, error: null };
    },
  },
};

// backward-compat alias
export const lovable = sovereign;
