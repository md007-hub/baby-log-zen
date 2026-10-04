import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, startOfToday } from "@/lib/db";
import { useFamily } from "@/hooks/useFamily";
import { supabase } from "@/integrations/supabase/client";
import { Moon } from "lucide-react";
import { wakeRangeFor, wakeStatus } from "@/lib/wakeWindow";

function durationSeconds(value?: string) {
  if (!value) return 0;
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}
function ago(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export function DailySummary() {
  const { baby } = useFamily();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const logs = useLiveQuery(() => db.logs.where("timestamp").aboveOrEqual(startOfToday() - 86400000).toArray(), [], []);
  const today = logs.filter((l) => l.timestamp >= startOfToday());
  const feeds = today.filter((l) => l.type === "feed");
  const pumps = today.filter((l) => l.type === "pumping");
  const pumpMl = pumps.reduce((s, l) => s + (Number(l.value.match(/(\d+)ml/)?.[1]) || 0), 0);
  const diapers = today.filter((l) => l.type === "diaper");
  const sleep = today.filter((l) => l.type === "sleep");
  const tummy = today.filter((l) => l.type === "tummy");
  const bottleMl = feeds.reduce((s, l) => s + (Number(l.value.match(/Bottle · (\d+)ml/)?.[1]) || 0), 0);
  const sleepMin = Math.floor(sleep.reduce((s, l) => s + durationSeconds(l.notes), 0) / 60);
  const tummyMin = Math.floor(tummy.reduce((s, l) => s + durationSeconds(l.notes), 0) / 60);

  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const lastFeed = sorted.find((l) => l.type === "feed");
  const lastSleep = sorted.find((l) => l.type === "sleep");
  const name = baby?.name ?? "Baby";
  const [sleepStart, setSleepStart] = useState<number | null>(null);
  useEffect(() => {
    const read = () => { const v = Number(localStorage.getItem("nestling-sleep-start")); setSleepStart(v > 0 ? v : null); };
    read(); window.addEventListener("nestling-sleep", read); window.addEventListener("storage", read);
    return () => { window.removeEventListener("nestling-sleep", read); window.removeEventListener("storage", read); };
  }, []);
  const fedText = lastFeed ? ` · Last fed ${ago(now - lastFeed.timestamp)} ago` : "";
  const asleep = sleepStart != null;
  const status = asleep
    ? [`Asleep for ${ago(now - sleepStart)}`, `${name} is resting${fedText}`]
    : today.length === 0 && !lastSleep
      ? ["Ready for the day", "Awaiting first log"]
      : [lastSleep ? `Awake for ${ago(now - lastSleep.timestamp)}${fedText}` : `${name} is awake${fedText}`, `${name}'s day so far`];
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!baby?.photo_url) { setPhoto(null); return; }
    void supabase.storage.from("baby-photos").createSignedUrl(baby.photo_url, 3600).then(({ data }) => setPhoto(data?.signedUrl ?? null));
  }, [baby?.photo_url]);

  const range = wakeRangeFor(baby?.birth_date, baby?.date_kind);
  const awakeMin = lastSleep ? Math.round((now - lastSleep.timestamp) / 60000) : null;
  const coach = range && awakeMin != null ? (() => {
    const st = wakeStatus(awakeMin, range);
    const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
    const msg = st === "early" ? `Next sleep in about ${fmt(range.min - awakeMin)}` : st === "soon" ? "Start winding down soon" : st === "now" ? "Sleep window is open — watch for yawns" : `Past typical window by ${fmt(awakeMin - range.max)} — overtired cues likely`;
    return { msg, pct: Math.min(100, (awakeMin / range.max) * 100), range: `${fmt(range.min)}–${fmt(range.max)}`, st };
  })() : null;

  const pills = [
    { label: `${feeds.length} ${feeds.length === 1 ? "feed" : "feeds"}${bottleMl ? ` · ${bottleMl}ml` : ""}`, cls: "bg-feed-tint text-feed-foreground" },
    { label: `${diapers.length} ${diapers.length === 1 ? "diaper" : "diapers"}`, cls: "bg-diaper-tint text-diaper-foreground" },
    { label: `${Math.floor(sleepMin / 60)}h ${sleepMin % 60}m sleep`, cls: "bg-[#EFEBFF] text-[#5B4EB1] dark:bg-[#252038] dark:text-[#C4B5FD]" },
    ...(tummyMin ? [{ label: `${tummyMin}m tummy`, cls: "bg-tummy-tint text-tummy-foreground" }] : []),
    ...(pumps.length ? [{ label: `Pumped ${pumpMl}ml`, cls: "bg-feed-tint text-feed-foreground" }] : []),
  ];

  return (
    <section aria-label="Today's summary" className="mb-4 rounded-3xl border border-transparent bg-card p-4 shadow-soft dark:border-[#2A2622] dark:bg-[#1C1A18]">
      <div className="flex items-center gap-3">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-2xl font-bold text-accent-foreground" aria-hidden>
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-display text-lg font-bold">{status[0]}{asleep && <span className="inline-flex items-center gap-1 rounded-full bg-sleep-tint px-2 py-0.5 text-xs font-semibold text-sleep-foreground"><Moon className="h-3 w-3" />Sleeping</span>}</p>
          <p className="text-sm text-muted-foreground">{status[1]}</p>
        </div>
      </div>
      {coach && (
        <div className="mt-3 rounded-2xl bg-sleep-tint p-3 text-sleep-foreground">
          <div className="flex items-baseline justify-between gap-2 text-xs font-semibold">
            <span>Wake-window coach</span>
            <span className="tabular-nums opacity-80">Typical {coach.range}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/60">
            <div className="h-full rounded-full bg-current transition-all" style={{ width: `${coach.pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-medium">{coach.msg}</p>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-2">
        {pills.map((p) => <li key={p.label} className={`rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums ${p.cls}`}>{p.label}</li>)}
      </ul>
    </section>
  );
}
