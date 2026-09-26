import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Milk, Moon, Pause, Play, Plus, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addLog, db, startOfToday } from "@/lib/db";
import { cn } from "@/lib/utils";

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].slice(h > 0 ? 0 : 1).map((n) => String(n).padStart(2, "0")).join(":");
}

function useStopwatch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  const elapsed = accumulated + (startedAt === null ? 0 : now - startedAt);
  return {
    active: startedAt !== null,
    elapsed: Math.max(0, elapsed),
    start: () => { setAccumulated(0); setStartedAt(Date.now()); setNow(Date.now()); },
    resume: () => { setStartedAt(Date.now()); setNow(Date.now()); },
    pause: () => { if (startedAt !== null) setAccumulated(accumulated + Date.now() - startedAt); setStartedAt(null); },
    stop: () => { const duration = accumulated + (startedAt === null ? 0 : Date.now() - startedAt); setStartedAt(null); setAccumulated(0); return duration; },
  };
}

function DiaperIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 6h16" />
      <path d="M4 6v5a7 7 0 0 0 7 7h2a7 7 0 0 0 7-7V6" />
      <path d="M4 9h3" />
      <path d="M20 9h-3" />
    </svg>
  );
}

function SectionCard({ title, icon, tone, extra, children }: {
  title: string; icon: React.ReactNode; tone: "feed" | "diaper" | "sleep";
  extra?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/60 bg-card p-4 shadow-soft", tone === "feed" && "border-feed/50", tone === "diaper" && "border-diaper/50", tone === "sleep" && "border-sleep/50")}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", tone === "feed" && "bg-feed text-feed-foreground", tone === "diaper" && "bg-diaper text-diaper-foreground", tone === "sleep" && "bg-sleep text-sleep-foreground")}>{icon}</span>
        <h2 className="text-base font-bold">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

const bigButton = "min-h-14 flex-1 rounded-xl px-3 text-base font-semibold tap-card";

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function QuickActions() {
  const nursing = useStopwatch();
  const sleep = useStopwatch();
  const [feedMode, setFeedMode] = useState<"bottle" | "nursing">("bottle");
  const [side, setSide] = useState<"Left" | "Right">("Left");
  const [customMl, setCustomMl] = useState(90);
  const [napOpen, setNapOpen] = useState(false);
  const [sleepKind, setSleepKind] = useState<"Nap" | "Night Sleep">("Nap");
  const [napStart, setNapStart] = useState("");
  const [napEnd, setNapEnd] = useState("");
  const diaperCount = useLiveQuery(() => db.logs.where("timestamp").aboveOrEqual(startOfToday()).filter((log) => log.type === "diaper").count(), [], 0);

  const logBottle = async (ml: number) => {
    if (!Number.isInteger(ml) || ml < 1 || ml > 2000) { toast.error("Enter an amount between 1 and 2000ml"); return; }
    await addLog({ type: "feed", value: `Bottle · ${ml}ml` });
    toast.success(`Bottle ${ml}ml logged`);
  };
  const logDiaper = async (kind: "Wet" | "Dirty" | "Both") => {
    await addLog({ type: "diaper", value: kind });
    toast.success(`Logged ${kind} diaper`, { duration: 1800 });
  };
  const savePastNap = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const start = new Date(napStart).getTime();
    const end = new Date(napEnd).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end > Date.now()) {
      toast.error("Enter a valid past start and end time"); return;
    }
    await addLog({ type: "sleep", value: "Nap", notes: formatDuration(end - start), timestamp: end });
    setNapOpen(false); setNapStart(""); setNapEnd("");
    toast.success("Past nap logged");
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Feed" icon={<Milk className="h-5 w-5" strokeWidth={2.25} />} tone="feed">
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-muted p-1" role="group" aria-label="Feed type">
          {(["bottle", "nursing"] as const).map((mode) => (
            <Button key={mode} type="button" variant="ghost" aria-pressed={feedMode === mode} onClick={() => setFeedMode(mode)} className={cn("h-11 rounded-md capitalize text-foreground", feedMode === mode && "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:text-primary-foreground")}>{mode}</Button>
          ))}
        </div>
        {feedMode === "bottle" ? (
          <>
            <div className="flex gap-2">
              {[60, 90, 120].map((ml) => <Button key={ml} type="button" onClick={() => void logBottle(ml)} className={cn(bigButton, "bg-feed text-feed-foreground hover:bg-feed/85")}>{ml}ml</Button>)}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label htmlFor="custom-ml" className="shrink-0 text-sm font-medium">Custom</label>
              <input id="custom-ml" type="number" min="1" max="2000" inputMode="numeric" value={customMl} onChange={(e) => setCustomMl(Number(e.target.value))} className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base tabular-nums" />
              <span className="text-sm text-muted-foreground">ml</span>
              <Button type="button" onClick={() => void logBottle(customMl)} className="h-12 px-4">Log</Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-muted/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 rounded-lg bg-background p-1">
                {(["Left", "Right"] as const).map((s) => <Button key={s} type="button" variant="ghost" disabled={nursing.elapsed > 0} aria-pressed={side === s} onClick={() => setSide(s)} className={cn("h-10 px-3 text-foreground", side === s && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}>{s}</Button>)}
              </div>
              <span className="font-display text-xl font-bold tabular-nums">{formatDuration(nursing.elapsed)}</span>
            </div>
            {nursing.elapsed === 0 && !nursing.active ? (
              <Button type="button" onClick={nursing.start} className={cn(bigButton, "mt-3 w-full")}><Play />Start nursing</Button>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="secondary" onClick={nursing.active ? nursing.pause : nursing.resume} className={cn(bigButton, "min-w-0")} >{nursing.active ? <Pause /> : <Play />}{nursing.active ? "Pause" : "Resume"}</Button>
                <Button type="button" onClick={async () => { const ms = nursing.stop(); await addLog({ type: "feed", value: `Breastfeed · ${side}`, notes: formatDuration(ms) }); toast.success("Nursing logged"); }} className={cn(bigButton, "min-w-0")}><Square />Done</Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Diaper" icon={<DiaperIcon className="h-5 w-5" />} tone="diaper" extra={<span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Today: {diaperCount}</span>}>
        <div className="flex gap-2">
          {(["Wet", "Dirty", "Both"] as const).map((kind) => <Button key={kind} type="button" onClick={() => void logDiaper(kind)} className={cn(bigButton, "min-w-0 bg-diaper text-diaper-foreground hover:bg-diaper/85")}>{kind}</Button>)}
        </div>
      </SectionCard>

      <SectionCard title="Sleep" icon={<Moon className="h-5 w-5" strokeWidth={2.25} />} tone="sleep">
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-muted p-1" role="group" aria-label="Sleep type">
          {(["Nap", "Night Sleep"] as const).map((kind) => (
            <Button key={kind} type="button" variant="ghost" disabled={sleep.elapsed > 0} aria-pressed={sleepKind === kind} onClick={() => setSleepKind(kind)} className={cn("h-11 rounded-md text-foreground", sleepKind === kind && "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:text-primary-foreground")}>{kind}</Button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted/70 px-4 py-3">
          <span className="text-sm text-muted-foreground">{sleep.active ? `${sleepKind} in progress` : `No ${sleepKind.toLowerCase()} running`}</span>
          <span className="font-display text-2xl font-bold tabular-nums">{formatDuration(sleep.elapsed)}</span>
        </div>
        <Button type="button" onClick={async () => {
          if (!sleep.active) { sleep.start(); return; }
          const ms = sleep.stop();
          await addLog({ type: "sleep", value: sleepKind, notes: formatDuration(ms) });
          toast.success(`${sleepKind} logged`);
        }} className={cn(bigButton, "mt-3 w-full", sleep.active && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
          {sleep.active ? <Square /> : <Play />}{sleep.active ? `Stop ${sleepKind}` : `Start ${sleepKind}`}
        </Button>
        <Dialog open={napOpen} onOpenChange={(open) => {
          setNapOpen(open);
          if (open) { setNapStart(localDateTime(new Date(Date.now() - 3600000))); setNapEnd(localDateTime(new Date())); }
        }}>
          <DialogTrigger asChild><Button variant="link" type="button" className="mt-2 h-10 px-0"><Plus />Log Past Nap</Button></DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl border-border bg-card">
            <DialogHeader><DialogTitle>Log Past Nap</DialogTitle><DialogDescription>Enter when the nap started and ended.</DialogDescription></DialogHeader>
            <form onSubmit={(event) => void savePastNap(event)} className="space-y-4">
              <label className="block text-sm font-medium">Start time<input type="datetime-local" required value={napStart} onChange={(e) => setNapStart(e.target.value)} className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-base" /></label>
              <label className="block text-sm font-medium">End time<input type="datetime-local" required value={napEnd} onChange={(e) => setNapEnd(e.target.value)} className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-base" /></label>
              <Button type="submit" className="h-12 w-full">Save nap</Button>
            </form>
          </DialogContent>
        </Dialog>
      </SectionCard>
    </div>
  );
}
