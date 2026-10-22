import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const PROOF_KEY = "nestling-password-recovery";
export const RECOVERY_WINDOW_MS = 60 * 60 * 1000;
export type RecoveryProof = { userId: string; sessionId: string; expiresAt: number };
export type RecoveryState = { status: "checking" | "ready" | "error"; message?: string };
let started = false;
let callbackError = false;
let codeExchange: Promise<void> | null = null;
let state: RecoveryState = { status: "checking" };
const listeners = new Set<(state: RecoveryState) => void>();

function sessionId(session: Session): string | null {
  try {
    const payload = session.access_token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.session_id === "string" ? decoded.session_id : null;
  } catch { return null; }
}

export function isRecoveryProofValid(proof: RecoveryProof | null, userId: string, id: string | null, now: number): boolean {
  return !!proof && !!id && proof.userId === userId && proof.sessionId === id && proof.expiresAt > now && proof.expiresAt <= now + RECOVERY_WINDOW_MS;
}

function readProof(): RecoveryProof | null {
  try { return JSON.parse(sessionStorage.getItem(PROOF_KEY) ?? "null"); }
  catch { return null; }
}

export function clearPasswordRecovery() {
  sessionStorage.removeItem(PROOF_KEY);
}

function publish(next: RecoveryState) {
  state = next;
  listeners.forEach(listener => listener(next));
}

export function subscribePasswordRecovery(listener: (state: RecoveryState) => void) {
  listeners.add(listener);
  listener(state);
  return () => { listeners.delete(listener); };
}

// Call before the first auth operation. The SDK alone consumes implicit tokens
// and exchanges PKCE codes; a second exchange would reuse a one-time code.
export function startPasswordRecovery() {
  if (started) return;
  started = true;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (url.searchParams.has("code") || hash.has("access_token") || hash.has("type")) clearPasswordRecovery();
  callbackError = [url.searchParams, hash].some(params => params.has("error") || params.has("error_code") || params.has("error_description"));
  if (callbackError) {
    clearPasswordRecovery();
    publish({ status: "error", message: "This reset link has expired or is invalid. Request a new link and open the newest email." });
    if (url.pathname !== "/reset-password") {
      window.location.replace(`/reset-password${url.search}${url.hash}`);
    } else window.history.replaceState(window.history.state, "", "/reset-password");
  }
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
      const id = sessionId(session);
      if (!id || callbackError) return;
      const proof: RecoveryProof = { userId: session.user.id, sessionId: id, expiresAt: Math.min(Date.now() + RECOVERY_WINDOW_MS, (session.expires_at ?? 0) * 1000) };
      sessionStorage.setItem(PROOF_KEY, JSON.stringify(proof));
      // Never call auth methods inside this callback (the SDK holds its lock).
      window.setTimeout(() => {
        if (window.location.pathname !== "/reset-password") window.location.replace("/reset-password");
      }, 0);
    } else if (event === "SIGNED_OUT") {
      clearPasswordRecovery();
    } else if (event === "SIGNED_IN" && (!session || !isRecoveryProofValid(readProof(), session.user.id, sessionId(session), Date.now()))) {
      // The SDK also emits SIGNED_IN when restoring an existing session.
      // Keep proof only when it still belongs to this exact recovery session.
      clearPasswordRecovery();
    }
  });
}

export async function validatePasswordRecovery(): Promise<boolean> {
  startPasswordRecovery();
  if (callbackError) return false;
  try {
    // getUser waits for SDK URL initialization and revalidates with Auth.
    let { data: userData, error } = await supabase.auth.getUser();
    const code = new URL(window.location.href).searchParams.get("code");
    if (code) {
      // This generated client uses implicit flow. Its SDK rejects a PKCE URL
      // before exchange. Only exchange a code left AFTER initialization; PKCE
      // clients remove it themselves. Share the promise to prevent double use.
      codeExchange ??= (async () => {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      })();
      await codeExchange;
      ({ data: userData, error } = await supabase.auth.getUser());
    }
    // URL initialization schedules PASSWORD_RECOVERY on the next task.
    await new Promise(resolve => window.setTimeout(resolve, 0));
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (error || !userData.user || !session || !isRecoveryProofValid(readProof(), userData.user.id, sessionId(session), Date.now())) {
      clearPasswordRecovery();
      publish({ status: "error", message: "This reset link has expired, has already been used, or could not be verified. Request a new link. Open it in the same browser where you requested it." });
      return false;
    }
    window.history.replaceState(window.history.state, "", "/reset-password");
    publish({ status: "ready" });
    return true;
  } catch {
    publish({ status: "error", message: "We couldn't verify your reset link. Check your connection and try again." });
    return false;
  }
}

export function passwordResetRedirect(origin: string): string {
  // Preview links remain on their own allowed origin. Worker-hosted/native
  // copies must send website recovery links to the published website.
  const url = new URL(origin);
  return `${url.hostname.endsWith(".workers.dev") || url.protocol !== "https:" ? "https://nestling-app.lovable.app" : url.origin}/reset-password`;
}