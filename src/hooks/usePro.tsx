import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFamily } from "@/hooks/useFamily";
import { tryStripeEnvironment } from "@/lib/stripe";
import { UpgradeModal } from "@/components/UpgradeModal";

export type OwnSub = { status: string; price_id: string; current_period_end: string | null; cancel_at_period_end: boolean | null };

type ProState = {
  isPro: boolean;
  ownSub: OwnSub | null;
  refreshPro: () => Promise<void>;
  openUpgrade: (reason?: string) => void;
};

const g = globalThis as { __nestlingProCtx?: React.Context<ProState | null> };
const Ctx = (g.__nestlingProCtx ??= createContext<ProState | null>(null));

const fallback: ProState = { isPro: false, ownSub: null, refreshPro: async () => {}, openUpgrade: () => {} };

export function ProProvider({ children }: { children: ReactNode }) {
  const { user, memberCount } = useFamily();
  const [isPro, setIsPro] = useState(false);
  const [ownSub, setOwnSub] = useState<OwnSub | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const refreshPro = useCallback(async () => {
    const env = tryStripeEnvironment();
    if (!user || !env) {
      setIsPro(false);
      setOwnSub(null);
      return;
    }
    const [{ data: pro }, { data: sub }] = await Promise.all([
      supabase.rpc("has_family_pro", { check_env: env }),
      supabase
        .from("subscriptions")
        .select("status, price_id, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setIsPro(!!pro);
    setOwnSub(sub ?? null);
  }, [user]);

  useEffect(() => {
    void refreshPro();
    if (!user) return;
    const channel = supabase
      .channel(`subs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, () => void refreshPro())
      .subscribe();
    const onFocus = () => void refreshPro();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, memberCount, refreshPro]);

  const openUpgrade = useCallback((r?: string) => {
    setReason(r);
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ isPro, ownSub, refreshPro, openUpgrade }}>
      {children}
      <UpgradeModal open={open} onOpenChange={setOpen} reason={reason} />
    </Ctx.Provider>
  );
}

export function usePro() {
  return useContext(Ctx) ?? fallback;
}
