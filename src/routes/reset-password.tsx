import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearPasswordRecovery, subscribePasswordRecovery, validatePasswordRecovery, type RecoveryState } from "@/lib/passwordRecovery";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password · Nestling" }, { name: "description", content: "Set a new password for your Nestling account." },
    { property: "og:title", content: "Reset password · Nestling" }, { property: "og:description", content: "Set a new password for your Nestling account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<RecoveryState>({ status: "checking" });
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  useEffect(() => {
    const unsubscribe = subscribePasswordRecovery(setRecovery);
    void validatePasswordRecovery();
    return unsubscribe;
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || recovery.status !== "ready") return;
    if (password.length < 8) { setSubmitError("Use at least 8 characters for your password."); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    setSubmitError("");
    try {
      if (!await validatePasswordRecovery()) return;
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setSubmitError(error.message); return; }
      clearPasswordRecovery();
      setPassword("");
      setConfirm("");
      await supabase.auth.signOut({ scope: "local" });
      setSuccess(true);
    } catch { setSubmitError("We couldn't save your password. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-sm space-y-5 py-10">
    <img src="/icon-192.png" alt="Nestling" className="mx-auto h-14 w-14 rounded-2xl" />
    <h1 className="font-display text-2xl font-bold">{success ? "Password updated" : "Choose a new password"}</h1>
    {success ? <div className="space-y-4" role="status">
      <p className="text-sm text-muted-foreground">Your new password is saved. You can now log in normally.</p>
      <Button asChild className="h-12 w-full rounded-full bg-sage-strong text-primary-foreground hover:bg-sage-strong/90"><Link to="/auth">Back to log in</Link></Button>
    </div> : recovery.status === "checking" ? <p role="status" className="text-sm text-muted-foreground">Verifying your reset link…</p> : recovery.status === "error" ? <div className="space-y-4">
      <p role="alert" className="text-sm text-destructive">{recovery.message}</p>
      <Button variant="secondary" onClick={() => { void validatePasswordRecovery(); }} className="w-full rounded-full">Try again</Button>
      <Button asChild variant="ghost" className="w-full"><Link to="/auth">Request a new link from Forgot password</Link></Button>
    </div> :
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">New password<Input aria-label="New password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5 h-12 focus-visible:ring-sage-strong/50" /></label>
        <label className="block text-sm font-medium">Confirm password<Input aria-label="Confirm password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1.5 h-12 focus-visible:ring-sage-strong/50" /></label>
        {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
        <Button disabled={busy} type="submit" className="h-12 w-full rounded-full bg-sage-strong text-primary-foreground hover:bg-sage-strong/90">{busy ? "Saving…" : "Save password"}</Button>
      </form>}
  </div>;
}