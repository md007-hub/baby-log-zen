import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Entitlements = { isAdFree: boolean; loading: boolean };

/**
 * Reads the signed-in user's row from `user_entitlements`.
 * Signed-out users are treated as not ad-free (loading=false, isAdFree=false).
 */
export function useEntitlements(): Entitlements {
  const [isAdFree, setIsAdFree] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) { setIsAdFree(false); setLoading(false); }
          return;
        }
        const { data, error } = await supabase
          .from("user_entitlements")
          .select("is_ad_free")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) {
          if (error) console.warn("useEntitlements: fetch failed", error.message);
          setIsAdFree(Boolean(data?.is_ad_free));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    // Re-check when the signed-in identity changes (sign in/out, profile update).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { isAdFree, loading };
}
