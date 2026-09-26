import { useEffect, useRef, useState } from "react";
import { Baby, Droplets, Milk, Moon, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { addLog } from "@/lib/db";
import { cn } from "@/lib/utils";

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s]
    .slice(h > 0 ? 0 : 1)
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function useStopwatch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedAt === null) return;
    ref.current = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [startedAt]);

  return {
    running: startedAt !== null,
    elapsed,
    start: () => {
      setElapsed(0);
      setStartedAt(Date.now());
    },
    stop: () => {
      const started = startedAt;
      setStartedAt(null);
      setElapsed(0);
      return started ? Date.now() - started : 0;
    },
  };
}

function SectionCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "feed" | "diaper" | "sleep";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 shadow-soft",
        tone === "feed" && "border-feed/50",
        tone === "diaper" && "border-diaper/50",
        tone === "sleep" && "border-sleep/50",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            tone === "feed" && "bg-feed text-feed-foreground",
            tone === "diaper" && "bg-diaper text-diaper-foreground",
            tone === "sleep" && "bg-sleep text-sleep-foreground",
          )}
        >
          {icon}
        </span>
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const bigButton =
  "flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold tap-card";

export function QuickActions() {
  const breast = useStopwatch();
  const sleep = useStopwatch();
  const [side, setSide] = useState<"Left" | "Right">("Left");
  const [diaper, setDiaper] = useState<string[]>([]);

  const logBottle = async (ml: number) => {
    await addLog({ type: "feed", value: `Bottle · ${ml}ml` });
    toast.success(`Bottle ${ml}ml logged`);
  };

  const toggleDiaper = (kind: string) => {
    setDiaper((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));
  };

  const saveDiaper = async () => {
    if (diaper.length === 0) return;
    const value = diaper.length === 2 ? "Both" : diaper[0]!;
    await addLog({ type: "diaper", value });
    setDiaper([]);
    toast.success(`Diaper: ${value}`);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Feed" icon={<Milk className="h-5 w-5" />} tone="feed">
        <div className="flex gap-2">
          {[60, 90, 120].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => logBottle(ml)}
              className={cn(bigButton, "bg-feed text-feed-foreground")}
            >
              {ml}ml
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-muted/70 p-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-background p-1">
              {(["Left", "Right"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={breast.running}
                  onClick={() => setSide(s)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                    side === s ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="font-display text-xl font-bold tabular-nums">
              {formatDuration(breast.elapsed)}
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!breast.running) return breast.start();
              const ms = breast.stop();
              await addLog({
                type: "feed",
                value: `Breastfeed · ${side}`,
                notes: formatDuration(ms),
              });
              toast.success("Breastfeed logged");
            }}
            className={cn(
              bigButton,
              "mt-3 w-full",
              breast.running
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {breast.running ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {breast.running ? "Stop breastfeed" : "Start breastfeed"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Diaper" icon={<Droplets className="h-5 w-5" />} tone="diaper">
        <div className="flex gap-2">
          {["Wet", "Dirty"].map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => toggleDiaper(kind)}
              className={cn(
                bigButton,
                diaper.includes(kind)
                  ? "bg-diaper text-diaper-foreground ring-2 ring-primary"
                  : "bg-muted text-foreground",
              )}
            >
              {kind}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDiaper(["Wet", "Dirty"])}
            className={cn(
              bigButton,
              diaper.length === 2 ? "bg-diaper text-diaper-foreground ring-2 ring-primary" : "bg-muted text-foreground",
            )}
          >
            Both
          </button>
        </div>
        <button
          type="button"
          disabled={diaper.length === 0}
          onClick={saveDiaper}
          className={cn(bigButton, "mt-3 w-full bg-primary text-primary-foreground disabled:opacity-40")}
        >
          <Baby className="h-5 w-5" />
          Log diaper change
        </button>
      </SectionCard>

      <SectionCard title="Sleep" icon={<Moon className="h-5 w-5" />} tone="sleep">
        <div className="flex items-center justify-between rounded-xl bg-muted/70 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {sleep.running ? "Nap in progress" : "No nap running"}
          </span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {formatDuration(sleep.elapsed)}
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!sleep.running) return sleep.start();
            const ms = sleep.stop();
            await addLog({ type: "sleep", value: "Nap", notes: formatDuration(ms) });
            toast.success("Nap logged");
          }}
          className={cn(
            bigButton,
            "mt-3 w-full",
            sleep.running
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {sleep.running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          {sleep.running ? "Stop nap" : "Start nap"}
        </button>
      </SectionCard>
    </div>
  );
}
