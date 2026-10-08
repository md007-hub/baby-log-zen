import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Re-checks the signed-in user's RevenueCat status server-side and writes the
 * result to `user_entitlements`. The client never decides its own ad-free
 * status: RevenueCat is asked directly with the secret key.
 */
export const syncEntitlementsFromRevenueCat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env['REVENUECAT_SECRET_API_KEY'];
    if (!key) return { ok: false as const, reason: "not_configured" as const };

    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(context.userId)}`,
      { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } },
    );
    if (!res.ok) return { ok: false as const, reason: "revenuecat_error" as const };

    const body = (await res.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
    };
    const now = Date.now();
    const active = Object.values(body.subscriber?.entitlements ?? {}).some(
      (e) => e.expires_date === null || new Date(e.expires_date).getTime() > now,
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = active
      ? { tier: "premium", status: "active", is_ad_free: true }
      : { tier: "free", status: "expired", is_ad_free: false };
    const { error } = await supabaseAdmin
      .from("user_entitlements")
      .upsert({ user_id: context.userId, ...row, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const, active };
  });
