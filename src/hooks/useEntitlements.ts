import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ENTITLEMENTS_EVENT } from "@/lib/revenuecat";

type Entitlements = {
  isAdFree: boolean;
  isPremium: boolean;
  tier: string;
  loading: boolean;
  refreshEntitlements: () => Promise<void>;
};

/** Reads the signed-in user's `user_entitlements` row and keeps it live. */
export function useEntitlements(): Entitlements {
  const [isAdFree, setIsAdFree] = useState(false);
  const [tier, setTier] = useState("free");
  const [status, setStatus] = useState("expired");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const alive = useRef(true);

  const refreshEntitlements = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive.current) return;
      setUserId(user?.id ?? null);
      if (!user) {
        setIsAdFree(false); setTier("free"); setStatus("expired"); setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_entitlements")
        .select("is_ad_free, tier, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive.current) return;
      if (error) console.warn("useEntitlements: fetch failed", error.message);
      setIsAdFree(Boolean(data?.is_ad_free));
      setTier(data?.tier ?? "free");
      setStatus(data?.status ?? "expired");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refreshEntitlements();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void refreshEntitlements();
    });
    const onChange = () => void refreshEntitlements();
    window.addEventListener(ENTITLEMENTS_EVENT, onChange);
    return () => {
      alive.current = false;
      sub.subscription.unsubscribe();
      window.removeEventListener(ENTITLEMENTS_EVENT, onChange);
    };
  }, [refreshEntitlements]);

  // Realtime: pick up server-side changes (purchases, webhooks) instantly.
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`entitlements-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_entitlements", filter: `user_id=eq.${userId}` },
        () => void refreshEntitlements(),
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, refreshEntitlements]);

  return {
    isAdFree,
    isPremium: tier === "premium" && status === "active",
    tier,
    loading,
    refreshEntitlements,
  };
}
