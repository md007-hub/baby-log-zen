import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Nestling" },
      { name: "description", content: "Sign in to Nestling to sync your baby's logs across devices and share with your partner." },
      { property: "og:title", content: "Sign in · Nestling" },
      { property: "og:description", content: "Sync baby logs across phones and share with your partner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/family` },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
        else navigate({ to: "/family" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/family" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
        <h1 className="font-display text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-muted-foreground">We sent a confirmation link to {email}. Open it to finish signing up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sync logs across phones and share with your partner.</p>
      </div>
      <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn("h-11 rounded-xl text-sm font-semibold", mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")}
          >
            {m === "in" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <Input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" />
        <Input type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" />
        <Button type="submit" disabled={busy} className="h-12 w-full text-base">
          {busy ? "Please wait…" : mode === "in" ? "Sign In" : "Sign Up"}
        </Button>
      </form>
    </div>
  );
}
