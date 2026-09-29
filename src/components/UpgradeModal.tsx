import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Check, FileText, Heart, Sparkles, Waves } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFamily } from "@/hooks/useFamily";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";
import { cn } from "@/lib/utils";

const PERKS = [
  { Icon: Sparkles, text: "Unlimited Nanny AI questions" },
  { Icon: Waves, text: "All sleep sounds — Pink & Brown noise" },
  { Icon: FileText, text: "Doctor-ready PDF export of your logs" },
  { Icon: Heart, text: "Covers both parents on your baby profile" },
];

type Plan = "pro_monthly" | "pro_yearly";

function Checkout({ priceId }: { priceId: Plan }) {
  const fetchClientSecret = async () => {
    const result = await createCheckoutSession({
      data: {
        priceId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Checkout did not start");
    return result.clientSecret;
  };
  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

export function UpgradeModal({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason?: string;
}) {
  const { user } = useFamily();
  const [plan, setPlan] = useState<Plan>("pro_yearly");
  const [checkout, setCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setCheckout(false);
      setError(null);
    }
  };

  const start = () => {
    try {
      getStripeEnvironment();
      setCheckout(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout unavailable");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-md">
        {checkout ? (
          <div className="-mx-2 pt-6">
            <Checkout priceId={plan} />
          </div>
        ) : (
          <>
            <DialogHeader className="text-left">
              <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Nestling Pro
              </span>
              <DialogTitle className="font-display text-2xl">Calmer nights, for both of you</DialogTitle>
              <DialogDescription>{reason ?? "Unlock everything Nestling offers. Logging and sync stay free forever."}</DialogDescription>
            </DialogHeader>

            <ul className="space-y-2.5">
              {PERKS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Billing period">
              {([
                { id: "pro_monthly", title: "Monthly", price: "$4.99", per: "/ month" },
                { id: "pro_yearly", title: "Annual", price: "$39.99", per: "/ year", badge: "Best Value · Save 33%" },
              ] as const).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={plan === p.id}
                  onClick={() => setPlan(p.id)}
                  className={cn(
                    "relative rounded-2xl border p-3 pt-5 text-left transition-colors",
                    plan === p.id ? "border-primary bg-primary/10" : "border-border bg-card",
                  )}
                >
                  {"badge" in p && (
                    <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {p.badge}
                    </span>
                  )}
                  <span className="block text-sm font-semibold text-muted-foreground">{p.title}</span>
                  <span className="block text-xl font-bold">{p.price}</span>
                  <span className="block text-xs text-muted-foreground">{p.per}</span>
                  {plan === p.id && <Check className="absolute right-3 top-4 h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            {user ? (
              <Button onClick={start} className="h-14 w-full text-base font-semibold">
                Start 7-Day Free Trial
              </Button>
            ) : (
              <Button asChild className="h-14 w-full text-base font-semibold" onClick={() => close(false)}>
                <Link to="/auth">Sign in to start your free trial</Link>
              </Button>
            )}
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <p className="text-center text-xs text-muted-foreground">
              Free for 7 days, then {plan === "pro_yearly" ? "$39.99/year" : "$4.99/month"}. Cancel anytime.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
