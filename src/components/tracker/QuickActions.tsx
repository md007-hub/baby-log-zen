import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CloudSun, Droplets, Hourglass, Milk, MoonStar, Pause, Play, Plus, Square, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addLog, db, deleteLog, startOfToday, type LogEntry } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useFamily } from "@/hooks/useFamily";

const FOODS = ["Avocado", "Banana", "Sweet Potato", "Oatmeal", "Egg", "Yogurt"];
const PORTIONS = ["Few tastes", "Small (1-2 tbsp)", "Medium (~1/2 cup)", "Full meal"];
const REACTIONS = ["😋 Loved it", "😐 Neutral", "😣 Disliked", "⚠️ Allergic reaction / Rash"];

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
      <rect x="14" y="2" width="7" height="6" rx="2" />
      <path d="M15 8v9a5 5 0 0 1-10 0V6a2 2 0 0 1 4 0v11" />
    </svg>
  );
}

type Tone = "feed" | "diaper" | "sleep" | "tummy";
const tint: Record<Tone, string> = { feed: "bg-feed-tint", diaper: "bg-diaper-tint", sleep: "bg-sleep-tint", tummy: "bg-tummy-tint" };
const badge: Record<Tone, string> = {
  feed: "bg-feed text-feed-foreground",
  diaper: "bg-diaper text-diaper-foreground",
  sleep: "bg-sleep text-sleep-foreground",
  tummy: "bg-tummy text-tummy-foreground",
};
const pill: Record<Tone, string> = {
  feed: "bg-feed text-feed-foreground ring-2 ring-feed-foreground/40",
  diaper: "bg-diaper text-diaper-foreground ring-2 ring-diaper-foreground/40",
  sleep: "bg-sleep text-sleep-foreground ring-2 ring-sleep-foreground/40",
  tummy: "bg-tummy text-tummy-foreground ring-2 ring-tummy-foreground/40",
};

function SectionCard({ title, icon, tone, extra, children }: { title: string; icon: React.ReactNode; tone: Tone; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-3xl p-4 shadow-soft", tint[tone])}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", badge[tone])}>{icon}</span>
        <h2 className="text-base font-bold">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

const bigButton = "min-h-14 flex-1 rounded-2xl px-3 text-base font-semibold tap-card";
const numInput = "h-12 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-base tabular-nums";
const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
const pillBase = "min-h-12 flex-1 rounded-full bg-card px-3 text-base font-semibold text-foreground shadow-soft tap-card hover:bg-card";

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
// datetime-local "YYYY-MM-DDTHH:mm" parsed explicitly as device-local time.
function parseLocal(v: string) {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return NaN;
  return new Date(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!).getTime();
}
export function defaultSleepKind(ts = Date.now()): "Nap" | "Night Sleep" {
  const h = new Date(ts).getHours();
  return h >= 7 && h < 19 ? "Nap" : "Night Sleep";
}

async function logWithUndo(entry: Parameters<typeof addLog>[0], message: string) {
  const id = await addLog(entry);
  toast.success(message, {
    duration: 5000,
    action: {
      label: "Undo",
      onClick: async () => {
        const log = (await db.logs.get(id)) as LogEntry | undefined;
        if (log) await deleteLog(log);
        toast("Entry removed", { duration: 1500 });
      },
    },
  });
}

export function QuickActions() {
  const { baby } = useFamily();
  const solidsOn = !!baby?.solids_enabled;
  const [food, setFood] = useState("");
  const [portion, setPortion] = useState<string | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [solidNotes, setSolidNotes] = useState("");
  const nursing = useStopwatch();
  const sleep = useStopwatch();
  const tummy = useStopwatch();
  const pumping = useStopwatch();
  const [pumpSide, setPumpSide] = useState<"Left" | "Right" | "Both">("Both");
  const [pumpMode, setPumpMode] = useState<"timer" | "manual">("timer");
  const [pumpMin, setPumpMin] = useState("");
  const [pumpVolume, setPumpVolume] = useState("");
  const [pumpUnit, setPumpUnit] = useState<"ml" | "oz">("ml");
  const [tummyMin, setTummyMin] = useState("");
  const [feedMode, setFeedMode] = useState<"bottle" | "nursing" | "solids">("bottle");
  useEffect(() => { if (!solidsOn && feedMode === "solids") setFeedMode("bottle"); }, [solidsOn, feedMode]);
  const [side, setSide] = useState<"Left" | "Right">("Left");
  const [bottleMl, setBottleMl] = useState("");
  const [diaperKind, setDiaperKind] = useState<"Wet" | "Dirty" | "Both" | null>(null);
  const [napOpen, setNapOpen] = useState(false);
  const [sleepKind, setSleepKind] = useState<"Nap" | "Night Sleep">(() => defaultSleepKind());
  const [napStart, setNapStart] = useState("");
  const [napEnd, setNapEnd] = useState("");
  const diaperCount = useLiveQuery(() => db.logs.where("timestamp").aboveOrEqual(startOfToday()).filter((log) => log.type === "diaper").count(), [], 0);

  const logBottle = async () => {
    const ml = Number(bottleMl);
    if (!Number.isInteger(ml) || ml < 1 || ml > 2000) { toast.error("Pick or enter an amount between 1 and 2000ml"); return; }
    await logWithUndo({ type: "feed", value: `Bottle · ${ml}ml` }, `Bottle ${ml}ml logged`);
    setBottleMl("");
  };
  const logSolids = async () => {
    const name = food.trim();
    if (!name || name.length > 60) { toast.error("Enter what your baby ate"); return; }
    if (!portion) { toast.error("Choose a portion size"); return; }
    const value = ["Solids", name, portion, reaction].filter(Boolean).join(" · ");
    await logWithUndo({ type: "solids", value, notes: solidNotes.trim().slice(0, 300) || undefined }, `${name} logged`);
    setFood(""); setPortion(null); setReaction(null); setSolidNotes("");
  };
  const logDiaper = async () => {
    if (!diaperKind) { toast.error("Choose Wet, Dirty or Both first"); return; }
    await logWithUndo({ type: "diaper", value: diaperKind }, `${diaperKind} diaper logged`);
    setDiaperKind(null);
  };
  const savePump = async () => {
    const ml = Math.round(Number(pumpVolume) * (pumpUnit === "oz" ? 29.5735 : 1));
    const ms = pumpMode === "manual" ? Number(pumpMin) * 60000 : pumping.elapsed;
    if (!pumpVolume || !Number.isFinite(ml) || ml < 1 || ml > 2000) { toast.error("Enter a volume between 1 and 2000ml"); return; }
    if (!Number.isFinite(ms) || ms < 60000 || ms > 12 * 3600000) { toast.error("Enter a duration between 1 minute and 12 hours"); return; }
    await addLog({ type: "pumping", value: `Pumping · ${pumpSide} · ${ml}ml`, notes: formatDuration(ms) });
    pumping.stop(); setPumpVolume(""); setPumpMin("");
    toast.success("Pumping session logged");
  };
  const savePastNap = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const start = parseLocal(napStart);
    const end = parseLocal(napEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end > Date.now() + 60000) {
      toast.error("Enter a valid past start and end time"); return;
    }
    const kind = defaultSleepKind(start);
    await addLog({ type: "sleep", value: kind, notes: formatDuration(end - start), timestamp: end });
    setNapOpen(false); setNapStart(""); setNapEnd("");
    toast.success(`Past ${kind.toLowerCase()} logged`);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Feed" icon={<Milk className="h-5 w-5" strokeWidth={2.25} />} tone="feed">
        <div className={cn("mb-3 grid rounded-full bg-card/70 p-1", solidsOn ? "grid-cols-3" : "grid-cols-2")} role="group" aria-label="Feed type">
          {(solidsOn ? (["bottle", "nursing", "solids"] as const) : (["bottle", "nursing"] as const)).map((mode) => (
            <Button key={mode} type="button" variant="ghost" aria-pressed={feedMode === mode} onClick={() => setFeedMode(mode)} className={cn("h-11 rounded-full capitalize text-foreground", feedMode === mode && "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:text-primary-foreground")}>{mode === "solids" && <UtensilsCrossed className="h-4 w-4" />}{mode}</Button>
          ))}
        </div>
        {feedMode === "bottle" ? (
          <>
            <div className="flex gap-2" role="group" aria-label="Bottle presets">
              {[60, 90, 120, 150].map((ml) => (
                <Button key={ml} type="button" aria-pressed={bottleMl === String(ml)} onClick={() => setBottleMl(String(ml))} className={cn(pillBase, bottleMl === String(ml) && pill.feed)}>{ml}</Button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label htmlFor="custom-ml" className="shrink-0 text-sm font-medium">Amount</label>
              <input id="custom-ml" type="number" min="1" max="2000" inputMode="numeric" placeholder="0" value={bottleMl} onFocus={selectAll} onChange={(e) => setBottleMl(e.target.value)} className={numInput} />
              <span className="text-sm text-muted-foreground">ml</span>
            </div>
            <Button type="button" onClick={() => void logBottle()} className={cn(bigButton, "mt-3 w-full")}>Log Feed</Button>
          </>
        ) : feedMode === "solids" ? (
          <div className="space-y-3">
            <input aria-label="Food name" placeholder="What did they eat?" maxLength={60} value={food} onChange={(e) => setFood(e.target.value)} className={cn(numInput, "w-full")} />
            <div className="flex flex-wrap gap-2">{FOODS.map((f) => <button key={f} type="button" onClick={() => setFood(f)} className={cn("rounded-full bg-card px-3 py-2 text-sm font-medium shadow-soft tap-card", food === f && pill.tummy)}>{f}</button>)}</div>
            <p className="text-sm font-semibold">Portion</p>
            <div className="grid grid-cols-2 gap-2">{PORTIONS.map((p) => <button key={p} type="button" aria-pressed={portion === p} onClick={() => setPortion(p)} className={cn("min-h-11 rounded-full bg-card px-3 text-sm font-medium shadow-soft tap-card", portion === p && pill.feed)}>{p}</button>)}</div>
            <p className="text-sm font-semibold">Reaction</p>
            <div className="grid grid-cols-2 gap-2">{REACTIONS.map((r) => <button key={r} type="button" aria-pressed={reaction === r} onClick={() => setReaction(reaction === r ? null : r)} className={cn("min-h-11 rounded-full bg-card px-3 text-sm font-medium shadow-soft tap-card", reaction === r && (r.startsWith("⚠️") ? "bg-destructive text-destructive-foreground" : pill.feed))}>{r}</button>)}</div>
            {(reaction?.startsWith("⚠️") || solidNotes) && <textarea aria-label="Reaction notes" placeholder="Describe the reaction (rash, where, how long)…" maxLength={300} value={solidNotes} onChange={(e) => setSolidNotes(e.target.value)} className="min-h-20 w-full rounded-xl border border-input bg-card p-3 text-base" />}
            <Button type="button" onClick={() => void logSolids()} className={cn(bigButton, "w-full")}>Log Solids</Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-card/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 rounded-full bg-background p-1">
                {(["Left", "Right"] as const).map((s) => <Button key={s} type="button" variant="ghost" disabled={nursing.elapsed > 0} aria-pressed={side === s} onClick={() => setSide(s)} className={cn("h-10 rounded-full px-3 text-foreground", side === s && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}>{s}</Button>)}
              </div>
              <span className="font-display text-xl font-bold tabular-nums">{formatDuration(nursing.elapsed)}</span>
            </div>
            {nursing.elapsed === 0 && !nursing.active ? (
              <Button type="button" onClick={nursing.start} className={cn(bigButton, "mt-3 w-full")}><Play />Start nursing</Button>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="secondary" onClick={nursing.active ? nursing.pause : nursing.resume} className={cn(bigButton, "min-w-0")}>{nursing.active ? <Pause /> : <Play />}{nursing.active ? "Pause" : "Resume"}</Button>
                <Button type="button" onClick={async () => { const ms = nursing.stop(); await logWithUndo({ type: "feed", value: `Breastfeed · ${side}`, notes: formatDuration(ms) }, "Nursing logged"); }} className={cn(bigButton, "min-w-0")}><Square />Done</Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Pumping" icon={<Droplets className="h-5 w-5" />} tone="feed">
        <div className="mb-3 grid grid-cols-3 gap-2" role="group" aria-label="Pumping side">
          {(["Left", "Right", "Both"] as const).map((s) => <Button key={s} type="button" aria-pressed={pumpSide === s} onClick={() => setPumpSide(s)} className={cn(pillBase, "min-h-11", pumpSide === s && pill.feed)}>{s}</Button>)}
        </div>
        <div className="mb-3 grid grid-cols-2 rounded-full bg-card/70 p-1" role="group" aria-label="Duration entry">
          {(["timer", "manual"] as const).map((m) => <Button key={m} type="button" variant="ghost" aria-pressed={pumpMode === m} onClick={() => setPumpMode(m)} className={cn("h-11 rounded-full capitalize text-foreground", pumpMode === m && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}>{m}</Button>)}
        </div>
        {pumpMode === "timer" ? (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-card/70 px-3 py-2">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="font-display text-xl font-bold tabular-nums">{formatDuration(pumping.elapsed)}</span>
            <Button type="button" variant={pumping.active ? "outline" : "default"} onClick={pumping.active ? pumping.pause : pumping.elapsed ? pumping.resume : pumping.start} className="h-10 rounded-full">{pumping.active ? <Pause /> : <Play />}{pumping.active ? "Pause" : pumping.elapsed ? "Resume" : "Start"}</Button>
          </div>
        ) : (
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="pump-min" className="text-sm font-medium">Duration</label>
            <input id="pump-min" type="number" min={1} max={720} inputMode="numeric" placeholder="0" value={pumpMin} onFocus={selectAll} onChange={(e) => setPumpMin(e.target.value)} className={numInput} />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label htmlFor="pump-volume" className="text-sm font-medium">Expressed</label>
          <input id="pump-volume" type="number" min="0.1" max={pumpUnit === "ml" ? 2000 : 68} step="0.1" inputMode="decimal" placeholder="0" value={pumpVolume} onFocus={selectAll} onChange={(e) => setPumpVolume(e.target.value)} className={numInput} />
          <Button type="button" variant="outline" onClick={() => { setPumpVolume(""); setPumpUnit(pumpUnit === "ml" ? "oz" : "ml"); }} className="h-12 w-16 rounded-xl">{pumpUnit}</Button>
        </div>
        <Button type="button" onClick={() => void savePump()} className={cn(bigButton, "mt-3 w-full")}>Log Pumping</Button>
      </SectionCard>

      <SectionCard title="Diaper" icon={<DiaperIcon className="h-5 w-5" />} tone="diaper" extra={<span className="ml-auto rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">Today: {diaperCount}</span>}>
        <div className="flex gap-2" role="group" aria-label="Diaper type">
          {(["Wet", "Dirty", "Both"] as const).map((kind) => <Button key={kind} type="button" aria-pressed={diaperKind === kind} onClick={() => setDiaperKind(kind)} className={cn(pillBase, diaperKind === kind && pill.diaper)}>{kind}</Button>)}
        </div>
        <Button type="button" onClick={() => void logDiaper()} className={cn(bigButton, "mt-3 w-full")}>Log Diaper</Button>
      </SectionCard>

      <SectionCard title="Sleep" icon={sleepKind === "Nap" ? <CloudSun className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />} tone="sleep">
        <div className="mb-3 grid grid-cols-2 rounded-full bg-card/70 p-1" role="group" aria-label="Sleep type">
          {(["Nap", "Night Sleep"] as const).map((kind) => (
            <Button key={kind} type="button" variant="ghost" disabled={sleep.elapsed > 0} aria-pressed={sleepKind === kind} onClick={() => setSleepKind(kind)} className={cn("h-11 rounded-full text-foreground", sleepKind === kind && "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:text-primary-foreground")}>
              {kind === "Nap" ? <CloudSun /> : <MoonStar />}{kind}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-card/70 px-4 py-3">
          <span className="text-sm text-muted-foreground">{sleep.active ? `${sleepKind} in progress` : `No ${sleepKind.toLowerCase()} running`}</span>
          <span className="font-display text-2xl font-bold tabular-nums">{formatDuration(sleep.elapsed)}</span>
        </div>
        <Button type="button" onClick={async () => {
          if (!sleep.active) { setSleepKind((k) => k); sleep.start(); return; }
          const ms = sleep.stop();
          await addLog({ type: "sleep", value: sleepKind, notes: formatDuration(ms) });
          toast.success(`${sleepKind} logged`);
          setSleepKind(defaultSleepKind());
        }} className={cn(bigButton, "mt-3 w-full", sleep.active && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
          {sleep.active ? <Square /> : <Play />}{sleep.active ? `Stop ${sleepKind}` : `Start ${sleepKind}`}
        </Button>
        <Dialog open={napOpen} onOpenChange={(open) => {
          setNapOpen(open);
          if (open) { setNapStart(localDateTime(new Date(Date.now() - 3600000))); setNapEnd(localDateTime(new Date())); }
        }}>
          <DialogTrigger asChild><Button variant="link" type="button" className="mt-2 h-10 px-0"><Plus />Log Past Sleep</Button></DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-3xl border-border bg-card">
            <DialogHeader><DialogTitle>Log Past Sleep</DialogTitle><DialogDescription>Enter when it started and ended. Nap or night is picked from the start time.</DialogDescription></DialogHeader>
            <form onSubmit={(event) => void savePastNap(event)} className="space-y-4">
              <label className="block text-sm font-medium">Start time<input type="datetime-local" required value={napStart} onChange={(e) => setNapStart(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 text-base" /></label>
              <label className="block text-sm font-medium">End time<input type="datetime-local" required value={napEnd} onChange={(e) => setNapEnd(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 text-base" /></label>
              <Button type="submit" className="h-12 w-full rounded-2xl">Save sleep</Button>
            </form>
          </DialogContent>
        </Dialog>
      </SectionCard>

      <SectionCard title="Tummy Time" icon={<Hourglass className="h-5 w-5" strokeWidth={2.25} />} tone="tummy">
        <div className="flex items-center justify-between rounded-2xl bg-card/70 px-4 py-3">
          <span className="text-sm text-muted-foreground">{tummy.active ? "Tummy time in progress" : "Not running"}</span>
          <span className="font-display text-2xl font-bold tabular-nums">{formatDuration(tummy.elapsed)}</span>
        </div>
        <Button type="button" onClick={async () => {
          if (!tummy.active) { tummy.start(); return; }
          const ms = tummy.stop();
          await addLog({ type: "tummy", value: "Tummy time", notes: formatDuration(ms) });
          toast.success("Tummy time logged");
        }} className={cn(bigButton, "mt-3 w-full", tummy.active && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
          {tummy.active ? <Square /> : <Play />}{tummy.active ? "Stop Tummy Time" : "Start Tummy Time"}
        </Button>
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="tummy-min" className="shrink-0 text-sm font-medium">Manual</label>
          <input id="tummy-min" type="number" min="1" max="180" inputMode="numeric" placeholder="0" value={tummyMin} onFocus={selectAll} onChange={(e) => setTummyMin(e.target.value)} className={numInput} />
          <span className="text-sm text-muted-foreground">min</span>
          <Button type="button" onClick={async () => {
            const n = Number(tummyMin);
            if (!Number.isInteger(n) || n < 1 || n > 180) { toast.error("Enter 1–180 minutes"); return; }
            await addLog({ type: "tummy", value: "Tummy time", notes: formatDuration(n * 60000) });
            setTummyMin("");
            toast.success(`${n} min tummy time logged`);
          }} className="h-12 rounded-xl px-4">Log</Button>
        </div>
      </SectionCard>
    </div>
  );
}
