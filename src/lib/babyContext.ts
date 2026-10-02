// Builds a plain-text summary of the last 48h of Dexie logs for Nanny AI's system context.
import { db, startOfToday, type LogEntry } from "@/lib/db";
import type { Baby } from "@/hooks/useFamily";

function secs(value?: string) {
  if (!value) return 0;
  const parts = value.split(":").map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return 0;
  return parts.reduce((t, p) => t * 60 + p, 0);
}
const time = (ms: number) =>
  new Date(ms).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
const dur = (s: number) => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};
const ago = (ms: number) => `${dur((Date.now() - ms) / 1000)} ago`;

function describeFeed(l: LogEntry) {
  const ml = l.value.match(/Bottle · (\d+)ml/)?.[1];
  if (ml) return `Bottle, ${ml}ml`;
  if (l.value.startsWith("Breastfeed")) return `${l.value.replace("Breastfeed · ", "Nursing, ")} side, ${dur(secs(l.notes))}`;
  return l.value;
}

export async function buildBabyContext(baby?: Baby | null): Promise<string> {
  const now = Date.now();
  const logs = await db.logs.where("timestamp").aboveOrEqual(now - 48 * 3600_000).sortBy("timestamp");
  const last = (t: LogEntry["type"]) => [...logs].reverse().find((l) => l.type === t);
  const feed = last("feed"), diaper = last("diaper"), sleep = last("sleep");

  const lines = [`Current local time: ${time(now)}`, `Logs in last 48h: ${logs.length}`];
  if (baby) {
    lines.unshift(`Baby's name: ${baby.name}`);
    if (baby.gender && baby.gender !== "prefer_not_to_say") lines.push(`Gender: ${baby.gender}`);
    if (baby.birth_date) {
      const date = new Date(`${baby.birth_date}T12:00:00`);
      const days = Math.floor((now - date.getTime()) / 86400000);
      if (Number.isFinite(days)) lines.push(baby.date_kind === "due" && days < 0
        ? `Due date: ${baby.birth_date}, in ${Math.abs(days)} days. Baby has not been born yet; do not infer postnatal age.`
        : `Age: ${Math.max(0, days)} days (${Math.floor(Math.max(0, days) / 7)} weeks, approximately ${Math.floor(Math.max(0, days) / 30.44)} months); date ${baby.date_kind === "due" ? "is a due date, not a confirmed birth date" : "of birth"}. Tailor routine guidance to this age without claiming medical certainty.`);
    }
  }
  lines.push(feed ? `Most recent feed: ${describeFeed(feed)} at ${time(feed.timestamp)} (${ago(feed.timestamp)})` : "Most recent feed: none logged");
  lines.push(diaper ? `Most recent diaper: ${diaper.value} at ${time(diaper.timestamp)} (${ago(diaper.timestamp)})` : "Most recent diaper: none logged");
  if (sleep) {
    const d = secs(sleep.notes);
    lines.push(`Most recent sleep: ${sleep.value}, ${time(sleep.timestamp - d * 1000)} to ${time(sleep.timestamp)} (${dur(d)})`);
    lines.push(`Current wake window: awake for ${dur((now - sleep.timestamp) / 1000)} since ${time(sleep.timestamp)} (assuming no sleep in progress)`);
  } else lines.push("Most recent sleep: none logged; wake window unknown");

  const today = logs.filter((l) => l.timestamp >= startOfToday());
  const feeds = today.filter((l) => l.type === "feed");
  const pumps = today.filter((l) => l.type === "pumping");
  const ml = feeds.reduce((s, l) => s + (Number(l.value.match(/Bottle · (\d+)ml/)?.[1]) || 0), 0);
  const nurse = feeds.reduce((s, l) => s + (l.value.startsWith("Breastfeed") ? secs(l.notes) : 0), 0);
  const diapers = today.filter((l) => l.type === "diaper");
  const c = (v: string) => diapers.filter((l) => l.value === v).length;
  const sleeps = today.filter((l) => l.type === "sleep");
  lines.push(
    `Today's totals: ${feeds.length} feeds (${ml}ml bottle, ${dur(nurse)} nursing); ${diapers.length} diapers (${c("Wet")} wet, ${c("Dirty")} dirty, ${c("Both")} both); ${dur(sleeps.reduce((s, l) => s + secs(l.notes), 0))} sleep across ${sleeps.length} sessions`,
  );
  lines.push(`Pumping today: ${pumps.length} sessions, ${pumps.reduce((s, l) => s + (Number(l.value.match(/(\d+)ml/)?.[1]) || 0), 0)}ml expressed (not counted as baby's intake).`);
  lines.push("Full 48h log (oldest first):");
  for (const l of logs.slice(-60)) lines.push(`- ${time(l.timestamp)} ${l.type}: ${l.type === "feed" ? describeFeed(l) : l.value}${l.type === "sleep" && l.notes ? ` (${dur(secs(l.notes))})` : ""}`);
  return lines.join("\n");
}
