import { useLiveQuery } from "dexie-react-hooks";
import { db, startOfToday } from "@/lib/db";

function durationSeconds(value?: string) {
  if (!value) return 0;
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function DailySummary() {
  const logs = useLiveQuery(() => db.logs.where("timestamp").aboveOrEqual(startOfToday()).toArray(), [], []);
  const feeds = logs.filter((log) => log.type === "feed");
  const pumps = logs.filter((log) => log.type === "pumping");
  const pumpMl = pumps.reduce((sum, log) => sum + (Number(log.value.match(/(\d+)ml/)?.[1]) || 0), 0);
  const diapers = logs.filter((log) => log.type === "diaper");
  const sleep = logs.filter((log) => log.type === "sleep");
  const nights = sleep.filter((log) => log.value === "Night Sleep").length;
  const naps = sleep.length - nights;
  const bottleMl = feeds.reduce((sum, log) => sum + (Number(log.value.match(/Bottle · (\d+)ml/)?.[1]) || 0), 0);
  const nursingSeconds = feeds.reduce((sum, log) => sum + (log.value.startsWith("Breastfeed") ? durationSeconds(log.notes) : 0), 0);
  const sleepSeconds = sleep.reduce((sum, log) => sum + durationSeconds(log.notes), 0);
  const wetOnly = diapers.filter((log) => log.value === "Wet").length;
  const dirtyOnly = diapers.filter((log) => log.value === "Dirty").length;
  const both = diapers.filter((log) => log.value === "Both").length;
  const sleepMinutes = Math.floor(sleepSeconds / 60);
  const nursingMinutes = Math.floor(nursingSeconds / 60);
  const hasBottle = bottleMl > 0;
  const hasNursing = nursingSeconds > 0;
  const feedDetail = feeds.length === 0
    ? "No feeds yet"
    : hasBottle && hasNursing
      ? `${bottleMl}ml · ${nursingMinutes}m nursed`
      : hasNursing
        ? `${nursingMinutes}m nursed`
        : `${bottleMl}ml total`;
  const diaperDetail = diapers.length === 0
    ? "No diapers yet"
    : both > 0
      ? `${wetOnly} Wet · ${dirtyOnly} Dirty · ${both} Both`
      : `${wetOnly} Wet · ${dirtyOnly} Dirty`;

  return (
    <section aria-label="Today's summary" className="mb-4 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)] divide-x divide-border rounded-xl border border-border/60 bg-card py-3.5 shadow-soft">
       <div className="min-w-0 px-1 text-center">
        <p className="text-xs font-semibold text-muted-foreground">Feeds</p>
        <p className="mt-1 whitespace-nowrap font-display text-xs font-bold leading-5 tabular-nums">{feeds.length} {feeds.length === 1 ? "feed" : "feeds"}</p>
         <p className="min-h-4 text-xs leading-4 text-muted-foreground">{feedDetail}</p>
         {pumps.length > 0 && <p className="mt-1 text-xs leading-4 text-muted-foreground">Pumped: {pumps.length} · {pumpMl}ml</p>}
      </div>
      <div className="min-w-0 px-1 text-center">
        <p className="text-xs font-semibold text-muted-foreground">Diapers</p>
        <p className="mt-1 whitespace-nowrap font-display text-xs font-bold leading-5 tabular-nums">{diapers.length} {diapers.length === 1 ? "diaper" : "diapers"}</p>
        <p className="min-h-4 text-xs leading-4 text-muted-foreground">{diaperDetail}</p>
      </div>
      <div className="min-w-0 px-1 text-center">
        <p className="text-xs font-semibold text-muted-foreground">Sleep</p>
        <p className="mt-1 whitespace-nowrap font-display text-xs font-bold leading-5 tabular-nums">{Math.floor(sleepMinutes / 60)}h {sleepMinutes % 60}m</p>
        <p className="min-h-4 text-xs leading-4 text-muted-foreground">{naps} {naps === 1 ? "nap" : "naps"}{nights > 0 ? ` · ${nights} night` : ""}</p>
      </div>
    </section>
  );
}
