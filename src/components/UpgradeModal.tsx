import { Ban, FileText, Sparkles, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePro } from "@/hooks/usePro";

const PERKS = [
  { Icon: Sparkles, title: "Unlimited AI Nanny Chat", sub: "Instant 24/7 answers" },
  { Icon: FileText, title: "Unlimited Doctor PDF Exports", sub: "Ready for every pediatric checkup" },
  { Icon: Users, title: "Unlimited Caregiver Sync", sub: "Invite nannies, partners & family" },
  { Icon: Ban, title: "100% Ad-Free experience", sub: "No sponsor messages, ever" },
];

export function UpgradeModal({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason?: string | undefined;
}) {
  const { canTestPro, setTestPro } = usePro();
  const close = (value: boolean) => onOpenChange(value);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-md">
            <DialogHeader className="text-left">
              <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Nestling PRO
              </span>
              <DialogTitle className="font-display text-2xl">Support your family with PRO</DialogTitle>
              {reason && <DialogDescription>{reason}</DialogDescription>}
            </DialogHeader>

            <ul className="space-y-2.5">
              {PERKS.map(({ Icon, title, sub }) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-center text-sm text-muted-foreground">New purchases are currently unavailable here.</p>
            <Button variant="outline" onClick={() => close(false)} className="h-12 w-full rounded-full">Not now</Button>
            {canTestPro && (
              <Button
                variant="ghost"
                className="h-10 w-full text-xs text-muted-foreground"
                onClick={() => {
                  setTestPro(true);
                  close(false);
                }}
              >
                Test mode: switch PRO on without paying
              </Button>
            )}
            <p className="rounded-2xl bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Always Free:</span> Full lifetime history & 2 caregiver sync included.
            </p>
      </DialogContent>
    </Dialog>
  );
}
